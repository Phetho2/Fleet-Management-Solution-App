import { useNavigate } from 'react-router-dom'
import { useShift } from '../../context/ShiftContext'

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

function Pill({ color, children }: { color: 'green' | 'amber' | 'gray'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-[#DFF5E8] text-[#0B7A45]',
    amber: 'bg-[#FEF1DC] text-[#B0700B]',
    gray:  'bg-[#E9EEF5] text-[#4A5568]',
  }[color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
      {color !== 'gray' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
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
}
function TaskItem({ icon, title, sub, tag, onClick }: TaskItemProps) {
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
      {tag}
    </button>
  )
}

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

export function TodayPage() {
  const { shift } = useShift()
  const navigate = useNavigate()

  const inspected = shift !== 'not-started'
  const checkedOut = shift === 'on-trip' || shift === 'returned'
  const checkedIn = shift === 'returned'

  const done = (v: boolean) => <Pill color={v ? 'green' : 'amber'}>{v ? 'Done' : 'To do'}</Pill>

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <PageHeader title="Today" sub="What needs doing before you drive" />

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {/* Info banner */}
        <div className="flex gap-2.5 p-3 rounded-xl text-sm font-semibold leading-snug bg-[#EAF2FE] text-[#0A57C2]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>
          </svg>
          Your shift checklist resets every morning at 04:00.
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
            onClick={() => !inspected && navigate('/inspection')}
          />
          <TaskItem
            icon={<IconKey />}
            title="Check out vehicle"
            sub="Log odometer and trip purpose"
            tag={done(checkedOut)}
            onClick={() => inspected && !checkedOut ? navigate('/checkinout') : undefined}
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
            tag={<Pill color="gray">Optional</Pill>}
            onClick={() => navigate('/fuel')}
          />
          <TaskItem
            icon={<IconCam />}
            title="Report an incident"
            sub="Only if something happens"
            tag={<Pill color="gray">As needed</Pill>}
            onClick={() => navigate('/incident')}
          />
        </div>

        {/* End of shift */}
        <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mt-1">
          End of shift
        </div>
        <div className="space-y-2">
          <TaskItem
            icon={<IconKey />}
            title="Check in vehicle"
            sub="Closing odometer and condition"
            tag={done(checkedIn)}
            onClick={() => shift === 'on-trip' ? navigate('/checkinout') : undefined}
          />
        </div>
      </div>
    </div>
  )
}
