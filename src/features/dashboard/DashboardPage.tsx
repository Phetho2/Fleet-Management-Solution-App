import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useShift } from '../../context/ShiftContext'
import { useDriver } from '../../context/DriverContext'

/* ── Helpers ─────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(name: string | undefined, username: string | undefined) {
  // Prefer display name, fall back to the part before @ in the email
  const raw = name || username?.split('@')[0] || 'Driver'
  return raw.split(' ')[0]
}

function today() {
  return new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

/* ── Sub-components ──────────────────────────────────────── */
function Pill({ color, children }: { color: 'green' | 'amber' | 'blue' | 'gray'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-[#DFF5E8] text-[#0B7A45]',
    amber: 'bg-[#FEF1DC] text-[#B0700B]',
    blue:  'bg-[#EAF2FE] text-[#0A57C2]',
    gray:  'bg-[#E9EEF5] text-[#4A5568]',
  }[color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
      {color !== 'gray' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

function Alert({ type, children }: { type: 'warn' | 'ok' | 'info' | 'error'; children: React.ReactNode }) {
  const cls = {
    warn:  'bg-[#FEF1DC] text-[#B0700B]',
    ok:    'bg-[#DFF5E8] text-[#0B7A45]',
    info:  'bg-[#EAF2FE] text-[#0A57C2]',
    error: 'bg-[#FDE7E9] text-[#C42D3A]',
  }[type]
  const icon = {
    warn:  <path d="M12 3l9.5 17h-19z"/>,
    ok:    <path d="M20 6L9 17l-5-5"/>,
    info:  <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/></>,
    error: <><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.1"/></>,
  }[type]
  return (
    <div className={`flex gap-2.5 p-3 rounded-xl text-sm font-semibold leading-snug mb-3 ${cls}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">{icon}</svg>
      <span>{children}</span>
    </div>
  )
}

interface TileProps {
  icon: React.ReactNode
  title: string
  sub: string
  badge?: string
  done?: boolean
  disabled?: boolean
  onClick?: () => void
  wide?: boolean
}
function Tile({ icon, title, sub, badge, done, disabled, onClick, wide }: TileProps) {
  const base = wide
    ? 'flex items-center gap-3 p-4 w-full rounded-[13px] border-[1.5px] text-left transition-all active:scale-[.98]'
    : 'flex flex-col p-4 rounded-[13px] border-[1.5px] text-left transition-all active:scale-[.97] relative'
  const color = done
    ? 'bg-[#DFF5E8] border-[#0B7A45]'
    : disabled
    ? 'bg-white border-[#E4E9F2] opacity-45 pointer-events-none'
    : 'bg-white border-[#EAF2FE]'

  return (
    <button className={`${base} ${color}`} onClick={onClick} disabled={disabled}>
      <div className={`grid place-items-center rounded-[10px] shrink-0 ${wide ? 'w-9 h-9' : 'w-9 h-9 mb-3'} ${done ? 'bg-white text-[#0B7A45]' : 'bg-[#B7D3FB] text-navy'}`}>
        {icon}
      </div>
      <div className={wide ? 'flex-1' : ''}>
        <div className={`font-bold leading-tight ${wide ? 'text-[14px]' : 'text-[13.5px] mb-0.5'}`}>{title}</div>
        <div className="text-[10.5px] text-fleet-ink-3">{sub}</div>
      </div>
      {badge && !done && (
        <span className={`${wide ? '' : 'absolute top-2.5 right-2.5'} bg-[#F04438] text-white text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full`}>
          {badge}
        </span>
      )}
      {wide && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-fleet-ink-3 shrink-0">
          <path d="M5 12h14M13 6l6 6-6 6"/>
        </svg>
      )}
    </button>
  )
}

/* ── Icons ───────────────────────────────────────────────── */
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
const IconCam = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <circle cx="12" cy="13" r="3.5"/>
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
const IconWrench = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6a4.5 4.5 0 0 0 5.7 5.7L13 19.4a2.6 2.6 0 0 1-3.7-3.7L17 8a4.5 4.5 0 0 0-2-2z"/>
  </svg>
)
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7"/>
    <path d="M13.7 20a2 2 0 0 1-3.4 0"/>
  </svg>
)

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="animate-spin text-fleet-blue" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function formatDisk(isoDate: string | undefined) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Main component ──────────────────────────────────────── */
export function DashboardPage() {
  const { account } = useAuth()
  const { shift, odoOut } = useShift()
  const { driver, vehicle, lastService, loading, error } = useDriver()
  const navigate = useNavigate()

  const vehicleName = vehicle
    ? `${vehicle.new_vehiclemake ?? ''} ${vehicle.new_vehiclemodel ?? vehicle.new_vehicletitle}`.trim()
    : '—'
  const vehicleReg = vehicle?.new_registrationnumber ?? '—'
  const diskExpiry = formatDisk(vehicle?.new_licensediskexpirationdate)

  const shiftPill = {
    'not-started': <Pill color="gray">Shift not started</Pill>,
    'inspected':   <Pill color="blue">Inspection done</Pill>,
    'on-trip':     <Pill color="green">On trip</Pill>,
    'returned':    <Pill color="gray">Shift complete</Pill>,
  }[shift]

  const shiftAlert = {
    'not-started': <Alert type="warn">Complete your daily inspection before checking out this vehicle.</Alert>,
    'inspected':   <Alert type="ok">Inspection passed. You can check out the vehicle now.</Alert>,
    'on-trip':     <Alert type="info">Checked out · Odometer {odoOut ? `${Number(odoOut).toLocaleString()} km` : 'recorded'}. Remember to check in at the end of your shift.</Alert>,
    'returned':    <Alert type="ok">Shift closed. Everything has been submitted — well done.</Alert>,
  }[shift]

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* Top bar */}
      <header className="bg-navy text-white pt-safe">
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <div>
            <div className="text-[17px] font-bold tracking-[-0.2px]">
              {greeting()}, {firstName(driver?.new_driverfullname ?? account?.name, account?.username)}
            </div>
            <div className="text-[11.5px] text-[#8FA8D4] mt-0.5">{today()}</div>
          </div>
          <button className="relative p-2 rounded-xl text-[#B9C8E4] hover:bg-white/10 transition-colors">
            <IconBell />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F04438] border-2 border-navy" />
          </button>
        </div>
        <div className="h-1 bg-fleet-blue" />
      </header>

      {loading && <Spinner />}

      {error && (
        <div className="m-4 p-4 bg-[#FDE7E9] border border-[#C42D3A]/20 text-[#C42D3A] rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {!loading && !error && (
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {/* Vehicle card */}
        <div className="relative bg-navy text-white rounded-[14px] p-4 overflow-hidden">
          <div className="absolute -right-7 -bottom-7 w-32 h-32 rounded-full bg-fleet-blue/20" />
          <div className="text-[10.5px] font-bold tracking-[0.5px] uppercase text-[#8FA8D4] mb-1">
            Your assigned vehicle
          </div>
          <div className="text-[19px] font-bold tracking-tight mb-3">
            {vehicle ? `${vehicleName} · ${vehicleReg}` : 'No vehicle assigned'}
          </div>
          <div className="flex flex-wrap gap-2 relative z-10">
            {shiftPill}
            {vehicle && <Pill color="amber">Disk expires {diskExpiry}</Pill>}
          </div>
        </div>

        {/* Shift status alert */}
        {shiftAlert}

        {/* Action tiles 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          <Tile
            icon={<IconClip />}
            title="Daily inspection"
            sub={shift !== 'not-started' ? 'Completed today' : 'Before every shift'}
            badge={shift === 'not-started' ? 'DUE' : undefined}
            done={shift !== 'not-started'}
            onClick={() => navigate('/inspection')}
          />
          {shift === 'on-trip' ? (
            <Tile icon={<IconKey />} title="Check in" sub="End your trip" onClick={() => navigate('/checkinout')} />
          ) : (
            <Tile
              icon={<IconKey />}
              title="Check out"
              sub={shift === 'inspected' ? 'Log odometer' : 'Inspection first'}
              disabled={shift !== 'inspected'}
              onClick={() => navigate('/checkinout')}
            />
          )}
          <Tile icon={<IconCam />} title="Report incident" sub="With photos" onClick={() => navigate('/incident')} />
          <Tile icon={<IconFuel />} title="Fuel &amp; mileage" sub="Capture refuel" onClick={() => navigate('/fuel')} />
        </div>

        {/* Defect — full-width */}
        <Tile icon={<IconWrench />} title="Log a defect" sub="Something not working right" onClick={() => navigate('/defects')} wide />

        {/* Next service info */}
        {vehicle && (
          <div className="bg-white border-[1.5px] border-fleet-line rounded-[13px] p-4 flex justify-around text-center divide-x divide-fleet-line">
            {lastService?.new_nextservicemileage && (
              <div className="flex-1 px-4">
                <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3">Next service</div>
                <div className="text-[17px] font-bold text-navy font-mono mt-0.5">
                  {lastService.new_nextservicemileage.toLocaleString()}
                </div>
                <div className="text-[10px] text-fleet-ink-3">km</div>
              </div>
            )}
            {lastService?.new_nextservicedate && (
              <div className="flex-1 pl-4">
                <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3">Service due</div>
                <div className="text-[13px] font-bold text-navy mt-0.5">
                  {new Date(lastService.new_nextservicedate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-[10px] text-fleet-ink-3">
                  {new Date(lastService.new_nextservicedate).getFullYear()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
