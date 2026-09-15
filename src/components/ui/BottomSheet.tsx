import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Native-style slide-up action sheet with backdrop, drag handle and safe-area padding. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 animate-[sheet-backdrop_.2s_ease-out]"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-[20px] pb-safe shadow-[0_-8px_30px_rgba(16,24,40,0.15)] animate-[sheet-up_.22s_cubic-bezier(0.32,0.72,0,1)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-9 h-[5px] rounded-full bg-fleet-line" />
        </div>
        {title && (
          <div className="px-5 pt-1 pb-2 text-[13px] font-extrabold tracking-[0.3px] uppercase text-fleet-ink-3">
            {title}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
