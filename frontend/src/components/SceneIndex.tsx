import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { StoryboardProject, StoryboardScene } from '../types/storyboard'

interface Props {
  project: StoryboardProject
  activeSceneNumber: number
  onSelectScene: (scene: StoryboardScene) => void
  onDeleteScene?: (sceneNumber: number) => void
  onReorderScenes?: (scenes: StoryboardScene[]) => void
}

async function downloadSceneZip(scene: StoryboardScene, projectTitle: string) {
  const zip = new JSZip()
  const folder = zip.folder(`scene_${String(scene.scene_number).padStart(2, '0')}`)!
  let hasImages = false
  for (const frame of scene.frames) {
    if (!frame.generated_image_url) continue
    const base64 = frame.generated_image_url.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    folder.file(`frame_${String(frame.frame_number).padStart(2, '0')}.png`, bytes)
    hasImages = true
  }
  // Always include scene metadata
  folder.file('scene.json', JSON.stringify(scene, null, 2))
  if (!hasImages && scene.frames.length === 0) return
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${projectTitle}_scene_${scene.scene_number}.zip`)
}

export default function SceneIndex({ project, activeSceneNumber, onSelectScene, onDeleteScene, onReorderScenes }: Props) {
  const [expandedScene, setExpandedScene] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [dragOverIdx, setDragOverIdx]     = useState<number | null>(null)
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null)

  const filtered = project.scenes.filter(s =>
    s.location_heading.toLowerCase().includes(search.toLowerCase()) ||
    String(s.scene_number).includes(search)
  )

  function handleDragStart(idx: number) {
    setDragSrcIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDrop(idx: number) {
    const src = dragSrcIdx
    if (src === null || src === idx) { setDragOverIdx(null); return }
    const reordered = [...project.scenes]
    const [moved] = reordered.splice(src, 1)
    reordered.splice(idx, 0, moved)
    onReorderScenes?.(reordered)
    setDragSrcIdx(null)
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    setDragSrcIdx(null)
    setDragOverIdx(null)
  }

  function handleRowClick(scene: StoryboardScene) {
    onSelectScene(scene)
    setExpandedScene(prev => prev === scene.scene_number ? null : scene.scene_number)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          Scene Index
        </p>
        <input
          placeholder="Search scenes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '5px 8px', fontSize: 10, color: 'var(--text-base)', outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      <div className="flex-1 overflow-y-auto py-1 scene-stagger">
        {filtered.map((scene, sceneIdx) => {
          const active   = scene.scene_number === activeSceneNumber
          const expanded = expandedScene === scene.scene_number
          const isConfirming = confirmDelete === scene.scene_number

          return (
            <div
              key={scene.scene_number}
              draggable={!search}
              onDragStart={() => handleDragStart(sceneIdx)}
              onDragOver={e => handleDragOver(e, sceneIdx)}
              onDrop={() => handleDrop(sceneIdx)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: dragSrcIdx === sceneIdx ? 0.4 : 1,
                borderTop: dragOverIdx === sceneIdx ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'border-color 100ms ease, opacity 150ms ease',
              }}
            >
              {/* Scene row */}
              <button
                className="w-full text-left px-3 py-2.5 transition-all btn-tactile"
                onClick={() => handleRowClick(scene)}
                style={{
                  borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                  background: active ? 'var(--gold-dim)' : 'transparent',
                  cursor: search ? 'pointer' : 'grab',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--gold)', opacity: active ? 1 : 0.4 }}>
                      SCENE {String(scene.scene_number).padStart(2, '0')}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.4, transition: 'transform 150ms ease', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-base)', opacity: 0.7, lineHeight: 1.3, marginTop: 2 }} className="truncate">
                  {scene.location_heading}
                </p>
                <p style={{ fontSize: 9, marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? 'var(--gold)' : 'var(--text-muted)', opacity: active ? 0.6 : 0.4 }}>
                  {scene.time_of_day} · {scene.frames.length} frame{scene.frames.length !== 1 ? 's' : ''}
                </p>
              </button>

              {/* Expanded panel */}
              {expanded && (
                <div style={{ background: 'var(--bg-base)', borderLeft: '2px solid var(--gold)', marginBottom: 2 }}>

                  {/* Scene metadata */}
                  <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                      {scene.color_palette.map((c, i) => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: c }} />
                      ))}
                    </div>
                    {[
                      { label: 'Tone',   value: scene.emotional_tone },
                      { label: 'Type',   value: scene.environmental_type },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span style={{ fontSize: 8, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6 }}>{label}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-base)', opacity: 0.7 }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Frame list */}
                  {scene.frames.length > 0 && (
                    <div style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      {scene.frames.map(frame => (
                        <div key={frame.frame_number}
                          style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {frame.generated_image_url ? (
                            <img src={frame.generated_image_url} alt=""
                              style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 2, border: '1px solid var(--border)', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 28, height: 18, background: 'var(--bg-surface)', borderRadius: 2, border: '1px solid var(--border)', flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 8, letterSpacing: '0.1em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase' }}>
                              F{frame.frame_number} · {frame.shot_type}
                            </p>
                            <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {frame.action_breakdown}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {isConfirming ? (
                    <div style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 8, color: 'var(--text-muted)', flex: 1, opacity: 0.7 }}>Delete scene?</span>
                      <button className="btn-tactile"
                        onClick={() => { onDeleteScene?.(scene.scene_number); setConfirmDelete(null); setExpandedScene(null) }}
                        style={{ fontSize: 8, padding: '3px 8px', borderRadius: 3, border: '1px solid rgba(180,30,30,0.6)', background: 'rgba(180,30,30,0.15)', color: '#e06060', cursor: 'pointer', letterSpacing: '0.1em' }}>
                        Delete
                      </button>
                      <button className="btn-tactile"
                        onClick={() => setConfirmDelete(null)}
                        style={{ fontSize: 8, padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                      <button className="btn-tactile"
                        onClick={() => downloadSceneZip(scene, project.project_title)}
                        style={{ flex: 1, fontSize: 8, padding: '4px 0', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                        ↓ Download
                      </button>
                      {onDeleteScene && (
                        <button className="btn-tactile"
                          onClick={() => setConfirmDelete(scene.scene_number)}
                          style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,30,30,0.5)'; e.currentTarget.style.color = '#e06060' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px' }}>
        <button className="btn-tactile"
          style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
          + New Scene
        </button>
      </div>
    </div>
  )
}
