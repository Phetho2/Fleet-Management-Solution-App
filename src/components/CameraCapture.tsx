import { useRef, useState, useCallback, useEffect } from 'react'

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void
  onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setHasCamera(false)
      setError('Camera not available — use file picker below.')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [startCamera])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      setCaptured(canvas.toDataURL('image/jpeg'))
      setCapturedBlob(blob)
    }, 'image/jpeg', 0.85)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCaptured(ev.target?.result as string)
    reader.readAsDataURL(file)
    setCapturedBlob(file)
  }

  const confirm = () => {
    if (capturedBlob) {
      onCapture(capturedBlob)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }

  const retake = () => {
    setCaptured(null)
    setCapturedBlob(null)
    if (hasCamera) startCamera()
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 bg-black/80">
        <span className="text-white font-medium">Take Photo</span>
        <button onClick={onClose} className="text-white text-2xl leading-none">&times;</button>
      </div>

      {!captured ? (
        <>
          {hasCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="flex-1 object-cover w-full"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white space-y-4 p-6">
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg"
                >
                  Choose from Library
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          <div className="p-6 flex justify-center bg-black/80">
            {hasCamera ? (
              <button
                onClick={capture}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/20 active:scale-95 transition-transform"
              />
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg"
              >
                Select Photo
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <img src={captured} alt="Captured" className="flex-1 object-contain bg-black" />
          <div className="p-4 flex gap-3 bg-black/80">
            <button
              onClick={retake}
              className="flex-1 border border-white text-white py-3 rounded-lg"
            >
              Retake
            </button>
            <button
              onClick={confirm}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              Use Photo
            </button>
          </div>
        </>
      )}
    </div>
  )
}
