import { useState, useCallback } from 'react'
import logoSrc from '../assets/logo.png'
import type { DragEvent, ChangeEvent } from 'react'
import { detectFormat, titleFromFilename } from '../utils/extractDocumentText'

const ACCEPTED = '.pdf,.docx,.txt,.fdx,.md,.markdown'
const FORMAT_LABELS = ['PDF', 'DOCX', 'TXT', 'FDX', 'Markdown']

interface Props {
  onFileReady: (file: File, title: string) => void
  onStartBlank: () => void
  onLanding: () => void
}

export default function GenesisUploadPage({ onFileReady, onStartBlank, onLanding }: Props) {
  const [dragging, setDragging]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [hovering, setHovering]   = useState(false)

  function validateAndAccept(file: File) {
    setError(null)
    const fmt = detectFormat(file)
    if (fmt === 'unknown') {
      setError(`"${file.name}" is not a supported format. Please use PDF, DOCX, TXT, FDX, or Markdown.`)
      return
    }
    onFileReady(file, titleFromFilename(file.name))
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
    if (file) validateAndAccept(file)
    e.target.value = '' // reset so same file can be re-selected
  }, [])

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
