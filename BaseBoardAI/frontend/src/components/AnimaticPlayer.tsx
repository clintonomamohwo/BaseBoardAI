import { useState, useEffect, useRef } from 'react'
import type { StoryboardFrame } from '../types/storyboard'

interface Props { frames: StoryboardFrame[] }

export default function AnimaticPlayer({ frames }: Props) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!playing || !frames.length) return
    timer.current = setTimeout(() => setIdx((i) => (i + 1) % frames.length),
      (frames[idx]?.duration_seconds ?? 3) * 1000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [playing, idx, frames])

  if (!frames.length) return null
  const frame = frames[idx]

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-video rounded bg-[var(--bg-base)] border border-[var(--border)] overflow-hidden relative">
        {frame.generated_image_url
          ? <img src={frame.generated_image_url} className="w-full h-full object-cover" alt="" />
          : <div className="flex items-center justify-center h-full text-[9px] tracking-widest text-[var(--gold)]/20 uppercase">No image generated</div>
        }
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex justify-between text-[9px] text-white/70">
            <span className="tracking-widest uppercase">{frame.shot_type}</span>
            <span className="font-mono">{frame.duration_seconds}s</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-center">
        <button onClick={() => { setIdx(0); setPlaying(false) }}
          className="w-8 h-8 flex items-center justify-center text-sm border border-[var(--border)] hover:border-[var(--gold)]/40 text-[var(--text-base)]/40 hover:text-[var(--gold)] rounded transition-all">⏮</button>
        <button onClick={() => setPlaying(p => !p)}
          className="w-10 h-10 flex items-center justify-center border border-[var(--gold)]/30 hover:border-[var(--gold)]/80 text-[var(--gold)] rounded transition-all gold-glow text-sm">
          {playing ? '⏸' : '▶'}
        </button>
      </div>

      <div className="flex gap-1">
        {frames.map((f, i) => (
          <button key={f.frame_number} onClick={() => { setIdx(i); setPlaying(false) }}
            className={`flex-1 h-0.5 rounded-full transition-all ${i === idx ? 'bg-[var(--gold)]' : 'bg-[var(--border)] hover:bg-[var(--gold)]/30'}`} />
        ))}
      </div>
    </div>
  )
}
