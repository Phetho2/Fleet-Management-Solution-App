import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { useShift, type ShiftState } from '../../context/ShiftContext'
import { useDriver } from '../../context/DriverContext'
import type { CheckinRecord, TripRecord, InspectionRecord } from '../../types/dataverse'

/* ── Helpers ──────────────────────────────────────────────── */
/** Returns the start of today's "shift day" — resets at 04:00 */
function shiftDayStart(): Date {
  const d = new Date()
  d.setHours(4, 0, 0, 0)
  if (new Date() < d) d.setDate(d.getDate() - 1)
  return d
}

/* ── Sub-components ───────────────────────────────────────── */
function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="bg-navy text-white pt-safe">
      <div className="px-5 pt-3 pb-4">
        <div className="text-[17px] font-bold tracking-[-0.2px]">{title}</div>
        <div className="text-[11.5px] text-[#8FA8D4] mt-0.5">{sub}</div>
      </div>
      <div className="h-1 bg-fleet-blue" />
    </header>
  )
}

function Pill({ color, children }: { color: 'green' | 'amber' | 'gray' | 'blue'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-[#DFF5E8] text-[#0B7A45]',
    amber: 'bg-[#FEF1DC] text-[#B0700B]',
    blue:  'bg-[#EAF2FE] text-[#0A57C2]',
    gray:  'bg-[#E9EEF5] text-[#4A5568]',
  }[color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
      {(color === 'green' || color === 'blue') && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

interface TaskItemProps {
  icon: React.ReactNode
  title: string
  sub: string
  tag: React.ReactNode
  onClick?: () => void
  loading?: boolean
}
function TaskItem({ icon, title, sub, tag, onClick, loading }: TaskItemProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white border-[1.5px] border-fleet-line rounded-[13px] p-4 flex items-center gap-3 w-full text-left active:scale-[.98] transition-all"
    >
      <div className="w-9 h-9 rounded-[10px] bg-[#B7D3FB] text-navy grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14px] text-fleet-ink">{title}</div>
        <div className="text-[11.5px] text-fleet-ink-3 mt-0.5">{sub}</div>
      </div>
      {loading ? (
        <svg className="animate-spin text-fleet-blue shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
          <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ) : tag}
    </button>
  )
}

/* ── Icons ────────────────────────────────────────────────── */
const IconClip = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6l1 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2z"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
)
const IconKey = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="4"/>
    <path d="M10.8 12.2L20 3M17 6l2.5 2.5M14.5 8.5L17 11"/>
  </svg>
)
const IconFuel = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15M3 20h11"/>
    <path d="M13 10h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>
    <path d="M6 8h5"/>
  </svg>
)
const IconCam = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <circle cx="12" cy="13" r="3.5"/>
  </svg>
)
const IconWrench = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6a4.5 4.5 0 0 0 5.7 5.7L13 19.4a2.6 2.6 0 0 1-3.7-3.7L17 8a4.5 4.5 0 0 0-2-2z"/>
  </svg>
)

