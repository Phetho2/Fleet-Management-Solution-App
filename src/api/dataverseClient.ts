import { IPublicClientApplication } from '@azure/msal-browser'
import { dataverseScopes } from '../auth/msalConfig'

// Strip any trailing slash so we never get double-slash in URLs
const BASE_URL = (import.meta.env.VITE_DATAVERSE_URL as string).replace(/\/$/, '')

export async function getDataverseToken(instance: IPublicClientApplication): Promise<string> {
  const accounts = instance.getAllAccounts()
  if (accounts.length === 0) throw new Error('No authenticated account')
  try {
    const result = await instance.acquireTokenSilent({
      scopes: dataverseScopes,
      account: accounts[0],
    })
    return result.accessToken
  } catch {
    await instance.acquireTokenRedirect({ scopes: dataverseScopes, account: accounts[0] })
    throw new Error('Redirecting for token…')
  }
}

async function request<T>(
  instance: IPublicClientApplication,
  method: string,
  path: string,
  body?: unknown,
  returnId = false
): Promise<T> {
  const token = await getDataverseToken(instance)
  const res = await fetch(`${BASE_URL}/api/data/v9.2/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="*"',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let msg = `Dataverse ${res.status}`
    try {
      const json = await res.json()
      msg = json?.error?.message ?? msg
    } catch {
      msg = (await res.text()) || msg
    }
    throw new Error(msg)
  }

  if (res.status === 204) {
    if (returnId) {
      // Extract GUID from OData-EntityId header: ".../entity(guid)"
      const entityId = res.headers.get('OData-EntityId') ?? ''
      const match = entityId.match(/\(([^)]+)\)$/)
      return (match ? match[1] : null) as T
    }
    return undefined as T
  }
  return res.json() as Promise<T>
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function isUnknownColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /does not exist on type|Invalid property/i.test(msg)
}

/**
 * Creates a record, retrying once without `optionalKeys` if Dataverse rejects
 * the payload because one of them isn't a real column yet — e.g. a field like
 * a new geolocation column that hasn't been added in Dataverse yet. Once the
 * column is added there, it starts being saved with no code change needed.
 */
export async function createResilient(
  client: ReturnType<typeof createDataverseClient>,
  entity: string,
  body: Record<string, unknown>,
  optionalKeys: string[]
): Promise<string | null> {
  try {
    return await client.create(entity, body)
  } catch (err) {
    if (!isUnknownColumnError(err)) throw err
    const fallback = { ...body }
    for (const key of optionalKeys) delete fallback[key]
    console.warn(
      `[Dataverse] ${entity}: dropped ${optionalKeys.join(', ')} — column(s) not found. Record saved without them. ` +
      `Original error: ${err instanceof Error ? err.message : err}`
    )
    return client.create(entity, fallback)
  }
}

/** Same fallback behavior as {@link createResilient}, for PATCH updates. */
export async function updateResilient(
  client: ReturnType<typeof createDataverseClient>,
  entity: string,
  id: string,
  body: Record<string, unknown>,
  optionalKeys: string[]
): Promise<void> {
  try {
    await client.update(entity, id, body)
  } catch (err) {
    if (!isUnknownColumnError(err)) throw err
    const fallback = { ...body }
    for (const key of optionalKeys) delete fallback[key]
    console.warn(
      `[Dataverse] ${entity}(${id}): dropped ${optionalKeys.join(', ')} — column(s) not found. Record updated without them. ` +
      `Original error: ${err instanceof Error ? err.message : err}`
    )
    await client.update(entity, id, fallback)
  }
}

function stripSelectFields(query: string, fields: string[]): string {
  return query.replace(/(\$select=)([^&]+)/, (_match, prefix: string, selectList: string) => {
    const kept = selectList.split(',').filter(f => !fields.includes(f))
    return prefix + kept.join(',')
  })
}

/**
 * Runs a GET, retrying once with `optionalSelectKeys` stripped from `$select`
 * if Dataverse 400s because one of them isn't a real column yet — a single
 * unknown column in $select fails the whole query, so without this fallback
 * every other field requested in the same call would be lost along with it.
 */
export async function retrieveResilient<T>(
  client: ReturnType<typeof createDataverseClient>,
  entity: string,
  query: string,
  optionalSelectKeys: string[]
): Promise<{ value: T[] }> {
  try {
    return await client.retrieve<T>(entity, query)
  } catch (err) {
    if (!isUnknownColumnError(err)) throw err
    console.warn(
      `[Dataverse] ${entity}: dropped ${optionalSelectKeys.join(', ')} from $select — column(s) not found. ` +
      `Original error: ${err instanceof Error ? err.message : err}`
    )
    return client.retrieve<T>(entity, stripSelectFields(query, optionalSelectKeys))
  }
}

export function createDataverseClient(instance: IPublicClientApplication) {
  return {
    /** GET – returns OData response with a `value` array */
    retrieve: <T>(entity: string, query = '') =>
      request<{ value: T[] }>(instance, 'GET', `${entity}${query ? '?' + query : ''}`),

    /** POST – creates a record, returns the new record's GUID */
    create: (entity: string, data: Record<string, unknown>) =>
      request<string | null>(instance, 'POST', entity, data, true),

    /** PATCH – updates a record by id */
    update: (entity: string, id: string, data: Record<string, unknown>) =>
      request<void>(instance, 'PATCH', `${entity}(${id})`, data),

    /**
     * Attaches a photo to a record as a Dataverse note (annotation).
     * `entitySet` is the OData entity set (e.g. TABLES.checkins), `entityLogicalName`
     * is the table's singular logical name (e.g. 'new_checkin') used for the
     * polymorphic `objectid_<entity>@odata.bind` lookup.
     */
    uploadPhoto: async (entitySet: string, entityLogicalName: string, recordId: string, blob: Blob, index = 0) => {
      const documentbody = await blobToBase64(blob)
      const filename = `photo-${Date.now()}-${index}.jpg`
      return request<string | null>(instance, 'POST', 'annotations', {
        subject: filename,
        filename,
        mimetype: blob.type || 'image/jpeg',
        documentbody,
        [`objectid_${entityLogicalName}@odata.bind`]: `/${entitySet}(${recordId})`,
      }, true)
    },

    /**
     * Queries Dataverse metadata to list all entity set names whose
     * logical name starts with a given prefix (default 'bwl_').
     * Use this to discover the correct entity set names for your tables.
     */
    discoverTables: async (prefix = 'new_') => {
      const res = await request<{ value: Array<{ LogicalName: string; EntitySetName: string; DisplayName: { UserLocalizedLabel?: { Label: string } } }> }>(
        instance,
        'GET',
        `EntityDefinitions?$select=LogicalName,EntitySetName,DisplayName`
      )
      return { value: res.value.filter(e => e.LogicalName.startsWith(prefix)) }
    },

    /** Returns all attribute logical names for a given table logical name */
    discoverColumns: (tableLogicalName: string) =>
      request<{ value: Array<{ LogicalName: string; AttributeType: string; DisplayName: { UserLocalizedLabel?: { Label: string } } }> }>(
        instance,
        'GET',
        `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes?$select=LogicalName,AttributeType,DisplayName&$filter=AttributeType ne 'Virtual'`
      ),

    /** Returns navigation property names for all many-to-one (lookup) relationships on a table.
     *  Use ReferencingEntityNavigationPropertyName as the key in @odata.bind payloads. */
    discoverRelationships: (tableLogicalName: string) =>
      request<{ value: Array<{ ReferencingAttribute: string; ReferencedEntity: string; ReferencingEntityNavigationPropertyName: string }> }>(
        instance,
        'GET',
        `EntityDefinitions(LogicalName='${tableLogicalName}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName`
      ),

    /** Returns the numeric value/label pairs behind a Picklist (option set) column. */
    discoverPicklistOptions: (tableLogicalName: string, attributeLogicalName: string) =>
      request<{ OptionSet?: { Options: Array<{ Value: number; Label: { UserLocalizedLabel?: { Label: string } } }> } }>(
        instance,
        'GET',
        `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`
      ),
  }
}
