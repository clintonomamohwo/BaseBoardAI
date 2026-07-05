import { useState, useEffect, useRef, useCallback } from 'react'
import type { StoryboardFrame } from '../types/storyboard'

interface Props { frames: StoryboardFrame[] }

export default function AnimaticPlayer({ frames }: Props) {
  const [idx,     setIdx]     = useState(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)   // seconds into current frame
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef   = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const frame        = frames[idx]
  const frameDur     = frame?.duration_seconds ?? 3
  const totalSeconds = frames.reduce((s, f) => s + (f.duration_seconds ?? 3), 0)

  // Cumulative second offset for each frame (for scrub bar)
  const frameOffsets = frames.reduce<number[]>((acc, f, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + (frames[i - 1].duration_seconds ?? 3))
    return acc
  }, [])
  const scrubPosition = (frameOffsets[idx] + elapsed) / totalSeconds

  const advance = useCallback(() => {
    setIdx(i => {
      const next = i + 1
      if (next >= frames.length) { setPlaying(false); return i }
      return next
    })
    setElapsed(0)
  }, [frames.length])

  // Playback tick
  useEffect(() => {
    if (!playing) {
      if (timer.current) clearTimeout(timer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    startRef.current = performance.now() - elapsed * 1000
    const remaining  = frameDur - elapsed

    // RAF for smooth scrub progress
    function tick() {
      const now  = performance.now()
      const secs = (now - startRef.current) / 1000
      setElapsed(Math.min(secs, frameDur))
      if (secs < frameDur) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // Advance to next frame after remaining duration
    timer.current = setTimeout(advance, remaining * 1000)

    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx])

  function goTo(i: number) {
    if (timer.current) clearTimeout(timer.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setIdx(i)
    setElapsed(0)
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const pct        = +e.target.value / 1000
    const targetSec  = pct * totalSeconds
    let acc          = 0
    for (let i = 0; i < frames.length; i++) {
      const dur = frames[i].duration_seconds ?? 3
      if (acc + dur >= targetSec || i === frames.length - 1) {
        setPlaying(false)
        goTo(i)
        setElapsed(targetSec - acc)
        break
      }
      acc += dur
    }
  }

  function togglePlay() {
    if (idx >= frames.length - 1 && !playing) goTo(0)
    setPlaying(p => !p)
  }

  if (!frames.length) return null

  const frameProgress = elapsed / frameDur   // 0–1 within current frame
  const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0')
  const formatTime = (s: number) => `${pad2(s / 60)}:${pad2(s % 60)}`
  const currentTime = frameOffsets[idx] + elapsed
  const frameId = `${String(frame.scene_number ?? 0).padStart(2,'0')}.${String(frame.frame_number).padStart(2,'0')}`

  return (
    <div className="flex flex-col gap-3">

      {/* Main viewport */}
      <div className="aspect-video rounded bg-[var(--bg-base)] border border-[var(--border)] overflow-hidden relative">
        {frame.generated_image_url
          ? <img src={frame.generated_image_url} className="w-full h-full object-cover" alt="" />
          : <div className="flex items-center justify-center h-full text-[9px] tracking-widest text-[var(--gold)]/20 uppercase">No image generated</div>
        }

        {/* Overlay HUD */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
          {/* Top row — frame info */}
          <div className="flex items-start justify-between">
            <div style={{
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              borderRadius: 4, padding: '4px 8px',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--gold)', letterSpacing: '0.2em' }}>
                F{frame.frame_number} / {frames.length}
              </span>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              borderRadius: 4, padding: '4px 8px',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em' }}>
                {formatTime(currentTime)} / {formatTime(totalSeconds)}
              </span>
            </div>
          </div>

          {/* Bottom row — shot metadata */}
          <div style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
            borderRadius: '0 0 4px 4px', padding: '16px 12px 6px',
          }}>
            <div className="flex justify-between items-end">
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>
                  {frame.shot_type}
                </p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{frame.camera_angle}</p>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                {frameDur}s
              </span>
            </div>
            {/* Per-frame progress bar */}
            <div style={{ height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1, marginTop: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 1,
                width: `${frameProgress * 100}%`,
                background: 'var(--gold)',
                transition: playing ? 'none' : 'width 150ms ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline scrub bar */}
      <div style={{ position: 'relative', padding: '0 2px' }}>
        <input
          type="range" min={0} max={1000} step={1}
          value={Math.round(scrubPosition * 1000)}
          onChange={handleScrub}
          style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer' }}
        />
        {/* Frame tick marks */}
        <div style={{ position: 'absolute', top: 0, left: 2, right: 2, height: '100%', pointerEvents: 'none', display: 'flex' }}>
          {frames.map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(frameOffsets[i] / totalSeconds) * 100}%`,
              top: 2, width: 1, height: 8,
              background: i === idx ? 'var(--gold)' : 'rgba(201,168,76,0.25)',
            }} />
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 justify-center">
        {/* Rewind */}
        <button
          onClick={() => goTo(0)}
          className="w-7 h-7 flex items-center justify-center rounded transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-base)', opacity: 0.4, fontSize: 11 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--gold)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >⏮</button>

        {/* Prev frame */}
        <button
          onClick={() => goTo(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="w-7 h-7 flex items-center justify-center rounded transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-base)', opacity: idx === 0 ? 0.2 : 0.5, fontSize: 12 }}
          onMouseEnter={e => { if (idx > 0) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--gold)' } }}
          onMouseLeave={e => { e.currentTarget.style.opacity = idx === 0 ? '0.2' : '0.5'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >‹</button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded transition-all gold-glow"
          style={{ border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 14, background: playing ? 'var(--gold-dim)' : 'transparent' }}
        >{playing ? '⏸' : '▶'}</button>

        {/* Next frame */}
        <button
          onClick={() => goTo(Math.min(frames.length - 1, idx + 1))}
          disabled={idx >= frames.length - 1}
          className="w-7 h-7 flex items-center justify-center rounded transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-base)', opacity: idx >= frames.length - 1 ? 0.2 : 0.5, fontSize: 12 }}
          onMouseEnter={e => { if (idx < frames.length - 1) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--gold)' } }}
          onMouseLeave={e => { e.currentTarget.style.opacity = idx >= frames.length - 1 ? '0.2' : '0.5'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >›</button>

        {/* Timecode */}
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6, marginLeft: 6 }}>
          {formatTime(currentTime)} / {formatTime(totalSeconds)}
        </span>
      </div>

      {/* Frame strip */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {frames.map((f, i) => (
          <button
            key={f.frame_number}
            onClick={() => goTo(i)}
            style={{
              flexShrink: 0, width: 48, height: 30,
              borderRadius: 3, overflow: 'hidden',
              border: `1.5px solid ${i === idx ? 'var(--gold)' : 'var(--border)'}`,
              background: 'var(--bg-base)', cursor: 'pointer', padding: 0,
              opacity: i === idx ? 1 : 0.5,
              transition: 'border-color 150ms ease, opacity 150ms ease',
              boxShadow: i === idx ? '0 0 6px var(--gold-dim)' : 'none',
            }}
            onMouseEnter={e => { if (i !== idx) e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { if (i !== idx) e.currentTarget.style.opacity = '0.5' }}
          >
            {f.generated_image_url
              ? <img src={f.generated_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 7, color: 'var(--gold)', opacity: 0.3, fontFamily: 'monospace' }}>F{f.frame_number}</span>
                </div>
            }
          </button>
        ))}
      </div>
    </div>
  )
}
