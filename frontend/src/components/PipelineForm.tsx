import { useState } from 'react'
import { classifyError } from '../utils/classifyError'
import type { RenderStyle, StoryboardProject } from '../types/storyboard'
import { forgePipelineStream } from '../api/storyboard'
import StyleReferenceUploader from './StyleReferenceUploader'

type RS = RenderStyle
const RENDER_OPTIONS: { value: RS; label: string }[] = [
  { value: 'bw_sketch',   label: 'B&W Sketch' },
  { value: 'flat_color',  label: 'Flat Color' },
  { value: 'full_shaded', label: 'Full Shaded' },
]

interface Stage {
  id: string
  label: string
  icon: string
}

const STAGES: Stage[] = [
  { id: 'chars',      label: 'Extracting Characters', icon: '👤' },
  { id: 'world',      label: 'Building World Bible',  icon: '🌍' },
  { id: 'storyboard', label: 'Generating Storyboard', icon: '🎬' },
  { id: 'images',     label: 'Generating Images',     icon: '🖼'  },
]

type StageStatus = 'pending' | 'running' | 'done'

interface Props {
  onComplete: (project: StoryboardProject) => void
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error', detail?: string) => void
}

export default function PipelineForm({ onComplete, onNotify }: Props) {
  const [title, setTitle]           = useState('')
  const [aesthetic, setAesthetic]   = useState('')
  const [renderStyle, setRS]        = useState<RS>('bw_sketch')
  const [refImage, setRefImage]     = useState<string | null>(null)
  const [charNotes, setCharNotes]   = useState('')
  const [worldNotes, setWorldNotes] = useState('')
  const [script, setScript]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Progress state
  const [stageStatus,   setStageStatus]   = useState<Record<string, StageStatus>>({})
  const [statusLine,    setStatusLine]    = useState('')
  const [imagesDone,    setImagesDone]    = useState(0)
  const [imagesTotal,   setImagesTotal]   = useState(0)

  function setStatus(id: string, s: StageStatus) {
    setStageStatus(prev => ({ ...prev, [id]: s }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStageStatus({})
    setStatusLine('Starting pipeline…')
    setImagesDone(0)
    setImagesTotal(0)
    onNotify?.('Pipeline started…', 'info')

    try {
      let finalProject: StoryboardProject | null = null

      await forgePipelineStream(
        {
          project_title:         title || 'Untitled PreViz Project',
          global_aesthetic:      aesthetic,
          render_style:          renderStyle,
          reference_style_image: refImage,
          raw_character_notes:   charNotes,
          raw_world_notes:       worldNotes,
          raw_script_text:       script,
        },
        (ev) => {
          if (ev.event === 'stage_start') {
            setStatus(ev.stage, 'running')
            const labels: Record<string, string> = {
              chars:      'Extracting characters…',
              world:      'Building world bible…',
              storyboard: 'Generating storyboard…',
              images:     `Generating images (0 / ${ev.total ?? '?'})…`,
            }
            setStatusLine(labels[ev.stage] ?? `Running ${ev.stage}…`)
            if (ev.stage === 'images') setImagesTotal(ev.total ?? 0)
          } else if (ev.event === 'stage_done') {
            setStatus(ev.stage, 'done')
            if (ev.stage === 'chars')
              setStatusLine(`${ev.count} character${ev.count !== 1 ? 's' : ''} extracted…`)
            else if (ev.stage === 'world')
              setStatusLine(`${ev.count} environment${ev.count !== 1 ? 's' : ''} built…`)
            else if (ev.stage === 'storyboard')
              setStatusLine(`${ev.frames} frames across ${ev.scenes} scenes — generating images…`)
            else if (ev.stage === 'images')
              setStatusLine('All images generated — saving…')
          } else if (ev.event === 'image_progress') {
            setImagesDone(ev.done)
            setImagesTotal(ev.total)
            setStatusLine(`Generating images (${ev.done} / ${ev.total})…`)
          } else if (ev.event === 'complete') {
            finalProject = ev.project
          } else if (ev.event === 'error') {
            throw new Error(ev.detail)
          }
        }
      )

      if (!finalProject) throw new Error('Pipeline ended without a result.')
      onNotify?.('Pipeline complete ✓')
      onComplete(finalProject)
    } catch (err) {
      const e = classifyError(err)
      setError(`${e.title}\n\n${e.detail}`)
      onNotify?.(e.title, 'error', e.detail)
    } finally {
      setLoading(false)
    }
  }

  const inputS: React.CSSProperties = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '8px 12px', fontSize: 13,
    color: 'var(--text-base)', outline: 'none',
    transition: 'border-color 150ms ease',
  }
  const labelS: React.CSSProperties = {
    display: 'block', fontSize: 9, letterSpacing: '0.25em',
    color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase', marginBottom: 6,
  }

  // ── Loading state — live progress ────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 300, paddingTop: 12 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.35em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>
          3-Stage Continuity Pipeline
        </p>

        {/* Stage cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAGES.map((stage) => {
            const s = stageStatus[stage.id] ?? 'pending'
            const isDone = s === 'done'
            const isRun  = s === 'running'
            // Image stage gets a sub-progress bar
            const imgPct = stage.id === 'images' && imagesTotal > 0
              ? imagesDone / imagesTotal
              : isDone ? 1 : isRun ? 0.4 : 0

            return (
              <div key={stage.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 6,
                background: isDone ? 'rgba(201,168,76,0.05)' : isRun ? 'rgba(201,168,76,0.03)' : 'var(--bg-surface)',
                border: `1px solid ${isDone ? 'rgba(201,168,76,0.3)' : isRun ? 'rgba(201,168,76,0.15)' : 'var(--border)'}`,
                opacity: s === 'pending' ? 0.3 : 1,
                transition: 'all 250ms ease',
              }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{stage.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: isDone ? 'var(--text-base)' : isRun ? 'var(--gold)' : 'var(--text-muted)', transition: 'color 250ms ease' }}>
                      {stage.id === 'images' && imagesTotal > 0
                        ? `Generating Images (${imagesDone} / ${imagesTotal})`
                        : stage.label}
                    </span>
                    {/* Status dot / checkmark */}
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: isDone ? 'none' : `1.5px solid ${isRun ? 'var(--gold)' : 'var(--border)'}`,
                      background: isDone ? 'var(--gold)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 250ms ease',
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
                      width: `${(isDone ? 1 : isRun ? (stage.id === 'images' && imagesTotal > 0 ? imgPct : 0.4) : 0) * 100}%`,
                      background: isDone ? 'var(--gold)' : 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
                      transition: stage.id === 'images' ? 'width 300ms ease' : 'width 600ms ease',
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Current status line */}
        <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>
          {statusLine}
        </p>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.35em', color: 'var(--gold)', opacity: 0.4, textTransform: 'uppercase' }}>
          3-Stage Continuity Pipeline
        </p>
      </div>

      {error && (
        <div style={{ borderRadius: 4, background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)', padding: '10px 14px', fontSize: 12, color: '#e06060' }}>
          {error}
        </div>
      )}

      {[
        { label: 'Project Title', val: title, set: setTitle, ph: 'Untitled PreViz Project' },
        { label: 'Global Aesthetic', val: aesthetic, set: setAesthetic, ph: 'e.g. Cinematic High-Contrast', req: true },
      ].map(f => (
        <div key={f.label}>
          <label style={labelS}>{f.label}</label>
          <input style={inputS} placeholder={f.ph} value={f.val}
            onChange={e => f.set(e.target.value)}
            required={f.req}
            onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        </div>
      ))}

      <div>
        <label style={labelS}>Render Style</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {RENDER_OPTIONS.map(o => (
            <button key={o.value} type="button" onClick={() => setRS(o.value)}
              className="btn-tactile"
              style={{
                flex: 1, padding: '8px 4px', fontSize: 10, letterSpacing: '0.15em',
                textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
                background: renderStyle === o.value ? 'var(--gold)' : 'transparent',
                color: renderStyle === o.value ? 'var(--bg-base)' : 'var(--text-muted)',
                border: `1px solid ${renderStyle === o.value ? 'var(--gold)' : 'var(--border)'}`,
                fontWeight: renderStyle === o.value ? 600 : 400,
                transition: 'all 150ms ease',
              }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {[
        { label: 'Character Notes', val: charNotes, set: setCharNotes, ph: 'Describe your characters…', rows: 3 },
        { label: 'World / Location Notes', val: worldNotes, set: setWorldNotes, ph: 'Describe your locations…', rows: 3 },
        { label: 'Screenplay Text', val: script, set: setScript, ph: 'Paste screenplay here…', rows: 6, mono: true },
      ].map(f => (
        <div key={f.label}>
          <label style={labelS}>{f.label}</label>
          <textarea style={{ ...inputS, resize: 'none', fontFamily: f.mono ? 'monospace' : 'inherit', fontSize: f.mono ? 11 : 13 }}
            rows={f.rows} placeholder={f.ph} value={f.val}
            onChange={e => f.set(e.target.value)} required
            onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        </div>
      ))}

      <StyleReferenceUploader onReferenceChange={setRefImage} />

      <button type="submit" className="btn-tactile gold-glow"
        style={{
          width: '100%', padding: '12px 24px', borderRadius: 4,
          border: '1px solid var(--gold)', color: 'var(--gold)',
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-dim)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span>Execute Pipeline</span>
        <span>→</span>
      </button>
    </form>
  )
}
