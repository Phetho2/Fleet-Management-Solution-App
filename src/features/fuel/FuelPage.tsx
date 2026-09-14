import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'
import { useLastOdometer } from '../../hooks/useLastOdometer'
import { captureLocation, reverseGeocode, isLowAccuracy } from '../../utils/geolocation'
import { findNearbyFuelStation } from '../../utils/fuelStation'

export function FuelPage() {
  const { instance } = useMsal()
  const { driver, vehicle } = useDriver()
  const navigate = useNavigate()

  const [litres, setLitres]   = useState('')
  const [cost, setCost]       = useState('')
  const [odo, setOdo]         = useState('')
  const [odoAuto, setOdoAuto] = useState(false)
  const [station, setStation] = useState('')
  const [stationAuto, setStationAuto] = useState(false)
  const [stationSource, setStationSource] = useState<'poi' | 'address' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Suggest the last known odometer reading instead of making the driver
  // retype it from scratch — only applies if they haven't typed anything yet.
  const { lastOdometer } = useLastOdometer()
  useEffect(() => {
    if (lastOdometer != null && !odo) {
      setOdo(String(lastOdometer))
      setOdoAuto(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOdometer])

  // Try to prefill the fuel station from the driver's current location: first
  // look for an actual named fuel station nearby (OpenStreetMap), and if none
  // is found, fall back to a general place name so the field isn't left blank.
  useEffect(() => {
    captureLocation().then(async pos => {
      if (!pos || isLowAccuracy(pos) || station) return
      const poiName = await findNearbyFuelStation(pos.lat, pos.lng)
      if (poiName) {
        if (!station) { setStation(poiName); setStationAuto(true); setStationSource('poi') }
        return
      }
      const placeName = await reverseGeocode(pos.lat, pos.lng)
      if (placeName && !station) {
        setStation(placeName)
        setStationAuto(true)
        setStationSource('address')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ratePerLitre = litres && cost
    ? (Number(cost) / Number(litres)).toFixed(2)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver) { setError('Driver profile not loaded.'); return }
    if (!litres || !cost || !odo || !station) {
      setError('Please fill in all required fields.'); return
    }
    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)
      const body: Record<string, unknown> = {
        new_date:               new Date().toISOString(),
        new_litresfilled:       Number(litres),
        new_totalcostr:         Number(cost),
        new_odometerreadingkm:  Number(odo),
        new_fuelstation:        station,
      }
      if (vehicle) {
        body['new_vehicle'] = vehicle.new_vehicletitle
      }
      await client.create(TABLES.fuel, body)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormShell
      title="Fuel &amp; Mileage"
      subtitle="Capture your refuel"
      onSubmit={handleSubmit}
      submitLabel="Submit capture"
      submitting={submitting}
      error={error}
    >
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">
          Fuel station <span className="text-[#D92D20]">*</span>
        </label>
        <input
          type="text"
          value={station}
          onChange={e => { setStation(e.target.value); setStationAuto(false) }}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. Engen N1 City"
          required
        />
        {stationAuto && stationSource === 'poi' && (
          <div className="text-[10.5px] text-fleet-blue font-semibold mt-1">
            📍 Nearest fuel station detected from your location — please confirm it's correct
          </div>
        )}
        {stationAuto && stationSource === 'address' && (
          <div className="text-[10.5px] text-fleet-blue font-semibold mt-1">
            📍 Prefilled from your current location — please rename to the fuel station if needed
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11.5px] font-bold text-navy mb-1.5">
            Litres (L) <span className="text-[#D92D20]">*</span>
          </label>
          <input
            type="number" inputMode="decimal" step="0.1"
            value={litres}
            onChange={e => setLitres(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
            placeholder="0.0"
            required
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-navy mb-1.5">
            Total cost (R) <span className="text-[#D92D20]">*</span>
          </label>
          <input
            type="number" inputMode="decimal" step="0.01"
            value={cost}
            onChange={e => setCost(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {ratePerLitre && (
        <div className="text-[12px] text-[#0B7A45] font-bold font-mono">
          R {ratePerLitre} / litre
        </div>
      )}

      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">
          Odometer reading (km) <span className="text-[#D92D20]">*</span>
        </label>
        <input
          type="number" inputMode="numeric"
          value={odo}
          onChange={e => { setOdo(e.target.value); setOdoAuto(false) }}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. 95730"
          required
        />
        {odoAuto && (
          <div className="text-[10.5px] text-fleet-blue font-semibold mt-1">
            Prefilled from the last recorded reading — please confirm it's correct
          </div>
        )}
      </div>
    </FormShell>
  )
}
