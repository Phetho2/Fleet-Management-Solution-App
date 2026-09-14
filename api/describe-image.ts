import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyCaller, setCorsHeaders } from './_lib/auth'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BASE64_LENGTH = 8_000_000 // ~6MB image, comfortably under Vercel's request body limit

// Kept short for both contexts — the defect field has a hard 100-char limit in
// Dataverse, and a concise incident description is more useful to prefill
// than a long one anyway (the driver can always expand on it).
const DESCRIPTION_TARGET_LENGTH = 100

const PROMPTS = {
  defect:
    'You are assisting a fleet maintenance driver logging a vehicle defect. ' +
    'Describe any visible damage, wear, or mechanical issues in this photo in one short, ' +
    `plain-language sentence of no more than ${DESCRIPTION_TARGET_LENGTH} characters, suitable to prefill a ` +
    'defect report field with a hard length limit. If the vehicle or part shown looks fine with no ' +
    'visible issues, say so plainly instead of guessing at a defect. Only describe what is visibly ' +
    'in the photo — do not speculate about cause or severity. Reply with only the description, ' +
    'no preamble.',
  incident:
    'You are assisting a driver filling in an accident/incident report for a fleet vehicle. ' +
    'Describe what is visibly shown in this photo — vehicle damage, its location/severity, road or ' +
    'scene conditions, position of vehicles involved — in 1-2 concise, plain-language sentences suitable ' +
    'to prefill the report\'s description field. Only describe what is visibly in the photo — do not ' +
    'guess at fault, cause, or anything not directly visible. Reply with only the description, no preamble.',
  inspection:
    'You are assisting a fleet driver completing a vehicle inspection checklist. Assess only what is ' +
    'actually visible in this single photo. Respond with ONLY a single JSON object — no markdown fences, ' +
    'no explanation before or after it — in exactly this shape: {"exteriorCondition": "Good"|"Fair"|"Poor"|null, ' +
    '"interiorCondition": "Good"|"Fair"|"Poor"|null, "comments": string|null, "isNeat": true|false|null}. ' +
    'Set "exteriorCondition" only if the vehicle\'s exterior (body, paint, tyres, lights) is visible in the ' +
    'photo, otherwise null. Set "interiorCondition" only if the cabin/seats/dashboard are visible, otherwise ' +
    'null. "comments" is a short plain-language note (under 100 characters) on anything notable — dirt, wear, ' +
    'damage — or null if there is nothing worth flagging. "isNeat" reflects whether the vehicle looks tidy ' +
    'and well kept overall in this photo, or null if you cannot judge that from what is shown. Do not guess ' +
    'about parts of the vehicle that are not visible in the photo.',
} as const

type DescribeContext = keyof typeof PROMPTS

function isDescribeContext(value: unknown): value is DescribeContext {
  return value === 'defect' || value === 'incident' || value === 'inspection'
}

const CONDITION_VALUES = new Set(['Good', 'Fair', 'Poor'])

export interface InspectionAssessment {
  exteriorCondition: 'Good' | 'Fair' | 'Poor' | null
  interiorCondition: 'Good' | 'Fair' | 'Poor' | null
  comments: string | null
  isNeat: boolean | null
}

function isInspectionAssessment(v: unknown): v is InspectionAssessment {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const okCondition = (x: unknown) => x === null || CONDITION_VALUES.has(x as string)
  const okComments = o.comments === null || typeof o.comments === 'string'
  const okNeat = o.isNeat === null || typeof o.isNeat === 'boolean'
  return okCondition(o.exteriorCondition) && okCondition(o.interiorCondition) && okComments && okNeat
}

/** Strips optional markdown code fences and parses the remaining text as JSON. */
function extractJson(text: string): unknown | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    try { return JSON.parse(match[0]) } catch { return null }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
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

  const { image, mimeType, context } = req.body ?? {}
  if (typeof image !== 'string' || typeof mimeType !== 'string') {
    res.status(400).json({ error: 'Missing image or mimeType' })
    return
  }
  const promptContext: DescribeContext = isDescribeContext(context) ? context : 'defect'
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
            { type: 'text', text: PROMPTS[promptContext] },
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
    const text = data?.content?.[0]?.text?.trim()
    if (!text) {
      res.status(502).json({ error: 'No response returned' })
      return
    }

    if (promptContext === 'inspection') {
      const parsed = extractJson(text)
      if (!isInspectionAssessment(parsed)) {
        res.status(502).json({ error: 'Could not parse inspection assessment' })
        return
      }
      res.status(200).json({ result: parsed })
      return
    }

    res.status(200).json({ description: text })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Request to Anthropic failed' })
  }
}
