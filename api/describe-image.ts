import type { VercelRequest, VercelResponse } from '@vercel/node'
import { jwtVerify, createRemoteJWKSet } from 'jose'

// Reuses the same tenant ID the client already has configured for MSAL —
// it's not secret, and this way there's no new env var to set up just for this.
const TENANT_ID = process.env.VITE_ENTRA_TENANT_ID ?? ''
const JWKS = TENANT_ID
  ? createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`))
  : null

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BASE64_LENGTH = 8_000_000 // ~6MB image, comfortably under Vercel's request body limit

const PROMPT =
  'You are assisting a fleet maintenance driver logging a vehicle defect. ' +
  'Describe any visible damage, wear, or mechanical issues in this photo in 1-2 concise, ' +
  'plain-language sentences suitable to prefill a defect report. If the vehicle or part shown ' +
  'looks fine with no visible issues, say so plainly instead of guessing at a defect. ' +
  'Only describe what is visibly in the photo — do not speculate about cause or severity.'

/**
 * Confirms the caller has a valid, unexpired token issued by this org's own
 * Entra ID tenant — the same delegated token already used for Dataverse
 * calls, reused here purely as proof of authentication. This blocks random
 * internet traffic from burning paid API credits on this endpoint; it does
 * not check token audience/scope, since the token was minted for Dataverse.
 */
async function verifyCaller(authHeader: string | undefined): Promise<void> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await verifyCaller(req.headers.authorization)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { image, mimeType } = req.body ?? {}
  if (typeof image !== 'string' || typeof mimeType !== 'string') {
    res.status(400).json({ error: 'Missing image or mimeType' })
    return
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: 'Unsupported image type' })
    return
  }
  if (image.length > MAX_BASE64_LENGTH) {
    res.status(400).json({ error: 'Image too large' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY' })
    return
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      res.status(502).json({ error: `Anthropic API error: ${errText.slice(0, 300)}` })
      return
    }

    const data = await anthropicRes.json()
    const description = data?.content?.[0]?.text?.trim()
    if (!description) {
      res.status(502).json({ error: 'No description returned' })
      return
    }

    res.status(200).json({ description })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Request to Anthropic failed' })
  }
}
