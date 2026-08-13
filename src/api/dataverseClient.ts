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
  body?: unknown
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

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function createDataverseClient(instance: IPublicClientApplication) {
  return {
    /** GET – returns OData response with a `value` array */
    retrieve: <T>(entity: string, query = '') =>
      request<{ value: T[] }>(instance, 'GET', `${entity}${query ? '?' + query : ''}`),

    /** POST – creates a record */
    create: (entity: string, data: Record<string, unknown>) =>
      request<void>(instance, 'POST', entity, data),

    /** PATCH – updates a record by id */
    update: (entity: string, id: string, data: Record<string, unknown>) =>
      request<void>(instance, 'PATCH', `${entity}(${id})`, data),

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
  }
}
