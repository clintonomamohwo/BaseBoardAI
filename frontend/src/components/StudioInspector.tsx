import { useState } from 'react'
import { classifyError } from '../utils/classifyError'
import type { ProjectCanon, StoryboardScene, StoryboardFrame } from '../types/storyboard'
import ShotPlanner from './ShotPlanner'
import { generateBackgroundVariation } from '../api/storyboard'

const LIGHTING_OPTIONS = ['Golden Hour / Sunrise', 'Chiaroscuro / Cyber', 'Natural Daylight', 'Neon Noir', 'Moonlit']
const VALENCE_OPTIONS   = ['High-Contrast', 'Muted', 'Saturated', 'Monochrome']

// Cinematic fields managed by the Director / Cinematic Brain
type CinematicFieldKey = 'shot_type' | 'camera_angle' | 'camera_movement' | 'lighting_notes' | 'mood' | 'purpose'

const CINEMATIC_FIELDS: { key: CinematicFieldKey; label: string }[] = [
  { key: 'shot_type',       label: 'Shot Type' },
  { key: 'camera_angle',    label: 'Camera Angle' },
  { key: 'camera_movement', label: 'Camera Movement' },
  { key: 'lighting_notes',  label: 'Lighting' },
  { key: 'mood',            label: 'Mood' },
  { key: 'purpose',         label: 'Purpose' },
]

interface SceneImageOption {
  sceneNumber: number
  frameNumber: number
  locationHeading: string
  imageUrl: string
}

interface Props {
  scene: StoryboardScene | null
  /** Currently selected frame — used to show Cinematic Brain decisions */
  frame?: StoryboardFrame | null
  onReferenceChange: (url: string | null) => void
  /** Called when the user locks or unlocks a cinematic field on the current frame */
  onToggleLock?: (frameNumber: number, fieldKey: string, locked: boolean) => void
  canon?: ProjectCanon | null
  /** Called after a successful background variation with the new image URL.
   *  The parent decides whether to commit it to project state. */
  onBackgroundVariation?: (sceneNumber: number, frameNumber: number, newImageUrl: string) => void
  /** Reference image stored for the current scene — required for background variation. */
  referenceImage?: string | null
  /** Render style of the active project, forwarded to the variation endpoint. */
  renderStyle?: string
  /** All scenes in the project — used to populate the fallback image picker when
   *  no style reference has been uploaded. */
  allScenes?: StoryboardScene[]
}

