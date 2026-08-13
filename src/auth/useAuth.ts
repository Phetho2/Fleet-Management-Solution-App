import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './msalConfig'

export function useAuth() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0] ?? null

  const login = () => instance.loginRedirect(loginRequest)
  const logout = () => instance.logoutRedirect({ account })

  return { isAuthenticated, account, login, logout, instance }
}
