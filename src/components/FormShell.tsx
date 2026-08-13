import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface FormShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  submitLabel?: string
  submitting?: boolean
  error?: string | null
  success?: string | null
  /** progress 0-100, shows progress bar instead of accent line */
  progress?: number
}

export function FormShell({
  title, subtitle, children, onSubmit, submitLabel = 'Submit',
  submitting = false, error, success, progress
}: FormShellProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col">
      {/* Top bar */}
      <header className="bg-navy text-white sticky top-0 z-10 pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg text-[#B9C8E4] hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[17px] leading-tight tracking-[-0.2px]">{title}</div>
            {subtitle && (
              <div className="text-[11.5px] text-[#8FA8D4] mt-0.5">{subtitle}</div>
            )}
          </div>
        </div>
        {/* Progress bar or accent line */}
        {progress !== undefined ? (
          <div className="h-1 bg-white/15">
            <div className="h-full bg-fleet-blue transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <div className="h-1 bg-fleet-blue" />
        )}
      </header>

      <form onSubmit={onSubmit} className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-[#DFF5E8] border border-[#0B7A45]/20 text-[#0B7A45] rounded-xl p-3 text-sm flex gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            {success}
          </div>
        )}
        {children}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-fleet-blue hover:bg-fleet-blue-dk disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-[14.5px] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Submitting…
            </>
          ) : submitLabel}
        </button>
      </form>
    </div>
  )
}
