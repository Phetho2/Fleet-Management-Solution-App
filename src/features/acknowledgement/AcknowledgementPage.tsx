import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { FormShell } from '../../components/FormShell'
import { SignaturePad } from '../../components/SignaturePad'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'

const ACK_TYPES = [
  'Vehicle Usage Policy',
  'Road Safety Pledge',
  'Incident Reporting Policy',
  'Fuel Card Policy',
].map(t => ({ value: t, label: t }))

export function AcknowledgementPage() {
  const { instance } = useMsal()
  const toast = useToast()
  const [selectedType, setSelectedType] = useState(ACK_TYPES[0].value)
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signature) { setError('Please provide your signature before submitting.'); return }
    setSubmitting(true); setError(null); setSuccess(null)
    try {
      const client = createDataverseClient(instance)
      await client.create('new_acknowledgements', {
        new_type: selectedType,
        new_date: new Date().toISOString(),
        new_signaturebase64: signature.split(',')[1]
      })
      setSuccess('Acknowledgement recorded.')
      toast('Acknowledgement recorded.')
      setSignature(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormShell title="Digital Acknowledgement" onSubmit={handleSubmit}
      submitting={submitting} error={error} success={success}>
      <div>
        <label className="block text-[11.5px] font-bold text-navy mb-1.5">Document</label>
        <Select
          value={selectedType}
          onChange={setSelectedType}
          options={ACK_TYPES}
          sheetTitle="Document"
        />
      </div>
      <div className="bg-fleet-blue-tint border border-[#0F6FEE]/20 rounded-xl p-4 text-sm text-fleet-ink-2">
        I acknowledge that I have read and understood the <strong className="text-navy">{selectedType}</strong> and agree to comply with all requirements stated therein.
      </div>
      {signature ? (
        <div>
          <label className="block text-[11.5px] font-bold text-navy mb-1.5">Signature</label>
          <div className="border-[1.5px] border-fleet-line rounded-xl overflow-hidden">
            <img src={signature} alt="Signature" className="w-full bg-white" />
          </div>
          <button type="button" onClick={() => setSignature(null)}
            className="mt-2 text-sm font-semibold text-[#C42D3A]">
            Clear signature
          </button>
        </div>
      ) : (
        <SignaturePad onSign={setSignature} height={180} />
      )}
    </FormShell>
  )
}
