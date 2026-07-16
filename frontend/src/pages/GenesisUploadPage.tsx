import { useState, useCallback } from 'react'
import logoSrc from '../assets/logo.png'
import type { DragEvent, ChangeEvent } from 'react'
import { detectFormat, titleFromFilename } from '../utils/extractDocumentText'
import type { RenderStyle } from '../types/storyboard'

const ACCEPTED = '.pdf,.docx,.txt,.fdx,.md,.markdown'
const FORMAT_LABELS = ['PDF', 'DOCX', 'TXT', 'FDX', 'Markdown']

const STYLE_OPTIONS: { value: RenderStyle; label: string; description: string }[] = [
  { value: 'bw_sketch',   label: 'B&W Sketch',    description: 'Clean line art, no shading' },
  { value: 'flat_color',  label: 'Flat Color',     description: 'Cel-shaded, solid fills' },
  { value: 'full_shaded', label: 'Full Shaded',    description: 'Cinematic, volumetric light' },
]

interface Props {
  onFileReady: (file: File, title: string, renderStyle: RenderStyle) => void
  onStartBlank: () => void
  onLanding: () => void
}

export default function GenesisUploadPage({ onFileReady, onStartBlank, onLanding }: Props) {
  const [dragging, setDragging]         = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [hovering, setHovering]         = useState(false)
  const [confirmed, setConfirmed]       = useState<{ file: File; title: string } | null>(null)
  const [renderStyle, setRenderStyle]   = useState<RenderStyle>('bw_sketch')

  function validateAndAccept(file: File) {
    setError(null)
    const fmt = detectFormat(file)
    if (fmt === 'unknown') {
      setError(`"${file.name}" is not a supported format. Please use PDF, DOCX, TXT, FDX, or Markdown.`)
      return
    }
    // Show confirmation card instead of immediately firing
    setConfirmed({ file, title: titleFromFilename(file.name) })
  }

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndAccept(file)
  }, [])

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset before processing so same file can be re-selected
    if (file) validateAndAccept(file)
  }, [])

  // ── Confirmation card ─────────────────────────────────────────────────────
  if (confirmed) {
    const fmt = detectFormat(confirmed.file)
    const sizeKb = Math.round(confirmed.file.size / 1024)
    const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{ background: 'var(--bg-base)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, var(--gold-dim) 0%, transparent 60%)', opacity: 0.25 }} />
        <div className="absolute inset-0 pointer-events-none grain-overlay" aria-hidden="true" />

        {/* Header */}
        <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-10">
          <button onClick={onLanding} className="btn-tactile flex items-center gap-2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <img src={logoSrc} alt="Baseboard AI" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(201,168,76,0.5))' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>BASEBOARD AI</span>
          </button>
        </div>

        <div className="relative z-10 anim-studio-unfold" style={{ width: '100%', maxWidth: 480 }}>
          {/* Genesis badge */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--gold)', opacity: 0.85 }}>
              <span style={{ color: 'var(--gold)', fontFamily: 'Georgia,serif', fontWeight: 'bold', fontSize: 15 }}>G</span>
            </div>
            <span style={{ fontSize: 10, letterSpacing: '0.35em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.7 }}>
              Genesis Engine
            </span>
          </div>

          {/* Confirmation card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 0 40px var(--gold-dim)',
          }}>
            {/* Card header */}
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--gold)', opacity: 0.3 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.5em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>
                  Ready to Analyse
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--gold)', opacity: 0.3 }} />
              </div>
              <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 'bold', color: 'var(--gold)', margin: '0 0 4px', letterSpacing: '0.06em' }}>
                {confirmed.title}
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.55, letterSpacing: '0.1em' }}>
                Genesis Engine · Document Loaded
              </p>
            </div>

            {/* File details */}
            <div style={{ padding: '12px 28px 20px' }}>
              <div style={{ height: 1, background: 'var(--border)', margin: '10px 0 16px', opacity: 0.6 }} />

              {[
                { label: 'File Name',   value: confirmed.file.name },
                { label: 'Format',      value: fmt.toUpperCase() },
                { label: 'File Size',   value: sizeLabel },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0' }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.7 }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-base)', fontWeight: 500, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '16px 0', opacity: 0.6 }} />

              {/* Render style selector */}
              <div style={{ marginBottom: 4 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 10 }}>
                  Render Style
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {STYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRenderStyle(opt.value)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 150ms ease',
                        border: renderStyle === opt.value
                          ? '1px solid var(--gold)'
                          : '1px solid var(--border)',
                        background: renderStyle === opt.value
                          ? 'rgba(201,168,76,0.08)'
                          : 'var(--bg-raised)',
                        color: renderStyle === opt.value ? 'var(--gold)' : 'var(--text-muted)',
                      }}
                      onMouseEnter={e => {
                        if (renderStyle !== opt.value) {
                          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
                          e.currentTarget.style.color = 'var(--text-base)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (renderStyle !== opt.value) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, letterSpacing: '0.02em' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.3 }}>
                        {opt.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '16px 0', opacity: 0.6 }} />
            </div>

            {/* Actions */}
            <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-tactile gold-glow"
                onClick={() => onFileReady(confirmed.file, confirmed.title, renderStyle)}
                style={{
                  padding: '14px 24px', borderRadius: 4,
                  border: '1px solid var(--gold)', background: 'var(--gold)',
                  color: 'var(--bg-base)', fontSize: 12, letterSpacing: '0.2em',
                  textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' }}
              >
                Analyse Script →
              </button>
              <button className="btn-tactile"
                onClick={() => setConfirmed(null)}
                style={{
                  padding: '10px 24px', borderRadius: 4, fontSize: 11,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  transition: 'border-color 150ms ease, color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                ← Change Document
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Upload drop zone ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, var(--gold-dim) 0%, transparent 60%)',
          opacity: 0.25,
        }}
      />

      {/* Header */}
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-10">
        <button
          onClick={onLanding}
          className="btn-tactile flex items-center gap-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src={logoSrc} alt="Baseboard AI" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(201,168,76,0.5))' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>
            BASEBOARD AI
          </span>
        </button>
        <button
          onClick={onStartBlank}
          className="btn-tactile"
          style={{
            fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase',
            opacity: 0.5,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          Skip → Enter Studio
        </button>
      </div>

      {/* Main card */}
      <div
        className="relative z-10 flex flex-col items-center anim-studio-unfold"
        style={{ width: '100%', maxWidth: 560 }}
      >
        {/* Title block */}
        <div className="mb-2 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--gold)', opacity: 0.85 }}
          >
            <span style={{ color: 'var(--gold)', fontFamily: 'Georgia,serif', fontWeight: 'bold', fontSize: 15 }}>G</span>
          </div>
          <span
            style={{
              fontSize: 10, letterSpacing: '0.35em', color: 'var(--gold)',
              textTransform: 'uppercase', opacity: 0.7,
            }}
          >
            Genesis Engine
          </span>
        </div>

        <h1
          className="mb-2 gold-glow-text"
          style={{
            fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 'bold',
            color: 'var(--gold)', letterSpacing: '0.08em', textAlign: 'center',
          }}
        >
          Create New Project
        </h1>
        <p
          style={{
            fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
            marginBottom: 32, maxWidth: 400, lineHeight: 1.6,
          }}
        >
          Upload your screenplay, novel, or story document. Genesis Engine will
          build your characters, world, storyboard, and production bible automatically.
        </p>

        {/* Drop zone */}
        <div
          className="genesis-drop-zone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            width: '100%',
            border: `1.5px dashed ${dragging || hovering ? 'var(--gold)' : 'var(--border)'}`,
            borderRadius: 8,
            background: dragging
              ? 'var(--gold-dim)'
              : hovering
              ? 'rgba(201,168,76,0.04)'
              : 'var(--bg-surface)',
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            transition: 'border-color 180ms ease, background 180ms ease',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('genesis-file-input')?.click()}
        >
          {/* Upload icon — SVG film clapper */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
            style={{ opacity: dragging || hovering ? 1 : 0.4, transition: 'opacity 180ms ease' }}>
            <rect x="6" y="14" width="36" height="26" rx="2" stroke="var(--gold)" strokeWidth="1.5" />
            <path d="M6 20h36" stroke="var(--gold)" strokeWidth="1" strokeOpacity="0.5" />
            <path d="M6 14 L12 8 L18 14" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M18 14 L24 8 L30 14" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M30 14 L36 8 L42 14" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M24 28 L24 36 M20 32 L24 28 L28 32" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: 'var(--text-base)', marginBottom: 6, fontWeight: 500 }}>
              {dragging ? 'Drop to import story' : 'Drag & Drop Story'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.7 }}>
              or click to browse files
            </p>
          </div>

          <div
            style={{
              fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)',
              opacity: 0.5, textTransform: 'uppercase',
            }}
          >
            {FORMAT_LABELS.join(' · ')}
          </div>

          <input
            id="genesis-file-input"
            type="file"
            accept={ACCEPTED}
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="mt-4 anim-slide-up"
            style={{
              width: '100%', borderRadius: 4, padding: '10px 14px',
              background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)',
              fontSize: 12, color: '#e06060',
            }}
          >
            {error}
          </div>
        )}

        {/* Divider */}
        <div
          className="mt-8 mb-6"
          style={{
            display: 'flex', alignItems: 'center', gap: 16, width: '100%',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.15em' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Start blank */}
        <button
          className="btn-tactile"
          onClick={onStartBlank}
          style={{
            width: '100%', padding: '12px 24px', borderRadius: 4,
            border: '1px solid var(--border)', color: 'var(--text-muted)',
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            background: 'transparent', cursor: 'pointer',
            transition: 'border-color 150ms ease, color 150ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--gold)'
            e.currentTarget.style.color = 'var(--gold)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          Start Blank Project
        </button>
      </div>
    </div>
  )
}
