export interface CapturedPhoto {
  blob: Blob
  preview: string
}

interface PhotoFieldProps {
  photos: CapturedPhoto[]
  onAdd: () => void
  onRemove: (index: number) => void
  label?: string
  hint?: string
}

export function PhotoField({ photos, onAdd, onRemove, label = 'Photos', hint }: PhotoFieldProps) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold text-navy mb-1.5">{label}</label>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img src={p.preview} alt="" className="w-full h-20 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="w-full border-2 border-dashed border-fleet-line rounded-xl py-4 text-fleet-ink-3 text-sm font-semibold hover:border-fleet-blue hover:text-fleet-blue transition-colors"
      >
        + Add photo
      </button>
      {hint && <div className="text-[10.5px] text-fleet-ink-3 mt-1">{hint}</div>}
    </div>
  )
}
