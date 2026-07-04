import { useState } from 'react'
import type { StoryboardProject, StoryboardScene } from '../types/storyboard'
import PipelineForm from '../components/PipelineForm'
import SceneList from '../components/SceneList'
import FrameStream from '../components/FrameStream'
import AnimaticPlayer from '../components/AnimaticPlayer'
import VaultGrid from '../components/VaultGrid'
import LockedCutFolder from '../components/LockedCutFolder'
import InspectorPanel from '../components/InspectorPanel'
import BatchExportBar from '../components/BatchExportBar'

const RENDER_STYLE_LABELS: Record<string, string> = {
  bw_sketch: 'B&W Sketch',
  flat_color: 'Flat Color',
  full_shaded: 'Full Shaded',
}

type ViewMode = 'gallery' | 'player' | 'vault' | 'locked'

interface Props {
  initialProject?: StoryboardProject | null
}

export default function WorkspacePage({ initialProject }: Props) {
  const [project, setProject] = useState<StoryboardProject | null>(initialProject ?? null)
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Map<string, boolean>>(new Map())
  const [viewMode, setViewMode] = useState<ViewMode>('gallery')
  const [referenceImage, setReferenceImage] = useState<string | null>(null)

  function handleProjectLoaded(p: StoryboardProject) {
    setProject(p)
    setActiveScene(p.scenes[0] ?? null)
    setSelectedKeys(new Map())
    setViewMode('gallery')
  }

  function handleToggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Map(prev)
      next.set(key, !prev.get(key))
      return next
    })
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F5F5F7] dark:bg-[#0d0b14]">
        <PipelineForm onComplete={handleProjectLoaded} />
      </div>
    )
  }

  const renderStyleLabel = RENDER_STYLE_LABELS[project.render_style] ?? project.render_style
  const displayScene = activeScene ?? project.scenes[0]

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4 bg-[#F5F5F7] dark:bg-[#0d0b14]">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {(['gallery', 'player', 'vault', 'locked'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all capitalize ${
                viewMode === mode
                  ? 'bg-[#2D1B69] dark:bg-[#00D4FF]/20 text-white dark:text-[#00D4FF]'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#00D4FF]'
              }`}
            >
              {mode === 'locked'
                ? `Locked Cut (${[...selectedKeys.values()].filter(Boolean).length})`
                : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <BatchExportBar project={project} scenes={project.scenes} selectedKeys={selectedKeys} />
          <button
            onClick={() => setProject(null)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-300 hover:text-red-500 transition-all"
          >
            New Pipeline
          </button>
        </div>
      </div>

      {/* Main content */}
      {(viewMode === 'vault' || viewMode === 'locked') ? (
        <div className="flex-1 overflow-y-auto rounded-2xl bg-white dark:bg-[#16102a] border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
          {viewMode === 'vault' ? (
            <VaultGrid scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} />
          ) : (
            <LockedCutFolder scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} />
          )}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          {/* Left — Scene list */}
          <section className="col-span-3 rounded-2xl bg-white dark:bg-[#16102a] border border-slate-100 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between overflow-y-auto">
            <SceneList
              scenes={project.scenes}
              activeSceneNumber={displayScene?.scene_number ?? 0}
              onSelectScene={setActiveScene}
            />
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
              <span>Powered by BOC Engine</span>
              <div className="h-2 w-2 rounded-full bg-[#D4A853]" />
            </div>
          </section>

          {/* Center — Stream / Player */}
          <section className="col-span-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-[#0d0b14]/50 flex flex-col overflow-hidden">
            {displayScene && viewMode === 'gallery' && (
              <FrameStream
                scene={displayScene}
                renderStyleLabel={renderStyleLabel}
                selectedKeys={selectedKeys}
                onToggleSelect={handleToggleSelect}
                viewMode="gallery"
                onSetViewMode={(m) => setViewMode(m as ViewMode)}
              />
            )}
            {displayScene && viewMode === 'player' && (
              <div className="flex flex-col h-full gap-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold tracking-tight text-slate-500 dark:text-slate-400">
                    Animatic Player
                  </h2>
                  <button
                    onClick={() => setViewMode('gallery')}
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#00D4FF]"
                  >
                    ← Gallery
                  </button>
                </div>
                <AnimaticPlayer frames={displayScene.frames} />
              </div>
            )}
          </section>

          {/* Right — Inspector */}
          <section className="col-span-3 rounded-2xl bg-white dark:bg-[#16102a] border border-slate-100 dark:border-slate-700 p-4 shadow-sm overflow-y-auto">
            <InspectorPanel scene={displayScene ?? null} onReferenceChange={setReferenceImage} />
          </section>
        </div>
      )}

      {referenceImage && <></>}
    </div>
  )
}
