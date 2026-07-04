import { useState } from 'react'
import type { StoryboardProject, StoryboardScene } from '../types/storyboard'
import PipelineForm from '../components/PipelineForm'
import EmptyBlueprintState from '../components/EmptyBlueprintState'
import SceneIndex from '../components/SceneIndex'
import StoryboardCanvas from '../components/StoryboardCanvas'
import StudioInspector from '../components/StudioInspector'
import AnimaticPlayer from '../components/AnimaticPlayer'
import VaultGrid from '../components/VaultGrid'
import LockedCutFolder from '../components/LockedCutFolder'
import BatchExportBar from '../components/BatchExportBar'

const RENDER_STYLE_LABELS: Record<string, string> = {
  bw_sketch: 'B&W Sketch',
  flat_color: 'Flat Color',
  full_shaded: 'Full Shaded',
}

type ViewMode = 'storyboard' | 'player' | 'vault' | 'locked'

interface Props {
  initialProject?: StoryboardProject | null
  onNotify?: (msg: string, type?: 'success' | 'info') => void
}

export default function StudioPage({ initialProject, onNotify }: Props) {
  const [project, setProject] = useState<StoryboardProject | null>(initialProject ?? null)
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Map<string, boolean>>(new Map())
  const [viewMode, setViewMode] = useState<ViewMode>('storyboard')
  const [showForm, setShowForm] = useState(false)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)

  function handleProjectLoaded(p: StoryboardProject) {
    setProject(p)
    setActiveScene(p.scenes[0] ?? null)
    setSelectedKeys(new Map())
    setViewMode('storyboard')
    setShowForm(false)
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
        {(['storyboard', 'player', 'vault', 'locked'] as ViewMode[]).map((m) => (
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
            ? <VaultGrid scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} />
            : <LockedCutFolder scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} />
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
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">
          {/* Scene Index — col 2 */}
          <aside className="col-span-2 border-r border-[var(--border)] overflow-y-auto flex flex-col">
            <SceneIndex
              project={project}
              activeSceneNumber={displayScene?.scene_number ?? 0}
              onSelectScene={setActiveScene}
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
              />
            )}
          </main>

          {/* Inspector — col 3 */}
          <aside className="col-span-3 overflow-y-auto">
            <StudioInspector
              scene={displayScene}
              onReferenceChange={setReferenceImage}
            />
          </aside>
        </div>
      )}
      {referenceImage && <></>}
    </div>
  )
}
