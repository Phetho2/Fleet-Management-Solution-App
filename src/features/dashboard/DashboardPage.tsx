import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useShift } from '../../context/ShiftContext'
import { useDriver } from '../../context/DriverContext'
import { DashboardSkeleton } from '../../components/ui/Skeleton'

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

type TileColor = 'blue' | 'purple' | 'red' | 'amber' | 'teal'
const TILE_COLORS: Record<TileColor, { bg: string; fg: string }> = {
  blue:   { bg: '#EAF2FE', fg: '#0A57C2' },
  purple: { bg: '#F1EAFE', fg: '#7C3AED' },
  red:    { bg: '#FDE7E9', fg: '#C42D3A' },
  amber:  { bg: '#FEF1DC', fg: '#B0700B' },
  teal:   { bg: '#DFF5F2', fg: '#0F8A7A' },
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
  color?: TileColor
}
function Tile({ icon, title, sub, badge, done, disabled, onClick, wide, color = 'blue' }: TileProps) {
  const base = wide
    ? 'flex items-center gap-3 p-4 w-full rounded-[13px] border-[1.5px] text-left transition-all active:scale-[.98]'
    : 'flex flex-col p-4 rounded-[13px] border-[1.5px] text-left transition-all active:scale-[.97] relative'
  const cardColor = done
    ? 'bg-[#DFF5E8] border-[#0B7A45]'
    : disabled
    ? 'bg-white border-[#E4E9F2] opacity-45 pointer-events-none'
    : 'bg-white border-fleet-line'

  const iconStyle = done
    ? { background: '#fff', color: '#0B7A45' }
    : { background: TILE_COLORS[color].bg, color: TILE_COLORS[color].fg }

  return (
    <button className={`${base} ${cardColor}`} onClick={onClick} disabled={disabled}>
      <div
        className={`grid place-items-center rounded-[12px] shrink-0 ${wide ? 'w-11 h-11' : 'w-11 h-11 mb-3'}`}
        style={iconStyle}
      >
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

/* ── Icons ── friendly duotone glyphs (filled base + bold accent), native app-icon style ── */
const IconClip = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4.5" y="3.5" width="15" height="18" rx="3.5" fill="currentColor" fillOpacity="0.16"/>
    <rect x="8.5" y="2" width="7" height="4" rx="1.5" fill="currentColor"/>
    <path d="M8.3 12.7l2.2 2.2 4.6-4.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconKey = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="8" cy="15" r="5" fill="currentColor" fillOpacity="0.16"/>
    <circle cx="8" cy="15" r="2.2" fill="currentColor"/>
    <path d="M11.3 11.8L20 3.1M17 6l2.6 2.6M14.3 8.7l2.3 2.3"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconCam = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2.5" y="6.5" width="19" height="13" rx="3" fill="currentColor" fillOpacity="0.16"/>
    <path d="M8.3 6.5l1.2-1.9A1.8 1.8 0 0 1 11 3.7h2a1.8 1.8 0 0 1 1.5.9l1.2 1.9"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2.2"/>
    <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
  </svg>
)
const IconFuel = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="3.5" width="10" height="17" rx="2" fill="currentColor" fillOpacity="0.16"/>
    <rect x="6" y="6" width="5" height="4.5" rx="1" fill="currentColor"/>
    <path d="M3 20.5h11.5M14.5 10h2.3a2 2 0 0 1 2 2v4.7a1.6 1.6 0 0 0 3.2 0V9.7L19.3 7"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconWrench = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.16"/>
    <path d="M14.7 5.8a5 5 0 0 0-6.1 6.4l-5.3 5.3a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.1l-2.9 2.9-2.3-.6-.6-2.3 2.5-2.6Z"
      fill="currentColor"/>
  </svg>
)
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a1 1 0 0 1 1 1v1.1A6.5 6.5 0 0 1 18.5 10.5c0 4 1.1 5.4 2.1 6.1a1 1 0 0 1-.6 1.8H4a1 1 0 0 1-.6-1.8c1-.7 2.1-2.1 2.1-6.1A6.5 6.5 0 0 1 11 4.1V3a1 1 0 0 1 1-1Z"/>
    <path d="M9.3 20a2.7 2.7 0 0 0 5.4 0h-5.4Z"/>
  </svg>
)

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
    'checked-in':  <Pill color="blue">Signed in</Pill>,
    'on-trip':     <Pill color="green">On trip</Pill>,
    'returned':    <Pill color="gray">Shift complete</Pill>,
  }[shift]

  const shiftAlert = {
    'not-started': <Alert type="warn">Complete your daily inspection before you can sign in.</Alert>,
    'inspected':   <Alert type="info">Inspection done. Sign in to the vehicle to start your shift.</Alert>,
    'checked-in':  <Alert type="ok">Signed in. Log your odometer and purpose of trip to check out.</Alert>,
    'on-trip':     <Alert type="info">Vehicle checked out at {odoOut ? `${Number(odoOut).toLocaleString()} km` : '—'}. Tap <strong>Check in</strong> when you are back.</Alert>,
    'returned':    <Alert type="ok">Checked in. Your trip record has been closed — well done.</Alert>,
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

      {loading && <DashboardSkeleton />}

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
          {/* Inspection */}
          <Tile
            icon={<IconClip />}
            title="Daily inspection"
            sub={shift !== 'not-started' ? 'Completed today' : 'Before every shift'}
            badge={shift === 'not-started' ? 'DUE' : undefined}
            done={shift !== 'not-started'}
            onClick={() => navigate('/inspection')}
            color="blue"
          />

          {/* Sign-in */}
          <Tile
            icon={<IconKey />}
            title="Sign in"
            sub={
              shift === 'not-started'  ? 'Inspection first' :
              shift === 'inspected'    ? 'Sign in to vehicle' :
              'Signed in'
            }
            done={['checked-in', 'on-trip', 'returned'].includes(shift)}
            disabled={shift === 'not-started'}
            onClick={() => navigate('/checkin')}
            color="purple"
          />

          {/* Check-out / Check-in vehicle */}
          {shift === 'on-trip' ? (
            <Tile
              icon={<IconKey />}
              title="Check in"
              sub="Log closing odometer & condition"
              onClick={() => navigate('/checkinout')}
              color="purple"
            />
          ) : (
            <Tile
              icon={<IconKey />}
              title="Check out"
              sub={
                shift === 'checked-in' ? 'Log odometer & purpose' :
                shift === 'returned'   ? 'Checked in' :
                'Sign in first'
              }
              done={shift === 'returned'}
              disabled={shift !== 'checked-in'}
              onClick={() => navigate('/checkinout')}
              color="purple"
            />
          )}

          {/* Incident */}
          <Tile icon={<IconCam />} title="Report incident" sub="With photos" onClick={() => navigate('/incident')} color="red" />
        </div>

        {/* Fuel — full-width */}
        <Tile icon={<IconFuel />} title="Fuel &amp; mileage" sub="Capture refuel" onClick={() => navigate('/fuel')} wide color="amber" />

        {/* Defect — full-width */}
        <Tile icon={<IconWrench />} title="Log a defect" sub="Something not working right" onClick={() => navigate('/defects')} wide color="teal" />

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
