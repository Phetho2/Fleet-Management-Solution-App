import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { TABLES } from '../../api/tables'
import { FormShell } from '../../components/FormShell'
import { CameraCapture } from '../../components/CameraCapture'
import { useDriver } from '../../context/DriverContext'

const INCIDENT_TYPES = [
  { value: 1, label: 'Accident' },
  { value: 2, label: 'Damage' },
  { value: 3, label: 'Theft' },
  { value: 4, label: 'Vandalism' },
  { value: 5, label: 'Near miss' },
]

const VEHICLE_STATUS_OPTIONS = [
  { value: 1, label: 'Running',     sub: 'Vehicle can still be driven',   color: 'green' },
  { value: 2, label: 'Not Running', sub: 'Vehicle cannot be driven',       color: 'red' },
  { value: 3, label: 'Written Off', sub: 'Vehicle is a total loss',        color: 'red' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-extrabold tracking-[1.1px] uppercase text-fleet-ink-3 mt-2">
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

export function IncidentPage() {
  const { instance } = useMsal()
  const { driver, vehicle } = useDriver()
  const navigate = useNavigate()

  // Step 1 — what happened
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [incidentType, setIncidentType]         = useState(1)
  const [location, setLocation]                 = useState('')
  const [description, setDescription]           = useState('')
  const [causeOfAccident, setCauseOfAccident]   = useState('')
  const [vehicleStatus, setVehicleStatus]       = useState<number>(1)

  // Step 2 — other parties
  const [injuries, setInjuries]                 = useState(false)
  const [thirdParty, setThirdParty]             = useState(false)
  const [thirdPartyName, setThirdPartyName]     = useState('')
  const [thirdPartyVehicle, setThirdPartyVehicle] = useState('')
  const [thirdPartyContact, setThirdPartyContact] = useState('')
  const [policeCaseNumber, setPoliceCaseNumber] = useState('')

  // Step 3 — photos
  const [showCamera, setShowCamera]             = useState(false)
  const [photoBlob, setPhotoBlob]               = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview]         = useState<string | null>(null)

  const [submitting, setSubmitting]             = useState(false)
  const [error, setError]                       = useState<string | null>(null)

  const handleCapture = (blob: Blob) => {
    setPhotoBlob(blob)
    setPhotoPreview(URL.createObjectURL(blob))
    setShowCamera(false)
  }

  const goNext = () => {
    if (step === 1) {
      if (!location.trim() || !description.trim()) {
        setError('Location and description are required.'); return
      }
      setError(null); setStep(2)
    } else if (step === 2) {
      setError(null); setStep(3)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver) { setError('Driver profile not loaded.'); return }

    setSubmitting(true); setError(null)
    try {
      const client = createDataverseClient(instance)

      let photoBase64: string | undefined
      if (photoBlob) {
        photoBase64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload  = ev => res((ev.target?.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(photoBlob)
        })
      }

      const incidentTypeLabel = INCIDENT_TYPES.find(t => t.value === incidentType)?.label ?? 'Incident'

      const body: Record<string, unknown> = {
        new_accidenttitle:            `${incidentTypeLabel} — ${new Date().toLocaleDateString('en-ZA')}`,
        new_accidentcause:            causeOfAccident ? causeOfAccident.slice(0, 100) : undefined,
        new_vehiclestatus:            vehicleStatus,
        new_insuranceapprovalstatus:  1,   // Awaiting Assessment — admin updates this
        new_policecasenumber:             policeCaseNumber || null,
        'new_DriverRecord@odata.bind':    `/new_drivers(${driver.new_driverid})`,
        ...(vehicle ? { 'new_Vehicle@odata.bind': `/new_vehiclerecords(${vehicle.new_vehiclerecordid})` } : {}),
      }

      await client.create(TABLES.incidents, body)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (showCamera) {
    return <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />
  }

  const progress = (step / 3) * 100

  /* ── Step 1 ──────────────────────────────── */
  if (step === 1) {
    return (
      <FormShell
        title="Report Incident"
        subtitle={`Step 1 of 3 · What happened`}
        onSubmit={e => { e.preventDefault(); goNext() }}
        submitLabel="Continue →"
        error={error}
        progress={progress}
      >
        {/* Safety alert */}
        <div className="flex gap-2.5 p-3 rounded-xl text-sm font-semibold leading-snug bg-[#FDE7E9] text-[#C42D3A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
            <path d="M12 3l9.5 17h-19z"/><path d="M12 9v5M12 17.2v.1"/>
          </svg>
          If anyone is injured, call 10111 first before submitting.
        </div>

        <SectionLabel>Incident type</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {INCIDENT_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => setIncidentType(t.value)}
              className={`px-3 py-2 rounded-xl text-[12px] font-bold border-[1.5px] transition-colors ${
                incidentType === t.value ? 'bg-navy text-white border-navy' : 'bg-white text-fleet-ink border-fleet-line'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <Field label="Location" required>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
            placeholder="e.g. N1 highway near Kyalami off-ramp" />
        </Field>

        <Field label="Cause of accident" hint="What led to the incident?">
          <input type="text" value={causeOfAccident} onChange={e => setCauseOfAccident(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
            placeholder="e.g. Rear-end collision, pothole, tyre blowout" />
        </Field>

        <Field label="Description" required>
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm resize-none focus:border-fleet-blue focus:outline-none"
            placeholder="In your own words — describe exactly what happened" />
        </Field>

        <SectionLabel>Vehicle condition after incident</SectionLabel>
        <div className="space-y-2">
          {VEHICLE_STATUS_OPTIONS.map(s => {
            const isSelected = vehicleStatus === s.value
            const cls = isSelected
              ? s.color === 'green'
                ? 'bg-[#DFF5E8] border-[#0B7A45] text-[#0B7A45]'
                : 'bg-[#FDE7E9] border-[#C42D3A] text-[#C42D3A]'
              : 'bg-white border-fleet-line text-fleet-ink'
            return (
              <button key={s.value} type="button" onClick={() => setVehicleStatus(s.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] text-left transition-colors ${cls}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-current' : 'border-fleet-line'}`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <div>
                  <div className="font-bold text-[13px]">{s.label}</div>
                  <div className="text-[11px] opacity-75">{s.sub}</div>
                </div>
              </button>
            )
          })}
        </div>
      </FormShell>
    )
  }

  /* ── Step 2 ──────────────────────────────── */
  if (step === 2) {
    return (
      <FormShell
        title="Report Incident"
        subtitle="Step 2 of 3 · Other parties"
        onSubmit={e => { e.preventDefault(); goNext() }}
        submitLabel="Continue →"
        error={error}
        progress={progress}
      >
        <SectionLabel>Injuries & third parties</SectionLabel>
        <div className="space-y-3">
          {[
            { label: 'Injuries involved', value: injuries, set: setInjuries },
            { label: 'Third party involved', value: thirdParty, set: setThirdParty },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => set(!value)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${value ? 'bg-fleet-blue border-fleet-blue' : 'border-fleet-line bg-white'}`}>
                {value && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </div>
              <span className="text-[13.5px] font-semibold text-fleet-ink">{label}</span>
            </label>
          ))}
        </div>

        {thirdParty && (
          <>
            <SectionLabel>Third party details</SectionLabel>
            <Field label="Full name">
              <input type="text" value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)}
                className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
                placeholder="Third party full name" />
            </Field>
            <Field label="Vehicle & registration">
              <input type="text" value={thirdPartyVehicle} onChange={e => setThirdPartyVehicle(e.target.value)}
                className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
                placeholder="e.g. VW Polo · GP 44 KL PL" />
            </Field>
            <Field label="Contact number">
              <input type="tel" inputMode="tel" value={thirdPartyContact} onChange={e => setThirdPartyContact(e.target.value)}
                className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm focus:border-fleet-blue focus:outline-none"
                placeholder="Phone number" />
            </Field>
          </>
        )}

        <SectionLabel>Police</SectionLabel>
        <Field label="Police case number" hint="Leave blank if not applicable">
          <input type="text" value={policeCaseNumber} onChange={e => setPoliceCaseNumber(e.target.value)}
            className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm font-mono focus:border-fleet-blue focus:outline-none"
            placeholder="e.g. CAS 45/07/2026" />
        </Field>
      </FormShell>
    )
  }

  /* ── Step 3 ──────────────────────────────── */
  return (
    <FormShell
      title="Report Incident"
      subtitle="Step 3 of 3 · Photo evidence & submit"
      onSubmit={handleSubmit}
      submitLabel="Submit incident report"
      submitting={submitting}
      error={error}
      progress={progress}
    >
      {/* Summary card */}
      <div className="bg-[#EAF2FE] border border-[#0F6FEE]/20 rounded-xl p-3 space-y-1">
        <div className="text-[11px] font-extrabold tracking-wide uppercase text-[#0A57C2] mb-2">Summary</div>
        {[
          ['Type',      INCIDENT_TYPES.find(t => t.value === incidentType)?.label ?? '—'],
          ['Location',  location],
          ['Cause',     causeOfAccident || '—'],
          ['Vehicle',   VEHICLE_STATUS_OPTIONS.find(s => s.value === vehicleStatus)?.label ?? '—'],
          ['Police no.', policeCaseNumber || 'N/A'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-[12px] text-[#0A57C2]">
            <span className="font-semibold opacity-70">{k}</span>
            <span className="font-bold text-right max-w-[60%] truncate">{v}</span>
          </div>
        ))}
      </div>

      <Field label="Photo evidence" hint="Photograph the damage, scene, and third party vehicle if applicable">
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="Evidence" className="w-full rounded-xl object-cover max-h-52" />
            <button type="button"
              onClick={() => { setPhotoBlob(null); setPhotoPreview(null) }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
              ×
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCamera(true)}
            className="w-full border-2 border-dashed border-fleet-line rounded-xl py-8 text-fleet-ink-3 text-sm font-semibold hover:border-fleet-blue hover:text-fleet-blue transition-colors">
            + Add photo
          </button>
        )}
      </Field>

      {/* Insurance note */}
      <div className="flex gap-2.5 p-3 rounded-xl text-[12px] font-semibold bg-[#FEF1DC] text-[#B0700B]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>
        </svg>
        Insurance approval and cost of repair will be assessed and updated by your fleet manager.
      </div>
    </FormShell>
  )
}
