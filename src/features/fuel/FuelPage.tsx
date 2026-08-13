import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'

export function FuelPage() {
  const { instance } = useMsal()
  const { driver, vehicle } = useDriver()
  const navigate = useNavigate()

  const [litres, setLitres]   = useState('')
  const [cost, setCost]       = useState('')
  const [odo, setOdo]         = useState('')
  const [station, setStation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

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
        new_date:            new Date().toISOString(),
        new_litres:          Number(litres),
        new_totalcost:       Number(cost),
        new_odometer:        Number(odo),
        new_fuelstationname: station,
        new_approvalstatus:  1,  // Pending
        'new_driverrecord@odata.bind': `/new_drivers(${driver.new_driverid})`,
      }
      if (vehicle) {
        body['new_vehiclerecord@odata.bind'] = `/new_vehiclerecords(${vehicle.new_vehiclerecordid})`
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
          onChange={e => setStation(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. Engen N1 City"
          required
        />
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
          onChange={e => setOdo(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. 95730"
          required
        />
      </div>
    </FormShell>
  )
}
