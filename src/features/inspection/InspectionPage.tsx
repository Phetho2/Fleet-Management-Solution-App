import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { useDriver } from '../../context/DriverContext'
import { useShift } from '../../context/ShiftContext'

/* ── Shared UI primitives ─────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mt-2 mb-1">
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold text-navy mb-1.5">
        {label}{required && <span className="text-[#D92D20] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <div className="text-[10.5px] text-fleet-ink-3 mt-1">{hint}</div>}
    </div>
  )
}

/** Yes / No toggle with optional comment textarea that appears on "No" */
function YesNo({
  label, value, onChange, comment, onComment, commentLabel, alwaysComment
}: {
  label: string
  value: boolean | undefined
  onChange: (v: boolean) => void
  comment?: string
  onComment?: (v: string) => void
  commentLabel?: string
  alwaysComment?: boolean
}) {
  return (
    <div className={`rounded-xl border-[1.5px] overflow-hidden transition-colors ${
      value === false ? 'border-[#C42D3A]/40' : value === true ? 'border-[#0B7A45]/40' : 'border-fleet-line'
    }`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
        <span className="text-[13.5px] font-semibold text-fleet-ink flex-1">{label}</span>
        <div className="flex gap-2 shrink-0">
          {[true, false].map(v => (
            <button key={String(v)} type="button" onClick={() => onChange(v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                value === v
                  ? v ? 'bg-[#DFF5E8] text-[#0B7A45]' : 'bg-[#FDE7E9] text-[#C42D3A]'
                  : 'bg-[#F7F9FC] text-fleet-ink-3'
              }`}>
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
      {onComment && (value === false || alwaysComment) && (
        <div className="border-t border-fleet-line bg-[#FAFBFD] px-4 pb-3 pt-2">
          <textarea rows={2} value={comment ?? ''} onChange={e => onComment(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-lg p-2.5 text-[13px] resize-none focus:border-fleet-blue focus:outline-none bg-white"
            placeholder={commentLabel ?? 'Add a comment…'} />
        </div>
      )}
    </div>
  )
}

/* ── Step definitions ─────────────────────────────────────── */
const STEPS = ['Location & odometer', 'Condition checks', 'Cleanliness & lights', 'Confirm & sign']

export function InspectionPage() {
  const { instance } = useMsal()
  const { driver, vehicle } = useDriver()
  const { setShift } = useShift()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)

  // Step 0 — title, location & odometer
  const [title, setTitle]             = useState('')
  const [site, setSite]               = useState('')
  const [street, setStreet]           = useState('')
  const [city, setCity]               = useState('')
  const [odometer, setOdometer]       = useState('')
  const [nextServiceOdo, setNextSvcOdo] = useState('')

  // Step 1 — condition checks
  const [isRoadworthy, setRoadworthy]         = useState<boolean | undefined>()
  const [roadworthyComment, setRwComment]     = useState('')
  const [exteriorcondition, setExterior]      = useState('')
  const [interiorcondition, setInterior]      = useState('')
  const [interiorComments, setInteriorComments] = useState('')
  const [isneat, setNeat]                     = useState<boolean | undefined>()

  // Step 2 — cleanliness & lights
  const [isInteriorClean, setClean]         = useState<boolean | undefined>()
  const [cleanComment, setCleanComment]     = useState('')
  const [lastwashdate, setWashDate]         = useState('')
  const [mirrorsWorking, setMirrors]        = useState<boolean | undefined>()
  const [mirrorsComment, setMirrorsComment] = useState('')
  const [headlightsWorking, setHeadlights]  = useState<boolean | undefined>()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Determine pass/fail: fail if any required check is false
  const failChecks = [isRoadworthy, mirrorsWorking, headlightsWorking].filter(v => v === false).length
  const allAnswered = [isRoadworthy, isneat, isInteriorClean, mirrorsWorking, headlightsWorking].every(v => v !== undefined)
  const result = failChecks > 0 ? 2 : 1   // 1=Pass, 2=Fail

  const validateStep = () => {
    if (step === 0 && !title.trim()) { setError('Inspection title is required.'); return false }
    if (step === 0 && !odometer) { setError('Odometer reading is required.'); return false }
    if (step === 1 && (isRoadworthy === undefined || isneat === undefined)) {
      setError('Please answer all condition checks.'); return false
    }
    if (step === 2 && (isInteriorClean === undefined || mirrorsWorking === undefined || headlightsWorking === undefined)) {
      setError('Please answer all cleanliness and lights checks.'); return false
    }
    setError(null); return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      if (!validateStep()) return
      setStep(s => s + 1); return
    }

    // Final submit
    if (!driver) { setError('Driver profile not loaded.'); return }
    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)
      const now = new Date()

      const body: Record<string, unknown> = {
        new_inspectiontitle:             title.trim(),
        new_inspectiondate:              now.toISOString(),
        new_odometerreading:             odometer ? Number(odometer) : undefined,
        new_nextserviceodometer:         nextServiceOdo ? Number(nextServiceOdo) : undefined,
        new_sitelocation:                site || undefined,
        new_streetaddress:               street || undefined,
        new_city:                        city || undefined,
        new_roadworthinesscomments:      isRoadworthy === false
                                           ? `No${roadworthyComment ? ` — ${roadworthyComment}` : ''}`
                                           : isRoadworthy ? 'Yes' : undefined,
        new_exteriorcondition:           exteriorcondition || undefined,
        new_interiorcondition:           interiorcondition || undefined,
        new_interiorconditioncomments:   interiorComments || undefined,
        new_neatcondition:               isneat,
        new_interiorcleanliness:         isInteriorClean,
        new_interiorcleanlinesscomments: cleanComment || undefined,
        new_lastwashdate:                lastwashdate
                                           ? new Date(lastwashdate + 'T00:00:00').toISOString()
                                           : undefined,
        new_mirrorsworking:              mirrorsWorking,
        new_mirrorsworkingcomments:      mirrorsComment || undefined,
        new_headlightsworking:           headlightsWorking,
        new_inspectorname:               driver.new_driverfullname,
        new_registrationnumber:          vehicle?.new_registrationnumber ?? undefined,
        new_vehiclemake:                 vehicle?.new_vehiclemake ?? undefined,
        'new_InspectorRecord@odata.bind': `/new_drivers(${driver.new_driverid})`,
        ...(vehicle ? { 'new_VehicleRecord@odata.bind': `/new_vehiclerecords(${vehicle.new_vehiclerecordid})` } : {}),
      }
      await client.create(TABLES.inspections, body)
      setShift(result === 1 ? 'inspected' : 'not-started')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const progress = ((step + (step === 3 ? 1 : 0)) / 4) * 100

  const stepSubtitle = `Step ${step + 1} of 4 · ${STEPS[step]}`

  /* ── Step 0 — Location & Odometer ──────────────────────── */
  if (step === 0) return (
    <FormShell title="Daily Inspection" subtitle={stepSubtitle}
      onSubmit={handleSubmit} submitLabel="Continue →" error={error} progress={progress}>

      <div className="bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 text-[12.5px] text-[#0A57C2] font-semibold">
        {vehicle
          ? <>{vehicle.new_vehiclemake} {vehicle.new_vehiclemodel} · {vehicle.new_registrationnumber}</>
          : 'No vehicle assigned'}
      </div>

      <Field label="Inspection title" required>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. Morning inspection — Midrand" />
      </Field>

      <SectionLabel>Location</SectionLabel>
      <Field label="Site / Location name">
        <input type="text" value={site} onChange={e => setSite(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. Midrand Depot" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Street">
          <input type="text" value={street} onChange={e => setStreet(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
            placeholder="Street address" />
        </Field>
        <Field label="City">
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
            placeholder="City" />
        </Field>
      </div>

      <SectionLabel>Odometer</SectionLabel>
      <Field label="Current odometer reading (km)" required>
        <input type="number" inputMode="numeric" value={odometer} onChange={e => setOdometer(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. 45250" />
      </Field>
      <Field label="Next service odometer reading (km)">
        <input type="number" inputMode="numeric" value={nextServiceOdo} onChange={e => setNextSvcOdo(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. 60000" />
      </Field>
    </FormShell>
  )

  /* ── Step 1 — Condition Checks ──────────────────────────── */
  if (step === 1) return (
    <FormShell title="Daily Inspection" subtitle={stepSubtitle}
      onSubmit={handleSubmit} submitLabel="Continue →" error={error} progress={progress}>

      <SectionLabel>Roadworthiness</SectionLabel>
      <YesNo label="Is the car roadworthy?"
        value={isRoadworthy} onChange={setRoadworthy}
        comment={roadworthyComment} onComment={setRwComment}
        commentLabel="Describe what makes it unroadworthy…"
        alwaysComment />

      <SectionLabel>Exterior</SectionLabel>
      <Field label="Exterior condition">
        <input type="text" value={exteriorcondition} onChange={e => setExterior(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. Minor stone chips on bonnet, dented rear bumper" />
      </Field>

      <SectionLabel>Interior</SectionLabel>
      <Field label="Interior condition">
        <input type="text" value={interiorcondition} onChange={e => setInterior(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. Good, needs a wash, slight scratches" />
      </Field>
      <Field label="Interior condition comments">
        <textarea rows={2} value={interiorComments} onChange={e => setInteriorComments(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm resize-none focus:border-fleet-blue focus:outline-none"
          placeholder="Additional notes…" />
      </Field>

      <SectionLabel>Neatness</SectionLabel>
      <YesNo label="Is the vehicle in neat condition?" value={isneat} onChange={setNeat} />
    </FormShell>
  )

  /* ── Step 2 — Cleanliness & Lights ─────────────────────── */
  if (step === 2) return (
    <FormShell title="Daily Inspection" subtitle={stepSubtitle}
      onSubmit={handleSubmit} submitLabel="Continue →" error={error} progress={progress}>

      <SectionLabel>Cleanliness</SectionLabel>
      <YesNo label="Is the interior of the vehicle clean?"
        value={isInteriorClean} onChange={setClean}
        comment={cleanComment} onComment={setCleanComment}
        commentLabel="What needs cleaning?" alwaysComment />

      <Field label="Last wash date">
        <input type="date" value={lastwashdate} onChange={e => setWashDate(e.target.value)}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none" />
      </Field>

      <SectionLabel>Lights & mirrors</SectionLabel>
      <YesNo label="Are all mirrors working?"
        value={mirrorsWorking} onChange={setMirrors}
        comment={mirrorsComment} onComment={setMirrorsComment}
        commentLabel="Which mirror is faulty?" />

      <YesNo label="Are headlights working?" value={headlightsWorking} onChange={setHeadlights} />
    </FormShell>
  )

  /* ── Step 3 — Confirm & Sign ────────────────────────────── */
  return (
    <FormShell title="Daily Inspection" subtitle={stepSubtitle}
      onSubmit={handleSubmit}
      submitLabel={result === 1 ? '✓ Submit — Pass' : '⚠ Submit — Fail'}
      submitting={submitting} error={error} progress={100}>

      {/* Result banner */}
      <div className={`rounded-xl p-4 text-center ${result === 1 ? 'bg-[#DFF5E8]' : 'bg-[#FDE7E9]'}`}>
        <div className={`text-[32px] font-extrabold tracking-tight ${result === 1 ? 'text-[#0B7A45]' : 'text-[#C42D3A]'}`}>
          {result === 1 ? 'PASS' : 'FAIL'}
        </div>
        <div className={`text-[12px] font-semibold mt-1 ${result === 1 ? 'text-[#0B7A45]' : 'text-[#C42D3A]'}`}>
          {result === 1 ? 'Vehicle is cleared for the road' : `${failChecks} critical check${failChecks > 1 ? 's' : ''} failed`}
        </div>
      </div>

      {result === 2 && (
        <div className="flex gap-2.5 p-3 rounded-xl text-sm font-semibold bg-[#FDE7E9] text-[#C42D3A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
            <path d="M12 3l9.5 17h-19z"/><path d="M12 9v5M12 17.2v.1"/>
          </svg>
          Vehicle cannot be checked out. Your fleet manager will be notified automatically.
        </div>
      )}

      {/* Summary table */}
      <div className="bg-white border-[1.5px] border-fleet-line rounded-xl overflow-hidden">
        {[
          ['Vehicle', vehicle ? `${vehicle.new_vehiclemake} ${vehicle.new_vehiclemodel} · ${vehicle.new_registrationnumber}` : '—'],
          ['Odometer', odometer ? `${Number(odometer).toLocaleString()} km` : '—'],
          ['Location', [site, city].filter(Boolean).join(', ') || '—'],
          ['Roadworthy', isRoadworthy ? 'Yes' : 'No'],
          ['Neat', isneat ? 'Yes' : 'No'],
          ['Interior clean', isInteriorClean ? 'Yes' : 'No'],
          ['Mirrors', mirrorsWorking ? 'OK' : 'Faulty'],
          ['Headlights', headlightsWorking ? 'OK' : 'Faulty'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between items-center px-4 py-2.5 border-b border-[#EEF2F7] last:border-0">
            <span className="text-[12px] font-semibold text-fleet-ink-3">{k}</span>
            <span className="text-[12.5px] font-bold text-fleet-ink">{v}</span>
          </div>
        ))}
      </div>

      {/* Digital acknowledgement */}
      <div className="border-[1.5px] border-fleet-line rounded-xl p-4 bg-white">
        <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mb-2">
          Digital acknowledgement
        </div>
        <div className="text-[17px] font-semibold text-navy italic border-b border-dashed border-fleet-line pb-3 mb-2">
          {driver?.new_driverfullname ?? 'Driver'}
        </div>
        <div className="text-[10.5px] text-fleet-ink-3">
          I confirm these checks were carried out by me on {vehicle ? `${vehicle.new_registrationnumber}` : 'the assigned vehicle'} today.
        </div>
      </div>
    </FormShell>
  )
}
