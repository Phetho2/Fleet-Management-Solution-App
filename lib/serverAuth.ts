import type { VercelResponse } from '@vercel/node'
import { jwtVerify, createRemoteJWKSet } from 'jose'

// Reuses the same tenant ID the client already has configured for MSAL —
// it's not secret, and this way there's no new env var to set up just for it.
const TENANT_ID = process.env.VITE_ENTRA_TENANT_ID ?? ''
const JWKS = TENANT_ID
  ? createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`))
  : null

/**
 * Confirms the caller has a valid, unexpired token issued by this org's own
 * Entra ID tenant — the same delegated token already used for Dataverse
 * calls, reused here purely as proof of authentication. This blocks random
 * internet traffic from burning paid API credits on these endpoints; it does
 * not check token audience/scope, since the token was minted for Dataverse.
 */
export async function verifyCaller(authHeader: string | undefined): Promise<void> {
  if (!JWKS) throw new Error('Server not configured with a tenant ID')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token')
  const token = authHeader.slice('Bearer '.length)
  await jwtVerify(token, JWKS, {
    issuer: [
      `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      `https://sts.windows.net/${TENANT_ID}/`,
    ],
  })
}

/**
 * Sets the CORS headers every one of these endpoints needs: the native
 * Capacitor app bundles dist/ and serves it from a local capacitor://localhost
 * (iOS) / https://localhost (Android) origin — always cross-origin from this
 * Vercel deployment, even though the PWA/web build calls it same-origin and
 * wouldn't need this itself.
 */
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}
