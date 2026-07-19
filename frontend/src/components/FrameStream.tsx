import type { StoryboardFrame, StoryboardScene } from '../types/storyboard'
import FrameCard from './FrameCard'

interface Props {
  scene: StoryboardScene
  renderStyleLabel: string
  selectedKeys: Map<string, boolean>
  onToggleSelect: (key: string) => void
  viewMode: 'gallery' | 'player'
  onSetViewMode: (mode: 'gallery' | 'player') => void
  onVisualActionUpdate?: (sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) => void
}

export default function FrameStream({ scene, renderStyleLabel, selectedKeys, onToggleSelect, viewMode, onSetViewMode, onVisualActionUpdate }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-sm font-bold tracking-tight text-slate-500 dark:text-slate-400">
          Storyboard Stream Production
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#2D1B69] dark:text-[#00D4FF] font-medium bg-[#00D4FF]/10 px-2.5 py-1 rounded-md border border-[#00D4FF]/20">
            {renderStyleLabel}
          </span>
          {(['gallery', 'player'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSetViewMode(m)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all capitalize ${
                viewMode === m
                  ? 'bg-[#2D1B69] dark:bg-[#00D4FF]/20 text-white dark:text-[#00D4FF]'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#00D4FF]'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Frame scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {scene.frames.map((frame) => {
          const fk = `s${scene.scene_number}_f${frame.frame_number}`
          return (
            <FrameCard
              key={fk}
              frameKey={fk}
              frame={frame}
              scene={scene}
              isSelected={selectedKeys.get(fk) ?? false}
              onToggleSelect={onToggleSelect}
              onVisualActionUpdate={onVisualActionUpdate}
            />
          )
        })}
        {scene.frames.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
            No frames in this scene.
          </div>
        )}
      </div>
    </div>
  )
}
