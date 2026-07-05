/**
 * GenesisEnginePage — Cinematic AI analysis pipeline screen.
 *
 * 12 independent task cards in a 2-column grid, each with its own
 * progress bar and completion checkmark. After the pipeline resolves,
 * fires onComplete with the project so App can show the Creative Director Report.
 */
import { useEffect, useState, useRef } from 'react'
import logoSrc from '../assets/logo.png'
import type { StoryboardProject } from '../types/storyboard'
import { forgePipeline } from '../api/storyboard'
import { extractDocumentText } from '../utils/extractDocumentText'

interface TaskDef {
  id: string
  label: string
  icon: string
  delay: number    // seconds before bar starts
  duration: number // seconds to fill
}

const TASKS: TaskDef[] = [
  { id: 'read',       label: 'Reading Story',               icon: '📖', delay: 0.0, duration: 1.2 },
  { id: 'genre',      label: 'Understanding Genre',         icon: '🎭', delay: 0.4, duration: 1.0 },
  { id: 'chars',      label: 'Extracting Characters',       icon: '👤', delay: 0.8, duration: 2.2 },
  { id: 'relations',  label: 'Building Relationships',      icon: '🕸', delay: 1.4, duration: 1.8 },
  { id: 'locations',  label: 'Detecting Locations',         icon: '📍', delay: 1.8, duration: 1.6 },
  { id: 'world',      label: 'Building World Bible',        icon: '🌍', delay: 2.2, duration: 2.0 },
  { id: 'props',      label: 'Detecting Props',             icon: '🗡',  delay: 2.8, duration: 1.4 },
  { id: 'scenes',     label: 'Splitting Into Scenes',       icon: '🎬', delay: 3.2, duration: 2.2 },
  { id: 'timeline',   label: 'Creating Story Timeline',     icon: '⏱',  delay: 3.8, duration: 1.6 },
  { id: 'storyboard', label: 'Generating Storyboard',       icon: '🖼',  delay: 4.4, duration: 3.0 },
  { id: 'style',      label: 'Creating Visual Style Guide', icon: '🎨', delay: 5.0, duration: 1.8 },
  { id: 'workspace',  label: 'Preparing Studio',            icon: '⚡', delay: 5.6, duration: 1.4 },
]

type TaskStatus = 'pending' | 'running' | 'done'

interface Props {
  file: File | null
  projectTitle: string
  onComplete: (project: StoryboardProject) => void
  onNotify?: (msg: string, type?: 'success' | 'info') => void
  onBack: () => void
  onLanding: () => void
}

