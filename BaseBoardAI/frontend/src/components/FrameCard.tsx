import { useRef } from 'react'
import type { StoryboardFrame, StoryboardScene } from '../types/storyboard'
import { downloadFramePng } from '../utils/exportFrames'

interface Props {
  frame: StoryboardFrame
  scene: StoryboardScene
  isSelected: boolean
  onToggleSelect: (key: string) => void
}

export default function FrameCard({ frame, scene, isSelected, onToggleSelect }: Props) {
  const key = `s${scene.scene_number}_f${frame.frame_number}`
  const frameId = `${String(scene.scene_number).padStart(2,'0')}${String(frame.frame_number).padStart(1,'0')}`
  const cardRef = useRef<HTMLDivElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width  - 0.5   // -0.5 → 0.5
    const y = (e.clientY - r.top)  / r.height - 0.5
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
    <div ref={cardRef}
      className="relative flex-shrink-0 w-56 rounded frame-card-hover card-tilt cursor-pointer group"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
        boxShadow: isSelected ? '0 0 0 1.5px var(--gold)' : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Frame image */}
      <div className="aspect-video w-full rounded-t overflow-hidden relative flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}>
        {frame.generated_image_url ? (
          <img src={frame.generated_image_url} alt={`Frame ${frameId}`}
            className="w-full h-full object-cover anim-gold-assemble" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.2, textTransform: 'uppercase' }}>
              AI PreViz (Base64 Render)
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.3 }}>{frameId}</span>
          </div>
        )}
        {/* Frame ID badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--gold)', opacity: 0.8, letterSpacing: '0.15em' }}>{frameId}</span>
        </div>
        {/* Action overlay on hover */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => onToggleSelect(key)}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] btn-tactile"
            style={{
              background: isSelected ? 'var(--gold)' : 'rgba(0,0,0,0.6)',
              color: isSelected ? 'var(--bg-base)' : 'var(--gold)',
              border: 'none', cursor: 'pointer',
            }}>★</button>
          <button onClick={() => downloadFramePng(frame.generated_image_url, `${frameId}.png`)}
            disabled={!frame.generated_image_url}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] btn-tactile"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--text-base)', border: 'none', cursor: 'pointer', opacity: frame.generated_image_url ? 1 : 0.3 }}>↓</button>
        </div>
      </div>

      {/* Metadata */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase' }}>
            {frame.shot_type}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.7 }}>{frame.duration_seconds}s</span>
        </div>
        <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {frame.action_breakdown}
        </p>
      </div>

      {/* Selected gold strip at bottom */}
      {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b" style={{ background: 'var(--gold)' }} />}
    </div>
  )
}
