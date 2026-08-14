import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'
import { useShift } from '../../context/ShiftContext'
import type { TripRecord } from '../../types/dataverse'

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
  const [condition, setCondition] = useState(100000000)
  const [purpose, setPurpose]     = useState('Client site visit')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [notes, setNotes]         = useState('')
  const [openTripId, setOpenTripId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

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
          await client.update(TABLES.checkins, checkinId, {
            new_closingodometerkm:       Number(odometer),
            new_vehicleconditiononreturn: condition,
            new_notes:                   notes || undefined,
          })
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
      title={isReturn ? 'Return Vehicle' : 'Check Out Vehicle'}
      subtitle={vehicle ? `${vehicle.new_vehicletitle} · ${vehicle.new_registrationnumber}` : 'Your vehicle'}
      onSubmit={handleSubmit}
      submitLabel={isReturn ? 'Return vehicle' : 'Check out'}
      submitting={submitting}
      error={error}
    >
      {/* Return: show trip summary */}
      {isReturn && odoOut && (
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
          {isReturn ? 'Closing odometer (km)' : 'Current odometer (km)'} <span className="text-[#D92D20]">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={odometer}
          onChange={e => setOdometer(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder={isReturn ? `More than ${odoOut ?? 0} km` : 'e.g. 95730'}
          required
        />
      </div>

      {/* Return: vehicle condition */}
      {isReturn && (
        <div>
          <label className="block text-[11.5px] font-bold text-navy mb-2">
            Vehicle condition on return <span className="text-[#D92D20]">*</span>
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
    </FormShell>
  )
}
