import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

interface VehicleScannerProps {
  /** Called with the decoded text every time a barcode/QR code is found. */
  onResult: (text: string) => void
  onClose: () => void
}

/**
 * Full-screen live scanner for the VIN barcode or QR sticker on a vehicle.
 * Decodes continuously from the camera stream — call onClose once you've
 * got a usable result, scanning doesn't stop itself.
 */
export function VehicleScanner({ onResult, onClose }: VehicleScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current!,
      (result, err) => {
        if (cancelled) return
        if (result) onResult(result.getText())
        // NotFoundException fires continuously while no code is in frame — expected, ignore it.
        else if (err && !(err instanceof NotFoundException)) setError('Scanning error — try again.')
      }
    ).catch(() => setError('Camera not available for scanning.'))

    return () => {
      cancelled = true
      reader.reset()
    }
  }, [onResult])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 bg-black/80">
        <span className="text-white font-medium">Scan vehicle VIN / QR</span>
        <button onClick={onClose} className="text-white text-2xl leading-none">&times;</button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-white text-sm p-6 text-center">{error}</div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[78%] max-w-sm aspect-[3/1] border-2 border-white/80 rounded-lg" />
          </div>
        </div>
      )}

      <div className="p-4 bg-black/80 text-center text-white text-xs">
        Point the camera at the VIN barcode or QR sticker on the vehicle
      </div>
    </div>
  )
}
