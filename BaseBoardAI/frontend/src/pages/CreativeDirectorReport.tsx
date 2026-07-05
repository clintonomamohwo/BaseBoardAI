/**
 * CreativeDirectorReport
 *
 * The signature post-analysis screen. Shown between Genesis Engine completion
 * and Studio entry. Derives story stats from the completed StoryboardProject
 * and presents them as a premium "Creative Director's Report" summary card.
 */
import type { StoryboardProject } from '../types/storyboard'
import logoSrc from '../assets/logo.png'

interface Props {
  project: StoryboardProject
  onEnterStudio: () => void
  onLanding: () => void
}

/** Derive approximate runtime from total frame durations */
function estimateRuntime(project: StoryboardProject): string {
  let totalSeconds = 0
  for (const scene of project.scenes) {
    for (const frame of scene.frames) {
      totalSeconds += frame.duration_seconds ?? 4
    }
  }
  if (totalSeconds < 60) return `${totalSeconds}s`
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Pull unique emotional tones across all scenes as "themes" */
function deriveThemes(project: StoryboardProject): string[] {
  const tones = new Set<string>()
  for (const scene of project.scenes) {
    if (scene.emotional_tone) {
      scene.emotional_tone.split(/[,·•\/]/).forEach(t => {
        const clean = t.trim()
        if (clean && clean.length < 30) tones.add(clean)
      })
    }
  }
  return [...tones].slice(0, 5)
}

/** Unique location headings */
function countLocations(project: StoryboardProject): number {
  return new Set(project.scenes.map(s => s.location_heading)).size
}

/** Total frame count across all scenes */
function countFrames(project: StoryboardProject): number {
  return project.scenes.reduce((sum, s) => sum + s.frames.length, 0)
}

/** Guess genre/visual style from global_aesthetic */
function deriveVisualStyle(project: StoryboardProject): string {
  const a = project.global_aesthetic
  if (!a) return 'Cinematic'
  return a.split(' ').slice(0, 4).join(' ')
}

/** Infer a genre label from the aesthetic / scene tones */
function deriveGenre(project: StoryboardProject): string {
  const text = [
    project.global_aesthetic,
    ...project.scenes.map(s => s.emotional_tone),
  ].join(' ').toLowerCase()

  if (text.includes('horror') || text.includes('terror')) return 'Horror'
  if (text.includes('romance') || text.includes('love'))   return 'Romance'
  if (text.includes('comedy') || text.includes('humor'))   return 'Comedy'
  if (text.includes('sci-fi') || text.includes('space') || text.includes('futur')) return 'Science Fiction'
  if (text.includes('fantasy') || text.includes('magic'))  return 'Fantasy'
  if (text.includes('action') || text.includes('battle'))  return 'Action / Adventure'
  if (text.includes('thriller') || text.includes('suspense')) return 'Thriller'
  if (text.includes('drama'))                               return 'Drama'
  return 'Cinematic Drama'
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function CreativeDirectorReport({ project, onEnterStudio, onLanding }: Props) {
  const runtime    = estimateRuntime(project)
  const themes     = deriveThemes(project)
  const locations  = countLocations(project)
  const frames     = countFrames(project)
  const genre      = deriveGenre(project)
  const style      = deriveVisualStyle(project)
  const characters = project.characters.length
  const scenes     = project.scenes.length
  // Confidence is cosmetic — based on how populated the project data is
  const confidence = Math.min(98, 80 + Math.min(characters, 5) * 2 + Math.min(scenes, 4) * 1)

  const DIVIDER = (
    <div style={{
      height: 1, background: 'var(--border)',
      margin: '18px 0', opacity: 0.6,
    }} />
  )

  const ROW = ({ label, value }: { label: string; value: string | number }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '7px 0',
    }}>
      <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.7 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-base)', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>
        {value}
      </span>
    </div>
  )

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, var(--gold-dim) 0%, transparent 60%)',
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
      </div>

      {/* Report card */}
      <div
        className="relative z-10 report-card-reveal"
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(201,168,76,0.4)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 0 48px var(--gold-dim), 0 0 16px rgba(0,0,0,0.6)',
        }}>

          {/* Card header */}
          <div style={{
            padding: '22px 28px 18px',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            {/* Double rule top */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gold)', opacity: 0.35 }} />
              <span style={{ fontSize: 9, letterSpacing: '0.55em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>
                Story Analysis
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--gold)', opacity: 0.35 }} />
            </div>

            <h1 style={{
              fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 'bold',
              color: 'var(--gold)', letterSpacing: '0.06em',
              textShadow: '0 0 20px var(--gold-dim)',
              margin: '0 0 6px',
            }}>
              {project.project_title || 'Untitled Project'}
            </h1>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6, letterSpacing: '0.1em' }}>
              Genesis Engine · Analysis Complete
            </p>
          </div>

          {/* Stats body */}
          <div style={{ padding: '8px 28px 20px' }}>
            {DIVIDER}

            <ROW label="Genre"            value={genre} />
            <ROW label="Estimated Runtime" value={runtime} />
            <ROW label="Visual Style"     value={style} />

            {DIVIDER}

            <ROW label="Characters"  value={characters} />
            <ROW label="Locations"   value={locations} />
            <ROW label="Scenes"      value={scenes} />
            <ROW label="Storyboard Frames" value={frames} />

            {DIVIDER}

            {/* Themes row — pill chips */}
            {themes.length > 0 && (
              <div style={{ padding: '6px 0', marginBottom: 6 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
                  Primary Themes
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {themes.map(t => (
                    <span key={t} style={{
                      fontSize: 10, letterSpacing: '0.1em',
                      color: 'var(--gold)', opacity: 0.8,
                      border: '1px solid rgba(201,168,76,0.3)',
                      borderRadius: 99, padding: '3px 10px',
                      background: 'rgba(201,168,76,0.06)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {DIVIDER}

            {/* AI Confidence */}
            <div style={{ padding: '6px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.7 }}>
                  AI Confidence
                </span>
                <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>
                  {confidence}%
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${confidence}%`,
                  background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
                  boxShadow: '0 0 6px var(--gold)',
                  animation: 'report-bar-fill 1.2s cubic-bezier(0.22,1,0.36,1) forwards',
                }} />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{
            padding: '0 28px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10,
          }}>
            <button
              className="btn-tactile gold-glow"
              onClick={onEnterStudio}
              style={{
                padding: '14px 24px', borderRadius: 4,
                border: '1px solid var(--gold)',
                background: 'var(--gold)',
                color: 'var(--bg-base)',
                fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
                fontWeight: 700, cursor: 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--gold)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--gold)'
                e.currentTarget.style.color = 'var(--bg-base)'
              }}
            >
              Enter Studio →
            </button>

            {/* Double rule bottom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, opacity: 0.4 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gold)' }} />
              <span style={{ fontSize: 8, letterSpacing: '0.4em', color: 'var(--gold)', textTransform: 'uppercase' }}>Baseboard AI</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gold)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
