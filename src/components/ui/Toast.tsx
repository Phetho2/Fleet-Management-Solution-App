import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ToastKind = 'success' | 'error'
interface ToastState { id: number; message: string; kind: ToastKind }

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.4" strokeLinecap="round" className="shrink-0">
    <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.1" />
  </svg>
)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, kind })
    timer.current = setTimeout(() => {
      setToast(current => (current?.id === id ? null : current))
    }, 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && createPortal(
        <div
          key={toast.id}
          className={`fixed left-1/2 z-[60] bottom-[calc(5rem+env(safe-area-inset-bottom))] max-w-[92vw] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-[13.5px] font-semibold animate-[toast-up_.22s_ease-out] ${
            toast.kind === 'success' ? 'bg-navy text-white' : 'bg-[#C42D3A] text-white'
          }`}
          style={{ transform: 'translateX(-50%)' }}
        >
          {toast.kind === 'success' ? <IconCheck /> : <IconAlert />}
          <span>{toast.message}</span>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
