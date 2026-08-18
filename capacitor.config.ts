import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.brilliware.monabofleet.driver',
  appName: 'Fleet Driver',
  webDir: 'dist',

  server: {
    // Makes MSAL cookies and session storage work correctly on Android.
    // Without this, the WebView runs on capacitor:// (non-secure origin)
    // and MSAL's storeAuthStateInCookie silently no-ops.
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0C1A3D',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#122350',
    },
  },
}

export default config
