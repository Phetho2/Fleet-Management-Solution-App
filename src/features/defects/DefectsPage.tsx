import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'

const DEFECT_TYPES = [
  { value: 1, label: 'Engine' },
  { value: 2, label: 'Transmission' },
  { value: 3, label: 'Brakes' },
  { value: 4, label: 'Tyres' },
  { value: 5, label: 'Lights / Electrical' },
  { value: 6, label: 'Body / Exterior' },
  { value: 7, label: 'Air conditioning' },
  { value: 8, label: 'Other' },
]

const URGENCY = [
  { value: 1, label: 'Low',      sub: 'Can wait for next service',     color: 'green' },
  { value: 2, label: 'Medium',   sub: 'Needs attention this week',      color: 'amber' },
  { value: 3, label: 'High',     sub: 'Fix before next trip',           color: 'red' },
  { value: 4, label: 'Critical', sub: 'Vehicle off-road immediately',   color: 'red' },
]

export function DefectsPage() {
  const { instance } = useMsal()
  const { driver, vehicle } = useDriver()
  const navigate = useNavigate()

  const [defectType, setDefectType] = useState(8)
  const [urgency, setUrgency]       = useState(2)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const urgencyColors: Record<string, string> = {
    green: 'bg-[#DFF5E8] border-[#0B7A45] text-[#0B7A45]',
    amber: 'bg-[#FEF1DC] border-[#B0700B] text-[#B0700B]',
    red:   'bg-[#FDE7E9] border-[#C42D3A] text-[#C42D3A]',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver)      { setError('Driver profile not loaded.'); return }
    if (!description) { setError('Please describe the defect.'); return }

    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)
      const body: Record<string, unknown> = {
        new_reportdate:  new Date().toISOString(),
        new_defecttype:  defectType,
        new_urgency:     urgency,
        new_description: description,
        'new_driverrecord@odata.bind': `/new_drivers(${driver.new_driverid})`,
      }
      if (vehicle) {
        body['new_vehiclerecord@odata.bind'] = `/new_vehiclerecords(${vehicle.new_vehiclerecordid})`
      }
      await client.create(TABLES.defects, body)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormShell
      title="Log a Defect"
      subtitle={vehicle ? `${vehicle.new_vehicletitle} · ${vehicle.new_registrationnumber}` : 'Your vehicle'}
      onSubmit={handleSubmit}
      submitLabel="Log defect"
      submitting={submitting}
      error={error}
    >
      {/* Defect type */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-2">
          What is affected? <span className="text-[#D92D20]">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFECT_TYPES.map(d => (
            <button
              key={d.value} type="button"
              onClick={() => setDefectType(d.value)}
              className={`px-3 py-2 rounded-xl text-[12px] font-bold border-[1.5px] transition-colors ${
                defectType === d.value
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-fleet-ink border-fleet-line'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Urgency */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-2">
          How serious? <span className="text-[#D92D20]">*</span>
        </label>
        <div className="space-y-2">
          {URGENCY.map(u => (
            <button
              key={u.value} type="button"
              onClick={() => setUrgency(u.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] text-left transition-colors ${
                urgency === u.value
                  ? urgencyColors[u.color]
                  : 'bg-white border-fleet-line'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                urgency === u.value ? 'border-current' : 'border-fleet-line'
              }`}>
                {urgency === u.value && <div className="w-2 h-2 rounded-full bg-current" />}
              </div>
              <div>
                <div className="text-[13px] font-bold">{u.label}</div>
                <div className="text-[11px] opacity-75">{u.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">
          Describe the defect <span className="text-[#D92D20]">*</span>
        </label>
        <textarea
          rows={4} value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm resize-none focus:border-fleet-blue focus:outline-none"
          placeholder="What are you noticing? When did it start? Getting worse?"
          required
        />
      </div>
    </FormShell>
  )
}
