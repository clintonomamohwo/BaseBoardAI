import { useCallback, useRef, useState } from 'react'
import type { CreativeKnowledgeGraph, RenderStyle, StoryboardFrame, StoryboardScene, SceneContinuityReport, SceneQARequest, FrameExpectedContext } from '../types/storyboard'
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
  projectRenderStyle?: RenderStyle
  projectCanon?: CreativeKnowledgeGraph | null
  selectedKeys: Map<string, boolean>
  onToggleSelect: (key: string) => void
  inspectorFrameKey: string | null
  onSelectFrame: (key: string) => void
  premiumSelectedKeys: Set<string>
  onTogglePremiumSelect: (key: string) => void
  premiumSelectedCount: number
  premiumSelectedEstimate: string
  premiumRenderProgress: { completed: number; total: number } | null
  onSelectPremiumScene: (scene: StoryboardScene) => void
  onClearPremiumSelection: () => void
  onRenderSelectedPremium: () => void
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
  scene, allScenes = [scene], renderStyleLabel, projectRenderStyle, projectCanon,
  selectedKeys, onToggleSelect, inspectorFrameKey, onSelectFrame, premiumSelectedKeys, onTogglePremiumSelect,
  premiumSelectedCount, premiumSelectedEstimate, premiumRenderProgress,
  onSelectPremiumScene, onClearPremiumSelection, onRenderSelectedPremium, onOpenPlayer,
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
  const [sceneActionsOpen, setSceneActionsOpen] = useState(false)

  async function handleUpgradeScene(targetStyle: string) {
    if (sceneUpgrading) return
    setSceneActionsOpen(false)
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
    // The backend rebuilds the same prompt used for rendering. Omit image bytes
    // from scene data so QA stays a small metadata-only request.
    const sceneData: StoryboardScene = {
      ...scene,
      frames: scene.frames.map(frame => ({ ...frame, generated_image_url: null })),
    }
    const promptCanonContext = projectCanon ? {
      character_identities: Object.fromEntries(
        Object.entries(projectCanon.character_identities).map(([id, identity]) => [id, {
          name: identity.name,
          face_description: identity.face_description,
          _canonical_prompt: identity._canonical_prompt,
        }]),
      ),
      approved_characters: Object.fromEntries(
        Object.entries(projectCanon.approved_characters).map(([id, character]) => [id, {
          name: character.name,
          appearance_summary: character.appearance_summary,
          canonical_prompt: character.canonical_prompt,
        }]),
      ),
      character_species: projectCanon.character_species,
      character_abilities: projectCanon.character_abilities,
    } : null
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
      // Fallback for older callers; the backend rebuilds the actual prompt from scene_data.
      generated_prompt:  f.visual_action ?? f.action_breakdown ?? '',
    }))

    const request: SceneQARequest = {
      scene_number:      scene.scene_number,
      location_heading:  scene.location_heading,
      time_of_day:       scene.time_of_day,
      environmental_type: scene.environmental_type,
      scene_data:        sceneData,
      render_style:      projectRenderStyle ?? 'bw_sketch',
      canon_context:     promptCanonContext,
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
  const scenePremiumFrameCount = scene.frames.filter(frame => Boolean(frame.generated_image_url)).length

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
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sceneActionsOpen}
              onClick={() => setSceneActionsOpen(open => !open)}
              className="text-[9px] tracking-widest uppercase text-[var(--text-base)]/55 hover:text-[var(--gold)] border border-[var(--border)] hover:border-[var(--gold)]/40 px-2 py-1 rounded transition-all"
              title="Scene actions"
            >⋯</button>
            {sceneActionsOpen && (
              <div role="menu" aria-label="Scene actions" style={{ position: 'absolute', top: 'calc(100% + 5px)', right: 0, zIndex: 50, width: 220, padding: 8, display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg-surface)', boxShadow: '0 12px 30px rgba(0,0,0,0.45)' }}>
                <span style={{ padding: '2px 4px 4px', color: 'var(--text-muted)', fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Scene actions</span>
                <button type="button" role="menuitem" disabled={scenePremiumFrameCount === 0 || premiumRenderProgress !== null} onClick={() => { onSelectPremiumScene(scene); setSceneActionsOpen(false) }} style={{ border: 'none', borderRadius: 4, background: 'transparent', color: 'var(--text-base)', opacity: scenePremiumFrameCount === 0 ? 0.4 : 0.84, textAlign: 'left', padding: '7px 6px', fontSize: 9, cursor: scenePremiumFrameCount === 0 ? 'default' : 'pointer' }}>＋ Add {scenePremiumFrameCount} rendered frames from this scene</button>
                <button type="button" role="menuitem" disabled={premiumSelectedCount === 0 || premiumRenderProgress !== null} onClick={() => { onClearPremiumSelection(); setSceneActionsOpen(false) }} style={{ border: 'none', borderRadius: 4, background: 'transparent', color: 'var(--text-base)', opacity: premiumSelectedCount === 0 ? 0.4 : 0.84, textAlign: 'left', padding: '7px 6px', fontSize: 9, cursor: premiumSelectedCount === 0 ? 'default' : 'pointer' }}>Clear selection across all scenes</button>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 7, marginTop: 2 }}>
                  <UpgradeStyleMenu currentStyle={projectRenderStyle} onSelect={handleUpgradeScene} loading={sceneUpgrading} label="Upgrade scene style" />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onOpenPlayer}
            className="text-[9px] tracking-widest uppercase text-[var(--text-base)]/40 hover:text-[var(--gold)] border border-[var(--border)] hover:border-[var(--gold)]/40 px-2 py-1 rounded transition-all"
          >
            ▶ Player
          </button>
        </div>
      </div>

      {/* Cost and batch controls appear only while premium frames are selected. */}
      {(premiumSelectedCount > 0 || premiumRenderProgress !== null) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(90deg, rgba(201,168,76,0.08), var(--bg-base))' }}>
          <div style={{ minWidth: 0 }}>
            <div role="status" aria-live="polite" style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.08em' }}>
              {premiumRenderProgress
                ? `Rendering selected frames · ${premiumRenderProgress.completed}/${premiumRenderProgress.total}`
                : `${premiumSelectedCount} frame${premiumSelectedCount === 1 ? '' : 's'} selected · Approx. ${premiumSelectedEstimate} USD`}
            </div>
            <div style={{ marginTop: 3, color: 'var(--text-muted)', opacity: 0.75, fontSize: 7 }}>
              Output-only estimate at $0.0336 per image; prompt and reference input charges are excluded.
            </div>
            <div style={{ marginTop: 3, color: 'var(--text-muted)', opacity: 0.65, fontSize: 7 }}>
              Add frames from other scenes to keep building this project-wide batch.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, flexShrink: 0 }}>
            <button
              type="button"
              disabled={premiumSelectedCount === 0 || premiumRenderProgress !== null}
              onClick={onClearPremiumSelection}
              style={{ border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', color: 'var(--text-muted)', cursor: premiumSelectedCount === 0 || premiumRenderProgress ? 'default' : 'pointer', fontSize: 8, padding: '6px 8px', opacity: premiumSelectedCount === 0 ? 0.45 : 0.85 }}
            >Clear</button>
            <button
              type="button"
              disabled={premiumSelectedCount === 0 || premiumRenderProgress !== null}
              onClick={onRenderSelectedPremium}
              className="btn-tactile"
              style={{ border: '1px solid rgba(201,168,76,0.55)', borderRadius: 4, background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', cursor: premiumSelectedCount === 0 || premiumRenderProgress ? 'default' : 'pointer', fontSize: 8, padding: '6px 9px', opacity: premiumSelectedCount === 0 || premiumRenderProgress ? 0.5 : 1, whiteSpace: 'nowrap' }}
            >{premiumRenderProgress ? 'Rendering…' : `Render ${premiumSelectedCount} · ${premiumSelectedEstimate} · Paid`}</button>
          </div>
        </div>
      )}

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
                isInspectorSelected={inspectorFrameKey === fk}
                onSelectFrame={onSelectFrame}
                compact
                isPremiumSelected={premiumSelectedKeys.has(fk)}
                onTogglePremiumSelect={onTogglePremiumSelect}
                premiumSelectionDisabled={premiumRenderProgress !== null}
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
