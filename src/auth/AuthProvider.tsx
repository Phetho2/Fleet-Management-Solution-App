import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { ReactNode } from 'react'
import { msalConfig } from './msalConfig'

const msalInstance = new PublicClientApplication(msalConfig)

export function AuthProvider({ children }: { children: ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>
}
