import { useState } from 'react'
import type { RenderStyle, StoryboardProject } from '../types/storyboard'
import { forgePipeline } from '../api/storyboard'
import StyleReferenceUploader from './StyleReferenceUploader'
import ConstellationLoader from './ConstellationLoader'

type RS = RenderStyle
const RENDER_OPTIONS: { value: RS; label: string }[] = [
  { value: 'bw_sketch',   label: 'B&W Sketch' },
  { value: 'flat_color',  label: 'Flat Color' },
  { value: 'full_shaded', label: 'Full Shaded' },
]

interface Props {
  onComplete: (project: StoryboardProject) => void
  onNotify?: (msg: string, type?: 'success' | 'info') => void
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    onNotify?.('Pipeline started…', 'info')
    try {
      const p = await forgePipeline({
        project_title: title || 'Untitled PreViz Project',
        global_aesthetic: aesthetic,
        render_style: renderStyle,
        reference_style_image: refImage,
        raw_character_notes: charNotes,
        raw_world_notes: worldNotes,
        raw_script_text: script,
      })
      onNotify?.('Pipeline complete ✓')
      onComplete(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed')
      onNotify?.('Pipeline failed', 'info')
    } finally { setLoading(false) }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 anim-gold-assemble" style={{ minHeight: 300 }}>
        {/* Scan line overlay */}
        <div className="relative w-48 h-32 overflow-hidden rounded"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="absolute inset-x-0 h-px"
            style={{ background: 'var(--gold)', opacity: 0.6, animation: 'scan-line 1.2s linear infinite', top: 0 }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.3, textTransform: 'uppercase' }}>
              Assembling…
            </span>
          </div>
        </div>
        <ConstellationLoader message="Pipeline running…" />
      </div>
    )
  }

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
