import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { RenderStyle, StoryDevelopmentDraft } from '../types/storyboard'
import type { DirectorStyle } from './NewProjectPage'
import { generateStoryOutline, generateStoryScript } from '../api/storyboard'
import logoSrc from '../assets/logo.png'

interface Props {
  onBack: () => void
  onLanding: () => void
  onScriptReady: (
    file: File,
    title: string,
    renderStyle: RenderStyle,
    directorStyle: DirectorStyle,
    draft: StoryDevelopmentDraft,
  ) => void
}

type Step = 'idea' | 'outline' | 'script'
type Work = 'outline' | 'script' | null

const RENDER_OPTIONS: { value: RenderStyle; label: string }[] = [
  { value: 'bw_sketch', label: 'B&W Sketch' },
  { value: 'flat_color', label: 'Flat Color' },
  { value: 'full_shaded', label: 'Full Shaded' },
]

const DIRECTOR_OPTIONS: { value: DirectorStyle; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'dialogue', label: 'Dialogue' },
  { value: 'action', label: 'Action' },
  { value: 'intimate', label: 'Intimate' },
]

const inputStyle: CSSProperties = {
  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
  borderRadius: 5, padding: '11px 13px', fontSize: 13, color: 'var(--text-base)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: CSSProperties = {
  display: 'block', marginBottom: 7, color: 'var(--gold)', opacity: 0.75,
  fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase',
}

