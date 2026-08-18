import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { AuthProvider, msalInstance } from './auth/AuthProvider'
import { DriverProvider } from './context/DriverContext'
import { ShiftProvider } from './context/ShiftContext'
import App from './App'
import './index.css'

// On native, the OS re-activates the app via the custom URL scheme after
// AAD completes the redirect (msauth.com.brilliware.monabofleet.driver://auth).
// We update window.location so that MSAL's handleRedirectPromise (called inside
// MsalProvider on mount) can find and process the auth code/token in the URL.
// This listener must be registered before createRoot so it fires before MsalProvider mounts.
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', ({ url }) => {
    if (url.includes('msauth')) {
      window.history.replaceState(null, '', url)
      // MsalProvider already called handleRedirectPromise() on mount before this
      // event fired. Re-trigger it now that the URL contains the auth code.
      msalInstance.handleRedirectPromise().catch(console.error)
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DriverProvider>
        <ShiftProvider>
          <App />
        </ShiftProvider>
      </DriverProvider>
    </AuthProvider>
  </StrictMode>,
)
