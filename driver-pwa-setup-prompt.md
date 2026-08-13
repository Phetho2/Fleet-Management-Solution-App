# Setup Prompt: Driver Fleet PWA — Dev Environment

Paste this into Claude Code (or another coding agent) in an empty project folder.

---

## Prompt

I'm building a Progressive Web App (PWA) for fleet drivers that must install cleanly on both iOS and Android via "Add to Home Screen" — no React Native, no native builds. It authenticates against Microsoft Entra ID and reads/writes data in Microsoft Dataverse. Set up a working local dev environment I can run immediately, covering the six features below (scaffold each as a route/page with a basic form — don't build full business logic yet, just prove the plumbing works end-to-end).

### Tech stack
- **Framework**: React + TypeScript, bundled with Vite (fast dev server, easy PWA plugin support)
- **Auth**: `@azure/msal-browser` + `@azure/msal-react` for Entra ID (Authorization Code flow with PKCE — required for SPAs, no client secret)
- **Data**: Dataverse Web API (OData/REST) called directly via `fetch`, using the MSAL-acquired access token as the bearer token
- **PWA**: `vite-plugin-pwa` for manifest + service worker, configured for `autoUpdate` and offline caching of the app shell
- **Styling**: Tailwind CSS, mobile-first
- **Routing**: React Router, with each driver feature as its own route

### Project structure to scaffold
```
/src
  /auth        → msalConfig.ts, MsalProvider setup, login/logout hooks
  /api         → dataverseClient.ts (fetch wrapper with auth header, base URL from env)
  /features
    /inspection     → daily vehicle inspection checklist form
    /checkinout     → vehicle check-in/check-out screen
    /incident       → incident/accident report form + photo capture
    /defects        → defect/maintenance issue logging form
    /fuel           → fuel and mileage capture form
    /acknowledgement → digital acknowledgement/signature capture
  /components  → shared UI (CameraCapture, SignaturePad, FormShell)
  /types       → Dataverse entity TypeScript interfaces (stub these, I'll refine schema separately)
  App.tsx, main.tsx
/public
  manifest config handled by vite-plugin-pwa (icons, name, theme color)
.env.example
```

### Specific implementation requirements

1. **MSAL setup**
   - Config driven entirely by environment variables: `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_REDIRECT_URI`
   - Use `PublicClientApplication` with `loginRedirect` (more reliable on mobile Safari than popup flow)
   - Request the Dataverse API scope (`https://<org>.crm.dynamics.com/user_impersonation` — make this an env var too since org URL varies) at login, not just `openid`/`profile`
   - Wrap the app in `MsalProvider`, gate all routes behind an `AuthenticatedTemplate`

2. **Dataverse client**
   - A single typed client that acquires a token silently via `acquireTokenSilent` (falling back to redirect if it fails), then calls the Dataverse Web API (`/api/data/v9.2/...`)
   - Generic `create`, `update`, `retrieve` functions I can point at any entity/table name
   - Read the org base URL from `VITE_DATAVERSE_URL`

3. **Camera capture component**
   - Use `getUserMedia` for the live preview and capture, NOT a plain `<input type="file" capture>` fallback-only approach — but include the file-input fallback for browsers where getUserMedia isn't available
   - Build this as its own full-page route, not a modal, to avoid the known iOS Safari PWA bug where the camera stream drops on in-SPA route changes
   - On capture, produce a Blob ready to attach to a Dataverse record (image column or related Note/annotation)

4. **Signature/acknowledgement capture**
   - Simple canvas-based pen input component (a lightweight signature-pad approach), exporting to a base64 PNG for submission

5. **PWA config**
   - `vite-plugin-pwa` with a manifest: standalone display mode, portrait orientation, a placeholder icon set (192/512px), theme color
   - Precache the app shell; runtime-cache Dataverse GET calls with a network-first strategy so recently-viewed data is available offline
   - Confirm the manifest and service worker work correctly when the app is served over HTTPS (required for both install and camera access)

6. **Local HTTPS**
   - Configure Vite's dev server with a locally-trusted cert (e.g. via `mkcert` or `@vitejs/plugin-basic-ssl`) since Entra ID redirect URIs and camera access both require HTTPS, even in local dev
   - Document the steps to trust the cert on a phone so I can test installs on real iOS/Android devices over the local network, not just desktop

### Deliverables from this setup
- `README.md` with: prerequisites, how to fill in `.env`, how to register the app in Entra ID (redirect URI, required API permissions for Dataverse), how to run `npm run dev`, and how to test the install-to-home-screen flow on a physical phone over local network HTTPS
- App should run with `npm install && npm run dev` and show a login screen, then after Entra ID login, six placeholder routes/nav items for the driver features listed above, each with a minimal working form that successfully writes a test record to Dataverse (I'll give you table/column names once the schema is finalized — use guessable stub names for now)

Ask me for my Entra ID tenant ID, client ID, and Dataverse org URL if you need them to fill in `.env.example` — otherwise leave placeholders.
