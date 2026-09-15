import { useState } from 'react'
import { BottomSheet } from './BottomSheet'

export interface SelectOption<T extends string | number> {
  value: T
  label: string
}

interface SelectProps<T extends string | number> {
  value: T | ''
  onChange: (v: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  sheetTitle?: string
}

const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fleet-ink-3">
    <path d="M7 10l5 5 5-5" />
  </svg>
)

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fleet-blue">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

/** Native-feeling action-sheet picker — replaces raw <select> with a slide-up sheet. */
export function Select<T extends string | number>({
  value, onChange, options, placeholder = 'Select…', sheetTitle
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border-[1.5px] border-fleet-line rounded-xl p-3 text-sm bg-white text-left flex items-center justify-between gap-2 active:bg-[#F7F9FC] transition-colors"
      >
        <span className={selected ? 'text-fleet-ink font-medium' : 'text-fleet-ink-3'}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevron />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={sheetTitle}>
        <div className="pb-2">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left active:bg-[#F7F9FC] transition-colors border-b border-fleet-line last:border-b-0"
            >
              <span className={`text-[14.5px] ${o.value === value ? 'font-bold text-navy' : 'font-medium text-fleet-ink'}`}>
                {o.label}
              </span>
              {o.value === value && <IconCheck />}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full text-center py-3.5 font-bold text-[14px] text-fleet-ink-3 border-t-[6px] border-[#F7F9FC] active:bg-[#F7F9FC]"
        >
          Cancel
        </button>
      </BottomSheet>
    </>
  )
}
