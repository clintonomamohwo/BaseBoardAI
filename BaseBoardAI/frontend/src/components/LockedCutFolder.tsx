import type { StoryboardScene } from '../types/storyboard'
import FrameCard from './FrameCard'

interface Props {
  scenes: StoryboardScene[]
  selectedKeys: Map<string, boolean>
  onToggleSelect: (key: string) => void
  onReplaceImage?: (sceneNumber: number, frameNumber: number, dataUrl: string) => void
}

export default function LockedCutFolder({ scenes, selectedKeys, onToggleSelect, onReplaceImage }: Props) {
  const locked = scenes.flatMap((scene) =>
    scene.frames
      .filter((f) => selectedKeys.get(`s${scene.scene_number}_f${f.frame_number}`) === true)
      .map((frame) => ({ frame, scene }))
  )
  if (locked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-[var(--text-base)]/20 text-sm tracking-widest uppercase">No frames locked</p>
        <p className="text-[9px] text-[var(--text-base)]/10 tracking-wider">Hover a frame and click ★ to lock it</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">Locked Cut — {locked.length} frame{locked.length !== 1 ? 's' : ''}</p>
      <div className="flex flex-wrap gap-3">
        {locked.map(({ frame, scene }) => (
          <FrameCard key={`s${scene.scene_number}_f${frame.frame_number}`} frame={frame} scene={scene}
            isSelected onToggleSelect={onToggleSelect}
            onReplaceImage={onReplaceImage} />
        ))}
      </div>
    </div>
  )
}
