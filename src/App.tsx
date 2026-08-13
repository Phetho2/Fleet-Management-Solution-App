import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react'
import { useAuth } from './auth/useAuth'

import { DashboardPage } from './features/dashboard/DashboardPage'
import { TodayPage }     from './features/today/TodayPage'
import { ActivityPage }  from './features/activity/ActivityPage'
import { ProfilePage }   from './features/profile/ProfilePage'

import { InspectionPage }     from './features/inspection/InspectionPage'
import { CheckInOutPage }     from './features/checkinout/CheckInOutPage'
import { IncidentPage }       from './features/incident/IncidentPage'
import { DefectsPage }        from './features/defects/DefectsPage'
import { FuelPage }           from './features/fuel/FuelPage'
import { AcknowledgementPage} from './features/acknowledgement/AcknowledgementPage'

/* ── Icons ──────────────────────────────────────────────── */
function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>
    </svg>
  )
}
function IconTasks({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2z"/>
      <path d="M9 12.5l2 2 4-4"/>
    </svg>
  )
}
function IconActivity({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>
    </svg>
  )
}
function IconUser({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round">
      <circle cx="12" cy="9" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>
    </svg>
  )
}

/* ── Bottom tab bar ─────────────────────────────────────── */
const TAB_PATHS = ['/', '/today', '/activity', '/profile']

function AppNav() {
  const location = useLocation()
  const onTab = TAB_PATHS.includes(location.pathname)
  if (!onTab) return null

  const tabs = [
    { to: '/',         label: 'Home',     Icon: IconHome },
    { to: '/today',    label: 'Today',    Icon: IconTasks },
    { to: '/activity', label: 'Activity', Icon: IconActivity },
    { to: '/profile',  label: 'Profile',  Icon: IconUser },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-fleet-line z-20 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10.5px] font-bold transition-colors ${
                isActive ? 'text-fleet-blue' : 'text-fleet-ink-3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/* ── Login screen ───────────────────────────────────────── */
function LoginScreen() {
  const { login } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-8 gap-8"
      style={{ background: 'linear-gradient(168deg, #0C1A3D, #122350 55%, #1B3268)' }}>
      <div className="text-center space-y-3">
        <div className="w-20 h-20 mx-auto mb-2">
          <svg viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="white" strokeWidth="3"/>
            <path d="M40 18c-8 0-14 6.5-14 14 0 5 2.5 8.5 5 11 1.5 1.5 2.2 3 2.2 4.7v1.5h13.6v-1.5c0-1.7.7-3.2 2.2-4.7 2.5-2.5 5-6 5-11 0-7.5-6-14-14-14z" fill="#F5B301"/>
            <rect x="33.5" y="51" width="13" height="4" rx="2" fill="white"/>
            <rect x="35.5" y="56.5" width="9" height="3.5" rx="1.75" fill="white"/>
          </svg>
        </div>
        <div className="text-[22px] font-extrabold tracking-tight">Brilliware</div>
        <div className="text-[10px] font-bold tracking-[2px] text-[#F5B301]">IDEATE · CREATE · INNOVATE</div>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Monabo Fleet</h1>
        <p className="text-[#9FB4DA] text-sm leading-relaxed">
          Sign in with your Monabo work account<br />to start your shift.
        </p>
      </div>

      <button
        onClick={login}
        className="w-full max-w-sm bg-white text-[#1F1F1F] font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 23 23">
          <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
          <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
          <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
          <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
        </svg>
        Sign in with Microsoft
      </button>

      <div className="font-mono text-[10px] tracking-widest text-[#5E7099] mt-auto">
        SECURED BY MICROSOFT ENTRA ID
      </div>
    </div>
  )
}

/* ── App shell ──────────────────────────────────────────── */
function Shell() {
  const location = useLocation()
  const onTab = TAB_PATHS.includes(location.pathname)

  return (
    <div className={onTab ? 'pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))]' : ''}>
      <Routes>
        <Route path="/"          element={<DashboardPage />} />
        <Route path="/today"     element={<TodayPage />} />
        <Route path="/activity"  element={<ActivityPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/inspection" element={<InspectionPage />} />
        <Route path="/checkinout" element={<CheckInOutPage />} />
        <Route path="/incident"   element={<IncidentPage />} />
        <Route path="/defects"    element={<DefectsPage />} />
        <Route path="/fuel"       element={<FuelPage />} />
        <Route path="/ack"        element={<AcknowledgementPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
      <AppNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthenticatedTemplate>
        <Shell />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginScreen />
      </UnauthenticatedTemplate>
    </BrowserRouter>
  )
}
