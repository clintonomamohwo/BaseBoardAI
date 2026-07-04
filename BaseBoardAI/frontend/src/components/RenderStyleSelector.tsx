import type { RenderStyle } from '../types/storyboard'

const OPTIONS: { value: RenderStyle; label: string }[] = [
  { value: 'bw_sketch', label: 'B&W Sketch' },
  { value: 'flat_color', label: 'Flat Color' },
  { value: 'full_shaded', label: 'Full Shaded' },
]

interface Props {
  value: RenderStyle
  onChange: (style: RenderStyle) => void
}

export default function RenderStyleSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            value === opt.value
              ? 'bg-[#2D1B69] text-white'
              : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#00D4FF]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
