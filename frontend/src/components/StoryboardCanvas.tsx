import { useCallback, useRef, useState } from 'react'
import type { StoryboardFrame, StoryboardScene, SceneContinuityReport, SceneQARequest, FrameExpectedContext } from '../types/storyboard'
import { runSceneQA, upgradeSceneStyle } from '../api/storyboard'
import FrameCard from './FrameCard'
import ActionTimeline from './ActionTimeline'
import SceneContinuityPanel from './SceneContinuityPanel'
import UpgradeStyleMenu from './UpgradeStyleMenu'

interface Props {
  scene: StoryboardScene
  allScenes?: StoryboardScene[]
  renderStyleLabel: string
  /** The current project render_style key — passed to UpgradeStyleMenu to show ✓ on current */
  projectRenderStyle?: string
  selectedKeys: Map<string, boolean>
  onToggleSelect: (key: string) => void
  onOpenPlayer: () => void
  onReplaceImage?: (sceneNumber: number, frameNumber: number, dataUrl: string) => void
  /** Called when a frame's visual_action is regenerated so parent can patch project state */
  onVisualActionUpdate?: (sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) => void
  onFrameUpdate?: (sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) => void
  /** BMS-3: called with the focused frame key so the inspector can preview it */
  onFocusFrame?: (frameKey: string | null) => void
  /** Called when a frame image is upgraded to a new style */
  onUpgradeFrame?: (sceneNumber: number, frameNumber: number, newUrl: string) => void
}

