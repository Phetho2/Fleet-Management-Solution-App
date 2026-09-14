// Must be an absolute URL, not a relative path: the native Capacitor app
// bundles dist/ and serves it from a local capacitor:// origin, so a
// relative fetch('/api/...') would resolve against that fake local origin
// instead of the deployed Vercel app and fail silently.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export interface RouteSummary {
  distanceKm: number
  durationMin: number
  trafficDelayMin: number
  geometry: { lat: number; lng: number }[]
}

export interface RouteSuggestion {
  destination: { lat: number; lng: number }
  routes: { fastest: RouteSummary; eco?: RouteSummary }
  weatherAlerts: string[]
}

export interface RouteSuggestionError {
  error: string
}

/**
 * Asks the /api/suggest-route function for a traffic-aware route (plus an
 * eco/fuel-efficient alternative and any severe weather alerts) from the
 * driver's current location to a typed destination. Returns an error object
 * rather than throwing, since a bad/unrecognized destination is an expected,
 * user-facing outcome, not a bug.
 */
export async function suggestRoute(
  originLat: number,
  originLng: number,
  destination: string,
  authToken: string
): Promise<RouteSuggestion | RouteSuggestionError> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/suggest-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ originLat, originLng, destination }),
    })
    const data = await res.json()
    if (!res.ok) return { error: typeof data?.error === 'string' ? data.error : 'Could not suggest a route' }
    return data as RouteSuggestion
  } catch {
    return { error: 'Could not reach the route suggestion service' }
  }
}
