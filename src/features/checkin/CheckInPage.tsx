import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'
import { useShift } from '../../context/ShiftContext'

export function CheckInPage() {
  const { instance } = useMsal()
  const { vehicle } = useDriver()
  const { setShift, setCheckinId } = useShift()
  const navigate = useNavigate()

  const [notes, setNotes]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const now = new Date()
  const timeDisplay = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)
      const body: Record<string, unknown> = {
        new_checkedout: now.toISOString(),
        new_notes:      notes || undefined,
      }
      const id = await client.create(TABLES.checkins, body)
      // Store the checkin record ID so the return flow can PATCH it
      if (id) setCheckinId(id)
      setShift('checked-in')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormShell
      title="Check In"
      subtitle={vehicle ? `${vehicle.new_vehicletitle} · ${vehicle.new_registrationnumber}` : 'Your vehicle'}
      onSubmit={handleSubmit}
      submitLabel="Check in"
      submitting={submitting}
      error={error}
    >
      {/* Time confirmation */}
      <div className="bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 text-[12.5px] text-[#0A57C2] font-semibold">
        Signing in at <span className="font-mono">{timeDisplay}</span>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm resize-none focus:border-fleet-blue focus:outline-none"
          placeholder="Optional — anything to flag before your shift?"
        />
      </div>
    </FormShell>
  )
}
