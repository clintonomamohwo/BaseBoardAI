import { useRef, useState, useMemo } from 'react'
import type { StoryboardFrame, StoryboardScene } from '../types/storyboard'
import { downloadFramePng } from '../utils/exportFrames'
import { resolveFrameContinuityInputs } from '../utils/shotContinuity'
import { regenerateVisualAction, renderFrameImage, upgradeFrameStyle } from '../api/storyboard'
import GalleryLightbox from './GalleryLightbox'
import UpgradeStyleMenu from './UpgradeStyleMenu'

interface Props {
  frame: StoryboardFrame
  scene: StoryboardScene
  allScenes?: StoryboardScene[]
  isSelected: boolean
  /** BMS-3: passed from StoryboardCanvas to apply focus glow */
  isFocused?: boolean
  /** Stable composite key — avoids recomputing in card */
  frameKey: string
  onToggleSelect: (key: string) => void
  /** Called with the new base64 data URL when the user uploads a replacement image */
  onReplaceImage?: (sceneNumber: number, frameNumber: number, dataUrl: string) => void
  /** Called when visual_action is updated so parent can patch project state */
  onVisualActionUpdate?: (sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) => void
  /** Called when shot metadata or approval state is edited. */
  onFrameUpdate?: (sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) => void
  /** Called when a style upgrade completes for this frame */
  onUpgradeFrame?: (sceneNumber: number, frameNumber: number, newUrl: string) => void
  /** Current project render style — shown as ✓ in the upgrade menu */
  projectRenderStyle?: string
}

