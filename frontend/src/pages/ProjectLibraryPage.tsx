/**
 * ProjectLibraryPage
 *
 * Displays all saved storyboard projects as folder-style cards.
 * Grouped: Genesis Engine projects (have db_id) shown first.
 * Each card shows title, scene/frame/character counts, render style,
 * and open/delete actions styled to match the gold design system.
 */
import { useState, useEffect } from 'react'
import logoSrc from '../assets/logo.png'
import type { StoryboardProject } from '../types/storyboard'
import { listProjects, getProject, deleteProject } from '../api/storyboard'

const RENDER_LABELS: Record<string, string> = {
  bw_sketch:   'B&W Sketch',
  flat_color:  'Flat Color',
  full_shaded: 'Full Shaded',
}

interface Props {
  onLoadProject: (project: StoryboardProject) => void
  onNewProject:  () => void
  onLanding:     () => void
}

export default function ProjectLibraryPage({ onLoadProject, onNewProject, onLanding }: Props) {
  const [projects,  setProjects]  = useState<StoryboardProject[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmId,  setConfirmId]  = useState<number | null>(null)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleLoad(dbId: number) {
    try {
      const project = await getProject(dbId)
      onLoadProject(project)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    }
  }

  async function handleDelete(dbId: number) {
    setDeletingId(dbId)
    try {
      await deleteProject(dbId)
      setProjects((prev) => prev.filter((p) => p.db_id !== dbId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 20%, var(--gold-dim) 0%, transparent 55%)', opacity: 0.15 }} />
      <div className="absolute inset-0 pointer-events-none grain-overlay" aria-hidden="true" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={onLanding} className="btn-tactile flex items-center gap-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src={logoSrc} alt="Baseboard AI"
            style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(201,168,76,0.5))' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>
            BASEBOARD AI
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-tactile" onClick={onNewProject}
            style={{
              fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)',
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              borderRadius: 999, padding: '5px 14px',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
            ⊕ New Project
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

        {/* Page heading */}
        <div className="mb-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--gold)', opacity: 0.2, maxWidth: 32 }} />
            <span style={{ fontSize: 9, letterSpacing: '0.5em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase' }}>
              Project Archive
            </span>
          </div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 'bold', color: 'var(--gold)', letterSpacing: '0.06em', margin: 0 }}>
            Project Library
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, opacity: 0.6 }}>
            {projects.length} saved project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 anim-slide-up" style={{
            borderRadius: 4, padding: '10px 14px',
            background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)',
            fontSize: 12, color: '#e06060',
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 96, borderRadius: 8,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                opacity: 0.4 + i * 0.1, animation: 'pulse-gold 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: 8,
            background: 'var(--bg-surface)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.3 }}>📁</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>No projects yet</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5, marginBottom: 24 }}>
              Upload a script through Genesis Engine to create your first project.
            </p>
            <button className="btn-tactile" onClick={onNewProject}
              style={{
                padding: '10px 24px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--gold)', background: 'var(--gold-dim)',
                color: 'var(--gold)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>
              ⊕ New Project
            </button>
          </div>
        )}

        {/* Project folder grid */}
        {!loading && projects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const sceneCount = p.scenes.length
              const frameCount = p.scenes.reduce((s, sc) => s + sc.frames.length, 0)
              const charCount  = p.characters.length
              const styleLabel = RENDER_LABELS[p.render_style] ?? p.render_style
              const isDeleting = deletingId === p.db_id
              const isConfirming = confirmId === p.db_id

              // Derive a muted color from the first scene's palette if available
              const accentColor = p.scenes[0]?.color_palette?.[0] ?? null

              return (
                <div key={p.db_id}
                  className="anim-slide-up"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    transition: 'border-color 200ms ease, box-shadow 200ms ease',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.4)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px var(--gold-dim)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                  }}
                >
                  {/* Folder tab strip */}
                  <div style={{
                    height: 4,
                    background: accentColor
                      ? `linear-gradient(90deg, ${accentColor}55, ${accentColor}22, transparent)`
                      : 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)',
                  }} />

                  <div style={{ padding: '16px 18px' }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 10, opacity: 0.4, flexShrink: 0 }}>📁</span>
                          <h3 style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--text-base)',
                            fontFamily: 'Georgia,serif', letterSpacing: '0.04em',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {p.project_title}
                          </h3>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.global_aesthetic}
                        </p>
                      </div>
                      {/* Render style badge */}
                      <span style={{
                        fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0,
                        background: 'rgba(201,168,76,0.06)',
                      }}>
                        {styleLabel}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div style={{
                      display: 'flex', gap: 16, paddingTop: 10,
                      borderTop: '1px solid var(--border)',
                      marginBottom: 14,
                    }}>
                      {[
                        { label: 'Scenes',     value: sceneCount },
                        { label: 'Frames',     value: frameCount },
                        { label: 'Characters', value: charCount  },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--gold)', fontFamily: 'Georgia,serif' }}>{value}</div>
                          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Color palette preview */}
                    {p.scenes[0]?.color_palette?.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                        {p.scenes.flatMap(s => s.color_palette).slice(0, 8).map((hex, i) => (
                          <div key={i} title={hex} style={{
                            width: 16, height: 8, borderRadius: 2,
                            background: hex, flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.08)',
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {isConfirming ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, opacity: 0.7 }}>Delete this project?</span>
                        <button className="btn-tactile"
                          onClick={() => p.db_id != null && handleDelete(p.db_id)}
                          disabled={isDeleting}
                          style={{
                            padding: '6px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                            border: '1px solid rgba(180,30,30,0.6)', background: 'rgba(180,30,30,0.15)',
                            color: '#e06060', letterSpacing: '0.1em', textTransform: 'uppercase',
                          }}>
                          {isDeleting ? '…' : 'Delete'}
                        </button>
                        <button className="btn-tactile"
                          onClick={() => setConfirmId(null)}
                          style={{
                            padding: '6px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
                          }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-tactile"
                          onClick={() => p.db_id != null && handleLoad(p.db_id)}
                          style={{
                            flex: 1, padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
                            border: '1px solid var(--gold)', background: 'var(--gold)',
                            color: 'var(--bg-base)', fontSize: 10, letterSpacing: '0.2em',
                            textTransform: 'uppercase', fontWeight: 700,
                            transition: 'background 150ms ease, color 150ms ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' }}
                        >
                          Open →
                        </button>
                        <button className="btn-tactile"
                          onClick={() => setConfirmId(p.db_id)}
                          style={{
                            padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-muted)', fontSize: 11,
                            transition: 'border-color 150ms ease, color 150ms ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,30,30,0.5)'; e.currentTarget.style.color = '#e06060' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
