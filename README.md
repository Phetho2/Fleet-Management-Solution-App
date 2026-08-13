# Fleet Driver PWA

A Progressive Web App for fleet drivers to capture inspections, check-in/out events, incidents, defects, fuel entries, and digital acknowledgements — backed by Microsoft Dataverse and secured via Microsoft Entra ID (Azure AD).

---

## Prerequisites

- **Node.js 18+** — [https://nodejs.org](https://nodejs.org)
- **npm 9+** (ships with Node 18)
- **HTTPS is required** for PWA features and camera access. The project uses `@vitejs/plugin-basic-ssl` to generate a self-signed certificate automatically — no extra tooling needed for local dev.
- Optional: **mkcert** if you want a locally-trusted certificate instead of accepting the browser warning each session. Install via `choco install mkcert` (Windows) and run `mkcert -install && mkcert localhost 127.0.0.1`.

---

## Entra ID App Registration

Follow these steps once to configure authentication:

1. Go to [https://portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**.
2. **Name**: `Fleet Driver PWA` (or any name you like).
3. **Supported account types**: Choose the appropriate option for your organisation (typically *Accounts in this organizational directory only*).
4. **Redirect URI**: Select **Single-page application (SPA)** and enter:
   ```
   https://localhost:5173
   ```
   Click **Register**.
5. From the **Overview** page, copy:
   - **Application (client) ID** → this is your `VITE_ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → this is your `VITE_ENTRA_TENANT_ID`
6. Go to **API permissions** → **Add a permission** → **Dynamics CRM** → **Delegated permissions** → tick `user_impersonation` → **Add permissions**.
7. Click **Grant admin consent for [your org]** and confirm. The status should show a green tick.
8. No client secret is needed — this app uses PKCE (public client flow).

---

## Environment Setup

```bash
# In the project root
cp .env.example .env
```

Edit `.env` and fill in the values copied from the App Registration:

```env
VITE_ENTRA_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ENTRA_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ENTRA_REDIRECT_URI=https://localhost:5173
VITE_DATAVERSE_URL=https://yourorg.crm.dynamics.com
VITE_DATAVERSE_SCOPE=https://yourorg.crm.dynamics.com/user_impersonation
```

Replace `yourorg` with your actual Dataverse/Power Platform environment subdomain.

---

## Running Locally

```bash
npm install
npm run dev
```

Open [https://localhost:5173](https://localhost:5173) in your browser.

**Trusting the self-signed certificate:**

- **Chrome / Edge**: Click *Advanced* → *Proceed to localhost (unsafe)*. You only need to do this once per browser session (or until the cert regenerates).
- **Firefox**: Click *Advanced* → *Accept the Risk and Continue*.
- **Safari**: macOS will prompt you to add the certificate to your Keychain; accept and trust it.

The PWA service worker is active even in dev mode (`devOptions.enabled: true` in `vite.config.ts`).

---

## Testing on a Physical Phone

To use the app on a phone connected to the same Wi-Fi network:

1. Find your computer's local IP address:
   - Windows: run `ipconfig` in Command Prompt, look for *IPv4 Address* (e.g. `192.168.1.42`).
2. Update your `.env`:
   ```env
   VITE_ENTRA_REDIRECT_URI=https://192.168.1.42:5173
   ```
3. Add that same URI to your Entra ID App Registration:
   - Portal → App registrations → your app → **Authentication** → **Add URI** → enter `https://192.168.1.42:5173` → Save.
4. Restart the dev server (`npm run dev`).
5. On your phone, navigate to `https://192.168.1.42:5173`.
6. Accept the certificate warning (procedure varies by browser/OS — look for "Advanced" or "Details").

---

## Install to Home Screen (PWA)

### iOS (Safari)
1. Open the app URL in **Safari** (must be Safari — other browsers on iOS cannot install PWAs).
2. Tap the **Share** button (box with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name and tap **Add**.

### Android (Chrome / Edge)
1. Open the app URL in **Chrome** or **Edge**.
2. Tap the browser menu (three dots).
3. Select **Add to Home Screen** or **Install App**.
4. Tap **Install** / **Add**.

The app will launch in standalone mode (no browser chrome) from the home screen icon.

---

## Dataverse Table Setup

The app uses the following custom Dataverse tables (entities). You must create these in your Power Platform environment before the API calls will succeed. The logical names used in the code are:

| Feature | Entity Logical Name | Display Name suggestion |
|---|---|---|
| Vehicle Inspection | `bwl_vehicleinspections` | Vehicle Inspections |
| Check In / Out | `bwl_vehiclecheckinouts` | Vehicle Check In/Out |
| Incident Report | `bwl_incidentreports` | Incident Reports |
| Defect Report | `bwl_defectreports` | Defect Reports |
| Fuel Entry | `bwl_fuelentries` | Fuel Entries |
| Acknowledgement | `bwl_acknowledgements` | Acknowledgements |

Column names are defined as stub interfaces in `src/types/dataverse.ts`. Adjust the `bwl_` prefixed column names to match your actual publisher prefix and column schema names in Dataverse.

**Tip:** Use the [Power Apps Maker portal](https://make.powerapps.com) → **Tables** → **New table** to create the tables, then update the column names in `src/types/dataverse.ts` accordingly.

---

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder. Deploy to any static hosting provider (Azure Static Web Apps, Vercel, Netlify, etc.) — ensure the host serves over HTTPS and is configured to redirect all paths to `index.html` for client-side routing.

Add the production URL as an additional Redirect URI in your Entra ID App Registration.

---

## Project Structure

```
src/
  auth/
    msalConfig.ts       MSAL configuration and scope definitions
    AuthProvider.tsx    Wraps the app with MsalProvider
    useAuth.ts          Hook: login, logout, account, isAuthenticated
  api/
    dataverseClient.ts  Fetch wrapper with silent token acquisition
  features/
    inspection/         Daily vehicle inspection checklist
    checkinout/         Vehicle check-in and check-out with odometer
    incident/           Incident report with camera photo capture
    defects/            Defect / maintenance issue logging
    fuel/               Fuel and mileage capture form
    acknowledgement/    Digital signature acknowledgement
  components/
    FormShell.tsx       Reusable form layout with header, error/success banners
    CameraCapture.tsx   Camera/file-picker component for photo evidence
    SignaturePad.tsx    Canvas-based touch signature component
  types/
    dataverse.ts        TypeScript interfaces for Dataverse entities
  App.tsx               Router, nav bar, auth-gated layout
  main.tsx              React entry point
  index.css             Tailwind directives + safe-area utilities
```
