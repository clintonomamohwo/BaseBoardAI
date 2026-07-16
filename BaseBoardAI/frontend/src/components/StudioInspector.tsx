import { useState } from 'react'
import type { ProjectCanon, StoryboardScene, StoryboardFrame } from '../types/storyboard'
import StyleReferenceUploader from './StyleReferenceUploader'
import ShotPlanner from './ShotPlanner'

const LIGHTING_OPTIONS = ['Golden Hour / Sunrise', 'Chiaroscuro / Cyber', 'Natural Daylight', 'Neon Noir', 'Moonlit']
const VALENCE_OPTIONS   = ['High-Contrast', 'Muted', 'Saturated', 'Monochrome']

// Cinematic fields managed by the Director / Cinematic Brain
const CINEMATIC_FIELDS: { key: string; label: string }[] = [
  { key: 'shot_type',       label: 'Shot Type' },
  { key: 'camera_angle',    label: 'Camera Angle' },
  { key: 'camera_movement', label: 'Camera Movement' },
  { key: 'lighting_notes',  label: 'Lighting' },
  { key: 'mood',            label: 'Mood' },
  { key: 'purpose',         label: 'Purpose' },
]

interface Props {
  scene: StoryboardScene | null
  /** Currently selected frame — used to show Cinematic Brain decisions */
  frame?: StoryboardFrame | null
  onReferenceChange: (url: string | null) => void
  /** Called when the user locks or unlocks a cinematic field on the current frame */
  onToggleLock?: (frameNumber: number, fieldKey: string, locked: boolean) => void
  canon?: ProjectCanon | null
}