/* ── Main component ───────────────────────────────────────── */
export function TodayPage() {
  const { instance } = useMsal()
  const { driver } = useDriver()
  const { shift, odoOut, checkinId, setShift, setOdoOut, setCheckinId } = useShift()
  const navigate = useNavigate()

  const [syncing, setSyncing]       = useState(true)
  const [fuelCount, setFuelCount]   = useState<number | null>(null)
  const [defectCount, setDefectCount] = useState<number | null>(null)

  // Derive checklist state from shift
  const inspected  = shift !== 'not-started'
  const checkedIn  = ['checked-in', 'on-trip', 'returned'].includes(shift)
  const checkedOut = shift === 'on-trip' || shift === 'returned'
  const returned   = shift === 'returned'

  const done = (v: boolean) => <Pill color={v ? 'green' : 'amber'}>{v ? 'Done' : 'To do'}</Pill>

  useEffect(() => {
    if (!driver) return
    const client = createDataverseClient(instance)
    const iso = shiftDayStart().toISOString()

    Promise.allSettled([
      // 1. Inspection submitted today by this driver
      client.retrieve<InspectionRecord>(TABLES.inspections,
        `$filter=_new_inspectorrecord_value eq ${driver.new_driverid} and createdon ge ${iso}` +
        `&$select=new_vehicleinspectionid&$top=1`),

      // 2. Check-in record from today (most recent)
      client.retrieve<CheckinRecord>(TABLES.checkins,
        `$filter=createdon ge ${iso}` +
        `&$select=new_checkinid,new_closingodometerkm&$orderby=createdon desc&$top=1`),

      // 3. Active (on-trip) checkout record from today
      client.retrieve<TripRecord>(TABLES.trips,
        `$filter=statecode eq 0 and createdon ge ${iso}` +
        `&$select=new_checkoutid,new_odometerreadingkm&$top=1`),

      // 4. Fuel entries today
      client.retrieve(TABLES.fuel,
        `$filter=createdon ge ${iso}&$select=new_fuelmilageid&$top=50`),

      // 5. Defects logged today
      client.retrieve(TABLES.defects,
        `$filter=createdon ge ${iso}&$select=new_defectlogid&$top=50`),
    ]).then(([inspRes, checkinRes, checkoutRes, fuelRes, defectRes]) => {
      const hasInspection  = inspRes.status    === 'fulfilled' && inspRes.value.value.length > 0
      const checkinRecord  = checkinRes.status  === 'fulfilled' ? checkinRes.value.value[0]  as CheckinRecord | undefined : undefined
      const checkoutRecord = checkoutRes.status === 'fulfilled' ? checkoutRes.value.value[0] as TripRecord | undefined    : undefined

      // Sync IDs back into context if session was lost
      if (checkinRecord?.new_checkinid && !checkinId) {
        setCheckinId(checkinRecord.new_checkinid)
      }
      if (checkoutRecord?.new_odometerreadingkm && !odoOut) {
        setOdoOut(String(checkoutRecord.new_odometerreadingkm))
      }

      // Derive true shift state from live data
      const hasReturned       = !!checkinRecord?.new_closingodometerkm
      const hasActiveCheckout = !!checkoutRecord
      const hasCheckin        = !!checkinRecord && !hasReturned

      let liveShift: ShiftState
      if (hasReturned)          liveShift = 'returned'
      else if (hasActiveCheckout) liveShift = 'on-trip'
      else if (hasCheckin)      liveShift = 'checked-in'
      else if (hasInspection)   liveShift = 'inspected'
      else                      liveShift = 'not-started'

      if (liveShift !== shift) setShift(liveShift)

      // Counts
      if (fuelRes.status === 'fulfilled')   setFuelCount(fuelRes.value.value.length)
      if (defectRes.status === 'fulfilled') setDefectCount(defectRes.value.value.length)
    }).finally(() => setSyncing(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.new_driverid])

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <PageHeader title="Today" sub="Your shift checklist" />

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {/* Info banner */}
        <div className="flex gap-2.5 p-3 rounded-xl text-sm font-semibold leading-snug bg-[#EAF2FE] text-[#0A57C2]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>
          </svg>
          Checklist synced from Dataverse · resets at 04:00 daily.
        </div>

        {/* Before you drive */}
        <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mt-1">
          Before you drive
        </div>
        <div className="space-y-2">
          <TaskItem
            icon={<IconClip />}
            title="Daily inspection"
            sub="10 condition checks · ~2 min"
            tag={done(inspected)}
            loading={syncing}
            onClick={() => !inspected ? navigate('/inspection') : undefined}
          />
          <TaskItem
            icon={<IconKey />}
            title="Check in to vehicle"
            sub="Sign in before your trip"
            tag={done(checkedIn)}
            loading={syncing}
            onClick={() => inspected && !checkedIn ? navigate('/checkin') : undefined}
          />
          <TaskItem
            icon={<IconKey />}
            title="Check out vehicle"
            sub="Log odometer and trip purpose"
            tag={done(checkedOut)}
            loading={syncing}
            onClick={() => checkedIn && !checkedOut ? navigate('/checkinout') : undefined}
          />
        </div>

        {/* During your shift */}
        <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mt-1">
          During your shift
        </div>
        <div className="space-y-2">
          <TaskItem
            icon={<IconFuel />}
            title="Capture fuel"
            sub="Every time you refuel"
            tag={
              fuelCount === null
                ? <Pill color="gray">Optional</Pill>
                : fuelCount === 0
                ? <Pill color="gray">None today</Pill>
                : <Pill color="blue">{fuelCount} capture{fuelCount !== 1 ? 's' : ''}</Pill>
            }
            loading={syncing}
            onClick={() => navigate('/fuel')}
          />
          <TaskItem
            icon={<IconCam />}
            title="Report an incident"
            sub="Only if something happens"
            tag={<Pill color="gray">As needed</Pill>}
            onClick={() => navigate('/incident')}
          />
          <TaskItem
            icon={<IconWrench />}
            title="Log a defect"
            sub="Something not working right"
            tag={
              defectCount === null
                ? <Pill color="gray">As needed</Pill>
                : defectCount === 0
                ? <Pill color="gray">None today</Pill>
                : <Pill color="amber">{defectCount} logged</Pill>
            }
            loading={syncing}
            onClick={() => navigate('/defects')}
          />
        </div>

        {/* End of shift */}
        <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mt-1">
          End of shift
        </div>
        <div className="space-y-2">
          <TaskItem
            icon={<IconKey />}
            title="Return vehicle"
            sub={returned ? 'Vehicle returned · shift closed' : 'Close odometer & condition on return'}
            tag={done(returned)}
            loading={syncing}
            onClick={() => shift === 'on-trip' ? navigate('/checkinout') : undefined}
          />
        </div>
      </div>
    </div>
  )
}