export default function FrameCard({
  frame, scene, allScenes = [scene], isSelected, isFocused = false, frameKey,
  onToggleSelect, onReplaceImage, onVisualActionUpdate, onFrameUpdate,
  onUpgradeFrame, projectRenderStyle,
}: Props) {
  const key = frameKey
  const frameId = `${String(scene.scene_number).padStart(2, '0')}${String(frame.frame_number).padStart(1, '0')}`
  const filename = `s${scene.scene_number}_f${frame.frame_number}.png`
  const continuityInputs = resolveFrameContinuityInputs(allScenes, scene.scene_number, frame.frame_number)
  const cardRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  // null = closed; number = index into galleryItems to open at
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Production sheet expand/collapse
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [editingFrame, setEditingFrame] = useState(false)
  const [durationDraft, setDurationDraft] = useState({
    frameNumber: frame.frame_number,
    baseDuration: frame.duration_seconds,
    value: String(frame.duration_seconds),
  })
  const durationValue = durationDraft.frameNumber === frame.frame_number
    && durationDraft.baseDuration === frame.duration_seconds
    ? durationDraft.value
    : String(frame.duration_seconds)
  const [durationError, setDurationError] = useState(false)
  // Regenerate visual action state
  const [regenLoading, setRegenLoading]     = useState(false)
  const [regenImgLoading, setRegenImgLoading] = useState(false)
  const [regenError, setRegenError]         = useState<string | null>(null)
  const [regenSuccess, setRegenSuccess]     = useState(false)
  // Style upgrade state
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(false)
  const [premiumError, setPremiumError] = useState<string | null>(null)
  const [premiumSuccess, setPremiumSuccess] = useState(false)

  async function handleUpgradeStyle(targetStyle: string) {
    if (upgradeLoading) return
    setUpgradeLoading(true)
    try {
      const result = await upgradeFrameStyle(
        frame, scene, targetStyle,
        frame.generated_image_url ?? null,
        null,
      )
      if (result.generated_image_url && onUpgradeFrame) {
        onUpgradeFrame(scene.scene_number, frame.frame_number, result.generated_image_url)
      }
    } catch { /* leave existing image */ }
    finally { setUpgradeLoading(false) }
  }

  async function handlePremiumRender() {
    if (premiumLoading || regenLoading || regenImgLoading || upgradeLoading) return
    setPremiumLoading(true)
    setPremiumError(null)
    setPremiumSuccess(false)
    try {
      const result = await renderFrameImage(
        frame,
        scene,
        projectRenderStyle ?? 'bw_sketch',
        'premium',
        frame.generated_image_url,
      )
      onUpgradeFrame?.(scene.scene_number, frame.frame_number, result.generated_image_url)
      setPremiumSuccess(true)
      setTimeout(() => setPremiumSuccess(false), 2500)
    } catch (error) {
      setPremiumError(error instanceof Error ? error.message : 'Premium rendering failed')
    } finally {
      setPremiumLoading(false)
    }
  }

  // Build gallery from all rendered frames in the scene
  const galleryItems = useMemo(() =>
    scene.frames
      .filter(f => f.generated_image_url)
      .map(f => ({
        url: f.generated_image_url!,
        label: `${String(scene.scene_number).padStart(2, '0')}${String(f.frame_number).padStart(1, '0')}`,
        sublabel: [f.shot_type, f.camera_angle, `${f.duration_seconds}s`, f.action_breakdown]
          .filter(Boolean).join(' · '),
      })),
    [scene.frames, scene.scene_number]
  )

  // Index of this frame within the gallery list
  const thisGalleryIndex = galleryItems.findIndex(
    g => g.label === frameId
  )

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !onReplaceImage) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      onReplaceImage(scene.scene_number, frame.frame_number, reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function openLightbox() {
    if (!frame.generated_image_url) return
    setLightboxIndex(thisGalleryIndex >= 0 ? thisGalleryIndex : 0)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `translateY(-2px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`
    el.style.boxShadow = `${-x * 8}px ${-y * 8}px 20px rgba(0,0,0,0.4), 0 0 0 1.5px var(--gold)`
  }

  function handleMouseLeave() {
    const el = cardRef.current
    if (!el) return
    el.style.transform = ''
    el.style.boxShadow = isSelected ? `0 0 0 1.5px var(--gold)` : ''
  }

  return (
    <>
      {/* Gallery lightbox — navigates all rendered frames in this scene */}
      {lightboxIndex !== null && galleryItems.length > 0 && (
        <GalleryLightbox
          items={galleryItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div
        ref={cardRef}
        data-frame-key={key}
        className={`relative flex-shrink-0 w-56 rounded frame-card-hover card-tilt cursor-pointer group bms-brass${isFocused ? ' bms-frame-focus' : ''}`}
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${isSelected ? 'var(--gold)' : frame.is_manual_override ? 'rgba(74,222,128,0.45)' : 'var(--border)'}`,
          boxShadow: isSelected ? '0 0 0 1.5px var(--gold)' : frame.is_manual_override ? '0 0 0 1px rgba(74,222,128,0.3)' : undefined,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Image container — click opens gallery lightbox ── */}
        <div
          className="aspect-video w-full rounded-t overflow-hidden relative flex items-center justify-center"
          style={{
            background: 'var(--bg-base)',
            cursor: frame.generated_image_url ? 'zoom-in' : 'default',
          }}
          onClick={openLightbox}
        >
          {frame.generated_image_url ? (
            <img
              src={frame.generated_image_url}
              alt={`Frame ${frameId}`}
              className="w-full h-full object-cover anim-gold-assemble"
            />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.2, textTransform: 'uppercase' }}>
                AI PreViz (Base64 Render)
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.3 }}>{frameId}</span>
            </div>
          )}

          {/* Frame ID badge */}
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm flex items-center gap-1"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', pointerEvents: 'none' }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--gold)', opacity: 0.8, letterSpacing: '0.15em' }}>
              {frameId}
            </span>
            {frame.is_manual_override && (
              <span style={{ fontSize: 7, color: '#4ade80', opacity: 0.9, letterSpacing: '0.1em' }} title="Artist override — protected from re-run">
                ◈
              </span>
            )}
          </div>

          {/* 🎬 Director Notes badge — bottom-right, always visible, hover reveals full note */}
          {frame.director_notes && (
            <div
              className="absolute bottom-1.5 right-1.5"
              style={{ pointerEvents: 'none' }}
              title={frame.director_notes}
            >
              <span style={{
                fontSize: 9,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                borderRadius: 3,
                padding: '2px 5px',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}>
                🎬
              </span>
            </div>
          )}

          {/* Zoom hint */}
          {frame.generated_image_url && (
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.18)' }}>⊕</span>
            </div>
          )}
        </div>

        {/* ── Action buttons — OUTSIDE image div so never bubble into lightbox trigger ── */}
        <div
          className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all"
          style={{ zIndex: 10 }}
        >
          {/* Star / select */}
          <button
            onClick={() => onToggleSelect(key)}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] btn-tactile"
            style={{
              background: isSelected ? 'var(--gold)' : 'rgba(0,0,0,0.6)',
              color: isSelected ? 'var(--bg-base)' : 'var(--gold)',
              border: 'none', cursor: 'pointer',
            }}
            title="Lock to cut"
          >★</button>

          {/* Download */}
          <button
            onClick={() => downloadFramePng(frame.generated_image_url, filename)}
            disabled={!frame.generated_image_url}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] btn-tactile"
            style={{
              background: 'rgba(0,0,0,0.6)', color: 'var(--text-base)',
              border: 'none',
              cursor: frame.generated_image_url ? 'pointer' : 'default',
              opacity: frame.generated_image_url ? 1 : 0.3,
            }}
            title="Download PNG"
          >↓</button>

          {/* Upload replacement */}
          {onReplaceImage && (
            <>
              <input
                ref={uploadRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
              <button
                onClick={() => uploadRef.current?.click()}
                className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] btn-tactile"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}
                title="Replace artwork"
              >⇪</button>
            </>
          )}

          {/* Expand */}
          {frame.generated_image_url && (
            <button
              onClick={openLightbox}
              className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] btn-tactile"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--gold)', border: 'none', cursor: 'pointer' }}
              title={galleryItems.length > 1 ? `View all ${galleryItems.length} frames` : 'View full size'}
            >⤢</button>
          )}

          {/* Upgrade style — only shown when frame has an image */}
          {frame.generated_image_url && onUpgradeFrame && (
            <UpgradeStyleMenu
              currentStyle={projectRenderStyle}
              onSelect={handleUpgradeStyle}
              loading={upgradeLoading}
              compact
            />
          )}
        </div>

        {/* ── Production Sheet ── */}
        <div style={{ padding: '8px 10px' }}>

          {/* Summary row — always visible */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase' }}>
              {frame.shot_type}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {frame.camera_movement && (
                <span style={{ fontSize: 7, letterSpacing: '0.1em', color: 'var(--text-muted)', opacity: 0.55, textTransform: 'uppercase' }}>
                  {frame.camera_movement}
                </span>
              )}
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.7 }}>
                {frame.duration_seconds}s
              </span>
            </div>
          </div>

          {/* Visual action — primary staging direction */}
          <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: sheetExpanded ? 20 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {frame.visual_action || frame.action_breakdown}
          </p>

          {/* Expand toggle */}
          <button
            onClick={() => setSheetExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 8, letterSpacing: '0.15em', color: 'var(--gold)', opacity: 0.45, textTransform: 'uppercase', transition: 'opacity 120ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
          >
            {sheetExpanded ? '▲ Collapse' : '▼ Full Sheet'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 7 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 8, color: frame.approval_status === 'approved' ? '#4ade80' : 'var(--text-muted)', opacity: 0.8 }}>
                {frame.approval_status === 'approved' ? '✓ Human approved' : 'Pending approval'}
              </span>
              {frame.continuity_review_required && (
                <span role="status" style={{ fontSize: 7, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Needs continuity review
                </span>
              )}
            </div>
            {onFrameUpdate && (
              <button
                type="button"
                onClick={() => onFrameUpdate(scene.scene_number, frame.frame_number, {
                  approval_status: frame.approval_status === 'approved' ? 'pending' : 'approved',
                })}
                style={{ border: '1px solid var(--border)', borderRadius: 3, background: frame.approval_status === 'approved' ? 'rgba(74,222,128,0.08)' : 'transparent', color: frame.approval_status === 'approved' ? '#4ade80' : 'var(--gold)', cursor: 'pointer', fontSize: 7, letterSpacing: '0.1em', padding: '3px 6px', textTransform: 'uppercase' }}
              >
                {frame.approval_status === 'approved' ? 'Reopen' : 'Approve frame'}
              </button>
            )}
          </div>

          {/* Expanded production sheet */}
          {sheetExpanded && (
            <div className="bms-inspector-enter" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', opacity: 0.5, margin: '4px 0 8px' }} />

              {continuityInputs.length > 0 && (
                <div style={{ marginBottom: 8, padding: '7px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, background: 'rgba(201,168,76,0.04)' }}>
                  <p style={{ fontSize: 7, letterSpacing: '0.16em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.65, marginBottom: 5 }}>
                    Approved continuity inputs
                  </p>
                  {continuityInputs.map(source => (
                    <div key={source.frame_id} style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'flex-start' }}>
                      {source.available && source.image_url && (
                        <img src={source.image_url} alt={`${source.frame_id} approved ending frame`} style={{ width: 48, height: 28, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 8, color: source.available ? '#4ade80' : '#fbbf24', marginBottom: 2 }}>
                          {source.frame_id} · {source.available ? 'approved source' : source.review_required ? 'source needs review' : source.approval_status === 'approved' ? 'not available' : 'source not approved'}
                        </p>
                        {source.available && (
                          <p style={{ fontSize: 8, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                            {source.action_pose || source.visual_action || 'No ending pose recorded'}
                            {source.props_present.length ? ` · Props: ${source.props_present.join(', ')}` : ''}
                            {source.screen_direction && source.screen_direction !== 'unspecified' ? ` · ${source.screen_direction.replaceAll('_', ' ')}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {onFrameUpdate && (
                <button
                  type="button"
                  onClick={() => setEditingFrame(editing => !editing)}
                  style={{ alignSelf: 'flex-start', marginBottom: 7, border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', color: 'var(--gold)', cursor: 'pointer', fontSize: 7, letterSpacing: '0.15em', padding: '4px 7px', textTransform: 'uppercase' }}
                >
                  {editingFrame ? 'Done editing' : 'Edit shot / frame'}
                </button>
              )}

              {editingFrame && onFrameUpdate && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '7px', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8, background: 'var(--bg-base)' }}>
                  {[
                    { key: 'shot_type', label: 'Shot type' },
                    { key: 'camera_angle', label: 'Camera angle' },
                    { key: 'camera_movement', label: 'Camera movement' },
                    { key: 'visual_action', label: 'Visual action', multiline: true },
                    { key: 'action_pose', label: 'End pose / action', multiline: true },
                    { key: 'props_present', label: 'Props present (comma-separated)', list: true },
                    { key: 'screen_direction', label: 'Screen direction', direction: true },
                    { key: 'continuity_reference_ids', label: 'Reference frame IDs (comma-separated)', list: true },
                    { key: 'continuity_dependency_ids', label: 'Depends on shot IDs (comma-separated)', list: true },
                    { key: 'continuity_notes', label: 'Continuity notes', multiline: true },
                    { key: 'duration_seconds', label: 'Duration (seconds)', numeric: true },
                    { key: 'lighting_notes', label: 'Lighting' },
                    { key: 'mood', label: 'Mood' },
                    { key: 'purpose', label: 'Purpose' },
                    { key: 'dialogue', label: 'Dialogue', multiline: true },
                    { key: 'sound_cue', label: 'Sound cue' },
                  ].map((field: { key: string; label: string; multiline?: boolean; numeric?: boolean; list?: boolean; direction?: boolean }) => {
                    const rawValue = (frame as unknown as Record<string, unknown>)[field.key]
                    const value = field.numeric
                      ? durationValue
                      : field.list && Array.isArray(rawValue)
                        ? rawValue.join(', ')
                        : String(rawValue ?? '')
                    const inputStyle = { width: '100%', boxSizing: 'border-box' as const, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--bg-surface)', color: 'var(--text-base)', fontSize: 8, padding: '5px 6px', outline: 'none' }
                    const onChange = (nextValue: string) => {
                      if (field.numeric) {
                        setDurationDraft({
                          frameNumber: frame.frame_number,
                          baseDuration: frame.duration_seconds,
                          value: nextValue,
                        })
                        setDurationError(false)
                        return
                      }
                      if (field.list) {
                        const list = nextValue.split(',').map(item => item.trim()).filter(Boolean)
                        const patch: Partial<StoryboardFrame> = field.key === 'props_present'
                          ? { props_present: list }
                          : field.key === 'continuity_dependency_ids'
                            ? { continuity_dependency_ids: list }
                            : { continuity_reference_ids: list }
                        onFrameUpdate(scene.scene_number, frame.frame_number, patch)
                        return
                      }
                      const patch: Partial<StoryboardFrame> = field.key === 'visual_action'
                          ? { visual_action: nextValue, action_breakdown: nextValue }
                          : field.key === 'screen_direction'
                            ? { screen_direction: nextValue as StoryboardFrame['screen_direction'] }
                            : { [field.key]: nextValue || null } as Partial<StoryboardFrame>
                      onFrameUpdate(scene.scene_number, frame.frame_number, patch)
                    }
                    const commitDuration = () => {
                      const nextDuration = Number(durationValue)
                      if (durationValue.trim() === '' || !Number.isFinite(nextDuration) || nextDuration <= 0) {
                        setDurationDraft({
                          frameNumber: frame.frame_number,
                          baseDuration: frame.duration_seconds,
                          value: String(frame.duration_seconds),
                        })
                        setDurationError(true)
                        return
                      }
                      setDurationError(false)
                      if (nextDuration !== frame.duration_seconds) {
                        onFrameUpdate(scene.scene_number, frame.frame_number, { duration_seconds: nextDuration })
                      }
                    }
                    return (
                      <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 3, color: 'var(--text-muted)', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {field.label}
                        {field.direction ? (
                          <select value={frame.screen_direction ?? 'unspecified'} onChange={event => onChange(event.target.value)} style={{ ...inputStyle, textTransform: 'none' }}>
                            {[
                              ['unspecified', 'Unspecified'],
                              ['left_to_right', 'Left to right'],
                              ['right_to_left', 'Right to left'],
                              ['toward_camera', 'Toward camera'],
                              ['away_from_camera', 'Away from camera'],
                              ['static', 'Static'],
                            ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        ) : field.multiline ? (
                          <textarea value={value} onChange={event => onChange(event.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', textTransform: 'none' }} />
                        ) : (
                          <input type={field.numeric ? 'number' : 'text'} min={field.numeric ? 0.1 : undefined} step={field.numeric ? 0.1 : undefined} value={value} onChange={event => onChange(event.target.value)} onBlur={field.numeric ? commitDuration : undefined} style={{ ...inputStyle, textTransform: 'none' }} />
                        )}
                        {field.numeric && durationError && <span role="alert" style={{ fontSize: 8, color: '#e06060', letterSpacing: 'normal', textTransform: 'none' }}>Enter a duration greater than zero.</span>}
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Field rows */}
              {[
                { label: 'Narrative Action', value: frame.narrative_action },
                { label: 'Camera Angle',     value: frame.camera_angle },
                { label: 'Camera Movement',  value: frame.camera_movement },
                { label: 'Lens',             value: frame.lens ?? frame.focal_length },
                { label: 'Lighting',         value: frame.lighting_notes },
                { label: 'Mood',             value: frame.mood },
                { label: 'Purpose',          value: frame.purpose },
                { label: 'Characters',       value: frame.characters_present?.join(', ') || null },
                { label: 'End Pose / Action', value: frame.action_pose },
                { label: 'Props',             value: frame.props_present?.join(', ') || null },
                { label: 'Screen Direction',  value: frame.screen_direction && frame.screen_direction !== 'unspecified' ? frame.screen_direction.replace(/_/g, ' ') : null },
                { label: 'References',        value: frame.continuity_reference_ids?.join(', ') || null },
                { label: 'Continuity Notes',  value: frame.continuity_notes },
                { label: 'Emotion',          value: frame.frame_emotion },
                { label: 'Dialogue',         value: frame.dialogue },
                { label: 'Sound',            value: frame.sound_cue },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 6, paddingBottom: 5, borderBottom: '1px solid var(--border)', marginBottom: 5 }}>
                  <span style={{ fontSize: 7, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.5, minWidth: 72, paddingTop: 1, flexShrink: 0 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-base)', opacity: 0.8, lineHeight: 1.5 }}>
                    {value}
                  </span>
                </div>
              ))}

              {/* Director Notes */}
              {frame.director_notes && (
                <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 3, padding: '6px 8px', marginTop: 2, marginBottom: 6 }}>
                  <p style={{ fontSize: 7, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>
                    Director's Notes
                  </p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic', opacity: 0.75 }}>
                    {frame.director_notes}
                  </p>
                </div>
              )}

              {/* Animation Beats — Level 3 */}
              {frame.animation_beats?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 7, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>
                    Animation Beats
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {frame.animation_beats.map((beat, i) => (
                      <span key={i} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 2, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)', opacity: 0.7 }}>
                        {beat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewrite direction + regenerate image */}
              {regenError && (
                <p style={{ fontSize: 8, color: '#e06060', marginBottom: 4 }}>{regenError}</p>
              )}
              <button
                disabled={regenLoading || regenImgLoading || premiumLoading}
                onClick={async () => {
                  setRegenLoading(true)
                  setRegenError(null)
                  setRegenSuccess(false)
                  try {
                    // Step 1 — rewrite the staging direction text
                    const result = await regenerateVisualAction(frame, scene)
                    const textPatch = {
                      visual_action: result.visual_action,
                      animation_beats: result.animation_beats,
                      director_notes: result.director_notes ?? frame.director_notes,
                    }
                    onVisualActionUpdate?.(scene.scene_number, frame.frame_number, textPatch)
                    setRegenLoading(false)

                    // Step 2 — regenerate the image from the new direction
                    setRegenImgLoading(true)
                    const updatedFrame = { ...frame, ...textPatch }
                    const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/storyboard/frame/reforge-composition`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ frame: updatedFrame, scene, render_style: projectRenderStyle ?? 'bw_sketch' }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.generated_image_url && onUpgradeFrame) {
                        onUpgradeFrame(scene.scene_number, frame.frame_number, data.generated_image_url)
                      }
                    }
                    setRegenSuccess(true)
                    setTimeout(() => setRegenSuccess(false), 2500)
                  } catch (err) {
                    setRegenError(err instanceof Error ? err.message : 'Regeneration failed')
                  } finally {
                    setRegenLoading(false)
                    setRegenImgLoading(false)
                  }
                }}
                className="btn-tactile bms-brass"
                style={{
                  width: '100%', padding: '6px 0', borderRadius: 3,
                  cursor: (regenLoading || regenImgLoading || premiumLoading) ? 'wait' : 'pointer',
                  border: '1px solid rgba(201,168,76,0.4)', background: 'transparent',
                  color: 'var(--gold)', fontSize: 8, letterSpacing: '0.2em',
                  textTransform: 'uppercase', opacity: (regenLoading || regenImgLoading || premiumLoading) ? 0.5 : 0.7,
                  transition: 'opacity 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={e => { if (!regenLoading && !regenImgLoading && !premiumLoading) e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { if (!regenLoading && !regenImgLoading && !premiumLoading) e.currentTarget.style.opacity = '0.7' }}
              >
                {regenLoading ? 'Rewriting Direction…' : regenImgLoading ? 'Rendering Scene…' : regenSuccess ? '✓ Scene Updated' : '↺ Regenerate Visual Action'}
              </button>

              {frame.generated_image_url && onUpgradeFrame && (
                <div style={{ marginTop: 8, padding: '7px', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 3 }}>
                  <p style={{ fontSize: 8, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                    With the Pollinations API key configured, drafts use low-cost models; reference edits use a model not currently marked paid-only, but can still consume Pollen. Nano Banana 2.1 uses the server-side Gemini API key and is usage-priced; it renders only this frame and uses the current image as a consistency reference. Reserve it for selected final frames.{' '}
                    <a href="https://gen.pollinations.ai/image/models" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Pollinations model pricing</a>{' '}·{' '}
                    <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Gemini API pricing</a>.
                  </p>
                  {premiumError && <p role="alert" style={{ fontSize: 8, color: '#e06060', marginBottom: 5 }}>{premiumError}</p>}
                  <button
                    type="button"
                    disabled={premiumLoading || regenLoading || regenImgLoading || upgradeLoading}
                    onClick={handlePremiumRender}
                    className="btn-tactile"
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 3,
                      cursor: premiumLoading ? 'wait' : 'pointer',
                      border: '1px solid rgba(201,168,76,0.28)', background: 'rgba(201,168,76,0.06)',
                      color: 'var(--gold)', fontSize: 8, letterSpacing: '0.12em',
                      textTransform: 'uppercase', opacity: premiumLoading ? 0.5 : 0.9,
                    }}
                  >
                    {premiumLoading ? 'Rendering with Nano Banana 2.1…' : premiumSuccess ? '✓ Premium frame updated' : 'Render this frame with Nano Banana 2.1 · Paid'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected gold strip */}
        {isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b" style={{ background: 'var(--gold)' }} />
        )}

        {/* Artist override strip — green, sits below the gold strip if also selected */}
        {frame.is_manual_override && !isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b" style={{ background: 'rgba(74,222,128,0.6)' }} />
        )}
      </div>
    </>
  )
}