export default function StudioInspector({ scene, frame, onReferenceChange, onToggleLock, canon }: Props) {
  const [swatchOverrides, setSwatchOverrides] = useState<Record<number, string>>({})
  const [lightingMood, setLightingMood]       = useState(LIGHTING_OPTIONS[0])
  const [colorValence, setColorValence]       = useState(VALENCE_OPTIONS[0])
  const [sunAngle, setSunAngle]               = useState(45)
  const [exposure, setExposure]               = useState(0.75)
  const [lens, setLens]                       = useState(24)
  const [shotPlannerOpen, setShotPlannerOpen] = useState(false)
  const [directorNotesOpen, setDirectorNotesOpen] = useState(true)

  const palette  = scene?.color_palette ?? ['#2D1B69', '#00D4FF', '#D4A853']
  const selectClass = 'w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] text-[var(--text-base)]/70 focus:outline-none focus:border-[var(--gold)]/50 transition-all'
  const sceneKey = scene?.scene_number ?? 'empty'

  // Frame-level cinematic data
  const autoSelected: Record<string, boolean>  = frame?.auto_selected  ?? {}
  const rationale:    Record<string, string>   = frame?.director_rationale ?? {}
  const lockedFields: string[]                 = frame?.locked_fields  ?? []

  function isAutoSelected(key: string) { return !!autoSelected[key] }
  function isLocked(key: string)       { return lockedFields.includes(key) }

  function handleToggleLock(key: string) {
    if (!frame || !onToggleLock) return
    onToggleLock(frame.frame_number, key, !isLocked(key))
  }

  // Get the current value of a frame cinematic field
  function fieldValue(key: string): string {
    if (!frame) return '—'
    const v = (frame as Record<string, unknown>)[key]
    return (v && String(v).trim()) ? String(v) : '—'
  }

  // How many fields were auto-selected for the current frame
  const autoCount = Object.values(autoSelected).filter(Boolean).length
  const totalCinematicFields = CINEMATIC_FIELDS.length
  const allRationale = Object.entries(rationale).filter(([, v]) => v)

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/50">Inspector</span>
        <button className="text-[var(--text-base)]/20 hover:text-[var(--text-base)]/60 text-xs transition-all">∧</button>
      </div>

      <div key={sceneKey} className="p-4 space-y-6 bms-inspector-enter">

        {/* ── Director Notes Panel ──────────────────────────────────────────── */}
        {frame && (
          <section>
            <button
              type="button"
              onClick={() => setDirectorNotesOpen(o => !o)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom: directorNotesOpen ? 10 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:9, letterSpacing:'0.3em', color:'var(--gold)', opacity:0.6, textTransform:'uppercase' }}>Director Notes</span>
                {autoCount > 0 && (
                  <span style={{ fontSize:8, background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:999, padding:'1px 6px', color:'var(--gold)', opacity:0.8 }}>
                    {autoCount}/{totalCinematicFields} AI
                  </span>
                )}
              </div>
              <span style={{ fontSize:9, color:'var(--gold)', opacity:0.5, transition:'transform 150ms', display:'inline-block', transform: directorNotesOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
            </button>

            {directorNotesOpen && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {/* Cinematic field rows */}
                {CINEMATIC_FIELDS.map(({ key, label }) => {
                  const ai      = isAutoSelected(key)
                  const locked  = isLocked(key)
                  const value   = fieldValue(key)
                  const note    = rationale[key]

                  return (
                    <div key={key} style={{
                      background:'var(--bg-surface)', border:`1px solid ${locked ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius:5, padding:'7px 10px', transition:'border-color 120ms',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {/* Field label */}
                        <span style={{ fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-muted)', opacity:0.5, minWidth:72 }}>
                          {label}
                        </span>
                        {/* AI badge */}
                        {ai && !locked && (
                          <span style={{ fontSize:7, letterSpacing:'0.1em', color:'var(--gold)', opacity:0.7, background:'rgba(201,168,76,0.1)', borderRadius:999, padding:'1px 5px', flexShrink:0 }}>
                            AI ✦
                          </span>
                        )}
                        {/* Locked badge */}
                        {locked && (
                          <span style={{ fontSize:7, letterSpacing:'0.1em', color:'#4ade80', opacity:0.8, background:'rgba(74,222,128,0.08)', borderRadius:999, padding:'1px 5px', flexShrink:0 }}>
                            ✓ Locked
                          </span>
                        )}
                        {/* Value */}
                        <span style={{ flex:1, fontSize:9, color:'var(--text-base)', opacity: value === '—' ? 0.25 : 0.8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {value}
                        </span>
                        {/* Lock / unlock button */}
                        {onToggleLock && (
                          <button
                            onClick={() => handleToggleLock(key)}
                            title={locked ? 'Unlock — let AI decide' : 'Lock — keep my choice'}
                            style={{ background:'none', border:'none', cursor:'pointer', padding:0, color: locked ? '#4ade80' : 'var(--text-muted)', opacity: locked ? 0.8 : 0.35, fontSize:11, flexShrink:0, lineHeight:1 }}>
                            {locked ? '🔒' : '🔓'}
                          </button>
                        )}
                      </div>
                      {/* Rationale tooltip row */}
                      {note && (
                        <p style={{ fontSize:8, color:'var(--text-muted)', opacity:0.4, marginTop:4, lineHeight:1.5, fontStyle:'italic' }}>
                          {note}
                        </p>
                      )}
                    </div>
                  )
                })}

                {/* Full director notes text if present */}
                {frame.director_notes && allRationale.length === 0 && (
                  <p style={{ fontSize:9, color:'var(--text-muted)', opacity:0.5, lineHeight:1.6, padding:'6px 10px', background:'var(--bg-surface)', borderRadius:4, border:'1px solid var(--border)' }}>
                    {frame.director_notes}
                  </p>
                )}

                {/* Lens info from Lens Planner */}
                {(frame.focal_length || frame.depth_style) && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:2 }}>
                    {frame.focal_length && (
                      <span style={{ fontSize:8, background:'rgba(124,92,216,0.08)', border:'1px solid rgba(124,92,216,0.2)', borderRadius:999, padding:'2px 7px', color:'#7c5cd8', opacity:0.8 }}>
                        🎞 {frame.focal_length}
                      </span>
                    )}
                    {frame.depth_style && (
                      <span style={{ fontSize:8, background:'rgba(124,92,216,0.08)', border:'1px solid rgba(124,92,216,0.2)', borderRadius:999, padding:'2px 7px', color:'#7c5cd8', opacity:0.8 }}>
                        ◉ {frame.depth_style}
                      </span>
                    )}
                    <span style={{ fontSize:7, color:'var(--text-muted)', opacity:0.35, padding:'2px 0', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                      Lens Planner
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Current Lighting ─────────────────────────────────────────────── */}
        <section>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-3">Current Lighting</p>
          <select value={lightingMood} onChange={(e) => setLightingMood(e.target.value)} className={selectClass}>
            {LIGHTING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </section>

        {/* ── Sun Angle dial ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Sun Angle</p>
            <span className="text-xs font-mono text-[var(--gold)]/70">{sunAngle}°</span>
          </div>
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

        {/* ── Exposure ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Exposure</p>
            <span className="text-xs font-mono text-[var(--gold)]/70">{exposure.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={exposure} onChange={(e) => setExposure(+e.target.value)}
            className="w-full accent-[var(--gold)]" />
        </section>

        {/* ── Lens ─────────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Lens</p>
            <span className="text-xs font-mono text-[var(--gold)]/70">{lens}mm</span>
          </div>
          <input type="range" min={14} max={200} value={lens} onChange={(e) => setLens(+e.target.value)}
            className="w-full accent-[var(--gold)]" />
        </section>

        {/* ── Color Valence ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-2">Color Valence</p>
          <select value={colorValence} onChange={(e) => setColorValence(e.target.value)} className={selectClass}>
            {VALENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </section>

        {/* ── Palette swatches ──────────────────────────────────────────────── */}
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

        {/* ── Style Reference ───────────────────────────────────────────────── */}
        <section className="border-t border-[var(--border)] pt-4">
          <StyleReferenceUploader onReferenceChange={onReferenceChange} />
        </section>

        {/* ── Project Settings — Canon ──────────────────────────────────────── */}
        {canon && (
          <section className="border-t border-[var(--border)] pt-4">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-3">Project Settings</p>

            {canon.style_guide && (
              <p style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7, lineHeight: 1.6, marginBottom: 10 }}>
                {canon.style_guide}
              </p>
            )}

            {Object.keys(canon.approved_characters).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.45, textTransform: 'uppercase', marginBottom: 6 }}>
                  Approved Characters
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.values(canon.approved_characters).map(ch => (
                    <div key={ch.name} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.7, minWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                      <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.55, lineHeight: 1.4, flex: 1 }}>{ch.wardrobe}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(canon.camera_language).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.45, textTransform: 'uppercase', marginBottom: 6 }}>Camera Language</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {Object.entries(canon.camera_language).map(([type, rule]) => (
                    <div key={type} style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 8, color: 'var(--gold)', opacity: 0.5, textTransform: 'capitalize', minWidth: 68, flexShrink: 0 }}>{type}</span>
                      <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.6 }}>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canon.visual_rules.length > 0 && (
              <div>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.45, textTransform: 'uppercase', marginBottom: 6 }}>Visual Rules</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {canon.visual_rules.map((rule, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 8, color: 'var(--gold)', opacity: 0.4, flexShrink: 0, marginTop: 1 }}>—</span>
                      <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.65, lineHeight: 1.5 }}>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Shot Planner ─────────────────────────────────────────────────── */}
        <section className="border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={() => setShotPlannerOpen(o => !o)}
            className="w-full flex items-center justify-between btn-tactile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: shotPlannerOpen ? 14 : 0 }}
          >
            <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase' }}>
              Shot Planner
            </span>
            <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.5, display: 'inline-block', transition: 'transform 150ms ease', transform: shotPlannerOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
          </button>
          {shotPlannerOpen && <ShotPlanner scene={scene} renderStyle="bw_sketch" />}
        </section>

      </div>
    </div>
  )
}
