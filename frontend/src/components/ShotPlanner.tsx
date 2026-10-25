/**
 * ShotPlanner
 *
 * Lets users think in seconds + fps — calculates total frames automatically,
 * derives standard animation keyframe positions, visualises them on a timeline,
 * and exports the shot spec to JSON (Maya / Blender compatible).
 */
import { useState } from 'react'
import { saveAs } from 'file-saver'
import type { StoryboardScene } from '../types/storyboard'
import { generateImage } from '../api/storyboard'

const FPS_OPTIONS = [
  { value: 24, label: '24 fps', sub: 'Film standard' },
  { value: 30, label: '30 fps', sub: 'TV / Content' },
  { value: 60, label: '60 fps', sub: 'Advanced' },
]

interface Keyframe {
  number: number
  label: string
  description: string
  pct: number   // 0–1 position on timeline
}

function deriveKeyframes(totalFrames: number): Keyframe[] {
  if (totalFrames < 2) return []
  const kfs: Keyframe[] = [
    { number: 1,            label: 'Start',          description: 'Initial pose — character or object at rest position',     pct: 0 },
    { number: Math.round(totalFrames * 0.25), label: 'Anticipation',   description: 'Wind-up or preparation before the main action',          pct: 0.25 },
    { number: Math.round(totalFrames * 0.5),  label: 'Main Action',    description: 'Peak of the primary movement — highest energy point',     pct: 0.5 },
    { number: Math.round(totalFrames * 0.75), label: 'Follow-through', description: 'Secondary motion settling after the main action',          pct: 0.75 },
    { number: totalFrames,  label: 'End Pose',        description: 'Final resting position — character or object fully settled', pct: 1 },
  ]
  // Deduplicate if total frames is very small
  const seen = new Set<number>()
  return kfs.filter(k => {
    if (seen.has(k.number)) return false
    seen.add(k.number)
    return true
  })
}

function buildExportJson(
  shotName: string,
  scene: StoryboardScene | null,
  fps: number,
  durationSec: number,
  totalFrames: number,
  keyframes: Keyframe[],
) {
  return {
    shot: shotName || 'SHOT_01',
    scene: scene ? { number: scene.scene_number, heading: scene.location_heading } : null,
    timing: { fps, duration_seconds: durationSec, total_frames: totalFrames },
    keyframes: keyframes.map(k => ({
      frame:       k.number,
      label:       k.label,
      description: k.description,
      timecode:    `${String(Math.floor((k.number / fps) / 60)).padStart(2,'0')}:${String(Math.floor((k.number / fps) % 60)).padStart(2,'0')}:${String(Math.round(((k.number / fps) % 1) * fps)).padStart(2,'0')}`,
    })),
    export_notes: [
      'Import this JSON via your studio\'s script/plugin.',
      'Maya: use keyframe numbers directly as frame values.',
      'Blender: set scene FPS to match, then use frame values.',
    ],
  }
}

interface Props {
  scene: StoryboardScene | null
  renderStyle?: string
}

