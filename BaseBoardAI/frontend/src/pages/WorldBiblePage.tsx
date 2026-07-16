import { useState, useRef } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import type { StoryboardProject, StoryboardScene, StoryboardFrame } from '../types/storyboard'
import { reforgeAffectedFrames, scanContinuityImpact } from '../api/storyboard'
import type { ContinuityImpactResult } from '../api/storyboard'
import ContinuityImpactModal from '../components/ContinuityImpactModal'

const SUB_TABS = ['Locations', 'Factions', 'Lore', 'Artifacts', 'Timelines']

interface Props {
  scenes: StoryboardScene[]
  project?: StoryboardProject | null
  renderStyle?: string
  /** Called when the user deletes a location so the change propagates to project state */
  onDeleteScene?: (sceneNumber: number) => void
  /** Called after frames are regenerated due to a location image change */
  onUpdateSceneFrames?: (updatedScenes: StoryboardScene[]) => void
  onNotify?: (msg: string, type?: 'success' | 'info') => void
}

function downloadSceneJson(scene: StoryboardScene) {
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' })
  saveAs(blob, `location_${scene.scene_number}_${scene.location_heading.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`)
}

async function downloadFramesPng(scene: StoryboardScene) {
  const frames = scene.frames.filter(f => f.generated_image_url)
  if (frames.length === 0) return

  if (frames.length === 1) {
    // Single frame — direct download
    try {
      const res = await fetch(frames[0].generated_image_url!)
      const blob = await res.blob()
      saveAs(blob, `scene${scene.scene_number}_frame${frames[0].frame_number}.png`)
    } catch {
      window.open(frames[0].generated_image_url!, '_blank')
    }
    return
  }

  // Multiple frames — zip them
  const zip = new JSZip()
  const folder = zip.folder(`scene_${scene.scene_number}_frames`)!
  await Promise.all(
    frames.map(async (f) => {
      try {
        const res = await fetch(f.generated_image_url!)
        const blob = await res.blob()
        folder.file(`frame_${f.frame_number}.png`, blob)
      } catch {
        // skip failed frames
      }
    })
  )
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveAs(zipBlob, `scene_${scene.scene_number}_frames.zip`)
}

interface LightboxState {
  frames: StoryboardFrame[]
  index: number
}

