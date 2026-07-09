import { useRef, useState, useMemo } from 'react'
import type { StoryboardFrame, StoryboardScene } from '../types/storyboard'
import { downloadFramePng } from '../utils/exportFrames'
import GalleryLightbox from './GalleryLightbox'

interface Props {
  frame: StoryboardFrame
  scene: StoryboardScene
  isSelected: boolean
  onToggleSelect: (key: string) => void
  /** Called with the new base64 data URL when the user uploads a replacement image */
  onReplaceImage?: (sceneNumber: number, frameNumber: number, dataUrl: string) => void
}

export default function FrameCard({ frame, scene, isSelected, onToggleSelect, onReplaceImage }: Props) {
  const key = `s${scene.scene_number}_f${frame.frame_number}`
  const frameId = `${String(scene.scene_number).padStart(2, '0')}${String(frame.frame_number).padStart(1, '0')}`
  const filename = `s${scene.scene_number}_f${frame.frame_number}.png`
  const cardRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  // null = closed; number = index into galleryItems to open at
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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
    [scene.frames]
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
        className="relative flex-shrink-0 w-56 rounded frame-card-hover card-tilt cursor-pointer group"
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
        </div>

        {/* ── Metadata ── */}
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase' }}>
              {frame.shot_type}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.7 }}>
              {frame.duration_seconds}s
            </span>
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {frame.action_breakdown}
          </p>
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