export default function StudioInspector({
  scene, frame, onReferenceChange, onToggleLock, canon,
  onBackgroundVariation, referenceImage, renderStyle, allScenes,
}: Props) {
  const [swatchOverrides, setSwatchOverrides] = useState<Record<number, string>>({})
  const [lightingMood, setLightingMood]       = useState(LIGHTING_OPTIONS[0])
  const [colorValence, setColorValence]       = useState(VALENCE_OPTIONS[0])
  const [sunAngle, setSunAngle]               = useState(45)
  const [exposure, setExposure]               = useState(0.75)
  const [lens, setLens]                       = useState(24)
  const [shotPlannerOpen, setShotPlannerOpen] = useState(false)
  const [directorNotesOpen, setDirectorNotesOpen] = useState(true)
  const [bgVariating, setBgVariating]         = useState(false)
  const [bgVariationError, setBgVariationError] = useState<string | null>(null)
  // null = picker closed; true = picker open waiting for selection
  const [pickerOpen, setPickerOpen]           = useState(false)
  // The image the user selected from the picker — used as a one-shot reference
  const [pickedImage, setPickedImage]         = useState<string | null>(null)
  // null = show same-location frames; string = show frames for that other location
  const [selectedOtherLocation, setSelectedOtherLocation] = useState<string | null>(null)
  // Which frame in the current scene is the variation target (null = first frame)
  const [targetFrameNumber, setTargetFrameNumber] = useState<number | null>(null)

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
  function fieldValue(key: CinematicFieldKey): string {
    if (!frame) return '—'
    const v = frame[key]
    return (v && String(v).trim()) ? String(v) : '—'
  }

  // How many fields were auto-selected for the current frame
  const autoCount = Object.values(autoSelected).filter(Boolean).length
  const totalCinematicFields = CINEMATIC_FIELDS.length
  const allRationale = Object.entries(rationale).filter(([, v]) => v)

  // The frame to apply the variation to — defaults to the first frame of the scene.
  // Reset to null (first frame) whenever the active scene changes.
  const sceneFrames = scene?.frames ?? []
  const variationFrame = sceneFrames.find(f => f.frame_number === targetFrameNumber)
    ?? sceneFrames[0]
    ?? null

  // ── Picker data ──────────────────────────────────────────────────────────
  // Build full options list, then split into same-location / other-location.
  const currentLocation = (scene?.location_heading ?? '').trim().toLowerCase()

  const allImageOptions: SceneImageOption[] = (allScenes ?? []).flatMap(s =>
    s.frames
      .filter(f => !!f.generated_image_url)
      .map(f => ({
        sceneNumber:     s.scene_number,
        frameNumber:     f.frame_number,
        locationHeading: s.location_heading,
        imageUrl:        f.generated_image_url as string,
      }))
  )

  // Same-location: location_heading matches current scene (case-insensitive)
  const sameLocationOptions = allImageOptions.filter(
    o => o.locationHeading.trim().toLowerCase() === currentLocation
  )

  // Other locations: group by location heading, deduplicate heading
  const otherLocationsMap = new Map<string, SceneImageOption[]>()
  for (const opt of allImageOptions) {
    if (opt.locationHeading.trim().toLowerCase() === currentLocation) continue
    const key = opt.locationHeading
    if (!otherLocationsMap.has(key)) otherLocationsMap.set(key, [])
    otherLocationsMap.get(key)!.push(opt)
  }
  const otherLocationNames = Array.from(otherLocationsMap.keys())

  const hasPickerOptions = allImageOptions.length > 0

  // The active reference: an uploaded style-reference takes priority over a
  // picker selection, which takes priority over nothing.
  const activeReference = referenceImage ?? pickedImage ?? null

  function closePicker() {
    setPickerOpen(false)
    setSelectedOtherLocation(null)
  }

  async function handleBackgroundVariation(overrideRef?: string, targetFrame = variationFrame) {
    const ref = overrideRef ?? activeReference
    if (!scene || !targetFrame || !ref) return
    setBgVariating(true)
    setBgVariationError(null)
    closePicker()
    try {
      const result = await generateBackgroundVariation(
        targetFrame,
        scene,
        ref,
        renderStyle ?? 'bw_sketch',
        canon ? (canon as unknown as Record<string, unknown>) : null,
      )
      if (result.generated_image_url) {
        onBackgroundVariation?.(scene.scene_number, targetFrame.frame_number, result.generated_image_url)
        // Clear the one-shot picked image after successful use
        setPickedImage(null)
      } else {
        setBgVariationError('Image provider returned no result — try again.')
      }
    } catch (err) {
      const e = classifyError(err)
      setBgVariationError(`${e.title} — ${e.detail}`)
    } finally {
      setBgVariating(false)
    }
  }

  async function handleBackgroundVariationAllFrames(overrideRef?: string) {
    const ref = overrideRef ?? activeReference
    if (!scene || !ref || sceneFrames.length === 0) return
    setBgVariating(true)
    setBgVariationError(null)
    closePicker()
    try {
      for (const f of sceneFrames) {
        const result = await generateBackgroundVariation(
          f,
          scene,
          ref,
          renderStyle ?? 'bw_sketch',
          canon ? (canon as unknown as Record<string, unknown>) : null,
        )
        if (result.generated_image_url) {
          onBackgroundVariation?.(scene.scene_number, f.frame_number, result.generated_image_url)
        }
      }
      setPickedImage(null)
    } catch (err) {
      const e = classifyError(err)
      setBgVariationError(`${e.title} — ${e.detail}`)
    } finally {
      setBgVariating(false)
    }
  }

  function handlePickerSelect(imageUrl: string) {
    setPickedImage(imageUrl)
    closePicker()
    handleBackgroundVariation(imageUrl)
  }

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

        {/* ── Scene Background Variation ───────────────────────────────────── */}
        {scene && (
          <section>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40 mb-3">Background Variation</p>

            {/* Reference thumbnail — shown when a reference is active */}
            {activeReference && (
              <div style={{ marginBottom: 8, position: 'relative' }}>
                <img
                  src={activeReference}
                  alt="Reference"
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', display: 'block' }}
                />
                <span style={{
                  position: 'absolute', top: 5, left: 6,
                  fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase',
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                  color: 'var(--gold)', opacity: 0.9, padding: '2px 6px', borderRadius: 3,
                }}>Reference</span>
                <button
                  type="button"
                  onClick={() => { onReferenceChange(null); setPickedImage(null) }}
                  title="Remove reference"
                  style={{
                    position: 'absolute', top: 5, right: 6,
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 3,
                    color: 'var(--text-muted)', opacity: 0.7, fontSize: 10, cursor: 'pointer',
                    padding: '2px 5px', lineHeight: 1,
                  }}
                >✕</button>
              </div>
            )}

            {/* No reference yet — upload or pick from frames */}
            {!activeReference && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {/* Upload */}
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: '1px dashed var(--border)', borderRadius: 4, padding: '8px 10px',
                  cursor: 'pointer', transition: 'border-color 120ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6 }}>⇪ Upload reference image</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => onReferenceChange(reader.result as string)
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }} />
                </label>

                {/* Pick from existing frames */}
                {hasPickerOptions && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(o => !o)}
                    style={{
                      background: pickerOpen ? 'rgba(201,168,76,0.08)' : 'none',
                      border: `1px solid ${pickerOpen ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 4, padding: '7px 10px', cursor: 'pointer',
                      color: pickerOpen ? 'var(--gold)' : 'var(--text-muted)',
                      fontSize: 9, letterSpacing: '0.1em', textAlign: 'center',
                      transition: 'border-color 120ms, background 120ms, color 120ms',
                      width: '100%',
                    }}
                    onMouseEnter={e => { if (!pickerOpen) { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' } }}
                    onMouseLeave={e => { if (!pickerOpen) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
                  >
                    {pickerOpen ? '▲ Close Picker' : '⊞ Pick from existing frames'}
                  </button>
                )}

                {!hasPickerOptions && (
                  <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, textAlign: 'center', lineHeight: 1.5 }}>
                    Generate some storyboard frames first, then pick one as the reference.
                  </p>
                )}
              </div>
            )}

            {/* Target frame selector — thumbnail strip */}
            {sceneFrames.filter(f => f.generated_image_url).length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.4, marginBottom: 5 }}>
                  Apply to frame
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {sceneFrames.filter(f => f.generated_image_url).map(f => {
                    const isTarget = (targetFrameNumber ?? sceneFrames[0]?.frame_number) === f.frame_number
                    return (
                      <button
                        key={f.frame_number}
                        type="button"
                        onClick={() => setTargetFrameNumber(f.frame_number)}
                        title={`Frame ${f.frame_number} — ${f.shot_type}`}
                        style={{
                          padding: 0, border: `2px solid ${isTarget ? 'var(--gold)' : 'var(--border)'}`,
                          borderRadius: 3, cursor: 'pointer', background: 'none',
                          overflow: 'hidden', width: 48, flexShrink: 0,
                          transition: 'border-color 100ms',
                          boxShadow: isTarget ? '0 0 0 1px var(--gold)' : 'none',
                        }}
                        onMouseEnter={e => { if (!isTarget) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }}
                        onMouseLeave={e => { if (!isTarget) e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        <img
                          src={f.generated_image_url!}
                          alt={`F${f.frame_number}`}
                          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                        />
                        <span style={{
                          display: 'block', fontSize: 6, textAlign: 'center',
                          padding: '2px 0', color: isTarget ? 'var(--gold)' : 'var(--text-muted)',
                          opacity: isTarget ? 1 : 0.5, lineHeight: 1,
                        }}>F{f.frame_number}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Generate buttons — only shown when a reference is set */}
            {activeReference && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                <button
                  type="button"
                  disabled={bgVariating}
                  onClick={() => handleBackgroundVariation()}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 4,
                    border: '1px solid rgba(201,168,76,0.4)', background: 'transparent',
                    color: 'var(--gold)', fontSize: 8, letterSpacing: '0.2em',
                    textTransform: 'uppercase', cursor: bgVariating ? 'wait' : 'pointer',
                    opacity: bgVariating ? 0.5 : 0.8,
                    transition: 'opacity 150ms, border-color 150ms',
                  }}
                  onMouseEnter={e => { if (!bgVariating) e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { if (!bgVariating) e.currentTarget.style.opacity = '0.8' }}
                >
                  {bgVariating ? '↻ Generating…' : '↻ Apply to Selected Frame'}
                </button>
                {sceneFrames.length > 1 && (
                  <button
                    type="button"
                    disabled={bgVariating}
                    onClick={() => handleBackgroundVariationAllFrames()}
                    style={{
                      width: '100%', padding: '7px 0', borderRadius: 4,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', fontSize: 8, letterSpacing: '0.2em',
                      textTransform: 'uppercase', cursor: bgVariating ? 'wait' : 'pointer',
                      opacity: bgVariating ? 0.3 : 0.5,
                      transition: 'opacity 150ms, border-color 150ms',
                    }}
                    onMouseEnter={e => { if (!bgVariating) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' } }}
                    onMouseLeave={e => { if (!bgVariating) { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                  >
                    {bgVariating ? '↻ Generating…' : `↻ Apply to All ${sceneFrames.length} Frames`}
                  </button>
                )}
              </div>
            )}

            {/* Inline image picker — shown when no reference is uploaded */}
            {pickerOpen && !activeReference && (() => {
              // Which frames are currently displayed in the grid
              const displayedOptions = selectedOtherLocation
                ? (otherLocationsMap.get(selectedOtherLocation) ?? [])
                : sameLocationOptions

              // Header label
              const gridLabel = selectedOtherLocation
                ? selectedOtherLocation
                : scene.location_heading

              return (
                <div style={{
                  marginTop: 10,
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--bg-surface)',
                  overflow: 'hidden',
                }}>
                  {/* ── Picker header ──────────────────────────────────────── */}
                  <div style={{
                    padding: '7px 10px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedOtherLocation && (
                        <button
                          type="button"
                          onClick={() => setSelectedOtherLocation(null)}
                          title="Back to same location"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.7, fontSize: 10, padding: 0, lineHeight: 1 }}
                        >←</button>
                      )}
                      <span style={{
                        fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: 'var(--gold)', opacity: 0.6,
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {gridLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={closePicker}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4, fontSize: 12, lineHeight: 1, padding: 0 }}
                    >✕</button>
                  </div>

                  {/* ── Thumbnail grid ─────────────────────────────────────── */}
                  {displayedOptions.length > 0 ? (
                    <div style={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      padding: 8,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 6,
                    }}>
                      {displayedOptions.map(opt => (
                        <button
                          key={`s${opt.sceneNumber}f${opt.frameNumber}`}
                          type="button"
                          onClick={() => handlePickerSelect(opt.imageUrl)}
                          title={`Scene ${opt.sceneNumber} · Frame ${opt.frameNumber}`}
                          style={{
                            background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                            padding: 0, cursor: 'pointer', overflow: 'hidden',
                            transition: 'border-color 100ms',
                            display: 'flex', flexDirection: 'column',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          <img
                            src={opt.imageUrl}
                            alt={`Scene ${opt.sceneNumber} F${opt.frameNumber}`}
                            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                          />
                          <span style={{
                            fontSize: 7, padding: '3px 4px', lineHeight: 1.3,
                            color: 'var(--text-muted)', opacity: 0.6,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            width: '100%', textAlign: 'left',
                          }}>
                            S{opt.sceneNumber} F{opt.frameNumber}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* No frames at this location yet */
                    <div style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.4 }}>
                        No generated frames at this location yet.
                      </p>
                    </div>
                  )}

                  {/* ── Other location section ─────────────────────────────── */}
                  {!selectedOtherLocation && otherLocationNames.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <div style={{
                        padding: '6px 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', opacity: 0.4 }}>
                          Other location
                        </span>
                      </div>
                      <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {otherLocationNames.map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setSelectedOtherLocation(loc)}
                            style={{
                              background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                              padding: '5px 8px', cursor: 'pointer', textAlign: 'left',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'border-color 100ms, background 100ms',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(201,168,76,0.05)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none' }}
                          >
                            <span style={{ fontSize: 9, color: 'var(--text-base)', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {loc}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, flexShrink: 0, marginLeft: 6 }}>
                              {otherLocationsMap.get(loc)?.length ?? 0} frame{(otherLocationsMap.get(loc)?.length ?? 0) !== 1 ? 's' : ''} ›
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Footer hint ────────────────────────────────────────── */}
                  <div style={{ padding: '5px 10px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, lineHeight: 1.4 }}>
                      Pick a frame as the environmental anchor. Only the background will change.
                    </p>
                  </div>
                </div>
              )
            })()}

            {bgVariationError && (
              <p style={{ fontSize: 9, color: '#e06060', marginTop: 4, lineHeight: 1.4 }}>
                {bgVariationError}
              </p>
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
