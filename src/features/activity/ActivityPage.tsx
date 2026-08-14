import { useState, useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { useDriver } from '../../context/DriverContext'
import type { InspectionRecord, TripRecord, FuelRecord, IncidentRecord, DefectRecord } from '../../types/dataverse'

type ActivityColor = 'green' | 'red' | 'amber' | 'blue' | 'gray'

interface ActivityItem {
  id: string
  title: string
  sub: string
  date: Date
  icon: 'clip' | 'key' | 'fuel' | 'warn' | 'wrench'
  color: ActivityColor
  result: string
}

function mapInspections(records: InspectionRecord[]): ActivityItem[] {
  return records.map(r => ({
    id: r.new_vehicleinspectionid,
    title: 'Daily inspection',
    sub: 'Submitted',
    date: new Date(r.new_inspectiondate ?? Date.now()),
    icon: 'clip',
    color: 'green',
    result: 'Submitted',
  }))
}

function mapTrips(records: TripRecord[]): ActivityItem[] {
  return records.map(r => {
    const isClosed = r.statecode === 1
    return {
      id: r.new_checkoutid,
      title: isClosed ? 'Vehicle returned' : 'Vehicle checked out',
      sub: r.new_purposeoftrip ?? (isClosed ? 'Returned' : 'On trip'),
      date: new Date(r.createdon ?? Date.now()),
      icon: 'key',
      color: isClosed ? 'green' : 'blue',
      result: isClosed ? 'Returned' : 'On trip',
    }
  })
}

function mapFuel(records: FuelRecord[]): ActivityItem[] {
  return records.map(r => ({
    id: r.new_fuelmilageid,
    title: 'Fuel capture',
    sub: [
      r.new_litresfilled ? `${r.new_litresfilled} L` : null,
      r.new_totalcostr ? `R ${Number(r.new_totalcostr).toLocaleString()}` : null,
    ].filter(Boolean).join(' · '),
    date: new Date(r.new_date ?? Date.now()),
    icon: 'fuel',
    color: 'amber',
    result: 'Submitted',
  }))
}

function mapIncidents(records: IncidentRecord[]): ActivityItem[] {
  const vStatus: Record<number, string> = { 1: 'Running', 2: 'Not Running', 3: 'Written Off' }
  return records.map(r => ({
    id: r.new_vehicleaccidentreportid,
    title: 'Incident reported',
    sub: [
      r.new_accidenttitle ?? 'Incident',
      r.new_vehiclestatus ? vStatus[r.new_vehiclestatus] : null,
    ].filter(Boolean).join(' · '),
    date: new Date(r.createdon ?? Date.now()),
    icon: 'warn',
    color: r.statecode === 1 ? 'gray' : 'amber',
    result: r.statecode === 0 ? 'Reported' : 'Closed',
  }))
}

function mapDefects(records: DefectRecord[]): ActivityItem[] {
  const severityLabel: Record<number, string> = { 100000000: 'Low', 100000001: 'Medium', 100000002: 'High' }
  const severityColor: Record<number, string> = { 100000000: 'green', 100000001: 'amber', 100000002: 'red' }
  return records.map(r => ({
    id: r.new_defectlogid,
    title: 'Defect logged',
    sub: [r.new_whatisaffected, r.new_severity ? severityLabel[r.new_severity] : null].filter(Boolean).join(' · '),
    date: new Date(r.createdon ?? Date.now()),
    icon: 'wrench',
    color: severityColor[r.new_severity ?? 2] ?? 'amber',
    result: r.statecode === 0 ? 'Open' : 'Resolved',
  }))
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Icon({ name }: { name: string }) {
  if (name === 'clip') return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2z"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  )
  if (name === 'key') return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4"/>
      <path d="M10.8 12.2L20 3M17 6l2.5 2.5M14.5 8.5L17 11"/>
    </svg>
  )
  if (name === 'fuel') return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15M3 20h11"/>
      <path d="M13 10h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>
    </svg>
  )
  if (name === 'warn') return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round">
      <path d="M12 3l9.5 17h-19z"/><path d="M12 9v5M12 17.2v.1"/>
    </svg>
  )
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6a4.5 4.5 0 0 0 5.7 5.7L13 19.4a2.6 2.6 0 0 1-3.7-3.7L17 8a4.5 4.5 0 0 0-2-2z"/>
    </svg>
  )
}

