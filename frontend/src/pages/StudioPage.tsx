import { useEffect, useRef, useState } from 'react'
import { classifyError } from '../utils/classifyError'
import type { RenderStyle, StoryboardFrame, StoryboardProject, StoryboardScene } from '../types/storyboard'
import { forgePipeline, renderFrameImage, upgradeSceneStyle } from '../api/storyboard'
import PipelineForm from '../components/PipelineForm'
import EmptyBlueprintState from '../components/EmptyBlueprintState'
import SceneIndex from '../components/SceneIndex'
import StoryboardCanvas from '../components/StoryboardCanvas'
import StudioInspector from '../components/StudioInspector'
import AnimaticPlayer from '../components/AnimaticPlayer'
import VaultGrid from '../components/VaultGrid'
import LockedCutFolder from '../components/LockedCutFolder'
import BatchExportBar from '../components/BatchExportBar'
import ConstellationLoader from '../components/ConstellationLoader'
import UpgradeStyleMenu from '../components/UpgradeStyleMenu'
import { patchShotWithContinuityReview } from '../utils/shotContinuity'
import { formatPremiumRenderOutputEstimate } from '../utils/premiumRenderEstimate'

const RENDER_OPTIONS: { value: RenderStyle; label: string }[] = [
  { value: 'bw_sketch',   label: 'B&W Sketch' },
  { value: 'flat_color',  label: 'Flat Color' },
  { value: 'full_shaded', label: 'Full Shaded' },
]

const RENDER_STYLE_LABELS: Record<string, string> = Object.fromEntries(
  RENDER_OPTIONS.map(o => [o.value, o.label])
)

const VIEW_MODES = ['storyboard', 'player', 'vault', 'locked'] as const
type ViewMode = typeof VIEW_MODES[number]

interface Props {
  initialProject?: StoryboardProject | null
  onProjectChange: (project: StoryboardProject, alreadySaved?: boolean) => void
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void
}

