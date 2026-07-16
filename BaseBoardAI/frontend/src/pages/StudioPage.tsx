import { useState } from 'react'
import type { RenderStyle, StoryboardFrame, StoryboardProject, StoryboardScene } from '../types/storyboard'
import { forgePipeline } from '../api/storyboard'
import PipelineForm from '../components/PipelineForm'
import EmptyBlueprintState from '../components/EmptyBlueprintState'
import SceneIndex from '../components/SceneIndex'
import StoryboardCanvas from '../components/StoryboardCanvas'
import StudioInspector from '../components/StudioInspector'
import AnimaticPlayer from '../components/AnimaticPlayer'
import VaultGrid from '../components/VaultGrid'
import LockedCutFolder from '../components/LockedCutFolder'
import BatchExportBar from '../components/BatchExportBar'
import ConstellationLoader from '../components/ConstellationLoader'

const RENDER_OPTIONS: { value: RenderStyle; label: string }[] = [
  { value: 'bw_sketch',   label: 'B&W Sketch' },
  { value: 'flat_color',  label: 'Flat Color' },
  { value: 'full_shaded', label: 'Full Shaded' },
]

const RENDER_STYLE_LABELS: Record<string, string> = Object.fromEntries(
  RENDER_OPTIONS.map(o => [o.value, o.label])
)

const VIEW_MODES = ['storyboard', 'player', 'vault', 'locked'] as const
type ViewMode = typeof VIEW_MODES[number]

interface Props {
  initialProject?: StoryboardProject | null
  onNotify?: (msg: string, type?: 'success' | 'info') => void
}

