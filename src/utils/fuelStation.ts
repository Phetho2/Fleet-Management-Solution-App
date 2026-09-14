function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Finds the nearest named fuel station to a coordinate using OpenStreetMap's
 * Overpass API (free, no key). Returns null if none is found nearby, none of
 * the nearby fuel points are named, or the request fails/times out — never
 * throws, this is a convenience only.
 */
export async function findNearbyFuelStation(
  lat: number,
  lng: number,
  radiusMeters = 400,
  timeoutMs = 7000
): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const query = `[out:json][timeout:8];node(around:${radiusMeters},${lat},${lng})["amenity"="fuel"];out body 10;`
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const elements: Array<{ lat: number; lon: number; tags?: Record<string, string> }> = data?.elements ?? []

    let best: { name: string; distance: number } | null = null
    for (const el of elements) {
      const name = el.tags?.name || el.tags?.brand || el.tags?.operator
      if (!name) continue
      const distance = haversineMeters(lat, lng, el.lat, el.lon)
      if (!best || distance < best.distance) best = { name, distance }
    }
    return best?.name ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
