// import { useState } from 'react' // Developer check — uncomment with components below
// import { useMsal } from '@azure/msal-react' // Developer check — uncomment with components below
import { useAuth } from '../../auth/useAuth'
import { useDriver } from '../../context/DriverContext'
// import { createDataverseClient } from '../../api/dataverseClient' // Developer check
// import { TABLES } from '../../api/tables' // Developer check

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4 py-3 border-b border-[#EEF2F7] last:border-0">
      <span className="text-[12.5px] text-fleet-ink-3 font-semibold">{label}</span>
      <span className={`text-[13px] font-semibold text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function Pill({ color, children }: { color: 'green' | 'amber' | 'blue'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-[#DFF5E8] text-[#0B7A45]',
    amber: 'bg-[#FEF1DC] text-[#B0700B]',
    blue:  'bg-[#EAF2FE] text-[#0A57C2]',
  }[color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

function initials(name: string | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

function formatDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* Developer check — uncomment when adding more tables

function ColumnDiscovery() {
  const { instance } = useMsal()
  const [table, setTable]     = useState('new_driver')
  const [results, setResults] = useState<Array<{ name: string; type: string; label: string }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [open, setOpen]       = useState(false)

  const discover = async () => {
    setLoading(true); setError(null); setResults(null)
    try {
      const client = createDataverseClient(instance)
      const res = await client.discoverColumns(table)
      setResults(
        res.value
          .map(a => ({ name: a.LogicalName, type: a.AttributeType, label: a.DisplayName?.UserLocalizedLabel?.Label ?? '' }))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">
        Developer · Column names
      </div>
      <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <div className="font-bold text-[14px] text-fleet-ink">Discover column names</div>
            <div className="text-[11.5px] text-fleet-ink-3 mt-0.5">
              See actual field names for a table
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            className={`text-fleet-ink-3 transition-transform ${open ? 'rotate-90' : ''}`}>
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>

        {open && (
          <div className="border-t border-[#EEF2F7] p-4 space-y-3">
            <div className="flex gap-2">
              <input
                value={table}
                onChange={e => setTable(e.target.value)}
                placeholder="Table logical name"
                className="flex-1 border border-fleet-line rounded-lg px-3 py-2 text-[12px] font-mono"
              />
              <button
                onClick={discover}
                className="px-4 py-2 bg-navy text-white rounded-lg text-[12px] font-bold"
              >
                {loading ? '…' : 'Go'}
              </button>
            </div>
            {error && <div className="text-[12px] text-[#C42D3A] font-semibold">{error}</div>}
            {results && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                <div className="text-[11px] text-fleet-ink-3 font-semibold mb-2">
                  {results.length} columns in {table}
                </div>
                {results.map(r => (
                  <div key={r.name} className="flex items-baseline justify-between gap-2 py-1 border-b border-[#EEF2F7]">
                    <span className="font-mono text-[11px] text-fleet-ink">{r.name}</span>
                    <span className="text-[10px] text-fleet-ink-3 shrink-0">{r.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RelationshipDiscovery() {
  const { instance } = useMsal()
  const [table, setTable]     = useState('new_vehicleinspection')
  const [results, setResults] = useState<Array<{ attr: string; target: string; navProp: string }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [open, setOpen]       = useState(false)

  const discover = async () => {
    setLoading(true); setError(null); setResults(null)
    try {
      const client = createDataverseClient(instance)
      const res = await client.discoverRelationships(table)
      setResults(
        res.value
          .filter(r => r.ReferencingAttribute.startsWith('new_'))
          .map(r => ({ attr: r.ReferencingAttribute, target: r.ReferencedEntity, navProp: r.ReferencingEntityNavigationPropertyName }))
          .sort((a, b) => a.attr.localeCompare(b.attr))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">
        Developer · Lookup navigation properties
      </div>
      <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <div className="font-bold text-[14px] text-fleet-ink">Discover @odata.bind names</div>
            <div className="text-[11.5px] text-fleet-ink-3 mt-0.5">Find correct navigation property names for lookups</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            className={`text-fleet-ink-3 transition-transform ${open ? 'rotate-90' : ''}`}>
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
        {open && (
          <div className="border-t border-[#EEF2F7] p-4 space-y-3">
            <div className="flex gap-2">
              <input value={table} onChange={e => setTable(e.target.value)}
                placeholder="Table logical name"
                className="flex-1 border border-fleet-line rounded-lg px-3 py-2 text-[12px] font-mono" />
              <button onClick={discover}
                className="px-4 py-2 bg-navy text-white rounded-lg text-[12px] font-bold">
                {loading ? '…' : 'Go'}
              </button>
            </div>
            {error && <div className="text-[12px] text-[#C42D3A] font-semibold">{error}</div>}
            {results && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                <div className="text-[11px] text-fleet-ink-3 font-semibold mb-2">
                  Use the <span className="font-mono">Nav property</span> value as the key in <span className="font-mono">@odata.bind</span>
                </div>
                {results.map(r => (
                  <div key={r.attr} className="py-1.5 border-b border-[#EEF2F7]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] text-fleet-ink-3">{r.attr} → {r.target}</span>
                    </div>
                    <div className="font-mono text-[12px] font-bold text-navy">{r.navProp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TableDiscovery() {
  const { instance } = useMsal()
  const [results, setResults] = useState<Array<{ logical: string; entitySet: string }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [open, setOpen]       = useState(false)

  const discover = async () => {
    setLoading(true); setError(null)
    try {
      const client = createDataverseClient(instance)
      const res = await client.discoverTables('new_')
      setResults(
        res.value
          .map(e => ({ logical: e.LogicalName, entitySet: e.EntitySetName }))
          .sort((a, b) => a.logical.localeCompare(b.logical))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  const configured: Record<string, string> = {
    new_driver:                 TABLES.drivers,
    new_vehiclerecord:          TABLES.vehicles,
    new_vehicleinspection:      TABLES.inspections,
    new_vehicleaccidentreport:  TABLES.incidents,
    new_vehicleservicerecord:   TABLES.services,
  }

  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">
        Developer · Table names
      </div>
      <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] overflow-hidden">
        <button
          onClick={() => { setOpen(o => !o); if (!open && !results) discover() }}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <div className="font-bold text-[14px] text-fleet-ink">Discover entity set names</div>
            <div className="text-[11.5px] text-fleet-ink-3 mt-0.5">
              Check what your Dataverse tables are actually called
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            className={`text-fleet-ink-3 transition-transform ${open ? 'rotate-90' : ''}`}>
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>

        {open && (
          <div className="border-t border-[#EEF2F7] p-4 space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-[12.5px] text-fleet-ink-3">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Querying metadata…
              </div>
            )}

            {error && (
              <div className="text-[12px] text-[#C42D3A] font-semibold">{error}</div>
            )}

            {results && (
              <>
                <div className="text-[11px] text-fleet-ink-3 font-semibold">
                  Found {results.length} new_ table{results.length !== 1 ? 's' : ''}.
                  Mismatch = wrong name in <code className="font-mono bg-[#F7F9FC] px-1 rounded">src/api/tables.ts</code>.
                </div>
                <div className="divide-y divide-[#EEF2F7] rounded-xl border border-fleet-line overflow-hidden">
                  {results.map(r => {
                    const expected = configured[r.logical]
                    const match = expected === r.entitySet
                    return (
                      <div key={r.logical} className={`p-3 ${!expected ? '' : match ? 'bg-[#F6FEF9]' : 'bg-[#FFF8F0]'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-fleet-ink-2">{r.logical}</span>
                          {expected && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${match ? 'bg-[#DFF5E8] text-[#0B7A45]' : 'bg-[#FEF1DC] text-[#B0700B]'}`}>
                              {match ? '✓ match' : '⚠ mismatch'}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[12px] font-bold text-navy mt-0.5">{r.entitySet}</div>
                        {expected && !match && (
                          <div className="text-[10.5px] text-[#B0700B] mt-1">
                            tables.ts has: <code className="font-mono">{expected}</code> — update it to <code className="font-mono">{r.entitySet}</code>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={discover}
                  className="text-[12px] font-bold text-fleet-blue"
                >
                  Refresh
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

*/ // end Developer check

export function ProfilePage() {
  const { account, logout } = useAuth()
  const { driver, vehicle, lastService } = useDriver()

  const displayName = driver?.new_driverfullname ?? account?.name ?? 'Driver'
  const email = account?.username ?? '—'

  const IconOut = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8"/>
      <path d="M17 15l4-3-4-3M21 12H10"/>
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="bg-navy text-white pt-safe">
        <div className="px-5 pt-3 pb-4">
          <div className="text-[17px] font-bold tracking-[-0.2px]">My profile</div>
          <div className="text-[11.5px] text-[#8FA8D4] mt-0.5">Driver details and licence</div>
        </div>
        <div className="h-1 bg-fleet-blue" />
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {/* Avatar */}
        <div className="text-center py-4">
          <div className="w-[74px] h-[74px] rounded-full bg-navy text-white grid place-items-center text-[26px] font-extrabold mx-auto mb-3">
            {initials(displayName)}
          </div>
          <div className="text-[18px] font-bold text-fleet-ink">{displayName}</div>
          {driver?.new_jobtitle && (
            <div className="text-[12.5px] font-semibold text-fleet-ink-2 mt-0.5">{driver.new_jobtitle}</div>
          )}
          <div className="text-[12.5px] text-fleet-ink-3 mt-1">{email}</div>
          <div className="mt-3">
            <Pill color="green">Active driver</Pill>
          </div>
        </div>

        {/* Driver details from Dataverse */}
        <div>
          <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">Details</div>
          <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] px-4">
            <Row label="Employee no." value={driver?.new_employeeid ?? '—'} mono />
            <Row label="Job title" value={driver?.new_jobtitle ?? '—'} />
            <Row
              label="Assigned vehicle"
              value={vehicle ? `${vehicle.new_vehicletitle} · ${vehicle.new_registrationnumber ?? ''}`.trim() : '—'}
            />
          </div>
        </div>

        {/* Licence — fields not yet in Dataverse table, shown as placeholders */}
        <div>
          {/* <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">Licence</div> */}
          {/* <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] px-4">
            <Row label="Licence no." value="—" mono />
            <Row label="Expires" value="—" />
          </div> */}
        </div>

        {/* Vehicle details */}
        {vehicle && (
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">Vehicle</div>
            <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] px-4">
              <Row label="Registration" value={vehicle.new_registrationnumber ?? '—'} mono />
              <Row label="Make & model" value={`${vehicle.new_vehiclemake ?? ''} ${vehicle.new_vehiclemodel ?? ''}`.trim() || '—'} />
              {vehicle.new_vinnumber && <Row label="VIN" value={vehicle.new_vinnumber} mono />}
              <Row label="Disk expires" value={formatDate(vehicle.new_licensediskexpirationdate)} />
              {lastService?.new_nextservicemileage && (
                <Row label="Next service" value={`${lastService.new_nextservicemileage.toLocaleString()} km`} mono />
              )}
            </div>
          </div>
        )}

        {/* Developer check — uncomment when adding more tables
        <TableDiscovery />
        <ColumnDiscovery />
        <RelationshipDiscovery />
        */}

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full bg-white border-[1.5px] border-fleet-blue text-fleet-blue font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[.98] transition-all text-[14.5px]"
        >
          <IconOut />
          Sign out
        </button>

        <div className="text-center text-[10px] font-mono text-fleet-ink-3 pb-2">
          MONABO FLEET v1.0 · BUILT BY BRILLIWARE
        </div>
      </div>
    </div>
  )
}
