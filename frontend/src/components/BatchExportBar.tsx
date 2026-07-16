import type { StoryboardProject, StoryboardScene } from '../types/storyboard'
import { prepareLockedCut, exportLockedCutZip } from '../utils/exportFrames'

interface Props {
  project: StoryboardProject
  scenes: StoryboardScene[]
  selectedKeys: Map<string, boolean>
}

export default function BatchExportBar({ project, scenes, selectedKeys }: Props) {
  const keySet = new Set([...selectedKeys.entries()].filter(([, v]) => v).map(([k]) => k))
  const locked = prepareLockedCut(scenes, keySet)
  const total = scenes.reduce((s, sc) => s + sc.frames.length, 0)

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[var(--text-base)]/30 tracking-wider">
        <span className="text-[var(--gold)]/60 font-semibold">{locked.length}</span>/{total} locked
      </span>
      <button
        onClick={() => exportLockedCutZip(project, locked)}
        disabled={locked.length === 0}
        className="text-[9px] tracking-widest uppercase border border-[var(--gold)]/20 hover:border-[var(--gold)]/60 text-[var(--gold)]/50 hover:text-[var(--gold)] px-2.5 py-1 rounded transition-all disabled:opacity-30"
      >
        Export ZIP
      </button>
    </div>
  )
}