function titleToFilename(title: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'untitled-story'}.txt`
}

export default function IdeaDevelopmentPage({ onBack, onLanding, onScriptReady }: Props) {
  const [step, setStep] = useState<Step>('idea')
  const [title, setTitle] = useState('')
  const [idea, setIdea] = useState('')
  const [format, setFormat] = useState('')
  const [genre, setGenre] = useState('')
  const [notes, setNotes] = useState('')
  const [outline, setOutline] = useState('')
  const [script, setScript] = useState('')
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('bw_sketch')
  const [directorStyle, setDirectorStyle] = useState<DirectorStyle>('balanced')
  const [working, setWorking] = useState<Work>(null)
  const [error, setError] = useState<string | null>(null)

  const storyContext = () => ({
    idea: idea.trim(),
    genre: genre.trim() || null,
    format: format.trim(),
    notes: notes.trim(),
  })

  async function buildOutline() {
    if (!idea.trim() || !format.trim()) {
      setError('Add your idea and choose a format before generating an outline.')
      return
    }
    setWorking('outline')
    setError(null)
    try {
      const result = await generateStoryOutline(storyContext())
      setOutline(result)
      setScript('')
      setStep('outline')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outline generation failed. Please try again.')
    } finally {
      setWorking(null)
    }
  }

  async function buildScript() {
    if (!outline.trim()) {
      setError('Add or generate an outline before drafting the script.')
      return
    }
    setWorking('script')
    setError(null)
    try {
      const result = await generateStoryScript({ ...storyContext(), outline: outline.trim() })
      setScript(result)
      setStep('script')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Script generation failed. Please try again.')
    } finally {
      setWorking(null)
    }
  }

  function sendToGenesis() {
    if (!script.trim()) {
      setError('The script is empty. Add a draft before continuing.')
      return
    }
    const draft: StoryDevelopmentDraft = {
      ...storyContext(),
      outline: outline.trim(),
      script: script.trim(),
    }
    const projectTitle = title.trim() || 'Untitled Story'
    const file = new File([draft.script], titleToFilename(projectTitle), { type: 'text/plain' })
    onScriptReady(file, projectTitle, renderStyle, directorStyle, draft)
  }

  const steps: { id: Step; label: string }[] = [
    { id: 'idea', label: 'Idea' },
    { id: 'outline', label: 'Outline' },
    { id: 'script', label: 'Script' },
  ]

  const primaryStyle: CSSProperties = {
    border: '1px solid var(--gold)', background: 'var(--gold)', color: 'var(--bg-base)',
    borderRadius: 4, padding: '11px 18px', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
  }
  const secondaryStyle: CSSProperties = {
    border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
    borderRadius: 4, padding: '10px 16px', fontSize: 10, letterSpacing: '0.14em',
    textTransform: 'uppercase', cursor: 'pointer',
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto" style={{ background: 'var(--bg-base)', color: 'var(--text-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--gold-dim) 0%, transparent 60%)', opacity: 0.2 }} />
      <div className="absolute inset-0 pointer-events-none grain-overlay" aria-hidden="true" />
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onLanding} className="flex items-center gap-2" style={{ border: 0, background: 'none', cursor: 'pointer' }}>
          <img src={logoSrc} alt="BaseBoard AI" style={{ width: 23, height: 23, objectFit: 'contain' }} />
          <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.75 }}>BASEBOARD AI</span>
        </button>
        <button onClick={onBack} style={{ ...secondaryStyle, border: 0 }}>← New project options</button>
      </header>

      <main className="relative z-10 w-full max-w-4xl mx-auto px-5 py-8 md:py-12">
        <div className="text-center mb-8">
          <p style={{ color: 'var(--gold)', opacity: 0.55, fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 10 }}>Story Development</p>
          <h1 style={{ fontFamily: 'Georgia,serif', color: 'var(--gold)', fontSize: 30, fontWeight: 700, margin: '0 0 10px' }}>Idea to Outline to Script</h1>
          <p style={{ maxWidth: 560, margin: '0 auto', fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
            Start with a premise, shape an outline, then revise a first script draft. Your chosen format carries through; genre is optional.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-5 mb-8" aria-label="Story development steps">
          {steps.map((item, index) => {
            const active = step === item.id
            const complete = steps.findIndex(s => s.id === step) > index
            return (
              <div key={item.id} className="flex items-center gap-2 sm:gap-5">
                <button
                  type="button"
                  onClick={() => {
                    if (item.id === 'idea' || (item.id === 'outline' && outline) || (item.id === 'script' && script)) setStep(item.id)
                  }}
                  aria-current={active ? 'step' : undefined}
                  style={{ border: `1px solid ${active || complete ? 'var(--gold)' : 'var(--border)'}`, color: active || complete ? 'var(--gold)' : 'var(--text-muted)', background: active ? 'var(--gold-dim)' : 'transparent', borderRadius: 999, padding: '7px 13px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
                >{index + 1}. {item.label}</button>
                {index < steps.length - 1 && <span aria-hidden="true" style={{ color: 'var(--border)' }}>—</span>}
              </div>
            )
          })}
        </div>

        {error && <div role="alert" className="mb-5" style={{ border: '1px solid rgba(200,70,70,0.45)', background: 'rgba(180,30,30,0.1)', color: '#e08080', borderRadius: 5, padding: '11px 14px', fontSize: 12 }}>{error}</div>}

        <section className="rounded-lg p-5 md:p-7" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 15px 50px rgba(0,0,0,0.12)' }}>
          {step === 'idea' && (
            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="story-title" style={labelStyle}>Project title <span style={{ color: 'var(--text-muted)', letterSpacing: 0, textTransform: 'none' }}>· optional</span></label>
                <input id="story-title" style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="A working title (you can change it later)" />
              </div>
              <div>
                <label htmlFor="story-idea" style={labelStyle}>Your idea <span aria-hidden="true">*</span></label>
                <textarea id="story-idea" required rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} value={idea} onChange={e => setIdea(e.target.value)} placeholder="What is the story about? Add any people, places, images, questions, or moments you already have in mind." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="story-format" style={labelStyle}>Project format <span aria-hidden="true">*</span></label>
                  <input id="story-format" required style={inputStyle} value={format} onChange={e => setFormat(e.target.value)} placeholder="e.g. animated short, feature screenplay, pilot, comic chapter" />
                  <p style={{ fontSize: 10, lineHeight: 1.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>Free text—use the format that fits your project.</p>
                </div>
                <div>
                  <label htmlFor="story-genre" style={labelStyle}>Genre <span style={{ color: 'var(--text-muted)', letterSpacing: 0, textTransform: 'none' }}>· optional</span></label>
                  <input id="story-genre" style={inputStyle} value={genre} onChange={e => setGenre(e.target.value)} placeholder="Leave blank to keep genre open" />
                </div>
              </div>
              <div>
                <label htmlFor="story-notes" style={labelStyle}>Additional notes <span style={{ color: 'var(--text-muted)', letterSpacing: 0, textTransform: 'none' }}>· optional</span></label>
                <textarea id="story-notes" rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tone, themes, length, boundaries, or ideas you want preserved" />
              </div>
              <div className="flex justify-end pt-1">
                <button type="button" onClick={buildOutline} disabled={working !== null} style={{ ...primaryStyle, opacity: working ? 0.65 : 1 }}>
                  {working === 'outline' ? 'Building outline…' : 'Develop outline →'}
                </button>
              </div>
            </div>
          )}

          {step === 'outline' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 19, color: 'var(--gold)', margin: '0 0 4px' }}>Review and shape the outline</h2>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Edit freely. The next step uses this version as its source.</p>
                </div>
                <button type="button" onClick={buildOutline} disabled={working !== null} style={secondaryStyle}>{working === 'outline' ? 'Regenerating…' : 'Regenerate outline'}</button>
              </div>
              <textarea aria-label="Editable story outline" rows={20} value={outline} onChange={e => setOutline(e.target.value)} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }} />
              <div className="flex justify-between gap-3 flex-wrap pt-1">
                <button type="button" onClick={() => setStep('idea')} style={secondaryStyle}>← Back to idea</button>
                <button type="button" onClick={buildScript} disabled={working !== null || !outline.trim()} style={{ ...primaryStyle, opacity: working ? 0.65 : 1 }}>
                  {working === 'script' ? 'Drafting script…' : 'Draft script →'}
                </button>
              </div>
            </div>
          )}

          {step === 'script' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 19, color: 'var(--gold)', margin: '0 0 4px' }}>Review the script draft</h2>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>This is your draft—revise it before passing it into the visual pipeline.</p>
                </div>
                <button type="button" onClick={buildScript} disabled={working !== null} style={secondaryStyle}>{working === 'script' ? 'Regenerating…' : 'Regenerate from outline'}</button>
              </div>
              <textarea aria-label="Editable script draft" rows={22} value={script} onChange={e => setScript(e.target.value)} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-md p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                <div>
                  <label style={labelStyle}>Storyboard render style</label>
                  <div className="flex gap-2">
                    {RENDER_OPTIONS.map(option => <button key={option.value} type="button" onClick={() => setRenderStyle(option.value)} style={{ flex: 1, border: `1px solid ${renderStyle === option.value ? 'var(--gold)' : 'var(--border)'}`, background: renderStyle === option.value ? 'var(--gold-dim)' : 'transparent', color: renderStyle === option.value ? 'var(--gold)' : 'var(--text-muted)', borderRadius: 4, padding: '8px 4px', fontSize: 9, cursor: 'pointer' }}>{option.label}</button>)}
                  </div>
                </div>
                <div>
                  <label htmlFor="director-style" style={labelStyle}>Storyboard direction</label>
                  <select id="director-style" value={directorStyle} onChange={e => setDirectorStyle(e.target.value as DirectorStyle)} style={{ ...inputStyle, padding: '9px 10px' }}>
                    {DIRECTOR_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-between gap-3 flex-wrap pt-1">
                <button type="button" onClick={() => setStep('outline')} style={secondaryStyle}>← Back to outline</button>
                <button type="button" onClick={sendToGenesis} style={primaryStyle}>Continue to Genesis →</button>
              </div>
            </div>
          )}
        </section>

        <p className="text-center" style={{ color: 'var(--text-muted)', opacity: 0.65, fontSize: 10, lineHeight: 1.6, margin: '18px auto 0' }}>
          Your idea, outline, optional genre, selected format, and final script will be saved with the generated project.
        </p>
      </main>
    </div>
  )
}
