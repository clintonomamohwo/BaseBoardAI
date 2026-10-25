import { useState } from 'react'
import type { StoryboardProject, StoryboardScene } from '../types/storyboard'
import { prepareLockedCut, exportLockedCutZip } from '../utils/exportFrames'
import {
  createProductionPackArchive,
  downloadProductionPackArchive,
  formatProductionPackDownloadNotice,
  type ProductionPackArchive,
} from '../utils/productionPack'

interface Props {
  project: StoryboardProject
  scenes: StoryboardScene[]
  selectedKeys: Map<string, boolean>
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void
}

interface PreparedPack {
  archive: ProductionPackArchive
  project: StoryboardProject
  scenes: StoryboardScene[]
}

export default function BatchExportBar({ project, scenes, selectedKeys, onNotify }: Props) {
  const [productionPackLoading, setProductionPackLoading] = useState(false)
  const [preparedPack, setPreparedPack] = useState<PreparedPack | null>(null)
  const [localNotice, setLocalNotice] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const keySet = new Set([...selectedKeys.entries()].filter(([, value]) => value).map(([key]) => key))
  const locked = prepareLockedCut(scenes, keySet)
  const total = scenes.reduce((sum, scene) => sum + scene.frames.length, 0)
  const currentPreparedPack = preparedPack?.project === project && preparedPack.scenes === scenes
    ? preparedPack
    : null

  function report(message: string, type: 'success' | 'info' | 'error' = 'success') {
    if (onNotify) onNotify(message, type)
    else setLocalNotice({ message, type })
  }

  async function handleProductionPackExport() {
    if (productionPackLoading) return
    if (currentPreparedPack) {
      try {
        downloadProductionPackArchive(currentPreparedPack.archive, project.project_title)
        setPreparedPack(null)
        report('Production Pack download started.', 'success')
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'An unexpected download error occurred.'
        report(`Production Pack download failed: ${detail}`, 'error')
      }
      return
    }

    setProductionPackLoading(true)
    try {
      const projectSnapshot = project
      const scenesSnapshot = scenes
      const archive = await createProductionPackArchive(projectSnapshot, scenesSnapshot)
      setPreparedPack({ archive, project: projectSnapshot, scenes: scenesSnapshot })
      const notice = formatProductionPackDownloadNotice(archive)
      report(`${notice.message}. Tap Download ZIP to save the file.`, notice.type)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'An unexpected export error occurred.'
      report(`Production Pack export failed: ${detail}`, 'error')
    } finally {
      setProductionPackLoading(false)
    }
  }

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
      <button
        onClick={() => void handleProductionPackExport()}
        disabled={productionPackLoading}
        title={currentPreparedPack ? 'Download the prepared versioned project JSON, shot CSV, images, and manifest' : 'Prepare a versioned project JSON, shot CSV, image files, and manifest'}
        className="text-[9px] tracking-widest uppercase border border-[var(--gold)]/50 hover:border-[var(--gold)] text-[var(--gold)] px-2.5 py-1 rounded transition-all disabled:opacity-50"
      >
        {productionPackLoading ? 'Preparing…' : currentPreparedPack ? 'Download ZIP' : 'Production Pack'}
      </button>
      {localNotice && !onNotify && (
        <span
          role={localNotice.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`text-[9px] ${localNotice.type === 'error' ? 'text-red-400' : 'text-[var(--text-base)]/60'}`}
        >
          {localNotice.message}
        </span>
      )}
    </div>
  )
}