function LocationRow({
  scene,
  onDelete,
  onOpenLightbox,
  onUploadLocationImage,
}: {
  scene: StoryboardScene
  onDelete: () => void
  onOpenLightbox: (frames: StoryboardFrame[], index: number) => void
  onUploadLocationImage?: (scene: StoryboardScene, dataUrl: string) => void
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [downloading, setDownloading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => onUploadLocationImage?.(scene, reader.result as string)
    reader.readAsDataURL(file)
  }

  const framesWithImages = scene.frames.filter(f => f.generated_image_url)

  async function handleDownloadPng() {
    setDownloading(true)
    try { await downloadFramesPng(scene) }
    finally { setDownloading(false) }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 6, overflow: 'hidden',
      transition: 'border-color 200ms ease',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.35)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
    >
      {/* Palette strip */}
      <div style={{ display: 'flex', height: 3 }}>
        {scene.color_palette.map((c) => (
          <div key={c} style={{ flex: 1, background: c }} />
        ))}
      </div>

      {/* Header row — click to expand */}
      <button
        className="w-full text-left btn-tactile"
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.6 }}>
                {scene.environmental_type}
              </span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {scene.time_of_day}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', fontFamily: 'Georgia,serif', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scene.location_heading}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* First frame thumbnail preview */}
            {framesWithImages.length > 0 && (
              <img
                src={framesWithImages[0].generated_image_url!}
                alt=""
                style={{ width: 48, height: 30, objectFit: 'cover', borderRadius: 3, border: '1px solid var(--border)', flexShrink: 0 }}
              />
            )}
            <span style={{ fontSize: 12, color: 'var(--gold)', opacity: 0.5, transition: 'transform 150ms ease', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', marginTop: 2 }}>›</span>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Scene details */}
          <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {[
              { label: 'Emotional Tone',     value: scene.emotional_tone },
              { label: 'Scene Number',       value: `#${scene.scene_number}` },
              { label: 'Environmental Type', value: scene.environmental_type },
              { label: 'Time of Day',        value: scene.time_of_day },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-base)', opacity: 0.85 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Colour palette */}
          <div style={{ padding: '0 14px 12px' }}>
            <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>Colour Palette</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {scene.color_palette.map((c) => (
                <div key={c} title={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.5, fontFamily: 'monospace' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Frames — clickable thumbnails with lightbox */}
          {scene.frames.length > 0 && (
            <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 6px' }}>
                <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6 }}>
                  Storyboard Frames ({scene.frames.length})
                  {framesWithImages.length > 0 && (
                    <span style={{ opacity: 0.5 }}> · {framesWithImages.length} rendered</span>
                  )}
                </p>
                {framesWithImages.length > 0 && (
                  <button
                    onClick={handleDownloadPng}
                    disabled={downloading}
                    style={{
                      fontSize: 8, letterSpacing: '0.15em', color: 'var(--gold)',
                      textTransform: 'uppercase', background: 'none', border: 'none',
                      cursor: downloading ? 'wait' : 'pointer',
                      opacity: downloading ? 0.5 : 0.7,
                      padding: 0,
                    }}
                  >
                    {downloading ? 'Zipping…' : `↓ ${framesWithImages.length > 1 ? 'ZIP' : 'PNG'}`}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {scene.frames.map((frame) => {
                    const imgIdx = framesWithImages.findIndex(f => f.frame_number === frame.frame_number)
                  return (
                    <div
                      key={frame.frame_number}
                      title={frame.action_breakdown}
                      style={{
                        position: 'relative',
                        cursor: frame.generated_image_url ? 'zoom-in' : 'default',
                      }}
                      onClick={() => {
                        if (frame.generated_image_url && imgIdx !== -1) {
                          onOpenLightbox(framesWithImages, imgIdx)
                        }
                      }}
                    >
                      {frame.generated_image_url ? (
                        <>
                          <img
                            src={frame.generated_image_url}
                            alt={`Frame ${frame.frame_number}`}
                            style={{ width: 72, height: 46, objectFit: 'cover', borderRadius: 3, border: '1px solid var(--border)', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', bottom: 2, right: 3,
                            background: 'rgba(0,0,0,0.55)', borderRadius: 2,
                            padding: '1px 3px',
                            fontSize: 7, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace',
                          }}>
                            F{frame.frame_number}
                          </div>
                        </>
                      ) : (
                        <div style={{
                          width: 72, height: 46, background: 'var(--bg-base)', borderRadius: 3,
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.4 }}>F{frame.frame_number}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            {confirming ? (
              <>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, opacity: 0.7, alignSelf: 'center' }}>Delete this location?</span>
                <button className="btn-tactile"
                  onClick={onDelete}
                  style={{ padding: '6px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid rgba(180,30,30,0.6)', background: 'rgba(180,30,30,0.15)', color: '#e06060', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Delete
                </button>
                <button className="btn-tactile"
                  onClick={() => setConfirming(false)}
                  style={{ padding: '6px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                {/* Upload location reference image */}
                {onUploadLocationImage && (
                  <>
                    <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <button className="btn-tactile"
                      onClick={() => uploadRef.current?.click()}
                      style={{ padding: '7px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 150ms ease' }}
                      title="Upload a reference image for this location — all scenes at this location will be updated"
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'transparent' }}>
                      ⇪ Ref Image
                    </button>
                  </>
                )}
                <button className="btn-tactile"
                  onClick={() => downloadSceneJson(scene)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'border-color 150ms ease, color 150ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                  ↓ Download JSON
                </button>
                <button className="btn-tactile"
                  onClick={() => setConfirming(true)}
                  style={{ padding: '7px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', transition: 'border-color 150ms ease, color 150ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,30,30,0.5)'; e.currentTarget.style.color = '#e06060' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({
  frames,
  index,
  onClose,
}: {
  frames: StoryboardFrame[]
  index: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(index)
  const frame = frames[current]

  function prev() { setCurrent(i => Math.max(0, i - 1)) }
  function next() { setCurrent(i => Math.min(frames.length - 1, i + 1)) }

  async function handleDownload() {
    if (!frame.generated_image_url) return
    try {
      const res = await fetch(frame.generated_image_url)
      const blob = await res.blob()
      saveAs(blob, `frame_${frame.frame_number}.png`)
    } catch {
      window.open(frame.generated_image_url, '_blank')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      {/* Close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>✕</button>

      {/* Main image */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, cursor: 'default' }}>
        <img
          src={frame.generated_image_url!}
          alt={`Frame ${frame.frame_number}`}
          style={{ maxWidth: '78vw', maxHeight: '62vh', borderRadius: 6, border: '1px solid rgba(201,168,76,0.25)', display: 'block' }}
        />

        {/* Caption */}
        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            Frame {frame.frame_number} · {frame.shot_type} · {frame.camera_angle}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
            {frame.action_breakdown}
          </p>
        </div>

        {/* Nav + download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prev} disabled={current === 0}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: current === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', borderRadius: 4, padding: '6px 14px', fontSize: 13, cursor: current === 0 ? 'default' : 'pointer' }}>
            ‹
          </button>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>
            {current + 1} / {frames.length}
          </span>
          <button onClick={next} disabled={current === frames.length - 1}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: current === frames.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', borderRadius: 4, padding: '6px 14px', fontSize: 13, cursor: current === frames.length - 1 ? 'default' : 'pointer' }}>
            ›
          </button>
          <button onClick={handleDownload}
            style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.6)', borderRadius: 4, padding: '6px 12px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
            ↓ PNG
          </button>
        </div>

        {/* Thumbnail strip */}
        {frames.length > 1 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            {frames.map((f, i) => (
              <img
                key={f.frame_number}
                src={f.generated_image_url!}
                alt=""
                onClick={() => setCurrent(i)}
                style={{
                  width: 52, height: 32, objectFit: 'cover', borderRadius: 3, cursor: 'pointer',
                  border: `1px solid ${i === current ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.1)'}`,
                  opacity: i === current ? 1 : 0.45,
                  transition: 'opacity 120ms ease, border-color 120ms ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorldBiblePage({ scenes, project, renderStyle = 'bw_sketch', onDeleteScene, onUpdateSceneFrames, onNotify }: Props) {
  const [lightbox,        setLightbox]        = useState<LightboxState | null>(null)
  const [impactState,     setImpactState]     = useState<{
    impact: ContinuityImpactResult
    pendingScene: StoryboardScene
  } | null>(null)
  const [isRegenerating,  setIsRegenerating]  = useState(false)

  async function handleUploadLocationImage(scene: StoryboardScene, dataUrl: string) {
    if (!project || scenes.length === 0) {
      onNotify?.('Location reference uploaded (no active project to propagate)', 'info')
      return
    }
    onNotify?.('Scanning scenes for this location…', 'info')
    try {
      const impact = await scanContinuityImpact(
        project, 'environment', scene.location_heading, 'location_image', '', dataUrl,
      )
      if (impact.total_affected === 0) {
        onNotify?.('No existing frames use this location', 'info')
        return
      }
      setImpactState({ impact, pendingScene: scene })
    } catch {
      onNotify?.('Location uploaded (continuity scan unavailable)', 'info')
    }
  }

  async function handleConfirmRegenerate() {
    if (!impactState) return
    setIsRegenerating(true)
    const { impact } = impactState
    onNotify?.(`Regenerating ${impact.total_affected} frame${impact.total_affected !== 1 ? 's' : ''}…`, 'info')
    try {
      const updatedUrls = await reforgeAffectedFrames(scenes, impact.affected_frame_ids, renderStyle)
      const updatedScenes = scenes.map(scene => ({
        ...scene,
        frames: scene.frames.map(frame => {
          const key = `scene_${scene.scene_number}_frame_${frame.frame_number}`
          const newUrl = updatedUrls.get(key)
          return newUrl !== undefined ? { ...frame, generated_image_url: newUrl } : frame
        }),
      }))
      onUpdateSceneFrames?.(updatedScenes)
      onNotify?.(`${impact.total_affected} frame${impact.total_affected !== 1 ? 's' : ''} updated ✓`, 'success')
    } catch {
      onNotify?.('Regeneration failed — please try again', 'info')
    } finally {
      setIsRegenerating(false)
      setImpactState(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-hidden">
      {/* Continuity impact modal */}
      {impactState && (
        <ContinuityImpactModal
          impact={impactState.impact}
          isRegenerating={isRegenerating}
          onConfirm={handleConfirmRegenerate}
          onSkip={() => { if (!isRegenerating) setImpactState(null) }}
        />
      )}

      {/* Global lightbox */}
      {lightbox && (
        <Lightbox
          frames={lightbox.frames}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
        <h1 className="text-sm font-semibold text-[var(--text-base)]/90 tracking-widest">World Bible</h1>
        <p className="text-[9px] text-[var(--gold)]/40 mt-0.5 tracking-wider">{scenes.length} location{scenes.length !== 1 ? 's' : ''} mapped</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 px-6 border-b border-[var(--border)] flex-shrink-0">
        {SUB_TABS.map((tab, i) => (
          <button key={tab} className={`relative px-4 py-2.5 text-[9px] tracking-widest uppercase transition-all ${
            i === 0 ? 'text-[var(--gold)] tab-active' : 'text-[var(--text-base)]/30 hover:text-[var(--text-base)]/60'
          }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-[var(--text-base)]/20 text-sm tracking-widest uppercase">No locations yet</p>
            <p className="text-[9px] text-[var(--text-base)]/10 tracking-wider">Run the pipeline to build your world bible</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680 }}>
            {scenes.map((scene) => (
              <LocationRow
                key={scene.scene_number}
                scene={scene}
                onDelete={() => onDeleteScene?.(scene.scene_number)}
                onOpenLightbox={(frames, idx) => setLightbox({ frames, index: idx })}
                onUploadLocationImage={project ? handleUploadLocationImage : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
