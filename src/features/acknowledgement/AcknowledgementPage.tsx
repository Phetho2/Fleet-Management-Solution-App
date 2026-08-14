import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../../api/dataverseClient'
import { FormShell } from '../../components/FormShell'
import { SignaturePad } from '../../components/SignaturePad'

const ACK_TYPES = [
  'Vehicle Usage Policy',
  'Road Safety Pledge',
  'Incident Reporting Policy',
  'Fuel Card Policy',
]

export function AcknowledgementPage() {
  const { instance } = useMsal()
  const [selectedType, setSelectedType] = useState(ACK_TYPES[0])
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
        <select value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white">
          {ACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        I acknowledge that I have read and understood the <strong>{selectedType}</strong> and agree to comply with all requirements stated therein.
      </div>
      {signature ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <img src={signature} alt="Signature" className="w-full bg-white" />
          </div>
          <button type="button" onClick={() => setSignature(null)}
            className="mt-2 text-sm text-red-600">
            Clear signature
          </button>
        </div>
      ) : (
        <SignaturePad onSign={setSignature} height={180} />
      )}
    </FormShell>
  )
}
