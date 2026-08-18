import { Configuration, LogLevel } from '@azure/msal-browser'
import { Capacitor } from '@capacitor/core'

// On native, MSAL redirects back via the custom URL scheme registered in Azure AD.
// On web, it redirects to the origin as before.
function getRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    // Must match the URI registered in Azure AD > Authentication > Mobile and desktop apps
    return 'msauth.com.brilliware.monabofleet.driver://auth'
  }
  return import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin
}

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: getRedirectUri(),
    postLogoutRedirectUri: getRedirectUri(),
    // Must be false on native: there is no browser history to navigate back to
    // after the redirect completes inside the native WebView.
    navigateToLoginRequestUrl: !Capacitor.isNativePlatform(),
  },
  cache: {
    // localStorage survives app suspension/restart on iOS; sessionStorage does not.
    cacheLocation: Capacitor.isNativePlatform() ? 'localStorage' : 'sessionStorage',
    // Cookie only needed for iOS Safari in the web build (not native WebView).
    storeAuthStateInCookie: !Capacitor.isNativePlatform(),
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:   console.error(message); break
          case LogLevel.Warning: console.warn(message);  break
          case LogLevel.Info:    console.info(message);  break
          case LogLevel.Verbose: console.debug(message); break
        }
      },
    },
  },
}

export const dataverseScopes = [
  import.meta.env.VITE_DATAVERSE_SCOPE || 'https://yourorg.crm.dynamics.com/user_impersonation'
]

export const loginRequest = {
  scopes: ['openid', 'profile', ...dataverseScopes]
}
