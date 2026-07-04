import type { StoryboardScene } from '../types/storyboard'
import FrameCard from './FrameCard'

interface Props {
  scenes: StoryboardScene[]
  selectedKeys: Map<string, boolean>
  onToggleSelect: (key: string) => void
}

export default function VaultGrid({ scenes, selectedKeys, onToggleSelect }: Props) {
  const allFrames = scenes.flatMap((scene) => scene.frames.map((frame) => ({ frame, scene })))
  return (
    <div className="space-y-4">
      <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--gold)]/40">The Vault — {allFrames.length} frames</p>
      <div className="flex flex-wrap gap-3">
        {allFrames.map(({ frame, scene }) => (
          <FrameCard key={`s${scene.scene_number}_f${frame.frame_number}`} frame={frame} scene={scene}
            isSelected={selectedKeys.get(`s${scene.scene_number}_f${frame.frame_number}`) ?? false}
            onToggleSelect={onToggleSelect} />
        ))}
      </div>
    </div>
  )
}
