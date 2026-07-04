import { useState } from 'react'
import type { StoryboardScene } from '../types/storyboard'
import StyleReferenceUploader from './StyleReferenceUploader'

const LIGHTING_OPTIONS = ['Golden Hour / Sunrise', 'Chiaroscuro / Cyber', 'Natural Daylight', 'Neon Noir', 'Moonlit']
const VALENCE_OPTIONS   = ['High-Contrast', 'Muted', 'Saturated', 'Monochrome']

interface Props {
  scene: StoryboardScene | null
  onReferenceChange: (url: string | null) => void
}

export default function StudioInspector({ scene, onReferenceChange }: Props) {
  const [swatchOverrides, setSwatchOverrides] = useState<Record<number, string>>({})
  const [lightingMood, setLightingMood]       = useState(LIGHTING_OPTIONS[0])
  const [colorValence, setColorValence]       = useState(VALENCE_OPTIONS[0])
  const [sunAngle, setSunAngle]               = useState(45)
  const [exposure, setExposure]               = useState(0.75)
  const [lens, setLens]                       = useState(24)

  const palette = scene?.color_palette ?? ['#2D1B69', '#00D4FF', '#D4A853']

  const selectClass = 'w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] text-[var(--text-base)]/70 focus:outline-none focus:border-[var(--gold)]/50 transition-all'

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/50">Inspector</span>
        <button className="text-[var(--text-base)]/20 hover:text-[var(--text-base)]/60 text-xs transition-all">∧</button>
      </div>

      <div className="p-4 space-y-6">

        {/* Current Lighting */}
        <section>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-3">Current Lighting</p>
          <select value={lightingMood} onChange={(e) => setLightingMood(e.target.value)} className={selectClass}>
            {LIGHTING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </section>

        {/* Sun Angle dial */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Sun Angle</p>
            <span className="text-xs font-mono text-[var(--gold)]/70">{sunAngle}°</span>
          </div>
          {/* Simple arc SVG dial */}
          <div className="flex justify-center">
            <div className="relative w-20 h-10 flex items-end justify-center">
              <svg width="80" height="50" viewBox="0 0 80 50" fill="none">
                <path d="M8 45 A32 32 0 0 1 72 45" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
                <path
                  d="M8 45 A32 32 0 0 1 72 45"
                  stroke="var(--gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="100"
                  strokeDashoffset={100 - (sunAngle / 180) * 100}
                />
                <circle cx={8 + ((sunAngle / 180) * 64)} cy={45 - Math.sin((sunAngle / 180) * Math.PI) * 32} r="4" fill="var(--gold)" />
              </svg>
            </div>
          </div>
          <input type="range" min={0} max={180} value={sunAngle} onChange={(e) => setSunAngle(+e.target.value)}
            className="w-full mt-2 accent-[var(--gold)]" />
        </section>

        {/* Exposure */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Exposure</p>
            <span className="text-xs font-mono text-[var(--gold)]/70">{exposure.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={exposure} onChange={(e) => setExposure(+e.target.value)}
            className="w-full accent-[var(--gold)]" />
        </section>

        {/* Lens */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Lens</p>
            <span className="text-xs font-mono text-[var(--gold)]/70">{lens}mm</span>
          </div>
          <input type="range" min={14} max={200} value={lens} onChange={(e) => setLens(+e.target.value)}
            className="w-full accent-[var(--gold)]" />
        </section>

        {/* Color Valence */}
        <section>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-2">Color Valence</p>
          <select value={colorValence} onChange={(e) => setColorValence(e.target.value)} className={selectClass}>
            {VALENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </section>

        {/* Palette swatches */}
        <section>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-2">Palette</p>
          <div className="grid grid-cols-4 gap-1.5">
            {palette.map((hex, i) => {
              const display = swatchOverrides[i] ?? hex
              return (
                <div key={i} className="relative group">
                  <div className="h-8 rounded" style={{ background: display }} />
                  <input type="color" value={display}
                    onChange={(e) => setSwatchOverrides((p) => ({ ...p, [i]: e.target.value }))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
              )
            })}
          </div>
        </section>

        {/* Style Reference */}
        <section className="border-t border-[var(--border)] pt-4">
          <StyleReferenceUploader onReferenceChange={onReferenceChange} />
        </section>
      </div>
    </div>
  )
}
