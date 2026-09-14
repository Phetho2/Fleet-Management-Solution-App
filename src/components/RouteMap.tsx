import { useEffect, useRef, useState } from 'react'
import * as atlas from 'azure-maps-control'
import 'azure-maps-control/dist/atlas.min.css'
import type { RouteSummary } from '../utils/suggestRoute'

interface RouteMapProps {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  routes: { fastest: RouteSummary; eco?: RouteSummary }
  weatherAlerts: string[]
  onClose: () => void
}

const toPositions = (points: { lat: number; lng: number }[]) => points.map(p => [p.lng, p.lat] as atlas.data.Position)

/**
 * Full-screen interactive map showing the suggested route(s) with live
 * traffic flow and incidents overlaid — Azure Maps renders those directly on
 * the map, so "what's happening on the road" is visible without us having to
 * separately fetch and place incident markers ourselves.
 */
export function RouteMap({ origin, destination, routes, weatherAlerts, onClose }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<atlas.Map | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const key = import.meta.env.VITE_AZURE_MAPS_KEY as string | undefined
    if (!key) { setError('Map is not configured (missing Azure Maps key).'); return }

    const map = new atlas.Map(containerRef.current, {
      authOptions: {
        authType: atlas.AuthenticationType.subscriptionKey,
        subscriptionKey: key,
      },
      style: 'road',
    })
    mapRef.current = map

    map.events.add('ready', () => {
      // Live traffic flow (color-coded by speed) and incident icons, straight
      // from Azure Maps — this is the "what's happening on the road" layer.
      map.setTraffic({ flow: 'relative', incidents: true })

      const allPositions: atlas.data.Position[] = []

      const fastestSource = new atlas.source.DataSource()
      map.sources.add(fastestSource)
      fastestSource.add(new atlas.data.Feature(new atlas.data.LineString(toPositions(routes.fastest.geometry))))
      map.layers.add(new atlas.layer.LineLayer(fastestSource, undefined, {
        strokeColor: '#0F6FEE',
        strokeWidth: 5,
      }))
      allPositions.push(...toPositions(routes.fastest.geometry))

      if (routes.eco) {
        const ecoSource = new atlas.source.DataSource()
        map.sources.add(ecoSource)
        ecoSource.add(new atlas.data.Feature(new atlas.data.LineString(toPositions(routes.eco.geometry))))
        map.layers.add(new atlas.layer.LineLayer(ecoSource, undefined, {
          strokeColor: '#0B7A45',
          strokeWidth: 4,
          strokeDashArray: [2, 2],
        }))
        allPositions.push(...toPositions(routes.eco.geometry))
      }

      map.markers.add(new atlas.HtmlMarker({ position: [origin.lng, origin.lat], color: '#0F6FEE' }))
      map.markers.add(new atlas.HtmlMarker({ position: [destination.lng, destination.lat], color: '#C42D3A' }))

      if (allPositions.length) {
        map.setCamera({ bounds: atlas.data.BoundingBox.fromPositions(allPositions), padding: 60 })
      }
    })

    return () => map.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 bg-black/80 shrink-0">
        <span className="text-white font-medium">Route map</span>
        <button onClick={onClose} className="text-white text-2xl leading-none">&times;</button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-white text-sm p-6 text-center">{error}</div>
      ) : (
        <div ref={containerRef} className="flex-1" />
      )}

      {weatherAlerts.length > 0 && (
        <div className="p-3 bg-[#FEF1DC] text-[#B0700B] text-[12px] font-semibold shrink-0">
          ⚠ {weatherAlerts.join(' · ')}
        </div>
      )}

      <div className="p-3 bg-black/80 flex gap-4 text-white text-[11px] font-semibold shrink-0">
        <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-[#0F6FEE] inline-block rounded-full" /> Fastest</span>
        {routes.eco && (
          <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-[#0B7A45] inline-block rounded-full" /> Eco</span>
        )}
        <span className="ml-auto opacity-70">Live traffic & incidents shown on map</span>
      </div>
    </div>
  )
}
