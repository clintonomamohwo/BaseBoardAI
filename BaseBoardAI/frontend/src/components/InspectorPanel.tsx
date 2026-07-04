import { useState } from 'react'
import type { StoryboardScene } from '../types/storyboard'
import StyleReferenceUploader from './StyleReferenceUploader'

const LIGHTING_OPTIONS = ['Chiaroscuro / Cyber', 'Natural Daylight', 'Neon Noir', 'Golden Hour']
const VALENCE_OPTIONS = ['High-Contrast', 'Muted', 'Saturated', 'Monochrome']

interface Props {
  scene: StoryboardScene | null
  onReferenceChange: (url: string | null) => void
}

export default function InspectorPanel({ scene, onReferenceChange }: Props) {
  const [swatchOverrides, setSwatchOverrides] = useState<Record<number, string>>({})
  const [lightingMood, setLightingMood] = useState(LIGHTING_OPTIONS[0])
  const [colorValence, setColorValence] = useState(VALENCE_OPTIONS[0])

  const palette = scene?.color_palette ?? ['#2D1B69', '#00D4FF', '#D4A853']

  function handleSwatchChange(index: number, value: string) {
    setSwatchOverrides((prev) => ({ ...prev, [index]: value }))
  }

  const selectClass = 'w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d0b14] px-2 py-1.5 focus:outline-none focus:border-[#00D4FF] transition-all'

  return (
    <div className="space-y-6 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-3">
          Director's Palette Inspector
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {palette.map((hex, i) => {
            const displayHex = swatchOverrides[i] ?? hex
            return (
              <div key={i} className="relative h-10 rounded-lg overflow-hidden shadow-inner">
                <div className="absolute inset-0" style={{ backgroundColor: displayHex }} />
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <span className="text-[9px] font-mono text-white mix-blend-difference">{displayHex}</span>
                </div>
                <input type="color" value={displayHex} onChange={(e) => handleSwatchChange(i, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          Cinematography Settings
        </label>
        <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-[#0d0b14]/50 space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lighting Mood</span>
            <select value={lightingMood} onChange={(e) => setLightingMood(e.target.value)} className={selectClass + ' text-[#2D1B69] dark:text-[#e2d9f3]'}>
              {LIGHTING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Color Valence</span>
            <select value={colorValence} onChange={(e) => setColorValence(e.target.value)} className={selectClass + ' text-[#00D4FF]'}>
              {VALENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
        <StyleReferenceUploader onReferenceChange={onReferenceChange} />
      </div>
    </div>
  )
}
