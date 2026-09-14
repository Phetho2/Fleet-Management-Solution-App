import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyCaller, setCorsHeaders } from '../lib/serverAuth.js'

const AZURE_MAPS_BASE = 'https://atlas.microsoft.com'

interface RouteSummary {
  distanceKm: number
  durationMin: number
  trafficDelayMin: number
}

async function logAzureMapsFailure(label: string, res: Response): Promise<void> {
  const body = await res.text()
  console.error(`[Azure Maps] ${label} failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`)
}

/**
 * Geocodes an address, biased toward the driver's current location and
 * restricted to South Africa. Without this, an ambiguous/incomplete address
 * (e.g. just a street name) can match a same-named place on another
 * continent — Azure Maps' routing engine then fails with "Origin and
 * destination have different ProductId's" since it can't route across
 * road-network tiles from different underlying data providers.
 */
async function geocodeAddress(
  address: string,
  originLat: number,
  originLng: number,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const url =
    `${AZURE_MAPS_BASE}/search/address/json?api-version=1.0&subscription-key=${apiKey}` +
    `&query=${encodeURIComponent(address)}&limit=1` +
    `&lat=${originLat}&lon=${originLng}&radius=300000&countrySet=ZA`
  const res = await fetch(url)
  if (!res.ok) { await logAzureMapsFailure('geocode', res); return null }
  const data = await res.json()
  const pos = data?.results?.[0]?.position
  if (!pos) console.error(`[Azure Maps] geocode: no results for "${address}" — ${JSON.stringify(data).slice(0, 300)}`)
  return pos ? { lat: pos.lat, lng: pos.lon } : null
}

async function computeRoute(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  routeType: 'fastest' | 'eco',
  apiKey: string
): Promise<RouteSummary | null> {
  const url =
    `${AZURE_MAPS_BASE}/route/directions/json?api-version=1.0&subscription-key=${apiKey}` +
    `&query=${originLat},${originLng}:${destLat},${destLng}` +
    `&routeType=${routeType}&traffic=true`
  const res = await fetch(url)
  if (!res.ok) { await logAzureMapsFailure(`route (${routeType})`, res); return null }
  const data = await res.json()
  const summary = data?.routes?.[0]?.summary
  if (!summary) console.error(`[Azure Maps] route (${routeType}): no summary in response — ${JSON.stringify(data).slice(0, 300)}`)
  if (!summary) return null
  return {
    distanceKm: Math.round((summary.lengthInMeters / 1000) * 10) / 10,
    durationMin: Math.round(summary.travelTimeInSeconds / 60),
    trafficDelayMin: Math.round((summary.trafficDelayInSeconds ?? 0) / 60),
  }
}

async function getSevereWeatherAlerts(lat: number, lng: number, apiKey: string): Promise<string[]> {
  const url = `${AZURE_MAPS_BASE}/weather/severe/alerts/json?api-version=1.1&subscription-key=${apiKey}&query=${lat},${lng}`
  const res = await fetch(url)
  if (!res.ok) { await logAzureMapsFailure('weather', res); return [] }
  const data = await res.json()
  const results = data?.results ?? []
  return results.map((r: { description?: { localized?: string } }) => r.description?.localized).filter(Boolean)
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

  const { originLat, originLng, destination } = req.body ?? {}
  if (typeof originLat !== 'number' || typeof originLng !== 'number' || typeof destination !== 'string' || !destination.trim()) {
    res.status(400).json({ error: 'Missing originLat, originLng, or destination' })
    return
  }

  const apiKey = process.env.AZURE_MAPS_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server missing AZURE_MAPS_KEY' })
    return
  }

  try {
    const dest = await geocodeAddress(destination, originLat, originLng, apiKey)
    if (!dest) {
      res.status(404).json({ error: `Could not find "${destination}"` })
      return
    }

    const [fastest, eco, originAlerts, destAlerts] = await Promise.all([
      computeRoute(originLat, originLng, dest.lat, dest.lng, 'fastest', apiKey),
      computeRoute(originLat, originLng, dest.lat, dest.lng, 'eco', apiKey),
      getSevereWeatherAlerts(originLat, originLng, apiKey),
      getSevereWeatherAlerts(dest.lat, dest.lng, apiKey),
    ])

    if (!fastest) {
      res.status(502).json({ error: 'Could not compute a route to that destination' })
      return
    }

    res.status(200).json({
      destination: dest,
      routes: { fastest, eco: eco ?? undefined },
      weatherAlerts: Array.from(new Set([...originAlerts, ...destAlerts])),
    })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Request to Azure Maps failed' })
  }
}