export default function StoryboardCanvas({
  scene, allScenes = [scene], renderStyleLabel, projectRenderStyle,
  selectedKeys, onToggleSelect, onOpenPlayer,
  onReplaceImage, onVisualActionUpdate, onFrameUpdate, onFocusFrame, onUpgradeFrame,
}: Props) {
  // BMS-3: track which frame key is currently nearest the cursor
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  // ActionTimeline expand/collapse
  const [timelineOpen, setTimelineOpen] = useState(false)
  // Continuity QA
  const [qaOpen, setQaOpen]           = useState(false)
  const [qaReport, setQaReport]       = useState<SceneContinuityReport | null>(null)
  const [qaLoading, setQaLoading]     = useState(false)
  // Scene-level style upgrade
  const [sceneUpgrading, setSceneUpgrading] = useState(false)

  async function handleUpgradeScene(targetStyle: string) {
    if (sceneUpgrading) return
    setSceneUpgrading(true)
    try {
      const result = await upgradeSceneStyle(scene.frames, scene, targetStyle, null)
      if (onUpgradeFrame) {
        for (const r of result.frames) {
          if (r.generated_image_url) {
            onUpgradeFrame(scene.scene_number, r.frame_number, r.generated_image_url)
          }
        }
      }
    } catch { /* partial results already applied above */ }
    finally { setSceneUpgrading(false) }
  }

  async function handleRunSceneQA() {
    // Only frames that have a generated prompt are useful; frames with no prompt
    // get a placeholder so the QA still counts them.
    const frames: FrameExpectedContext[] = scene.frames.map(f => ({
      scene_number:      scene.scene_number,
      frame_number:      f.frame_number,
      location_heading:  scene.location_heading,
      time_of_day:       scene.time_of_day,
      environmental_type: scene.environmental_type,
      characters_present: f.characters_present ?? [],
      lighting_notes:    f.lighting_notes ?? '',
      mood:              f.mood ?? null,
      shot_type:         f.shot_type ?? 'Wide Shot',
      generated_prompt:  f.visual_action ?? f.action_breakdown ?? '',
    }))

    const request: SceneQARequest = {
      scene_number:      scene.scene_number,
      location_heading:  scene.location_heading,
      time_of_day:       scene.time_of_day,
      environmental_type: scene.environmental_type,
      frames,
    }

    setQaLoading(true)
    try {
      const report = await runSceneQA(request)
      setQaReport(report)
      setQaOpen(true)
    } catch { /* silently leave existing report */ }
    finally { setQaLoading(false) }
  }
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current
    if (!scroll) return
    // Find all frame card elements within the scroll container
    const cards = scroll.querySelectorAll<HTMLElement>('[data-frame-key]')
    let closest: string | null = null
    let minDist = Infinity
    cards.forEach(card => {
      const r = card.getBoundingClientRect()
      const cx = (r.left + r.right) / 2
      const cy = (r.top + r.bottom) / 2
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
      if (dist < minDist) { minDist = dist; closest = card.dataset.frameKey ?? null }
    })
    if (closest !== focusedKey) {
      setFocusedKey(closest)
      onFocusFrame?.(closest)
    }
  }, [focusedKey, onFocusFrame])

  const handleMouseLeave = useCallback(() => {
    setFocusedKey(null)
    onFocusFrame?.(null)
  }, [onFocusFrame])

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
          <UpgradeStyleMenu
            currentStyle={projectRenderStyle}
            onSelect={handleUpgradeScene}
            loading={sceneUpgrading}
            label="Upgrade Scene ▾"
          />
          <button
            onClick={onOpenPlayer}
            className="text-[9px] tracking-widest uppercase text-[var(--text-base)]/40 hover:text-[var(--gold)] border border-[var(--border)] hover:border-[var(--gold)]/40 px-2 py-1 rounded transition-all"
          >
            ▶ Player
          </button>
        </div>
      </div>

      {/* Frame grid — horizontal scroll, BMS-3 cursor tracking */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          ref={scrollRef}
          className="flex gap-3 p-4 h-full items-start"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {scene.frames.map((frame) => {
            const fk = `s${scene.scene_number}_f${frame.frame_number}`
            return (
              <FrameCard
                key={fk}
                frameKey={fk}
                frame={frame}
                scene={scene}
                allScenes={allScenes}
                isSelected={selectedKeys.get(fk) ?? false}
                isFocused={focusedKey === fk}
                onToggleSelect={onToggleSelect}
                onReplaceImage={onReplaceImage}
                onVisualActionUpdate={onVisualActionUpdate}
                onFrameUpdate={onFrameUpdate}
                onUpgradeFrame={onUpgradeFrame}
                projectRenderStyle={projectRenderStyle}
              />
            )
          })}
          {scene.frames.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-[var(--text-base)]/20 text-sm tracking-widest uppercase">
              No frames generated
            </div>
          )}
        </div>
      </div>

      {/* Action Timeline — collapsible beat sheet below the frame grid */}
      {scene.frames.length > 0 && (
        <div className="flex-shrink-0 border-t border-[var(--border)]">
          <button
            onClick={() => setTimelineOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-[8px] tracking-[0.3em] uppercase transition-all"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gold)',
              opacity: timelineOpen ? 0.8 : 0.4,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = timelineOpen ? '0.8' : '0.4')}
          >
            <span>Action Timeline</span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.6 }}>
              {timelineOpen ? '▲' : '▼'}
            </span>
          </button>
          {timelineOpen && (
            <div className="bms-inspector-enter px-4 pb-4">
              <ActionTimeline scene={scene} />
            </div>
          )}
        </div>
      )}

      {/* Continuity QA — collapsible panel below the timeline */}
      {scene.frames.length > 0 && (
        <div className="flex-shrink-0 border-t border-[var(--border)]">
          <button
            onClick={() => setQaOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-[8px] tracking-[0.3em] uppercase transition-all"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: qaReport && qaReport.frames_failed > 0 ? '#f87171' : 'var(--gold)',
              opacity: qaOpen ? 0.8 : 0.4,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = qaOpen ? '0.8' : '0.4')}
          >
            <span>
              Continuity QA
              {qaReport && (
                <span style={{ marginLeft: 8, fontFamily: 'Georgia,serif', fontSize: 9, opacity: 0.9 }}>
                  {qaReport.frames_failed === 0
                    ? `✓ ${qaReport.frames_passed}/${qaReport.total_frames} Pass`
                    : `✕ ${qaReport.frames_failed} Issue${qaReport.frames_failed !== 1 ? 's' : ''}`}
                </span>
              )}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.6 }}>
              {qaOpen ? '▲' : '▼'}
            </span>
          </button>
          {qaOpen && (
            <div className="bms-inspector-enter px-4 pb-4">
              <SceneContinuityPanel
                sceneNumber={scene.scene_number}
                locationHeading={scene.location_heading}
                report={qaReport}
                onRunQA={handleRunSceneQA}
                loading={qaLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
