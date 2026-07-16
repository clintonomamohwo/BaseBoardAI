/**
 * GalleryLightbox — shared navigable image viewer.
 *
 * Used by both FrameCard (storyboard/vault) and CharacterPackagePage (turnaround,
 * expressions, poses, outfits, props).
 *
 * Navigation:
 *   ← / → arrow keys
 *   Left / Right click buttons
 *   Click a thumbnail strip item
 *   Swipe left / right (touch)
 *   Escape → close
 *   Click backdrop → close
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { downloadFramePng } from '../utils/exportFrames'

export interface GalleryItem {
  url: string
  label: string          // e.g. "Front", "Happy", "0101", "Standing"
  sublabel?: string      // optional second line, e.g. shot type / duration
}

interface Props {
  items: GalleryItem[]
  initialIndex?: number
  onClose: () => void
}

const BTN = {
  nav: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '10px 18px',
    transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
    userSelect: 'none' as const,
  },
  navDisabled: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.12)',
    fontSize: 20,
    lineHeight: 1,
    cursor: 'default',
    padding: '10px 18px',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  },
}

export default function GalleryLightbox({ items, initialIndex = 0, onClose }: Props) {
  const [current, setCurrent] = useState(Math.max(0, Math.min(initialIndex, items.length - 1)))
  const backdropRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const item = items[current]
  const hasPrev = current > 0
  const hasNext = current < items.length - 1

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape')      { onClose(); return }
    if (e.key === 'ArrowLeft'  && hasPrev) setCurrent(i => i - 1)
    if (e.key === 'ArrowRight' && hasNext) setCurrent(i => i + 1)
  }, [onClose, hasPrev, hasNext])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Focus the backdrop on mount so keydown fires without needing a click first
  useEffect(() => { backdropRef.current?.focus() }, [])

  // ── Touch / swipe ────────────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50 && hasNext) setCurrent(i => i + 1)
    if (dx >  50 && hasPrev) setCurrent(i => i - 1)
    touchStartX.current = null
  }

  // ── Download current image ───────────────────────────────────────────────
  function handleDownload() {
    downloadFramePng(item.url, `${item.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`)
  }

  // ── Thumbnail strip scroll-into-view ────────────────────────────────────
  const thumbRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const strip = thumbRef.current
    if (!strip) return
    const active = strip.children[current] as HTMLElement | undefined
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [current])

  return (
    <div
      ref={backdropRef}
      tabIndex={-1}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.94)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        outline: 'none',
      }}
    >
      {/* ── Close ── */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 18, right: 22,
          background: 'none', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, color: 'rgba(255,255,255,0.35)',
          fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '4px 10px',
          transition: 'border-color 150ms, color 150ms',
          zIndex: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.color = 'var(--gold)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
      >✕</button>

      {/* ── Counter ── */}
      <div style={{ position: 'absolute', top: 22, left: 22, zIndex: 1 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>
          {current + 1} / {items.length}
        </span>
      </div>

      {/* ── Main row: prev · image · next ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 20, cursor: 'default' }}
      >
        {/* Prev arrow */}
        <button
          onClick={() => hasPrev && setCurrent(i => i - 1)}
          style={hasPrev ? BTN.nav : BTN.navDisabled}
          onMouseEnter={e => { if (hasPrev) { e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'var(--gold)' }}}
          onMouseLeave={e => { if (hasPrev) { e.currentTarget.style.background = BTN.nav.background; e.currentTarget.style.borderColor = BTN.nav.border.split(' ').pop()!; e.currentTarget.style.color = BTN.nav.color }}}
          aria-label="Previous image"
        >‹</button>

        {/* Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: '76vw' }}>
          <img
            key={item.url}   /* key forces re-render fade on change */
            src={item.url}
            alt={item.label}
            style={{
              maxWidth: '70vw',
              maxHeight: '62vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 6,
              border: '1px solid rgba(201,168,76,0.18)',
              display: 'block',
              animation: 'glb-fade 150ms ease',
            }}
          />

          {/* Label + sublabel */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 3 }}>
              {item.label}
            </p>
            {item.sublabel && (
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', lineHeight: 1.6 }}>
                {item.sublabel}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownload}
              style={{
                padding: '7px 20px', borderRadius: 4, fontSize: 9,
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
                border: '1px solid rgba(201,168,76,0.4)', background: 'transparent',
                color: 'var(--gold)', transition: 'background 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)' }}
            >↓ Export PNG</button>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px', borderRadius: 4, fontSize: 9,
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.09)', background: 'transparent',
                color: 'rgba(255,255,255,0.28)', transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.28)' }}
            >Close</button>
          </div>
        </div>

        {/* Next arrow */}
        <button
          onClick={() => hasNext && setCurrent(i => i + 1)}
          style={hasNext ? BTN.nav : BTN.navDisabled}
          onMouseEnter={e => { if (hasNext) { e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'var(--gold)' }}}
          onMouseLeave={e => { if (hasNext) { e.currentTarget.style.background = BTN.nav.background; e.currentTarget.style.borderColor = BTN.nav.border.split(' ').pop()!; e.currentTarget.style.color = BTN.nav.color }}}
          aria-label="Next image"
        >›</button>
      </div>

      {/* ── Thumbnail strip ── */}
      {items.length > 1 && (
        <div
          ref={thumbRef}
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', gap: 6, marginTop: 20,
            maxWidth: '84vw', overflowX: 'auto',
            padding: '4px 2px',
            scrollbarWidth: 'none',
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              title={it.label}
              style={{
                flexShrink: 0, cursor: 'pointer',
                borderRadius: 4,
                border: `2px solid ${i === current ? 'var(--gold)' : 'transparent'}`,
                opacity: i === current ? 1 : 0.38,
                transition: 'opacity 120ms ease, border-color 120ms ease, transform 120ms ease',
                transform: i === current ? 'scale(1.08)' : 'scale(1)',
              }}
              onMouseEnter={e => { if (i !== current) (e.currentTarget as HTMLDivElement).style.opacity = '0.7' }}
              onMouseLeave={e => { if (i !== current) (e.currentTarget as HTMLDivElement).style.opacity = '0.38' }}
            >
              <img
                src={it.url}
                alt={it.label}
                style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 3, display: 'block' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <p style={{ position: 'absolute', bottom: 16, fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}>
        ← → ARROW KEYS TO NAVIGATE · ESC TO CLOSE
      </p>

      {/* Fade-in animation */}
      <style>{`@keyframes glb-fade { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
  )
}
