import { blobToBase64 } from '../api/dataverseClient'

/**
 * Sends a photo to the /api/describe-image serverless function for an
 * AI-generated description (used to prefill defect/incident text fields).
 * Never throws — resolves null on any failure so it never blocks the form;
 * this is a convenience suggestion, not a required step.
 */
export async function describeImage(blob: Blob, authToken: string): Promise<string | null> {
  try {
    const image = await blobToBase64(blob)
    const res = await fetch('/api/describe-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ image, mimeType: blob.type || 'image/jpeg' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.description === 'string' ? data.description : null
  } catch {
    return null
  }
}