export default function StudioPage({ initialProject, onProjectChange, onNotify }: Props) {
  const [project, setProject]           = useState<StoryboardProject | null>(initialProject ?? null)
  const projectRef = useRef(project)
  useEffect(() => {
    projectRef.current = project
  }, [project])
  const [activeScene, setActiveScene]   = useState<StoryboardScene | null>(null)
  const [inspectedFrameKey, setInspectedFrameKey] = useState<string | null>(() => {
    const firstScene = initialProject?.scenes[0]
    const firstFrame = firstScene?.frames[0]
    return firstScene && firstFrame ? `s${firstScene.scene_number}_f${firstFrame.frame_number}` : null
  })
  const [selectedKeys, setSelectedKeys] = useState<Map<string, boolean>>(new Map())
  const [premiumSelectedKeys, setPremiumSelectedKeys] = useState<Set<string>>(new Set())
  const [premiumRenderProgress, setPremiumRenderProgress] = useState<{ completed: number; total: number } | null>(null)
  const [viewMode, setViewMode]         = useState<ViewMode>('storyboard')
  const [showForm, setShowForm]         = useState(false)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [rerunOpen, setRerunOpen]       = useState(false)
  const [rerunStyle, setRerunStyle]     = useState<RenderStyle>('bw_sketch')
  const [rerunAesthetic, setRerunAesthetic] = useState('')
  const [rerunLoading, setRerunLoading] = useState(false)
  const [rerunError, setRerunError]     = useState<string | null>(null)
  const [projectUpgrading, setProjectUpgrading] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  function updateProjectState(updater: (current: StoryboardProject) => StoryboardProject) {
    const current = projectRef.current
    if (!current) return
    const next = updater(current)
    projectRef.current = next
    setProject(next)
    onProjectChange(next)
  }

  async function handleRerun() {
    if (!project) return
    setRerunLoading(true); setRerunError(null)
    onNotify?.('Re-running pipeline…', 'info')

    // Snapshot locked frames before the pipeline wipes project state
    const lockedFrames: Record<string, { url: string }> = {}
    for (const scene of project.scenes) {
      for (const frame of scene.frames) {
        if (frame.is_manual_override && frame.generated_image_url) {
          lockedFrames[`${scene.scene_number}:${frame.frame_number}`] = {
            url: frame.generated_image_url,
          }
        }
      }
    }

    try {
      const p = await forgePipeline({
        project_title:         project.project_title,
        global_aesthetic:      rerunAesthetic || project.global_aesthetic,
        render_style:          rerunStyle,
        reference_style_image: null,
        raw_character_notes:   project.characters.map(c => `${c.name}: ${c.wardrobe_defaults}`).join('\n'),
        raw_world_notes:       project.scenes.map(s => s.location_heading).join('\n'),
        raw_script_text:       project.scenes.map(s =>
          s.frames.map(f => f.action_breakdown).join(' ')
        ).join('\n\n'),
      })

      // Restore artist overrides — re-run cannot overwrite locked frames
      if (Object.keys(lockedFrames).length > 0) {
        p.scenes = p.scenes.map(scene => ({
          ...scene,
          frames: scene.frames.map(frame => {
            const locked = lockedFrames[`${scene.scene_number}:${frame.frame_number}`]
            if (!locked) return frame
            return { ...frame, generated_image_url: locked.url, is_manual_override: true }
          }),
        }))
      }

      const restoredCount = Object.keys(lockedFrames).length
      handleProjectLoaded(p)
      if (restoredCount > 0) onProjectChange(p)
      setRerunOpen(false)
      onNotify?.(restoredCount > 0
        ? `Re-run complete ✓ — ${restoredCount} locked frame${restoredCount !== 1 ? 's' : ''} preserved`
        : 'Re-run complete ✓'
      )
    } catch (err) {
      const e = classifyError(err)
      setRerunError(`${e.title} — ${e.detail}`)
      onNotify?.(`${e.title} — ${e.detail}`, 'error')
    } finally {
      setRerunLoading(false)
    }
  }

  function handleDeleteScene(sceneNumber: number) {
    if (!project) return
    const updated = { ...project, scenes: project.scenes.filter(s => s.scene_number !== sceneNumber) }
    projectRef.current = updated
    setProject(updated)
    onProjectChange(updated)
    setPremiumSelectedKeys(prev => new Set([...prev].filter(key => !key.startsWith(`s${sceneNumber}_f`))))
    if (activeScene?.scene_number === sceneNumber) {
      const nextScene = updated.scenes[0] ?? null
      setActiveScene(nextScene)
      const nextFrame = nextScene?.frames[0]
      setInspectedFrameKey(nextScene && nextFrame ? `s${nextScene.scene_number}_f${nextFrame.frame_number}` : null)
    }
  }

  function handleSelectScene(scene: StoryboardScene) {
    setActiveScene(scene)
    const firstFrame = scene.frames[0]
    setInspectedFrameKey(firstFrame ? `s${scene.scene_number}_f${firstFrame.frame_number}` : null)
  }

  function handleReorderScenes(scenes: StoryboardScene[]) {
    if (!project) return
    updateProjectState(current => ({ ...current, scenes }))
  }

  function handleProjectLoaded(p: StoryboardProject) {
    projectRef.current = p
    setProject(p)
    onProjectChange(p, true)
    setActiveScene(p.scenes[0] ?? null)
    const firstScene = p.scenes[0]
    const firstFrame = firstScene?.frames[0]
    setInspectedFrameKey(firstScene && firstFrame ? `s${firstScene.scene_number}_f${firstFrame.frame_number}` : null)
    setSelectedKeys(new Map())
    setPremiumSelectedKeys(new Set())
    setViewMode('storyboard')
    setShowForm(false)
  }

  function handleFrameUpdate(sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) {
    const current = projectRef.current
    if (!current) return
    const scenes = patchShotWithContinuityReview(current.scenes, sceneNumber, frameNumber, patch)
    updateProjectState(project => ({ ...project, scenes }))
    setActiveScene(prev => !prev || prev.scene_number !== sceneNumber
      ? prev
      : scenes.find(scene => scene.scene_number === sceneNumber) ?? prev)
  }

  /** Replace a single frame's image and mark it as an artist override.
   *  Marked frames are skipped by re-run so the artwork is never overwritten. */
  function handleReplaceFrameImage(sceneNumber: number, frameNumber: number, dataUrl: string) {
    handleFrameUpdate(sceneNumber, frameNumber, { generated_image_url: dataUrl, is_manual_override: true })
  }

  /** Patch a frame's visual action fields after regeneration.
   *  Only the returned fields are overwritten — image and overrides are untouched. */
  function handleVisualActionUpdate(sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) {
    handleFrameUpdate(sceneNumber, frameNumber, patch)
  }

  /** Patch a single frame's image after a style upgrade or background variation. */
  function handleUpgradeFrame(sceneNumber: number, frameNumber: number, newUrl: string) {
    handleFrameUpdate(sceneNumber, frameNumber, { generated_image_url: newUrl })
  }

  /** Upgrade every frame in every scene to a new render style. */
  async function handleUpgradeProject(targetStyle: string) {
    if (!project || projectUpgrading) return
    setProjectUpgrading(true)
    onNotify?.(`Upgrading entire project to ${targetStyle}…`, 'info')
    let total = 0, succeeded = 0
    for (const scene of project.scenes) {
      try {
        const result = await upgradeSceneStyle(scene.frames, scene, targetStyle, null)
        for (const r of result.frames) {
          if (r.generated_image_url) {
            handleUpgradeFrame(scene.scene_number, r.frame_number, r.generated_image_url)
            succeeded++
          }
        }
        total += result.total
      } catch (err) {
        const e = classifyError(err)
        onNotify?.(`${e.title} — ${e.detail}`, 'error')
      }
    }
    setProjectUpgrading(false)
    onNotify?.(`Upgrade complete — ${succeeded}/${total} frames upgraded`, 'success')
  }

  function handleToggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Map(prev)
      next.set(key, !prev.get(key))
      return next
    })
  }

  function handleToggleFrameLock(frameNumber: number, fieldKey: string, locked: boolean) {
    if (!displayScene) return
    const frame = displayScene.frames.find(item => item.frame_number === frameNumber)
    if (!frame) return
    const existing = frame.locked_fields ?? []
    const lockedFields = locked
      ? [...new Set([...existing, fieldKey])]
      : existing.filter(field => field !== fieldKey)
    handleFrameUpdate(displayScene.scene_number, frameNumber, { locked_fields: lockedFields })
  }

  const displayScene = activeScene ?? project?.scenes[0] ?? null
  const inspectedFrame = displayScene?.frames.find(frame => `s${displayScene.scene_number}_f${frame.frame_number}` === inspectedFrameKey)
    ?? displayScene?.frames[0]
    ?? null
  const renderStyleLabel = project ? (RENDER_STYLE_LABELS[project.render_style] ?? project.render_style) : ''
  const lockedCount = [...selectedKeys.values()].filter(Boolean).length
  const premiumSelectedCount = project
    ? project.scenes.reduce((count, scene) => count + scene.frames.filter(frame => premiumSelectedKeys.has(`s${scene.scene_number}_f${frame.frame_number}`) && Boolean(frame.generated_image_url)).length, 0)
    : 0
  const premiumAvailableCount = project
    ? project.scenes.reduce((count, scene) => count + scene.frames.filter(frame => Boolean(frame.generated_image_url)).length, 0)
    : 0
  const premiumSelectedEstimate = formatPremiumRenderOutputEstimate(premiumSelectedCount)
  // Frames the artist has manually overridden — protected from re-run
  const overrideCount = project
    ? project.scenes.reduce((sum, s) => sum + s.frames.filter(f => f.is_manual_override).length, 0)
    : 0

  function handleTogglePremiumSelect(key: string) {
    setPremiumSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleSelectPremiumScene(scene: StoryboardScene) {
    setPremiumSelectedKeys(prev => {
      const next = new Set(prev)
      for (const frame of scene.frames) {
        if (frame.generated_image_url) next.add(`s${scene.scene_number}_f${frame.frame_number}`)
      }
      return next
    })
  }

  function handleSelectAllPremiumFrames() {
    if (!project || premiumRenderProgress) return
    const allRenderedKeys = project.scenes.flatMap(scene => scene.frames.flatMap(frame =>
      frame.generated_image_url ? [`s${scene.scene_number}_f${frame.frame_number}`] : []
    ))
    setPremiumSelectedKeys(new Set(allRenderedKeys))
  }

  function handleClearPremiumSelection() {
    setPremiumSelectedKeys(new Set())
  }

  async function handleRenderSelectedPremium() {
    const current = projectRef.current
    if (!current || premiumRenderProgress) return

    const selectedFrames = current.scenes.flatMap(scene => scene.frames.flatMap(frame => {
      const key = `s${scene.scene_number}_f${frame.frame_number}`
      if (!premiumSelectedKeys.has(key) || !frame.generated_image_url) return []
      return [{ key, scene, frame, referenceImage: frame.generated_image_url }]
    }))
    if (selectedFrames.length === 0) return

    const total = selectedFrames.length
    const succeededKeys: string[] = []
    let completed = 0
    let firstError: string | null = null
    setPremiumRenderProgress({ completed, total })

    try {
      for (const item of selectedFrames) {
        try {
          const result = await renderFrameImage(
            item.frame,
            item.scene,
            current.render_style,
            'premium',
            item.referenceImage,
          )
          handleUpgradeFrame(item.scene.scene_number, item.frame.frame_number, result.generated_image_url)
          succeededKeys.push(item.key)
        } catch (error) {
          firstError ??= error instanceof Error ? error.message : 'Unknown render error'
        }
        completed += 1
        setPremiumRenderProgress({ completed, total })
      }

      if (succeededKeys.length > 0) {
        const succeeded = new Set(succeededKeys)
        setPremiumSelectedKeys(prev => new Set([...prev].filter(key => !succeeded.has(key))))
      }
      const failed = total - succeededKeys.length
      if (failed > 0) {
        onNotify?.(`Premium batch finished: ${succeededKeys.length}/${total} updated; ${failed} failed and remain selected to retry. ${firstError ?? ''}`.trim(), succeededKeys.length > 0 ? 'info' : 'error')
      } else {
        onNotify?.(`Premium batch complete — ${succeededKeys.length} frame${succeededKeys.length === 1 ? '' : 's'} updated.`, 'success')
      }
    } finally {
      setPremiumRenderProgress(null)
    }
  }

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
        {VIEW_MODES.map((m) => (
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
          {project && (
            <>
              {premiumSelectedCount > 0 && (
                <span role="status" aria-live="polite" style={{ color: 'var(--gold)', fontSize: 8, whiteSpace: 'nowrap' }}>
                  {premiumSelectedCount} selected · Approx. {premiumSelectedEstimate} USD
                </span>
              )}
              <button
                type="button"
                title="Select every rendered frame across all scenes for the premium batch"
                disabled={premiumAvailableCount === 0 || premiumSelectedCount === premiumAvailableCount || premiumRenderProgress !== null}
                onClick={handleSelectAllPremiumFrames}
                className="btn-tactile"
                style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--gold)', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.28)', borderRadius: 4, padding: '5px 8px', cursor: premiumAvailableCount === 0 || premiumSelectedCount === premiumAvailableCount || premiumRenderProgress ? 'default' : 'pointer', opacity: premiumAvailableCount === 0 || premiumSelectedCount === premiumAvailableCount || premiumRenderProgress ? 0.45 : 0.9, whiteSpace: 'nowrap' }}
              >Select all</button>
              <button
                type="button"
                title="Clear the premium selection across all scenes"
                disabled={premiumSelectedCount === 0 || premiumRenderProgress !== null}
                onClick={handleClearPremiumSelection}
                className="btn-tactile"
                style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 8px', cursor: premiumSelectedCount === 0 || premiumRenderProgress ? 'default' : 'pointer', opacity: premiumSelectedCount === 0 || premiumRenderProgress ? 0.45 : 0.85, whiteSpace: 'nowrap' }}
              >Clear selection</button>
            </>
          )}
          {project && <BatchExportBar project={project} scenes={project.scenes} selectedKeys={selectedKeys} onNotify={onNotify} />}
          {project && (
            <UpgradeStyleMenu
              currentStyle={project.render_style}
              onSelect={handleUpgradeProject}
              loading={projectUpgrading}
              label="Upgrade Project ▾"
            />
          )}
          {project && (
            <button
              onClick={() => setRerunOpen(o => !o)}
              className="text-[10px] tracking-widest uppercase border px-3 py-1.5 rounded transition-all"
              style={{
                color: rerunOpen ? 'var(--gold)' : 'var(--text-base)',
                borderColor: rerunOpen ? 'var(--gold)' : 'var(--border)',
                opacity: rerunOpen ? 1 : 0.5,
              }}
            >
              ↺ Re-run
            </button>
          )}
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
            ? <VaultGrid scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} onReplaceImage={handleReplaceFrameImage} />
            : <LockedCutFolder scenes={project.scenes} selectedKeys={selectedKeys} onToggleSelect={handleToggleSelect} onReplaceImage={handleReplaceFrameImage} />
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
        /* Main storyboard layout */
        <div className="flex-1 flex gap-0 min-h-0 overflow-hidden relative">

          {/* Re-run overlay */}
          {rerunOpen && (
            <div className="absolute inset-0 z-20 flex items-start justify-end pointer-events-none">
              <div
                className="pointer-events-auto anim-slide-up"
                style={{
                  width: 320, margin: '8px 8px 0 0',
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(201,168,76,0.4)',
                  borderRadius: 8,
                  boxShadow: '0 0 32px var(--gold-dim)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>↺ Re-run Pipeline</span>
                  <button onClick={() => setRerunOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, opacity: 0.5 }}>✕</button>
                </div>

                {rerunLoading ? (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <ConstellationLoader message="Re-running pipeline…" />
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {rerunError && (
                      <div style={{ borderRadius: 4, background: 'rgba(180,30,30,0.1)', border: '1px solid rgba(180,30,30,0.4)', padding: '8px 12px', fontSize: 11, color: '#e06060' }}>
                        {rerunError}
                      </div>
                    )}

                    {/* Aesthetic */}
                    <div>
                      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
                        Global Aesthetic
                      </label>
                      <input
                        placeholder={project?.global_aesthetic ?? 'e.g. Cinematic High-Contrast'}
                        value={rerunAesthetic}
                        onChange={e => setRerunAesthetic(e.target.value)}
                        style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '7px 10px', fontSize: 11, color: 'var(--text-base)', outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </div>

                    {/* Render style */}
                    <div>
                      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
                        Render Style
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {RENDER_OPTIONS.map(o => (
                          <button key={o.value} type="button" onClick={() => setRerunStyle(o.value)}
                            style={{
                              flex: 1, padding: '6px 4px', fontSize: 9, letterSpacing: '0.1em',
                              textTransform: 'uppercase', borderRadius: 4, cursor: 'pointer',
                              background: rerunStyle === o.value ? 'var(--gold)' : 'transparent',
                              color: rerunStyle === o.value ? 'var(--bg-base)' : 'var(--text-muted)',
                              border: `1px solid ${rerunStyle === o.value ? 'var(--gold)' : 'var(--border)'}`,
                              transition: 'all 150ms ease',
                            }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.55, lineHeight: 1.5 }}>
                      Re-uses the existing script text and character notes with your new settings. Saves as a new project.
                    </p>

                    {/* Override status */}
                    {overrideCount > 0 ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        borderRadius: 4, padding: '7px 10px',
                        background: 'rgba(74,222,128,0.06)',
                        border: '1px solid rgba(74,222,128,0.25)',
                      }}>
                        <span style={{ fontSize: 10, color: '#4ade80' }}>◈</span>
                        <span style={{ fontSize: 9, color: '#4ade80', opacity: 0.8, lineHeight: 1.5 }}>
                          {overrideCount} artist frame{overrideCount !== 1 ? 's' : ''} locked — will be preserved
                        </span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        borderRadius: 4, padding: '7px 10px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border)',
                      }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.45, lineHeight: 1.5 }}>
                          No artist overrides — all frames will be regenerated
                        </span>
                      </div>
                    )}

                    <button
                      onClick={handleRerun}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 4, cursor: 'pointer',
                        border: '1px solid var(--gold)', background: 'var(--gold)',
                        color: 'var(--bg-base)', fontSize: 10, letterSpacing: '0.2em',
                        textTransform: 'uppercase', fontWeight: 700, transition: 'background 150ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' }}
                    >
                      ↺ Execute Re-run →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Scene Index */}
          <aside style={{ width: 160, minWidth: 160, flexShrink: 0 }} className="border-r border-[var(--border)] overflow-y-auto flex flex-col">
            <SceneIndex
              project={project}
              activeSceneNumber={displayScene?.scene_number ?? 0}
              onSelectScene={handleSelectScene}
              onDeleteScene={handleDeleteScene}
              onReorderScenes={handleReorderScenes}
            />
          </aside>

          {/* Storyboard Canvas — grows to fill remaining space */}
          <main className="flex-1 overflow-hidden flex flex-col border-r border-[var(--border)]">
            {displayScene && (
              <StoryboardCanvas
                  scene={displayScene}
                  allScenes={project?.scenes ?? []}
                  renderStyleLabel={renderStyleLabel}
                  projectRenderStyle={project?.render_style}
                  projectCanon={project?.canon ?? null}
                  selectedKeys={selectedKeys}
                  onToggleSelect={handleToggleSelect}
                  inspectorFrameKey={inspectedFrameKey}
                  onSelectFrame={setInspectedFrameKey}
                  premiumSelectedKeys={premiumSelectedKeys}
                  onTogglePremiumSelect={handleTogglePremiumSelect}
                  premiumSelectedCount={premiumSelectedCount}
                  premiumSelectedEstimate={premiumSelectedEstimate}
                  premiumRenderProgress={premiumRenderProgress}
                  onSelectPremiumScene={handleSelectPremiumScene}
                  onClearPremiumSelection={handleClearPremiumSelection}
                  onRenderSelectedPremium={handleRenderSelectedPremium}
                  onOpenPlayer={() => setViewMode('player')}
                  onReplaceImage={handleReplaceFrameImage}
                  onVisualActionUpdate={handleVisualActionUpdate}
                  onFrameUpdate={handleFrameUpdate}
                  onUpgradeFrame={handleUpgradeFrame}
                />
            )}
          </main>

          {/* Inspector — collapsible right panel */}
          <aside
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: inspectorOpen ? 260 : 28,
              minWidth: inspectorOpen ? 260 : 28,
              maxWidth: inspectorOpen ? 260 : 28,
              transition: 'width 220ms cubic-bezier(0.22,1,0.36,1), min-width 220ms cubic-bezier(0.22,1,0.36,1), max-width 220ms cubic-bezier(0.22,1,0.36,1)',
              borderLeft: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Toggle button — always visible, vertically centred */}
            <button
              onClick={() => setInspectorOpen(o => !o)}
              title={inspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
              style={{
                position: 'absolute',
                top: '50%',
                left: inspectorOpen ? 0 : 0,
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: 28,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderLeft: 'none',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
                color: 'var(--gold)',
                fontSize: 9,
                opacity: 0.6,
                transition: 'opacity 150ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
            >
              {inspectorOpen ? '›' : '‹'}
            </button>

            {/* Collapsed label */}
            {!inspectorOpen && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  fontSize: 8,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  opacity: 0.35,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  marginTop: 32,
                }}
              >
                Inspector
              </span>
            )}

            {/* Inspector content — hidden when collapsed */}
            {inspectorOpen && (
              <div style={{ flex: 1, overflowY: 'auto', paddingLeft: 28 }}>
                <StudioInspector
                  scene={displayScene}
                  frame={inspectedFrame}
                  onFrameUpdate={handleFrameUpdate}
                  onToggleLock={handleToggleFrameLock}
                  onReferenceChange={setReferenceImage}
                  canon={project?.canon ?? null}
                  referenceImage={referenceImage}
                  renderStyle={project?.render_style}
                  allScenes={project?.scenes}
                  onBackgroundVariation={(sceneNumber, frameNumber, newUrl) => {
                    handleUpgradeFrame(sceneNumber, frameNumber, newUrl)
                    onNotify?.('Background variation applied ✓', 'success')
                  }}
                />
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