export default function GenesisEnginePage({
  file, projectTitle, onComplete, onNotify, onBack, onLanding,
}: Props) {
  const [taskStatus,   setTaskStatus]   = useState<Record<string, TaskStatus>>(
    Object.fromEntries(TASKS.map(t => [t.id, 'pending' as TaskStatus]))
  )
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>(
    Object.fromEntries(TASKS.map(t => [t.id, 0]))
  )
  const [error,     setError]     = useState<string | null>(null)
  const [started,   setStarted]   = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    runGenesis()
  }, [])

  async function runGenesis() {
    setStarted(true)

    // Extract document text
    let docText = ''
    try {
      if (file) docText = await extractDocumentText(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read document')
      return
    }

    // Animate task cards independently
    const timers: ReturnType<typeof setInterval>[] = []
    TASKS.forEach((task) => {
      const startDelay = task.delay * 1000
      const totalMs    = task.duration * 1000
      setTimeout(() => {
        setTaskStatus(prev => ({ ...prev, [task.id]: 'running' }))
        const startTime = Date.now()
        const interval  = setInterval(() => {
          const progress = Math.min((Date.now() - startTime) / totalMs, 1)
          setTaskProgress(prev => ({ ...prev, [task.id]: progress }))
          if (progress >= 1) {
            clearInterval(interval)
            setTaskStatus(prev => ({ ...prev, [task.id]: 'done' }))
          }
        }, 50)
        timers.push(interval)
      }, startDelay)
    })

    // Fire the actual pipeline
    onNotify?.('Genesis Engine initialising…', 'info')
    try {
      const project = await forgePipeline({
        project_title:         projectTitle || (file ? file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Genesis Project'),
        global_aesthetic:      'Cinematic High-Contrast',
        render_style:          'bw_sketch',
        reference_style_image: null,
        raw_character_notes:   docText,
        raw_world_notes:       docText,
        raw_script_text:       docText,
      })

      // Flash all tasks to done
      setTaskStatus(Object.fromEntries(TASKS.map(t => [t.id, 'done'])))
      setTaskProgress(Object.fromEntries(TASKS.map(t => [t.id, 1])))
      timers.forEach(clearInterval)
      onNotify?.('Genesis Engine complete ✓')

      // Countdown before report
      const SECS = 5
      setCountdown(SECS)
      let remaining = SECS
      const tick = setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          clearInterval(tick)
          setCountdown(null)
          onComplete(project)
        } else {
          setCountdown(remaining)
        }
      }, 1000)
    } catch (err) {
      timers.forEach(clearInterval)
      let msg = err instanceof Error ? err.message : 'Pipeline failed'
      if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
        msg = 'Cannot reach the backend.\n\nMake sure the server is running:\ncd BaseBoardAI/backend && source .venv/bin/activate && uvicorn app.main:app --reload'
      }
      setError(msg)
      onNotify?.('Backend unreachable — is the server running?', 'info')
    }
  }

  const totalDone  = Object.values(taskStatus).filter(s => s === 'done').length
  const overallPct = Math.round((totalDone / TASKS.length) * 100)
  const allDone    = totalDone === TASKS.length

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, var(--gold-dim) 0%, transparent 60%)', opacity: 0.18 }} />
      <div className="absolute inset-0 pointer-events-none grain-overlay" aria-hidden="true" />

      {/* Top bar */}
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-10">
        <button onClick={onLanding} className="btn-tactile flex items-center gap-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src={logoSrc} alt="Baseboard AI" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(201,168,76,0.5))' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>
            BASEBOARD AI
          </span>
        </button>
        {(!started || error) && (
          <button onClick={onBack} className="btn-tactile"
            style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', opacity: 0.6 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>
            ← Back
          </button>
        )}
      </div>

      <div className="relative z-10 w-full anim-studio-unfold" style={{ maxWidth: 740 }}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-7 h-7 rounded flex items-center justify-center genesis-glow"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--gold)' }}>
              <span style={{ color: 'var(--gold)', fontFamily: 'Georgia,serif', fontWeight: 'bold', fontSize: 13 }}>G</span>
            </div>
            <span style={{ fontSize: 9, letterSpacing: '0.45em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.7 }}>
              Genesis Engine
            </span>
          </div>
          <h2 className="gold-glow-text"
            style={{ fontFamily: 'Georgia,serif', fontSize: 24, fontWeight: 'bold', color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 6 }}>
            {projectTitle || 'Analysing Story'}
          </h2>
          {file && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6, letterSpacing: '0.1em' }}>
              {file.name}
            </p>
          )}
          {!file && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>
              Building your production bible from scratch…
            </p>
          )}
        </div>

        {/* Error state */}
        {error ? (
          <div className="anim-slide-up mb-6" style={{
            borderRadius: 8, padding: '20px 24px',
            background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)',
            fontSize: 13, color: '#e06060', lineHeight: 1.7,
          }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>Genesis Engine failed</strong>
            <pre style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', opacity: 0.8 }}>{error}</pre>
            <button className="btn-tactile" onClick={onBack}
              style={{ marginTop: 16, fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', background: 'none', border: '1px solid var(--gold)', cursor: 'pointer', textTransform: 'uppercase', padding: '7px 18px', borderRadius: 4 }}>
              ← Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Overall progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase' }}>
                  Analysis Progress
                </span>
                <span style={{ fontSize: 11, color: 'var(--gold)', opacity: 0.8 }}>
                  {overallPct}%
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${overallPct}%`,
                  background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
                  boxShadow: overallPct > 0 ? '0 0 8px var(--gold)' : 'none',
                  transition: 'width 200ms ease',
                }} />
              </div>
            </div>

            {/* 2-column task grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 24,
            }}>
              {TASKS.map((task) => {
                const status   = taskStatus[task.id]
                const progress = taskProgress[task.id]
                const isDone   = status === 'done'
                const isRun    = status === 'running'

                return (
                  <div
                    key={task.id}
                    className="genesis-task-card"
                    style={{
                      background: isDone
                        ? 'rgba(201,168,76,0.05)'
                        : isRun
                        ? 'rgba(201,168,76,0.03)'
                        : 'var(--bg-surface)',
                      border: isDone
                        ? '1px solid rgba(201,168,76,0.3)'
                        : isRun
                        ? '1px solid rgba(201,168,76,0.2)'
                        : '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '12px 14px',
                      opacity: status === 'pending' ? 0.3 : 1,
                      transition: 'opacity 300ms ease, background 300ms ease, border-color 300ms ease',
                    }}
                  >
                    {/* Row: icon + label + indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, lineHeight: 1, opacity: isDone ? 1 : isRun ? 0.9 : 0.4 }}>
                        {task.icon}
                      </span>
                      <span style={{
                        fontSize: 12, flex: 1,
                        color: isDone ? 'var(--text-base)' : isRun ? 'var(--gold)' : 'var(--text-muted)',
                        transition: 'color 250ms ease',
                      }}>
                        {task.label}
                      </span>
                      {/* Status circle */}
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        border: isDone ? 'none' : `1.5px solid ${isRun ? 'var(--gold)' : 'var(--border)'}`,
                        background: isDone ? 'var(--gold)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isDone ? '0 0 6px var(--gold-dim)' : isRun ? '0 0 4px var(--gold-dim)' : 'none',
                        transition: 'background 250ms ease, box-shadow 250ms ease',
                      }}>
                        {isDone && (
                          <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                            <path d="M1 3.5 L3 5.5 L7 1.5" stroke="var(--bg-base)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {isRun && (
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', animation: 'pulse-gold 1s ease-in-out infinite' }} />
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${progress * 100}%`,
                        background: isDone ? 'var(--gold)' : 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
                        boxShadow: isRun ? '0 0 4px var(--gold)' : 'none',
                        transition: 'width 80ms linear, background 300ms ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Status line / countdown */}
            {countdown !== null ? (
              <div className="text-center anim-slide-up">
                <p style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12, opacity: 0.7 }}>
                  Analysis Complete — Preparing Report
                </p>
                {/* Countdown ring */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: '2px solid rgba(201,168,76,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    boxShadow: '0 0 16px var(--gold-dim)',
                  }}>
                    <svg width="56" height="56" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                      <circle cx="28" cy="28" r="26"
                        fill="none" stroke="var(--gold)" strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - countdown / 5)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                      />
                    </svg>
                    <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: 'var(--gold)', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                      {countdown}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5 }}>
                    seconds until report
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ opacity: 0.5 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase' }}>
                  {overallPct < 100 ? 'Genesis Engine is analysing your story…' : 'Preparing report…'}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
