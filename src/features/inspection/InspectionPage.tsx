import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient, getDataverseToken } from '../../api/dataverseClient'
import { TABLES, ENTITY_LOGICAL } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { Select } from '../../components/ui/Select'
import { CameraCapture } from '../../components/CameraCapture'
import { PhotoField, type CapturedPhoto } from '../../components/PhotoField'
import { useDriver } from '../../context/DriverContext'
import { useShift } from '../../context/ShiftContext'
import { useLastOdometer } from '../../hooks/useLastOdometer'
import { assessInspectionPhoto } from '../../utils/aiDescribe'

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

/** Pill-style single-choice picker for Picklist columns */
function ChoicePicker({ value, onChange, options }: {
  value: number | ''
  onChange: (v: number) => void
  options: Array<{ value: number; label: string }>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-2 rounded-xl text-[12px] font-bold border-[1.5px] transition-colors ${
            value === o.value ? 'bg-navy text-white border-navy' : 'bg-white text-fleet-ink border-fleet-line'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Step definitions ─────────────────────────────────────── */
const STEPS = ['Location & odometer', 'Condition checks', 'Cleanliness & lights', 'Confirm & sign']

// Confirmed against Dataverse's new_dailyinspection.new_inspectiontitle picklist —
// it only accepts 100000000-100000003 (a 5th "Weekly Inspection" guess was invalid
// and rejected by the server). Labels are still guesses; verify via Profile →
// "Discover picklist option values" if they don't match what the org actually uses.
const INSPECTION_TITLES = [
  { value: 100000000, label: 'Pre-Trip Inspection' },
  { value: 100000001, label: 'Post-Trip Inspection' },
  { value: 100000002, label: 'Morning Inspection' },
  { value: 100000003, label: 'End-of-Day Inspection' },
]

const CONDITION_OPTIONS = [
  { value: 100000000, label: 'Good' },
  { value: 100000001, label: 'Fair' },
  { value: 100000002, label: 'Poor' },
]

const SITE_LOCATIONS = [
  { value: 100000000, label: 'Head Office' },
  { value: 100000001, label: 'Depot' },
  { value: 100000002, label: 'Client Site' },
  { value: 100000003, label: 'Other' },
]

export function InspectionPage() {
  const { instance } = useMsal()
  const { driver, vehicle, lastService } = useDriver()
  const { setShift } = useShift()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)

  // Step 0 — title, location & odometer
  const [title, setTitle]             = useState<number | ''>('')
  const [site, setSite]               = useState<number | ''>('')
  const [odometer, setOdometer]       = useState('')
  const [odometerAuto, setOdometerAuto] = useState(false)
  const [nextServiceOdo, setNextSvcOdo] = useState('')
  const [nextServiceOdoAuto, setNextServiceOdoAuto] = useState(false)

  // Suggest the last known odometer reading instead of making the driver
  // retype it from scratch — only applies if they haven't typed anything yet.
  const { lastOdometer } = useLastOdometer()
  useEffect(() => {
    if (lastOdometer != null && !odometer) {
      setOdometer(String(lastOdometer))
      setOdometerAuto(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOdometer])

  // The vehicle's next service mileage is already fetched by DriverContext —
  // reuse it instead of asking the driver to know/type it themselves.
  useEffect(() => {
    if (lastService?.new_nextservicemileage != null && !nextServiceOdo) {
      setNextSvcOdo(String(lastService.new_nextservicemileage))
      setNextServiceOdoAuto(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastService])

  // Step 1 — condition checks
  const [exteriorcondition, setExterior]      = useState<number | ''>('')
  const [exteriorAuto, setExteriorAuto]       = useState(false)
  const [interiorcondition, setInterior]      = useState<number | ''>('')
  const [interiorAuto, setInteriorAuto]       = useState(false)
  const [interiorComments, setInteriorComments] = useState('')
  const [commentsAuto, setCommentsAuto]       = useState(false)
  const [isneat, setNeat]                     = useState<boolean | undefined>()
  const [neatAuto, setNeatAuto]               = useState(false)
  const [showCamera, setShowCamera]           = useState(false)
  const [photos, setPhotos]                   = useState<CapturedPhoto[]>([])
  const [analyzingPhoto, setAnalyzingPhoto]   = useState(false)

  const conditionValueForLabel = (label: 'Good' | 'Fair' | 'Poor') =>
    CONDITION_OPTIONS.find(o => o.label === label)?.value ?? ''

  // Each new photo is assessed by AI and only fills fields that are still
  // unset — an exterior shot won't touch interior fields and vice versa, and
  // nothing here ever overwrites a choice the driver already made themselves.
  const handlePhotoCaptured = async (blob: Blob) => {
    setPhotos(p => [...p, { blob, preview: URL.createObjectURL(blob) }])
    setShowCamera(false)
    setAnalyzingPhoto(true)
    try {
      const token = await getDataverseToken(instance)
      const result = await assessInspectionPhoto(blob, token)
      if (result) {
        if (result.exteriorCondition && !exteriorcondition) {
          setExterior(conditionValueForLabel(result.exteriorCondition))
          setExteriorAuto(true)
        }
        if (result.interiorCondition && !interiorcondition) {
          setInterior(conditionValueForLabel(result.interiorCondition))
          setInteriorAuto(true)
        }
        if (result.comments && !interiorComments) {
          setInteriorComments(result.comments)
          setCommentsAuto(true)
        }
        if (result.isNeat !== null && isneat === undefined) {
          setNeat(result.isNeat)
          setNeatAuto(true)
        }
      }
    } catch {
      // AI assessment is a convenience only — never surface this as a form error
    } finally {
      setAnalyzingPhoto(false)
    }
  }

  // Step 2 — cleanliness & lights
  const [isInteriorClean, setClean]         = useState<boolean | undefined>()
  const [cleanComment, setCleanComment]     = useState('')
  const [lastwashdate, setWashDate]         = useState('')
  const [mirrorsWorking, setMirrors]        = useState<boolean | undefined>()
  const [headlightsWorking, setHeadlights]  = useState<boolean | undefined>()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Determine pass/fail: fail if any required check is false
  const failChecks = [mirrorsWorking, headlightsWorking].filter(v => v === false).length
const result = failChecks > 0 ? 2 : 1   // 1=Pass, 2=Fail

  const validateStep = () => {
    if (step === 0 && !title) { setError('Inspection title is required.'); return false }
    if (step === 0 && !odometer) { setError('Odometer reading is required.'); return false }
    if (step === 1 && isneat === undefined) {
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

      const body: Record<string, unknown> = {
        new_inspectiontitle:                title || undefined,
        new_currentodometerreadingkm:       odometer ? Number(odometer) : undefined,
        new_nextserviceodometerreadingkm:   nextServiceOdo ? Number(nextServiceOdo) : undefined,
        new_sitelocationname:               site || undefined,
        new_exteriorcondition:              exteriorcondition || undefined,
        new_interiorcondition:              interiorcondition || undefined,
        new_interiorconditioncomments:      interiorComments || undefined,
        new_isthevehicleinneatcondition:    isneat,
        new_istheinteriorofthevehicleclean: isInteriorClean,
        new_whatneedscleaning:              cleanComment || undefined,
        new_lastwashdate:                   lastwashdate
                                              ? new Date(lastwashdate + 'T00:00:00').toISOString()
                                              : undefined,
        new_areallmirrorsworking:           mirrorsWorking,
        new_areheadlightsworking:           headlightsWorking,
        // new_drivername / new_vehiclename are read-only lookup-name companion
        // columns (same pattern as ownerid/owneridname) — Dataverse populates
        // them automatically from the bound lookups below, they can't be set directly.
        'new_Driver@odata.bind':             `/new_drivers(${driver.new_driverid})`,
        ...(vehicle ? { 'new_Vehicle@odata.bind': `/new_vehiclerecords(${vehicle.new_vehiclerecordid})` } : {}),
      }
      const id = await client.create(TABLES.inspections, body)
      if (id && photos.length) {
        try {
          await Promise.all(
            photos.map((p, i) => client.uploadPhoto(TABLES.inspections, ENTITY_LOGICAL.inspections, id, p.blob, i))
          )
        } catch {
          // Record already saved — don't block on photo upload failures
        }
      }
      setShift(result === 1 ? 'inspected' : 'not-started')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (showCamera) {
    return <CameraCapture onCapture={handlePhotoCaptured} onClose={() => setShowCamera(false)} />
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
        <Select
          value={title}
          onChange={setTitle}
          options={INSPECTION_TITLES}
          placeholder="Select inspection type…"
          sheetTitle="Inspection type"
        />
      </Field>

      <SectionLabel>Location</SectionLabel>
      <Field label="Site / Location name">
        <Select
          value={site}
          onChange={setSite}
          options={SITE_LOCATIONS}
          placeholder="Select a location…"
          sheetTitle="Site / location"
        />
      </Field>

      <SectionLabel>Odometer</SectionLabel>
      <Field
        label="Current odometer reading (km)" required
        hint={odometerAuto ? 'Prefilled from the last recorded reading — please confirm it\'s correct' : undefined}
      >
        <input type="number" inputMode="numeric" value={odometer}
          onChange={e => { setOdometer(e.target.value); setOdometerAuto(false) }}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. 45250" />
      </Field>
      <Field
        label="Next service odometer reading (km)"
        hint={nextServiceOdoAuto ? 'Prefilled from the vehicle\'s last service record — please confirm it\'s correct' : undefined}
      >
        <input type="number" inputMode="numeric" value={nextServiceOdo}
          onChange={e => { setNextSvcOdo(e.target.value); setNextServiceOdoAuto(false) }}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
          placeholder="e.g. 60000" />
      </Field>
    </FormShell>
  )

  /* ── Step 1 — Condition Checks ──────────────────────────── */
  if (step === 1) return (
    <FormShell title="Daily Inspection" subtitle={stepSubtitle}
      onSubmit={handleSubmit} submitLabel="Continue →" error={error} progress={progress}>

      <PhotoField
        label="Vehicle photo"
        hint="Photograph the exterior and/or interior — the AI will suggest condition ratings and comments from it"
        photos={photos}
        onAdd={() => setShowCamera(true)}
        onRemove={i => setPhotos(p => p.filter((_, idx) => idx !== i))}
      />
      {analyzingPhoto && (
        <div className="text-[10.5px] text-fleet-ink-3 font-semibold -mt-1">🤖 Analyzing photo…</div>
      )}

      <SectionLabel>Exterior</SectionLabel>
      <Field
        label="Exterior condition"
        hint={exteriorAuto ? '🤖 AI-suggested from your photo — tap to change' : undefined}
      >
        <ChoicePicker value={exteriorcondition}
          onChange={v => { setExterior(v); setExteriorAuto(false) }}
          options={CONDITION_OPTIONS} />
      </Field>

      <SectionLabel>Interior</SectionLabel>
      <Field
        label="Interior condition"
        hint={interiorAuto ? '🤖 AI-suggested from your photo — tap to change' : undefined}
      >
        <ChoicePicker value={interiorcondition}
          onChange={v => { setInterior(v); setInteriorAuto(false) }}
          options={CONDITION_OPTIONS} />
      </Field>
      <Field
        label="Interior condition comments"
        hint={commentsAuto ? '🤖 AI-suggested from your photo — please review and edit as needed' : undefined}
      >
        <textarea rows={2} value={interiorComments}
          onChange={e => { setInteriorComments(e.target.value); setCommentsAuto(false) }}
          className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm resize-none focus:border-fleet-blue focus:outline-none"
          placeholder="Additional notes…" />
      </Field>

      <SectionLabel>Neatness</SectionLabel>
      <YesNo label="Is the vehicle in neat condition?" value={isneat}
        onChange={v => { setNeat(v); setNeatAuto(false) }} />
      {neatAuto && (
        <div className="text-[10.5px] text-fleet-blue font-semibold -mt-1">
          🤖 AI-suggested from your photo — please review
        </div>
      )}
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
      <YesNo label="Are all mirrors working?" value={mirrorsWorking} onChange={setMirrors} />
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
          ['Location', SITE_LOCATIONS.find(s => s.value === site)?.label ?? '—'],
          ['Exterior', CONDITION_OPTIONS.find(c => c.value === exteriorcondition)?.label ?? '—'],
          ['Interior', CONDITION_OPTIONS.find(c => c.value === interiorcondition)?.label ?? '—'],
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
