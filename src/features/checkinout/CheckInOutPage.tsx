import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient, createResilient, updateResilient, getDataverseToken } from '../../api/dataverseClient'
import { TABLES, ENTITY_LOGICAL } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { CameraCapture } from '../../components/CameraCapture'
import { PhotoField, type CapturedPhoto } from '../../components/PhotoField'
import { VehicleScanner } from '../../components/VehicleScanner'
import { useDriver } from '../../context/DriverContext'
import { useShift } from '../../context/ShiftContext'
import type { TripRecord } from '../../types/dataverse'
import { captureLocation, reverseGeocode, isLowAccuracy, type GeoPosition } from '../../utils/geolocation'
import { matchesVehicle } from '../../utils/vehicleMatch'
import { useLastOdometer } from '../../hooks/useLastOdometer'
import { suggestRoute, type RouteSuggestion } from '../../utils/suggestRoute'

// Vehicle condition picklist — confirm values with Dataverse if needed
const CONDITIONS = [
  { value: 100000000, label: 'Good',  sub: 'No visible damage or issues' },
  { value: 100000001, label: 'Fair',  sub: 'Minor wear, nothing critical' },
  { value: 100000002, label: 'Poor',  sub: 'Damage or issues to report' },
]

export function CheckInOutPage() {
  const { instance } = useMsal()
  const { vehicle } = useDriver()
  const { shift, odoOut, checkinId, setShift, setOdoOut } = useShift()
  const navigate = useNavigate()

  const isReturn = shift === 'on-trip'

  const [odometer, setOdometer]   = useState('')
  const [odometerAuto, setOdometerAuto] = useState(false)
  const [condition, setCondition] = useState(100000000)
  const [purpose, setPurpose]     = useState('Client site visit')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [notes, setNotes]         = useState('')
  const [openTripId, setOpenTripId] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [photos, setPhotos]       = useState<CapturedPhoto[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState<{ text: string; matched: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [location, setLocation]   = useState<GeoPosition | null>(null)
  const [locationStatus, setLocationStatus] = useState<'pending' | 'ok' | 'unavailable'>('pending')
  const [locationName, setLocationName] = useState<string | null>(null)

  // Capture location in the background as soon as the page opens, so it's
  // ready by the time the driver taps submit — never blocks the form.
  useEffect(() => {
    captureLocation().then(pos => {
      setLocation(pos)
      setLocationStatus(pos ? 'ok' : 'unavailable')
      // Skip reverse geocoding a low-accuracy (likely IP-based) fix — resolving
      // an address for an untrustworthy coordinate just adds false confidence.
      if (pos && !isLowAccuracy(pos)) reverseGeocode(pos.lat, pos.lng).then(setLocationName)
    })
  }, [])

  // Suggest the last known odometer reading for checkout only — on return the
  // field means "closing odometer", which must reflect the actual trip driven,
  // not a stale prior reading.
  const { lastOdometer } = useLastOdometer()
  useEffect(() => {
    if (!isReturn && lastOdometer != null && !odometer) {
      setOdometer(String(lastOdometer))
      setOdometerAuto(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOdometer, isReturn])

  // Route suggestion (checkout only) — informational only, never persisted
  // and never blocks checkout; the driver still navigates with their normal
  // maps app.
  const [destination, setDestination] = useState('')
  const [routeResult, setRouteResult] = useState<RouteSuggestion | null>(null)
  const [routeError, setRouteError]   = useState<string | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  const handleSuggestRoute = async () => {
    if (!destination.trim()) return
    if (!location) {
      setRouteError('Your location isn\'t available yet — try again in a moment.')
      return
    }
    setRouteLoading(true); setRouteError(null); setRouteResult(null)
    try {
      const token = await getDataverseToken(instance)
      const result = await suggestRoute(location.lat, location.lng, destination, token)
      if ('error' in result) setRouteError(result.error)
      else setRouteResult(result)
    } catch {
      setRouteError('Could not suggest a route right now.')
    } finally {
      setRouteLoading(false)
    }
  }

  const distance = odometer && odoOut
    ? Number(odometer) - Number(odoOut)
    : null

  // On return, find the open checkout record to deactivate
  useEffect(() => {
    if (!isReturn) return
    const client = createDataverseClient(instance)
    client.retrieve<TripRecord>(
      TABLES.trips,
      `$filter=statecode eq 0&$select=new_checkoutid&$orderby=createdon desc&$top=1`
    ).then(res => {
      if (res.value.length) setOpenTripId(res.value[0].new_checkoutid)
    }).catch(() => {})
  }, [isReturn, instance])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!odometer) {
      setError(isReturn ? 'Please enter the closing odometer reading.' : 'Please enter the odometer reading.')
      return
    }
    if (isReturn && Number(odometer) <= Number(odoOut ?? 0)) {
      setError('Closing odometer must be higher than the check-out reading.')
      return
    }

    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)

      if (isReturn) {
        // PATCH the checkin record with return info
        if (checkinId) {
          const returnBody: Record<string, unknown> = {
            new_closingodometerkm:       Number(odometer),
            new_vehicleconditiononreturn: condition,
            new_notes:                   notes || undefined,
          }
          if (location) {
            returnBody['crbc3_returnlatitude']  = location.lat
            returnBody['crbc3_returnlongitude'] = location.lng
          }
          await updateResilient(client, TABLES.checkins, checkinId, returnBody, ['crbc3_returnlatitude', 'crbc3_returnlongitude'])
          if (photos.length) {
            try {
              await Promise.all(
                photos.map((p, i) => client.uploadPhoto(TABLES.checkins, ENTITY_LOGICAL.checkins, checkinId, p.blob, i))
              )
            } catch {
              // Record already saved — don't block on photo upload failures
            }
          }
        }
        // Deactivate the checkout record
        if (openTripId) {
          await client.update(TABLES.trips, openTripId, { statecode: 1, statuscode: 2 })
        }
        setShift('returned')
      } else {
        // POST new checkout record
        const body: Record<string, unknown> = {
          new_odometerreadingkm: Number(odometer),
          new_purposeoftrip:     purpose,
          new_notes:             notes || undefined,
        }
        if (expectedReturn) {
          body['new_expectedreturn'] = new Date(expectedReturn).toISOString()
        }
        if (location) {
          body['crbc3_checkoutlatitude']  = location.lat
          body['crbc3_checkoutlongitude'] = location.lng
        }
        const id = await createResilient(client, TABLES.trips, body, ['crbc3_checkoutlatitude', 'crbc3_checkoutlongitude'])
        if (id && photos.length) {
          try {
            await Promise.all(
              photos.map((p, i) => client.uploadPhoto(TABLES.trips, ENTITY_LOGICAL.trips, id, p.blob, i))
            )
          } catch {
            // Record already saved — don't block on photo upload failures
          }
        }
        setOdoOut(odometer)
        setShift('on-trip')
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={blob => {
          setPhotos(p => [...p, { blob, preview: URL.createObjectURL(blob) }])
          setShowCamera(false)
        }}
        onClose={() => setShowCamera(false)}
      />
    )
  }

  if (showScanner) {
    return (
      <VehicleScanner
        onResult={text => {
          setScanResult({ text, matched: matchesVehicle(text, vehicle) })
          setShowScanner(false)
        }}
        onClose={() => setShowScanner(false)}
      />
    )
  }

  return (
    <FormShell
      title={isReturn ? 'Check In Vehicle' : 'Check Out Vehicle'}
      subtitle={vehicle ? `${vehicle.new_vehicletitle} · ${vehicle.new_registrationnumber}` : 'Your vehicle'}
      onSubmit={handleSubmit}
      submitLabel={isReturn ? 'Check in' : 'Check out'}
      submitting={submitting}
      error={error}
    >
      {/* Return: show trip summary */}
      {isReturn && odoOut && (
        <div className="bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 text-[12.5px] text-[#0A57C2] font-semibold flex items-center justify-between gap-2">
          <span>
            Checked out at: <span className="font-mono">{Number(odoOut).toLocaleString()} km</span>
            {distance !== null && distance > 0 && (
              <span className="ml-2 text-[#0B7A45]">· {distance.toLocaleString()} km this trip</span>
            )}
          </span>
          <span className="text-[10.5px] font-bold opacity-75 shrink-0 text-right max-w-[55%]">
            {locationStatus === 'pending' && 'Locating…'}
            {locationStatus === 'ok' && location && isLowAccuracy(location) &&
              `📍 Approx (±${Math.round(location.accuracy / 1000)}km)`}
            {locationStatus === 'ok' && location && !isLowAccuracy(location) &&
              `📍 ${locationName ?? 'Captured'}`}
            {locationStatus === 'unavailable' && 'No location'}
          </span>
        </div>
      )}

      {/* Checkout: location status (return branch shows it in the summary banner above) */}
      {!isReturn && (
        <div className="text-[11px] font-semibold text-fleet-ink-3 -mt-1">
          {locationStatus === 'pending' && 'Getting your location…'}
          {locationStatus === 'ok' && location && isLowAccuracy(location) &&
            `📍 Approximate location only (±${Math.round(location.accuracy / 1000)}km) — GPS unavailable`}
          {locationStatus === 'ok' && location && !isLowAccuracy(location) &&
            `📍 ${locationName ?? 'Location captured'}`}
          {locationStatus === 'unavailable' && 'Location unavailable — continuing without it'}
        </div>
      )}

      {/* Odometer */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">
          {isReturn ? 'Closing odometer (km)' : 'Current odometer (km)'} <span className="text-[#D92D20]">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={odometer}
          onChange={e => { setOdometer(e.target.value); setOdometerAuto(false) }}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder={isReturn ? `More than ${odoOut ?? 0} km` : 'e.g. 95730'}
          required
        />
        {odometerAuto && (
          <div className="text-[10.5px] text-fleet-blue font-semibold mt-1">
            Prefilled from the last recorded reading — please confirm it's correct
          </div>
        )}
      </div>

      {/* Return: vehicle condition */}
      {isReturn && (
        <div>
          <label className="block text-[11.5px] font-bold text-navy mb-2">
            Vehicle condition at check-in <span className="text-[#D92D20]">*</span>
          </label>
          <div className="space-y-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value} type="button"
                onClick={() => setCondition(c.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] text-left transition-colors ${
                  condition === c.value
                    ? 'bg-[#EAF2FE] border-[#0F6FEE] text-[#0A57C2]'
                    : 'bg-white border-fleet-line'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  condition === c.value ? 'border-current' : 'border-fleet-line'
                }`}>
                  {condition === c.value && <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <div>
                  <div className="text-[13px] font-bold">{c.label}</div>
                  <div className="text-[11px] opacity-75">{c.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Checkout-only fields */}
      {!isReturn && (
        <>
          {/* Vehicle verification scan */}
          {!scanResult ? (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center justify-center gap-2 border-[1.5px] border-dashed border-fleet-line rounded-xl p-3 text-[12.5px] font-bold text-fleet-blue"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                <path d="M7 8v8M11 8v8M15 8v8M18 8v8"/>
              </svg>
              Scan vehicle VIN / QR to verify
            </button>
          ) : (
            <div className={`rounded-xl p-3 text-[12.5px] font-semibold flex items-center justify-between gap-2 ${
              scanResult.matched
                ? 'bg-[#DFF5E8] text-[#0B7A45] border border-[#0B7A45]/20'
                : 'bg-[#FEF1DC] text-[#B0700B] border border-[#B0700B]/20'
            }`}>
              <span>
                {scanResult.matched
                  ? '✓ Verified — matches your assigned vehicle'
                  : `⚠ Doesn't match your assigned vehicle (scanned "${scanResult.text}")`}
              </span>
              <button type="button" onClick={() => setShowScanner(true)} className="underline shrink-0 whitespace-nowrap">
                Rescan
              </button>
            </div>
          )}

          <div>
            <label className="block text-[11.5px] font-bold text-navy mb-1.5">
              Purpose of trip <span className="text-[#D92D20]">*</span>
            </label>
            <select
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm bg-white focus:border-fleet-blue focus:outline-none appearance-none"
            >
              {['Client site visit', 'Depot collection', 'Delivery run', 'Maintenance drop-off', 'Other'].map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-navy mb-1.5">
              Expected return
            </label>
            <input
              type="datetime-local"
              value={expectedReturn}
              onChange={e => setExpectedReturn(e.target.value)}
              className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
            />
          </div>

          {/* Route suggestion */}
          <div>
            <label className="block text-[11.5px] font-bold text-navy mb-1.5">
              Destination <span className="text-[10.5px] font-semibold text-fleet-ink-3">(optional — get a route suggestion)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={destination}
                onChange={e => { setDestination(e.target.value); setRouteResult(null); setRouteError(null) }}
                className="flex-1 border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
                placeholder="e.g. 14 Rivonia Rd, Sandton"
              />
              <button
                type="button"
                onClick={handleSuggestRoute}
                disabled={!destination.trim() || routeLoading}
                className="px-4 rounded-xl text-sm font-bold text-white bg-fleet-blue disabled:opacity-40 shrink-0"
              >
                {routeLoading ? '…' : '🧭 Route'}
              </button>
            </div>

            {routeError && (
              <div className="text-[11.5px] text-[#C42D3A] font-semibold mt-1.5">{routeError}</div>
            )}

            {routeResult && (
              <div className="mt-2 bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-[12.5px]">
                  <span className="font-semibold text-[#0A57C2]">Fastest route</span>
                  <span className="font-bold text-navy">
                    {routeResult.routes.fastest.distanceKm} km · {routeResult.routes.fastest.durationMin} min
                    {routeResult.routes.fastest.trafficDelayMin > 0 &&
                      ` (+${routeResult.routes.fastest.trafficDelayMin} min traffic)`}
                  </span>
                </div>
                {routeResult.routes.eco && (
                  <div className="flex justify-between text-[12.5px]">
                    <span className="font-semibold text-[#0B7A45]">Eco / fuel-efficient</span>
                    <span className="font-bold text-navy">
                      {routeResult.routes.eco.distanceKm} km · {routeResult.routes.eco.durationMin} min
                    </span>
                  </div>
                )}
                {routeResult.weatherAlerts.length > 0 && (
                  <div className="text-[11.5px] font-semibold text-[#B0700B] pt-1 border-t border-[#0F6FEE]/15">
                    ⚠ {routeResult.weatherAlerts.join(' · ')}
                  </div>
                )}
                <div className="text-[10.5px] text-fleet-ink-3">
                  Open your maps app for turn-by-turn navigation — this is a planning estimate only.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Notes */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm resize-none focus:border-fleet-blue focus:outline-none"
          placeholder="Optional"
        />
      </div>

      {/* Photos */}
      <PhotoField
        label={isReturn ? 'Photos at check-in' : 'Photos on checkout'}
        hint={isReturn
          ? 'Optional — photograph any new damage or issues found at check-in'
          : 'Optional — photograph the vehicle condition before you drive off'}
        photos={photos}
        onAdd={() => setShowCamera(true)}
        onRemove={i => setPhotos(p => p.filter((_, idx) => idx !== i))}
      />
    </FormShell>
  )
}