export default function StudioPage({ initialProject, onNotify }: Props) {
  const [project, setProject]           = useState<StoryboardProject | null>(initialProject ?? null)
  const [activeScene, setActiveScene]   = useState<StoryboardScene | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Map<string, boolean>>(new Map())
  const [viewMode, setViewMode]         = useState<ViewMode>('storyboard')
  const [showForm, setShowForm]         = useState(false)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [rerunOpen, setRerunOpen]       = useState(false)
  const [rerunStyle, setRerunStyle]     = useState<RenderStyle>('bw_sketch')
  const [rerunAesthetic, setRerunAesthetic] = useState('')
  const [rerunLoading, setRerunLoading] = useState(false)
  const [rerunError, setRerunError]     = useState<string | null>(null)

  async function handleRerun() {
    if (!project) return
    setRerunLoading(true); setRerunError(null)
    onNotify?.('Re-running pipeline…', 'info')

    // Snapshot locked frames before the pipeline wipes project state
    const lockedFrames: Record<string, { url: string }> = {}
    for (const scene of project.scenes) {
      for (const frame of scene.frames) {
        if (frame.is_manual_override && frame.generated_image_url) {
          lockedFrames[`${scene.scene_number}:${frame.frame_number}`] = {
            url: frame.generated_image_url,
          }
        }
      }
    }

    try {
      const p = await forgePipeline({
        project_title:         project.project_title,
        global_aesthetic:      rerunAesthetic || project.global_aesthetic,
        render_style:          rerunStyle,
        reference_style_image: null,
        raw_character_notes:   project.characters.map(c => `${c.name}: ${c.wardrobe_defaults}`).join('\n'),
        raw_world_notes:       project.scenes.map(s => s.location_heading).join('\n'),
        raw_script_text:       project.scenes.map(s =>
          s.frames.map(f => f.action_breakdown).join(' ')
        ).join('\n\n'),
      })

      // Restore artist overrides — re-run cannot overwrite locked frames
      if (Object.keys(lockedFrames).length > 0) {
        p.scenes = p.scenes.map(scene => ({
          ...scene,
          frames: scene.frames.map(frame => {
            const locked = lockedFrames[`${scene.scene_number}:${frame.frame_number}`]
            if (!locked) return frame
            return { ...frame, generated_image_url: locked.url, is_manual_override: true }
          }),
        }))
      }

      handleProjectLoaded(p)
      setRerunOpen(false)
      const restoredCount = Object.keys(lockedFrames).length
      onNotify?.(restoredCount > 0
        ? `Re-run complete ✓ — ${restoredCount} locked frame${restoredCount !== 1 ? 's' : ''} preserved`
        : 'Re-run complete ✓'
      )
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : 'Re-run failed')
    } finally {
      setRerunLoading(false)
    }
  }

  function handleDeleteScene(sceneNumber: number) {
    if (!project) return
    const updated = { ...project, scenes: project.scenes.filter(s => s.scene_number !== sceneNumber) }
    setProject(updated)
    if (activeScene?.scene_number === sceneNumber) {
      setActiveScene(updated.scenes[0] ?? null)
    }
  }

  function handleReorderScenes(scenes: StoryboardScene[]) {
    if (!project) return
    setProject({ ...project, scenes })
  }

  function handleProjectLoaded(p: StoryboardProject) {
    setProject(p)
    setActiveScene(p.scenes[0] ?? null)
    setSelectedKeys(new Map())
    setViewMode('storyboard')
    setShowForm(false)
  }

  /** Replace a single frame's image and mark it as an artist override.
   *  Marked frames are skipped by re-run so the artwork is never overwritten. */
  function handleReplaceFrameImage(sceneNumber: number, frameNumber: number, dataUrl: string) {
    const patch = (f: StoryboardFrame) =>
      f.frame_number === frameNumber
        ? { ...f, generated_image_url: dataUrl, is_manual_override: true }
        : f

    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        scenes: prev.scenes.map(s =>
          s.scene_number !== sceneNumber ? s : { ...s, frames: s.frames.map(patch) }
        ),
      }
    })
    // Keep activeScene in sync so the canvas re-renders immediately
    setActiveScene(prev => {
      if (!prev || prev.scene_number !== sceneNumber) return prev
      return { ...prev, frames: prev.frames.map(patch) }
    })
  }

  /** Patch a frame's visual action fields after regeneration.
   *  Only the returned fields are overwritten — image and overrides are untouched. */
  function handleVisualActionUpdate(sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) {
    const applyPatch = (f: StoryboardFrame) =>
      f.frame_number === frameNumber ? { ...f, ...patch } : f

    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        scenes: prev.scenes.map(s =>
          s.scene_number !== sceneNumber ? s : { ...s, frames: s.frames.map(applyPatch) }
        ),
      }
    })
    setActiveScene(prev => {
      if (!prev || prev.scene_number !== sceneNumber) return prev
      return { ...prev, frames: prev.frames.map(applyPatch) }
    })
  }

  function handleToggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Map(prev)
      next.set(key, !prev.get(key))
      return next
    })
  }

  const displayScene = activeScene ?? project?.scenes[0] ?? null
  const renderStyleLabel = project ? (RENDER_STYLE_LABELS[project.render_style] ?? project.render_style) : ''
  const lockedCount = [...selectedKeys.values()].filter(Boolean).length
  // Frames the artist has manually overridden — protected from re-run
  const overrideCount = project
    ? project.scenes.reduce((sum, s) => sum + s.frames.filter(f => f.is_manual_override).length, 0)
    : 0

  if (!project || showForm) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-2xl">
          {project ? (
            <button onClick={() => setShowForm(false)}
              className="btn-tactile mb-6"
              style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>
              ← Back to project
            </button>
          ) : (
            <EmptyBlueprintState onStart={() => setShowForm(true)} />
          )}
          {(showForm || project) && <PipelineForm onComplete={handleProjectLoaded} onNotify={onNotify} />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden anim-studio-unfold" style={{ background: 'var(--bg-base)' }}>
      {/* View mode tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[var(--border)] flex-shrink-0">
        {VIEW_MODES.map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`relative px-4 py-2 text-xs tracking-widest uppercase transition-all ${
              viewMode === m ? 'text-[var(--gold)] tab-active' : 'text-[var(--text-base)]/40 hover:text-[var(--text-base)]/70'
            }`}
          >
            {m === 'locked' ? `Locked Cut (${lockedCount})` : m.replace('-', ' ')}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 pb-1">
          {project && <BatchExportBar project={project} scenes={project.scenes} selectedKeys={selectedKeys} />}
          {project && (
            <button
              onClick={() => setRerunOpen(o => !o)}
              className="text-[10px] tracking-widest uppercase border px-3 py-1.5 rounded transition-all"
              style={{
                color: rerunOpen ? 'var(--gold)' : 'var(--text-base)',
                borderColor: rerunOpen ? 'var(--gold)' : 'var(--border)',
                opacity: rerunOpen ? 1 : 0.5,
              }}
            >
              ↺ Re-run
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] tracking-widest uppercase text-[var(--gold)]/50 hover:text-[var(--gold)] border border-[var(--border)] hover:border-[var(--gold)]/40 px-3 py-1.5 rounded transition-all"
          >
            + New Pipeline
          </button>
        </div>
      </div>

      {/* Content */}
      {(viewMode === 'vault' || viewMode === 'locked') ? (
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'vault'
            ? <VaultGrid scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} onReplaceImage={handleReplaceFrameImage} />
            : <LockedCutFolder scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} onReplaceImage={handleReplaceFrameImage} />
          }
        </div>
      ) : viewMode === 'player' && displayScene ? (
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs tracking-[0.3em] uppercase text-[var(--gold)]/60">Animatic Player</h2>
            <button onClick={() => setViewMode('storyboard')} className="text-[10px] tracking-widest uppercase text-[var(--text-base)]/40 hover:text-[var(--gold)] transition-all">← Storyboard</button>
          </div>
          <AnimaticPlayer frames={displayScene.frames} />
        </div>
      ) : (
        /* Main 3-col storyboard layout */
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden relative">

          {/* Re-run overlay */}
          {rerunOpen && (
            <div className="absolute inset-0 z-20 flex items-start justify-end pointer-events-none">
              <div
                className="pointer-events-auto anim-slide-up"
                style={{
                  width: 320, margin: '8px 8px 0 0',
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(201,168,76,0.4)',
                  borderRadius: 8,
                  boxShadow: '0 0 32px var(--gold-dim)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>↺ Re-run Pipeline</span>
                  <button onClick={() => setRerunOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, opacity: 0.5 }}>✕</button>
                </div>

                {rerunLoading ? (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <ConstellationLoader message="Re-running pipeline…" />
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {rerunError && (
                      <div style={{ borderRadius: 4, background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)', padding: '8px 12px', fontSize: 11, color: '#e06060' }}>
                        {rerunError}
                      </div>
                    )}

                    {/* Aesthetic */}
                    <div>
                      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
                        Global Aesthetic
                      </label>
                      <input
                        placeholder={project?.global_aesthetic ?? 'e.g. Cinematic High-Contrast'}
                        value={rerunAesthetic}
                        onChange={e => setRerunAesthetic(e.target.value)}
                        style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '7px 10px', fontSize: 11, color: 'var(--text-base)', outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </div>

                    {/* Render style */}
                    <div>
                      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
                        Render Style
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {RENDER_OPTIONS.map(o => (
                          <button key={o.value} type="button" onClick={() => setRerunStyle(o.value)}
                            style={{
                              flex: 1, padding: '6px 4px', fontSize: 9, letterSpacing: '0.1em',
                              textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
                              background: rerunStyle === o.value ? 'var(--gold)' : 'transparent',
                              color: rerunStyle === o.value ? 'var(--bg-base)' : 'var(--text-muted)',
                              border: `1px solid ${rerunStyle === o.value ? 'var(--gold)' : 'var(--border)'}`,
                              transition: 'all 150ms ease',
                            }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.55, lineHeight: 1.5 }}>
                      Re-uses the existing script text and character notes with your new settings. Saves as a new project.
                    </p>

                    {/* Override status */}
                    {overrideCount > 0 ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        borderRadius: 4, padding: '7px 10px',
                        background: 'rgba(74,222,128,0.06)',
                        border: '1px solid rgba(74,222,128,0.25)',
                      }}>
                        <span style={{ fontSize: 10, color: '#4ade80' }}>◈</span>
                        <span style={{ fontSize: 9, color: '#4ade80', opacity: 0.8, lineHeight: 1.5 }}>
                          {overrideCount} artist frame{overrideCount !== 1 ? 's' : ''} locked — will be preserved
                        </span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        borderRadius: 4, padding: '7px 10px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border)',
                      }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.45, lineHeight: 1.5 }}>
                          No artist overrides — all frames will be regenerated
                        </span>
                      </div>
                    )}

                    <button
                      onClick={handleRerun}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 4, cursor: 'pointer',
                        border: '1px solid var(--gold)', background: 'var(--gold)',
                        color: 'var(--bg-base)', fontSize: 10, letterSpacing: '0.2em',
                        textTransform: 'uppercase', fontWeight: 700, transition: 'background 150ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' }}
                    >
                      ↺ Execute Re-run →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Scene Index — col 2 */}
          <aside className="col-span-2 border-r border-[var(--border)] overflow-y-auto flex flex-col">
            <SceneIndex
              project={project}
              activeSceneNumber={displayScene?.scene_number ?? 0}
              onSelectScene={setActiveScene}
              onDeleteScene={handleDeleteScene}
              onReorderScenes={handleReorderScenes}
            />
          </aside>

          {/* Storyboard Canvas — col 7 */}
          <main className="col-span-7 overflow-hidden flex flex-col border-r border-[var(--border)]">
            {displayScene && (
              <StoryboardCanvas
                  scene={displayScene}
                  renderStyleLabel={renderStyleLabel}
                  selectedKeys={selectedKeys}
                  onToggleSelect={handleToggleSelect}
                  onOpenPlayer={() => setViewMode('player')}
                  onReplaceImage={handleReplaceFrameImage}
                  onVisualActionUpdate={handleVisualActionUpdate}
                />
            )}
          </main>

          {/* Inspector — col 3 */}
          <aside className="col-span-3 overflow-y-auto">
            <StudioInspector
              scene={displayScene}
              onReferenceChange={setReferenceImage}
              canon={project?.canon ?? null}
            />
          </aside>
        </div>
      )}
    </div>
  )
}
