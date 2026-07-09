import type { StoryboardScene } from '../types/storyboard'
import FrameCard from './FrameCard'

interface Props {
  scene: StoryboardScene
  renderStyleLabel: string
  selectedKeys: Map<string, boolean>
  onToggleSelect: (key: string) => void
  onOpenPlayer: () => void
  onReplaceImage?: (sceneNumber: number, frameNumber: number, dataUrl: string) => void
}

export default function StoryboardCanvas({ scene, renderStyleLabel, selectedKeys, onToggleSelect, onOpenPlayer, onReplaceImage }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Canvas header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-base)]/40 tracking-widest uppercase">
          <span className="text-[var(--gold)]/70">SCENE {String(scene.scene_number).padStart(2, '0')}</span>
          <span>›</span>
          <span>{scene.location_heading}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-widest text-[var(--gold)]/50 border border-[var(--gold)]/20 px-2 py-0.5 rounded uppercase">
            {renderStyleLabel}
          </span>
          <button
            onClick={onOpenPlayer}
            className="text-[9px] tracking-widest uppercase text-[var(--text-base)]/40 hover:text-[var(--gold)] border border-[var(--border)] hover:border-[var(--gold)]/40 px-2 py-1 rounded transition-all"
          >
            ▶ Player
          </button>
        </div>
      </div>

      {/* Frame grid — horizontal scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full items-start">
          {scene.frames.map((frame) => (
            <FrameCard
                key={frame.frame_number}
                frame={frame}
                scene={scene}
                isSelected={selectedKeys.get(`s${scene.scene_number}_f${frame.frame_number}`) ?? false}
                onToggleSelect={onToggleSelect}
                onReplaceImage={onReplaceImage}
              />
          ))}
          {scene.frames.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-[var(--text-base)]/20 text-sm tracking-widest uppercase">
              No frames generated
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
