import { useState } from 'react'
import type { StoryboardFrame, StoryboardScene } from '../types/storyboard'
import { resolveFrameContinuityInputs } from '../utils/shotContinuity'

interface Props {
  scene: StoryboardScene
  allScenes?: StoryboardScene[]
  frame: StoryboardFrame
  onFrameUpdate?: (sceneNumber: number, frameNumber: number, patch: Partial<StoryboardFrame>) => void
  onToggleLock?: (frameNumber: number, fieldKey: string, locked: boolean) => void
}

const INPUT_STYLE = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'var(--bg-surface)',
  color: 'var(--text-base)',
  fontSize: 9,
  lineHeight: 1.45,
  padding: '6px 7px',
  outline: 'none',
}

const LABEL_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
  color: 'var(--text-muted)',
  fontSize: 7,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
}

export default function SelectedFrameInspector({ scene, allScenes = [scene], frame, onFrameUpdate, onToggleLock }: Props) {
  const continuityInputs = resolveFrameContinuityInputs(allScenes, scene.scene_number, frame.frame_number)
  const [durationDraft, setDurationDraft] = useState({
    frameNumber: frame.frame_number,
    baseDuration: frame.duration_seconds,
    value: String(frame.duration_seconds),
  })
  const [durationError, setDurationError] = useState(false)
  const durationValue = durationDraft.frameNumber === frame.frame_number
    && durationDraft.baseDuration === frame.duration_seconds
    ? durationDraft.value
    : String(frame.duration_seconds)

  function updateText(key: string, value: string) {
    if (!onFrameUpdate) return
    const patch: Partial<StoryboardFrame> = key === 'visual_action'
      ? { visual_action: value, action_breakdown: value }
      : ({ [key]: value || null } as Partial<StoryboardFrame>)
    onFrameUpdate(scene.scene_number, frame.frame_number, patch)
  }

  function updateList(key: string, value: string) {
    if (!onFrameUpdate) return
    const items = value.split(',').map(item => item.trim()).filter(Boolean)
    const patch: Partial<StoryboardFrame> = key === 'props_present'
      ? { props_present: items }
      : key === 'characters_present'
        ? { characters_present: items }
        : key === 'continuity_dependency_ids'
          ? { continuity_dependency_ids: items }
          : { continuity_reference_ids: items }
    onFrameUpdate(scene.scene_number, frame.frame_number, patch)
  }

  function commitDuration() {
    const nextDuration = Number(durationValue)
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      setDurationDraft({
        frameNumber: frame.frame_number,
        baseDuration: frame.duration_seconds,
        value: String(frame.duration_seconds),
      })
      setDurationError(true)
      return
    }
    setDurationError(false)
    if (nextDuration !== frame.duration_seconds) {
      onFrameUpdate?.(scene.scene_number, frame.frame_number, { duration_seconds: nextDuration })
    }
  }

  function toggleFieldLock(fieldKey: string) {
    if (!onToggleLock) return
    onToggleLock(frame.frame_number, fieldKey, !(frame.locked_fields ?? []).includes(fieldKey))
  }

  const autoSelected = frame.auto_selected ?? {}
  const rationale = frame.director_rationale ?? {}
  const frameId = `S${String(scene.scene_number).padStart(2, '0')} · F${String(frame.frame_number).padStart(2, '0')}`

  function textField(label: string, key: string, value: string | null | undefined, multiline = false, lockable = false) {
    const locked = (frame.locked_fields ?? []).includes(key)
    const aiSelected = Boolean(autoSelected[key])
    const displayValue = value ?? ''
    return (
      <label key={key} style={LABEL_STYLE}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{label}</span>
          {aiSelected && <span style={{ color: 'var(--gold)', opacity: 0.8, letterSpacing: '0.04em' }}>AI</span>}
          {lockable && onToggleLock && (
            <button
              type="button"
              onClick={event => { event.preventDefault(); toggleFieldLock(key) }}
              aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
              title={locked ? 'Unlock — let the AI decide' : 'Lock — keep this choice'}
              style={{ marginLeft: 'auto', padding: '0 2px', border: 'none', background: 'none', color: locked ? '#4ade80' : 'var(--text-muted)', opacity: locked ? 0.9 : 0.45, cursor: 'pointer', fontSize: 10, lineHeight: 1 }}
            >{locked ? '●' : '○'}</button>
          )}
        </span>
        {multiline ? (
          <textarea
            value={displayValue}
            onChange={event => updateText(key, event.target.value)}
            rows={key === 'visual_action' || key === 'continuity_notes' || key === 'director_notes' ? 3 : 2}
            disabled={!onFrameUpdate}
            style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
          />
        ) : (
          <input
            type="text"
            value={displayValue}
            onChange={event => updateText(key, event.target.value)}
            disabled={!onFrameUpdate}
            style={INPUT_STYLE}
          />
        )}
        {rationale[key] && (
          <span style={{ color: 'var(--text-muted)', opacity: 0.58, fontSize: 8, letterSpacing: 'normal', textTransform: 'none', lineHeight: 1.45 }}>
            {rationale[key]}
          </span>
        )}
      </label>
    )
  }

  function listField(label: string, key: string, values: string[] | undefined) {
    return (
      <label key={key} style={LABEL_STYLE}>
        {label}
        <input
          type="text"
          value={(values ?? []).join(', ')}
          onChange={event => updateList(key, event.target.value)}
          disabled={!onFrameUpdate}
          placeholder="Separate items with commas"
          style={INPUT_STYLE}
        />
      </label>
    )
  }

  return (
    <section style={{ borderBottom: '1px solid var(--border)', padding: '14px 12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 8, letterSpacing: '0.22em', color: 'var(--gold)', opacity: 0.62, textTransform: 'uppercase' }}>Selected frame</p>
          <h2 style={{ margin: '4px 0 0', color: 'var(--text-base)', fontSize: 12, fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{frameId}</h2>
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 8, lineHeight: 1.4 }}>{scene.location_heading}</p>
        </div>
        <span style={{ flexShrink: 0, border: `1px solid ${frame.approval_status === 'approved' ? 'var(--approval-border)' : 'var(--border)'}`, borderRadius: 999, padding: '3px 7px', color: frame.approval_status === 'approved' ? 'var(--approval-color)' : 'var(--text-muted)', fontSize: 7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {frame.approval_status === 'approved' ? 'Approved' : 'Pending'}
        </span>
      </div>

      {frame.continuity_review_required && (
        <div role="status" style={{ marginBottom: 9, border: '1px solid rgba(251,191,36,0.25)', borderRadius: 4, background: 'rgba(251,191,36,0.06)', padding: '7px 8px', color: '#fbbf24', fontSize: 8, lineHeight: 1.45 }}>
          Continuity review needed before this frame is treated as approved.
        </div>
      )}

      {onFrameUpdate && (
        <button
          type="button"
          onClick={() => onFrameUpdate(scene.scene_number, frame.frame_number, { approval_status: frame.approval_status === 'approved' ? 'pending' : 'approved' })}
          style={{ width: '100%', border: `1px solid ${frame.approval_status === 'approved' ? 'var(--approval-button-border)' : 'rgba(201,168,76,0.32)'}`, borderRadius: 4, background: frame.approval_status === 'approved' ? 'var(--approval-soft-bg)' : 'rgba(201,168,76,0.05)', color: frame.approval_status === 'approved' ? 'var(--approval-color)' : 'var(--gold)', cursor: 'pointer', padding: '7px 8px', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}
        >
          {frame.approval_status === 'approved' ? 'Reopen approval' : 'Approve frame'}
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <details open style={{ border: '1px solid var(--border)', borderRadius: 5, background: 'rgba(255,255,255,0.012)' }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '8px 9px', color: 'var(--gold)', opacity: 0.72, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Shot, action &amp; lighting</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 9px 10px' }}>
            {textField('Shot type', 'shot_type', frame.shot_type, false, true)}
            {textField('Camera angle', 'camera_angle', frame.camera_angle, false, true)}
            {textField('Camera movement', 'camera_movement', frame.camera_movement, false, true)}
            <label style={LABEL_STYLE}>
              Duration (seconds)
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={durationValue}
                disabled={!onFrameUpdate}
                onChange={event => {
                  setDurationDraft({ frameNumber: frame.frame_number, baseDuration: frame.duration_seconds, value: event.target.value })
                  setDurationError(false)
                }}
                onBlur={commitDuration}
                style={INPUT_STYLE}
              />
              {durationError && <span role="alert" style={{ color: '#e06060', fontSize: 8, letterSpacing: 'normal', textTransform: 'none' }}>Enter a duration greater than zero.</span>}
            </label>
            {textField('Visual action', 'visual_action', frame.visual_action || frame.action_breakdown, true)}
            {textField('Lighting', 'lighting_notes', frame.lighting_notes, true, true)}
            {textField('Mood', 'mood', frame.mood, false, true)}
            {textField('Purpose', 'purpose', frame.purpose, true, true)}
          </div>
        </details>

        <details style={{ border: '1px solid var(--border)', borderRadius: 5, background: 'rgba(255,255,255,0.012)' }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '8px 9px', color: 'var(--gold)', opacity: 0.72, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Continuity, characters &amp; props</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 9px 10px' }}>
            {continuityInputs.length > 0 && (
              <div style={{ padding: '7px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, background: 'rgba(201,168,76,0.04)' }}>
                <p style={{ margin: '0 0 5px', color: 'var(--gold)', opacity: 0.72, fontSize: 7, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Continuity sources</p>
                {continuityInputs.map(source => (
                  <div key={source.frame_id} style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'flex-start' }}>
                    {source.available && source.image_url && <img src={source.image_url} alt={`${source.frame_id} approved ending frame`} style={{ width: 54, height: 31, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: source.available ? 'var(--approval-color)' : '#fbbf24', fontSize: 8 }}>{source.frame_id} · {source.available ? 'approved source' : source.review_required ? 'source needs review' : source.approval_status === 'approved' ? 'not available' : 'source not approved'}</p>
                      {source.available && <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 8, lineHeight: 1.45 }}>{source.action_pose || source.visual_action || 'No ending pose recorded'}{source.props_present.length ? ` · Props: ${source.props_present.join(', ')}` : ''}{source.screen_direction && source.screen_direction !== 'unspecified' ? ` · ${source.screen_direction.replaceAll('_', ' ')}` : ''}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {textField('End pose / action', 'action_pose', frame.action_pose, true)}
            {listField('Characters present', 'characters_present', frame.characters_present)}
            {listField('Props present', 'props_present', frame.props_present)}
            <label style={LABEL_STYLE}>
              Screen direction
              <select
                value={frame.screen_direction ?? 'unspecified'}
                disabled={!onFrameUpdate}
                onChange={event => onFrameUpdate?.(scene.scene_number, frame.frame_number, { screen_direction: event.target.value as StoryboardFrame['screen_direction'] })}
                style={INPUT_STYLE}
              >
                <option value="unspecified">Unspecified</option>
                <option value="left_to_right">Left to right</option>
                <option value="right_to_left">Right to left</option>
                <option value="toward_camera">Toward camera</option>
                <option value="away_from_camera">Away from camera</option>
                <option value="static">Static</option>
              </select>
            </label>
            {listField('Reference frame IDs', 'continuity_reference_ids', frame.continuity_reference_ids)}
            {listField('Depends on shot IDs', 'continuity_dependency_ids', frame.continuity_dependency_ids)}
            {textField('Continuity notes', 'continuity_notes', frame.continuity_notes, true)}
          </div>
        </details>

        <details style={{ border: '1px solid var(--border)', borderRadius: 5, background: 'rgba(255,255,255,0.012)' }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '8px 9px', color: 'var(--gold)', opacity: 0.72, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Notes &amp; sound</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 9px 10px' }}>
            {frame.narrative_action && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 8, lineHeight: 1.5 }}><span style={{ color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Script action · </span>{frame.narrative_action}</p>}
            {textField('Director notes', 'director_notes', frame.director_notes, true)}
            {textField('Dialogue', 'dialogue', frame.dialogue, true)}
            {textField('Sound cue', 'sound_cue', frame.sound_cue, false)}
            {textField('Emotion', 'frame_emotion', frame.frame_emotion, false)}
          </div>
        </details>
      </div>
    </section>
  )
}
