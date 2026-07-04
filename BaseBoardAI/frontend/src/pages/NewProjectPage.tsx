/**
 * NewProjectPage
 *
 * Three creation methods:
 *   1. Upload Story (primary)  — triggers file upload flow
 *   2. Use Template            — downloads a structured template
 *   3. Start Blank             — opens studio with empty project
 */
import logoSrc from '../assets/logo.png'

import { useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { detectFormat, titleFromFilename } from '../utils/extractDocumentText'

const ACCEPTED   = '.pdf,.docx,.txt,.fdx,.md,.markdown'
const FORMATS    = ['PDF', 'DOCX', 'TXT', 'Markdown', 'Final Draft (.fdx)']

// Minimal structured template the user can fill before uploading
const TEMPLATE_TEXT = `# Baseboard AI Story Template
# Fill in each section, then upload this file to Genesis Engine.

## PROJECT TITLE
[Your story title here]

## GENRE
[e.g. Sci-Fi Thriller, Fantasy Adventure, Contemporary Drama]

## TONE
[e.g. Dark, Hopeful, Gritty, Whimsical]

## LOGLINE
[One-sentence summary of your story]

## SYNOPSIS
[2–4 paragraph summary of the full story]

## THEMES
[e.g. Redemption, Identity, Power, Sacrifice]

---

## CHARACTERS

### Character 1
Name: [Full name]
Age: [Approximate age]
Role: [Protagonist / Antagonist / Supporting]
Appearance: [Hair, eyes, build, distinguishing features]
Clothing: [Typical outfit / wardrobe]
Personality: [Key traits]
Arc: [How they change over the story]
Relationships: [Key connections to other characters]

### Character 2
[Repeat above structure]

---

## LOCATIONS

### Location 1
Name: [Location name]
Type: [Interior / Exterior / City / Wilderness / etc.]
Climate: [Weather / time period]
Architecture: [Building style, materials]
Atmosphere: [Mood, lighting, sounds]
Description: [2–3 sentences]

### Location 2
[Repeat above structure]

---

## SCENES

### Scene 1
Location: [Where it takes place]
Time of Day: [Dawn / Day / Dusk / Night]
Characters Present: [List character names]
Emotional Tone: [e.g. Tense, Joyful, Melancholy]
Action: [What happens]
Dialogue Notes: [Key exchanges or beats]

### Scene 2
[Repeat above structure]

---

## PROPS & OBJECTS
[List any significant objects, weapons, vehicles, artifacts, technology]

## VISUAL STYLE
[Describe your preferred visual aesthetic, color palette, lighting style, cinematic references]
`

interface Props {
  onFileReady:  (file: File, title: string) => void
  onStartBlank: () => void
  onLanding:    () => void
}

export default function NewProjectPage({ onFileReady, onStartBlank, onLanding }: Props) {
  const [dragging,  setDragging]  = useState(false)
  const [hovering,  setHovering]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [hovered,   setHovered]   = useState<'upload' | 'template' | 'blank' | null>(null)

  function validateAndAccept(file: File) {
    setError(null)
    const fmt = detectFormat(file)
    if (fmt === 'unknown') {
      setError(`"${file.name}" is not a supported format. Use PDF, DOCX, TXT, FDX, or Markdown.`)
      return
    }
    onFileReady(file, titleFromFilename(file.name))
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragging(true) }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndAccept(file)
  }
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndAccept(file)
    e.target.value = ''
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_TEXT], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'baseboard-story-template.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isUpHov = hovered === 'upload'
  const isTplHov = hovered === 'template'
  const isBlkHov = hovered === 'blank'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, var(--gold-dim) 0%, transparent 65%)',
          opacity: 0.22, animation: 'vignette-breathe 8s ease-in-out infinite',
        }}
      />
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
        <button onClick={onStartBlank} className="btn-tactile"
          style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', opacity: 0.5 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
          Skip → Enter Studio
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full anim-studio-unfold" style={{ maxWidth: 780 }}>

        {/* Heading */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-7 h-7 rounded flex items-center justify-center genesis-glow"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--gold)' }}>
              <span style={{ color: 'var(--gold)', fontFamily: 'Georgia,serif', fontWeight: 'bold', fontSize: 13 }}>G</span>
            </div>
            <span style={{ fontSize: 9, letterSpacing: '0.45em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.7 }}>
              Genesis Engine
            </span>
          </div>
          <h1 className="gold-glow-text"
            style={{ fontFamily: 'Georgia,serif', fontSize: 30, fontWeight: 'bold', color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 10 }}>
            Create New Project
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Upload your story once.{' '}
            <span style={{ color: 'var(--gold)', opacity: 0.85 }}>Genesis Engine</span>{' '}
            will build your characters, world, storyboard, and production bible automatically.
          </p>
        </div>

        {/* ── Three option cards ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, alignItems: 'stretch' }}>

          {/* ── Option 1: Upload Story (PRIMARY — double-wide) ─────────────── */}
          <div
            className="new-project-card"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onMouseEnter={() => { setHovering(true); setHovered('upload') }}
            onMouseLeave={() => { setHovering(false); setHovered(null) }}
            onClick={() => document.getElementById('np-file-input')?.click()}
            style={{
              border: `1.5px dashed ${dragging || isUpHov ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 8,
              background: dragging ? 'var(--gold-dim)' : isUpHov ? 'rgba(201,168,76,0.04)' : 'var(--bg-surface)',
              padding: '36px 28px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', gap: 14,
              transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
              boxShadow: isUpHov ? '0 0 24px var(--gold-dim)' : 'none',
            }}
          >
            <div style={{ fontSize: 28, lineHeight: 1 }}>📄</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: isUpHov ? 'var(--gold)' : 'var(--text-base)', marginBottom: 6, transition: 'color 150ms ease', fontFamily: 'Georgia,serif' }}>
                Upload Story
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
                {dragging
                  ? 'Drop your file here…'
                  : 'Upload your screenplay, novel, story outline, game design document, or comic script.'}
              </div>
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase' }}>
              {FORMATS.join(' · ')}
            </div>
            <div
              className="btn-tactile"
              style={{
                marginTop: 4, padding: '9px 28px', borderRadius: 4,
                border: '1px solid var(--gold)',
                background: isUpHov ? 'var(--gold)' : 'var(--gold-dim)',
                color: isUpHov ? 'var(--bg-base)' : 'var(--gold)',
                fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              Analyze Story →
            </div>

            <input id="np-file-input" type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={onFileChange} />
          </div>

          {/* ── Option 2: Use Template ─────────────────────────────────────── */}
          <div
            className="new-project-card"
            onMouseEnter={() => setHovered('template')}
            onMouseLeave={() => setHovered(null)}
            onClick={downloadTemplate}
            style={{
              border: `1px solid ${isTplHov ? 'rgba(201,168,76,0.6)' : 'var(--border)'}`,
              borderRadius: 8,
              background: isTplHov ? 'rgba(201,168,76,0.04)' : 'var(--bg-surface)',
              padding: '28px 20px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', gap: 12,
              transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
              boxShadow: isTplHov ? '0 0 18px var(--gold-dim)' : 'none',
            }}
          >
            <div style={{ fontSize: 26, lineHeight: 1 }}>📑</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isTplHov ? 'var(--gold)' : 'var(--text-base)', marginBottom: 6, transition: 'color 150ms ease', fontFamily: 'Georgia,serif' }}>
                Use Template
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Recommended for highest AI accuracy.
              </div>
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginTop: 'auto' }}>
              .md · Structured Format
            </div>
            <div style={{
              fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: isTplHov ? 'var(--gold)' : 'var(--text-muted)',
              border: `1px solid ${isTplHov ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 4, padding: '7px 16px',
              transition: 'color 150ms ease, border-color 150ms ease',
            }}>
              Download →
            </div>
          </div>

          {/* ── Option 3: Start Blank ──────────────────────────────────────── */}
          <div
            className="new-project-card"
            onMouseEnter={() => setHovered('blank')}
            onMouseLeave={() => setHovered(null)}
            onClick={onStartBlank}
            style={{
              border: `1px solid ${isBlkHov ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
              borderRadius: 8,
              background: isBlkHov ? 'rgba(201,168,76,0.03)' : 'var(--bg-surface)',
              padding: '28px 20px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', gap: 12,
              transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
              boxShadow: isBlkHov ? '0 0 14px var(--gold-dim)' : 'none',
              opacity: isBlkHov ? 1 : 0.75,
            }}
          >
            <div style={{ fontSize: 26, lineHeight: 1 }}>✨</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isBlkHov ? 'var(--gold)' : 'var(--text-base)', marginBottom: 6, transition: 'color 150ms ease', fontFamily: 'Georgia,serif' }}>
                Start Blank
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Begin with an empty workspace and build manually.
              </div>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Manual Setup
            </div>
            <div style={{
              fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: isBlkHov ? 'var(--text-base)' : 'var(--text-muted)',
              border: `1px solid ${isBlkHov ? 'var(--border)' : 'var(--border)'}`,
              borderRadius: 4, padding: '7px 16px',
              transition: 'color 150ms ease',
            }}>
              Open Studio →
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 anim-slide-up" style={{
            borderRadius: 4, padding: '10px 14px',
            background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)',
            fontSize: 12, color: '#e06060',
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
