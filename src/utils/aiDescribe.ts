import { blobToBase64 } from '../api/dataverseClient'

// Must be an absolute URL, not a relative path: the native Capacitor app
// bundles dist/ and serves it from a local capacitor:// origin, so a
// relative fetch('/api/...') would resolve against that fake local origin
// instead of the deployed Vercel app and fail silently.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

/**
 * Sends a photo to the /api/describe-image serverless function for an
 * AI-generated description (used to prefill defect/incident text fields).
 * `context` selects the prompt used server-side — 'defect' for a vehicle
 * defect/maintenance issue, 'incident' for an accident/incident report.
 * Never throws — resolves null on any failure so it never blocks the form;
 * this is a convenience suggestion, not a required step.
 */
export async function describeImage(
  blob: Blob,
  authToken: string,
  context: 'defect' | 'incident' = 'defect'
): Promise<string | null> {
  try {
    const image = await blobToBase64(blob)
    const res = await fetch(`${API_BASE_URL}/api/describe-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ image, mimeType: blob.type || 'image/jpeg', context }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.description === 'string' ? data.description : null
  } catch {
    return null
  }
}

export interface InspectionAssessment {
  exteriorCondition: 'Good' | 'Fair' | 'Poor' | null
  interiorCondition: 'Good' | 'Fair' | 'Poor' | null
  comments: string | null
  isNeat: boolean | null
}

/**
 * Sends a vehicle inspection photo for an AI condition assessment — only
 * fills in whichever fields are actually visible in the photo (e.g. an
 * exterior shot won't set interiorCondition). Never throws — resolves null
 * on any failure so it never blocks the form.
 */
export async function assessInspectionPhoto(blob: Blob, authToken: string): Promise<InspectionAssessment | null> {
  try {
    const image = await blobToBase64(blob)
    const res = await fetch(`${API_BASE_URL}/api/describe-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ image, mimeType: blob.type || 'image/jpeg', context: 'inspection' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.result ?? null
  } catch {
    return null
  }
}