const bgFg: Record<ActivityColor, [string, string]> = {
  green: ['bg-[#DFF5E8]', 'text-[#0B7A45]'],
  red:   ['bg-[#FDE7E9]', 'text-[#C42D3A]'],
  amber: ['bg-[#FEF1DC]', 'text-[#B0700B]'],
  blue:  ['bg-[#EAF2FE]', 'text-[#0A57C2]'],
  gray:  ['bg-[#E9EEF5]', 'text-[#4A5568]'],
}

export function ActivityPage() {
  const { instance } = useMsal()
  const { driver, loading: driverLoading } = useDriver()

  const [items, setItems]   = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!driver) return
    const id = driver.new_driverid
    const client = createDataverseClient(instance)

    setLoading(true)
    setError(null)

    Promise.allSettled([
      client.retrieve<InspectionRecord>(TABLES.inspections,
        `$filter=_new_inspectorrecord_value eq ${id}&$select=new_vehicleinspectionid,new_inspectiondate&$orderby=new_inspectiondate desc&$top=15`),
      client.retrieve<TripRecord>(TABLES.trips,
        `$select=new_checkoutid,new_purposeoftrip,new_odometerreadingkm,statecode,createdon&$orderby=createdon desc&$top=15`),
      client.retrieve<FuelRecord>(TABLES.fuel,
        `$select=new_fuelmilageid,new_date,new_litresfilled,new_totalcostr,new_fuelstation&$orderby=new_date desc&$top=15`),
      client.retrieve<IncidentRecord>(TABLES.incidents,
        `$filter=_new_driverrecord_value eq ${id}&$select=new_vehicleaccidentreportid,new_accidenttitle,new_vehiclestatus,statecode,createdon&$orderby=createdon desc&$top=15`),
      client.retrieve<DefectRecord>(TABLES.defects,
        `$select=new_defectlogid,new_whatisaffected,new_severity,statecode,createdon&$orderby=createdon desc&$top=15`),
    ])
      .then(([insp, trips, fuel, incidents, defects]) => {
        const all: ActivityItem[] = [
          ...(insp.status     === 'fulfilled' ? mapInspections(insp.value.value)     : []),
          ...(trips.status    === 'fulfilled' ? mapTrips(trips.value.value)           : []),
          ...(fuel.status     === 'fulfilled' ? mapFuel(fuel.value.value)             : []),
          ...(incidents.status === 'fulfilled' ? mapIncidents(incidents.value.value)  : []),
          ...(defects.status  === 'fulfilled' ? mapDefects(defects.value.value)       : []),
        ].sort((a, b) => b.date.getTime() - a.date.getTime())
        setItems(all)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load activity'))
      .finally(() => setLoading(false))
  }, [driver, instance])

  const busy = driverLoading || loading

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="bg-navy text-white pt-safe">
        <div className="px-5 pt-3 pb-4">
          <div className="text-[17px] font-bold tracking-[-0.2px]">My activity</div>
          <div className="text-[11.5px] text-[#8FA8D4] mt-0.5">Everything you have submitted</div>
        </div>
        <div className="h-1 bg-fleet-blue" />
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {busy && (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin text-fleet-blue" width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#FDE7E9] border border-[#C42D3A]/20 text-[#C42D3A] rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {!busy && !error && items.length === 0 && (
          <div className="text-center py-16 text-fleet-ink-3">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.4" className="mx-auto mb-4 opacity-40">
              <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h8M8 16h5"/>
            </svg>
            <div className="font-bold text-fleet-ink-2 mb-1">No activity yet</div>
            <div className="text-sm">Your submissions will appear here.</div>
          </div>
        )}

        {!busy && items.length > 0 && (
          <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] divide-y divide-[#EEF2F7]">
            {items.map(item => {
              const [bg, fg] = bgFg[item.color]
              return (
                <div key={item.id} className="flex gap-3 items-center p-4">
                  <div className={`w-9 h-9 rounded-[10px] grid place-items-center shrink-0 ${bg} ${fg}`}>
                    <Icon name={item.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px] text-fleet-ink">{item.title}</div>
                    <div className="text-[11.5px] text-fleet-ink-3 mt-0.5">
                      {item.sub}{item.sub ? ' · ' : ''}{formatDate(item.date)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${bg} ${fg}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {item.result}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
