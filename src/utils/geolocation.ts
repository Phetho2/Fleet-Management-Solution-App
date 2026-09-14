export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
}

/**
 * Above this accuracy radius (meters), a fix is almost certainly IP/network-based
 * rather than a real GPS reading (common on laptops with no GPS hardware) and can
 * be off by an entire city — treat it as unreliable rather than showing it as-is.
 */
export const LOW_ACCURACY_THRESHOLD_M = 1000

export function isLowAccuracy(pos: GeoPosition): boolean {
  return pos.accuracy > LOW_ACCURACY_THRESHOLD_M
}

/**
 * Resolves a coordinate to a short human-readable place name via
 * OpenStreetMap's Nominatim (free, no API key). Never rejects — resolves
 * null on any failure/timeout so it never blocks the UI or a submission.
 */
export async function reverseGeocode(lat: number, lng: number, timeoutMs = 6000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = data.address ?? {}
    const line = [
      a.road,
      a.suburb ?? a.neighbourhood,
      a.city ?? a.town ?? a.village,
    ].filter(Boolean).join(', ')
    return line || data.display_name || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolves with the driver's current position, or null if location is
 * unsupported, permission is denied, or it takes longer than the timeout.
 * Never rejects — location is a nice-to-have and must not block a submission.
 */
export function captureLocation(timeoutMs = 8000): Promise<GeoPosition | null> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    const timer = setTimeout(() => resolve(null), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timer)
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    )
  })
}