export default function ShotPlanner({ scene, renderStyle = 'bw_sketch' }: Props) {
  const [fps,         setFps]         = useState(24)
  const [duration,    setDuration]    = useState(5)
  const [shotName,    setShotName]    = useState('')
  const [hoveredKf,   setHoveredKf]   = useState<number | null>(null)
  const [kfImages,    setKfImages]    = useState<Record<number, string | null>>({})
  const [generating,  setGenerating]  = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)

  async function handleGenerateImages() {
    setGenerating(true)
    setGenProgress(0)
    setGenerationError(null)
    setKfImages({})
    const sceneContext = scene
      ? `${scene.location_heading}, ${scene.emotional_tone}, ${scene.time_of_day}`
      : 'cinematic scene'
    const newImages: Record<number, string | null> = {}
    let failedCount = 0
    let firstFailure = ''
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i]
      const prompt = `${kf.label} keyframe pose. ${sceneContext}. ${kf.description}. Frame ${kf.number} of ${totalFrames}.`
      let url: string | null = null
      try {
        url = await generateImage(prompt, renderStyle)
        if (!url) firstFailure ||= 'The image provider returned no image.'
      } catch (error) {
        firstFailure ||= error instanceof Error ? error.message : 'The image request failed.'
      }
      if (!url) failedCount += 1
      newImages[kf.number] = url
      setKfImages({ ...newImages })
      setGenProgress(((i + 1) / keyframes.length) * 100)
    }
    if (failedCount > 0) {
      setGenerationError(`${failedCount} of ${keyframes.length} keyframe images failed. ${firstFailure}`)
    }
    setGenerating(false)
  }

  const totalFrames = Math.round(fps * duration)
  const keyframes   = deriveKeyframes(totalFrames)

  function handleExport() {
    const data = buildExportJson(shotName, scene, fps, duration, totalFrames, keyframes)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    saveAs(blob, `${(shotName || 'shot').replace(/\s+/g, '_').toLowerCase()}_keyframes.json`)
  }

  const inputS: React.CSSProperties = {
    background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '6px 10px', fontSize: 11,
    color: 'var(--text-base)', outline: 'none', width: '100%',
    transition: 'border-color 150ms ease',
  }

  return (
    <div>
      {/* Shot name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
          Shot Name
        </label>
        <input
          style={inputS}
          placeholder="e.g. SHOT_05"
          value={shotName}
          onChange={e => setShotName(e.target.value)}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* FPS selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
          Frame Rate
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {FPS_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setFps(opt.value)}
              style={{
                flex: 1, padding: '6px 4px', borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${fps === opt.value ? 'var(--gold)' : 'var(--border)'}`,
                background: fps === opt.value ? 'var(--gold-dim)' : 'transparent',
                color: fps === opt.value ? 'var(--gold)' : 'var(--text-muted)',
                transition: 'all 150ms ease', textAlign: 'center',
              }}>
              <div style={{ fontSize: 10, fontWeight: fps === opt.value ? 700 : 400, letterSpacing: '0.1em' }}>{opt.label}</div>
              <div style={{ fontSize: 7, opacity: 0.6, marginTop: 1 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration slider */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <label style={{ fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase' }}>
            Duration
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" min={1} max={120} value={duration}
              onChange={e => setDuration(Math.max(1, Math.min(120, +e.target.value)))}
              style={{ ...inputS, width: 52, textAlign: 'center', padding: '4px 8px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6 }}>sec</span>
          </div>
        </div>
        <input
          type="range" min={1} max={60} value={duration}
          onChange={e => setDuration(+e.target.value)}
          className="w-full accent-[var(--gold)]"
          style={{ accentColor: 'var(--gold)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.4 }}>1s</span>
          <span style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.4 }}>60s</span>
        </div>
      </div>

      {/* Calculated total — the key readout */}
      <div style={{
        background: 'var(--bg-base)', border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 6, padding: '10px 14px', marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 3 }}>
            Total Frames
          </div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--gold)', fontFamily: 'Georgia,serif', lineHeight: 1 }}>
            {totalFrames.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 3 }}>
            Calculation
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.7 }}>
            {duration}s × {fps} fps
          </div>
          <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'monospace', opacity: 0.8, marginTop: 2 }}>
            = {totalFrames} frames
          </div>
        </div>
      </div>

      {/* Keyframe timeline */}
      {keyframes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Keyframe Layout
          </label>

          {/* Timeline track */}
          <div style={{ position: 'relative', height: 32, marginBottom: 8 }}>
            {/* Track */}
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
              background: 'var(--border)', borderRadius: 1, transform: 'translateY(-50%)',
            }} />
            {/* Filled progress */}
            <div style={{
              position: 'absolute', top: '50%', left: 0, height: 2,
              background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
              width: '100%', borderRadius: 1, transform: 'translateY(-50%)',
              opacity: 0.4,
            }} />
            {/* Keyframe dots */}
            {keyframes.map(kf => (
              <div
                key={kf.number}
                onMouseEnter={() => setHoveredKf(kf.number)}
                onMouseLeave={() => setHoveredKf(null)}
                style={{
                  position: 'absolute', top: '50%',
                  left: `${kf.pct * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: hoveredKf === kf.number ? 12 : 8,
                  height: hoveredKf === kf.number ? 12 : 8,
                  borderRadius: '50%',
                  background: kf.pct === 0 || kf.pct === 1 ? 'var(--gold)' : 'var(--bg-base)',
                  border: '2px solid var(--gold)',
                  boxShadow: hoveredKf === kf.number ? '0 0 8px var(--gold)' : 'none',
                  transition: 'all 150ms ease',
                  cursor: 'default', zIndex: 1,
                }}
              />
            ))}
          </div>

          {/* Keyframe list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {keyframes.map(kf => (
              <div
                key={kf.number}
                onMouseEnter={() => setHoveredKf(kf.number)}
                onMouseLeave={() => setHoveredKf(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '5px 8px', borderRadius: 4,
                  background: hoveredKf === kf.number ? 'var(--gold-dim)' : 'transparent',
                  border: `1px solid ${hoveredKf === kf.number ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
                  transition: 'background 150ms ease, border-color 150ms ease',
                  cursor: 'default',
                }}
              >
                {/* Frame number badge */}
                <div style={{
                  minWidth: 36, textAlign: 'center', padding: '2px 0',
                  borderRadius: 3, border: '1px solid rgba(201,168,76,0.3)',
                  background: 'var(--bg-base)',
                }}>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--gold)', opacity: 0.9 }}>
                    {kf.number}
                  </span>
                </div>
                {/* Label + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {kf.label}
                  </span>
                  {hoveredKf === kf.number && (
                    <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.7, marginTop: 1, lineHeight: 1.4 }}>
                      {kf.description}
                    </p>
                  )}
                </div>
                {/* Timecode */}
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}>
                  {(kf.number / fps).toFixed(2)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated keyframe images */}
      {Object.keys(kfImages).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Generated Keyframes
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {keyframes.map(kf => {
              const img = kfImages[kf.number]
              const pending = !(kf.number in kfImages)
              return (
                <div key={kf.number} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 72, height: 48, borderRadius: 4, overflow: 'hidden',
                    border: `1px solid ${img ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                    background: 'var(--bg-base)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {img
                      ? <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={kf.label} />
                      : pending
                        ? <span style={{ fontSize: 7, color: 'var(--gold)', opacity: 0.3 }}>…</span>
                        : <span style={{ fontSize: 7, color: '#e06060', opacity: 0.6 }}>✕</span>
                    }
                  </div>
                  <span style={{ fontSize: 7, color: 'var(--text-muted)', opacity: 0.5, marginTop: 2, display: 'block' }}>
                    {kf.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Export actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>

        {/* Generate images button / progress */}
        {generating ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase' }}>
                Generating {Math.round(genProgress)}%
              </span>
            </div>
            <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--gold)', borderRadius: 1, width: `${genProgress}%`, transition: 'width 300ms ease' }} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerateImages}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 4, cursor: 'pointer',
              border: '1px solid rgba(201,168,76,0.5)', background: 'transparent',
              color: 'var(--gold)', fontSize: 10, letterSpacing: '0.2em',
              textTransform: 'uppercase', fontWeight: 600,
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-dim)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }}
          >
            ✦ Generate Keyframe Images
          </button>
        )}

        {generationError && (
          <p role="alert" style={{ fontSize: 9, color: '#e06060', lineHeight: 1.5 }}>
            {generationError}
          </p>
        )}

        <button
          type="button"
          onClick={handleExport}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 4, cursor: 'pointer',
            border: '1px solid var(--gold)', background: 'var(--gold-dim)',
            color: 'var(--gold)', fontSize: 10, letterSpacing: '0.2em',
            textTransform: 'uppercase', fontWeight: 600,
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold-dim)'; e.currentTarget.style.color = 'var(--gold)' }}
        >
          ↓ Export Keyframes JSON
        </button>
        <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.5, textAlign: 'center', letterSpacing: '0.1em' }}>
          Compatible with Maya · Blender · After Effects
        </p>
      </div>
    </div>
  )
}
