import { useRef, useState, useEffect, useCallback } from 'react'

interface SignaturePadProps {
  onSign: (dataUrl: string) => void
  width?: number
  height?: number
}

export function SignaturePad({ onSign, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    e.preventDefault()
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setIsEmpty(false)
    }
    lastPos.current = pos
  }, [drawing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('touchmove', draw, { passive: false })
    return () => {
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('touchmove', draw)
    }
  }, [draw])

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    lastPos.current = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
  }

  const endDraw = () => {
    setDrawing(false)
    lastPos.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const exportSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return
    onSign(canvas.toDataURL('image/png'))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Signature</label>
      <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden" style={{ height }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={height}
          className="w-full h-full touch-none"
          onMouseDown={startDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="text-sm text-gray-500 border border-gray-300 px-3 py-1 rounded"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={exportSignature}
          disabled={isEmpty}
          className="text-sm bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-40"
        >
          Confirm Signature
        </button>
      </div>
    </div>
  )
}
