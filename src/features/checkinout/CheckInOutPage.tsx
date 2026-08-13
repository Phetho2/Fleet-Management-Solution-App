import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'
import { useShift } from '../../context/ShiftContext'
import type { TripRecord } from '../../types/dataverse'

export function CheckInOutPage() {
  const { instance } = useMsal()
  const { driver, vehicle, refetch } = useDriver()
  const { shift, odoOut, setShift, setOdoOut } = useShift()
  const navigate = useNavigate()

  const isCheckIn = shift === 'on-trip'

  const [odometer, setOdometer] = useState('')
  const [purpose, setPurpose] = useState('Client site visit')
  const [notes, setNotes] = useState('')
  const [openTripId, setOpenTripId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On check-in, find the open trip to patch
  useEffect(() => {
    if (!isCheckIn || !driver) return
    const client = createDataverseClient(instance)
    client.retrieve<TripRecord>(
      TABLES.trips,
      `$filter=_new_driverrecord_value eq ${driver.new_driverid} and statecode eq 0` +
      `&$select=new_vehicletripid&$orderby=new_checkouttime desc&$top=1`
    ).then(res => {
      if (res.value.length) setOpenTripId(res.value[0].new_vehicletripid)
    }).catch(() => {})
  }, [isCheckIn, driver, instance])

  const currentOdo = 0  // odometer not stored on vehicle record
  const distance = odometer && odoOut
    ? Number(odometer) - Number(odoOut)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver) { setError('Driver profile not loaded.'); return }
    if (!odometer) { setError('Please enter the odometer reading.'); return }
    if (isCheckIn && Number(odometer) <= Number(odoOut ?? currentOdo)) {
      setError('Closing odometer must be higher than the check-out reading.')
      return
    }
    if (!isCheckIn && Number(odometer) < currentOdo) {
      setError(`Odometer must be at least ${currentOdo.toLocaleString()} km.`)
      return
    }

    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)

      if (isCheckIn) {
        // PATCH the open trip
        if (!openTripId) throw new Error('No open trip found.')
        const km = Number(odometer) - Number(odoOut ?? 0)
        await client.update(TABLES.trips, openTripId, {
          new_checkintime:        new Date().toISOString(),
          new_odometerat_checkin: Number(odometer),
          new_distancekm:         Math.max(0, km),
          new_notes:              notes,
        })
        setShift('returned')
        refetch()  // reload vehicle with new odo
      } else {
        // POST new trip
        const body: Record<string, unknown> = {
          new_checkouttime:        new Date().toISOString(),
          new_odometerat_checkout: Number(odometer),
          new_purpose:             purpose,
          new_notes:               notes,
          'new_driverrecord@odata.bind': `/new_drivers(${driver.new_driverid})`,
        }
        if (vehicle) {
          body['new_vehiclerecord@odata.bind'] = `/${TABLES.vehicles}(${vehicle.new_vehiclerecordid})`
        }
        await client.create(TABLES.trips, body)
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

  return (
    <FormShell
      title={isCheckIn ? 'Check In Vehicle' : 'Check Out Vehicle'}
      subtitle={vehicle ? `${vehicle.new_vehicletitle} · ${vehicle.new_registrationnumber}` : 'Your vehicle'}
      onSubmit={handleSubmit}
      submitLabel={isCheckIn ? 'Check In' : 'Check Out'}
      submitting={submitting}
      error={error}
    >
      {/* Current odo hint */}
      {!isCheckIn && (
        <div className="bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 text-[12.5px] text-[#0A57C2] font-semibold">
          Last recorded odometer: <span className="font-mono">{currentOdo.toLocaleString()} km</span>
        </div>
      )}
      {isCheckIn && odoOut && (
        <div className="bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 text-[12.5px] text-[#0A57C2] font-semibold">
          Checked out at: <span className="font-mono">{Number(odoOut).toLocaleString()} km</span>
          {distance !== null && distance > 0 && (
            <span className="ml-2 text-[#0B7A45]">· {distance.toLocaleString()} km this trip</span>
          )}
        </div>
      )}

      {/* Odometer */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">
          {isCheckIn ? 'Closing odometer (km)' : 'Current odometer (km)'} <span className="text-[#D92D20]">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={odometer}
          onChange={e => setOdometer(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder={isCheckIn ? `More than ${odoOut ?? currentOdo} km` : `More than ${currentOdo.toLocaleString()} km`}
          required
        />
      </div>

      {/* Purpose — only on checkout */}
      {!isCheckIn && (
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
    </FormShell>
  )
}
