/**
 * ActionTimeline
 *
 * Renders a per-scene beat sheet derived from accumulated frame durations.
 * Every frame contributes its duration_seconds to produce a running timestamp,
 * so directors can see exactly when each action occurs in screen time.
 *
 * Example output:
 *   0.0   Emma enters the abandoned station       [Wide]
 *   3.5   Emma pauses — distant footsteps echo    [Medium]
 *   5.5   Emma slowly turns toward the sound      [OTS]
 *   7.0   Kai emerges from the shadows             [Wide Reveal]
 *   9.5   Emma and Kai silently lock eyes          [Close-up]
 */

import type { StoryboardScene } from '../types/storyboard'

interface Props {
  scene: StoryboardScene
}

export default function ActionTimeline({ scene }: Props) {
  const { beats, totalDuration } = scene.frames.reduce<{
    beats: { frame: StoryboardScene['frames'][number]; ts: number }[]
    totalDuration: number
  }>((acc, frame) => ({
    beats: [...acc.beats, { frame, ts: acc.totalDuration }],
    totalDuration: acc.totalDuration + frame.duration_seconds,
  }), { beats: [], totalDuration: 0 })

  if (beats.length === 0) return null

  return (
    <div style={{ padding: '12px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 8, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.6 }}>
          Action Timeline
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-muted)', opacity: 0.5 }}>
          {totalDuration.toFixed(1)}s total
        </span>
      </div>

      {/* Timeline track */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        {/* Background bar */}
        <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, position: 'relative' }}>
          {/* Progress segments coloured by mood or shot type */}
          {beats.map(({ frame, ts }) => (
            <div
              key={frame.frame_number}
              title={`Frame ${frame.frame_number} — ${frame.shot_type}`}
              style={{
                position: 'absolute',
                left: `${(ts / totalDuration) * 100}%`,
                width: `${(frame.duration_seconds / totalDuration) * 100}%`,
                height: '100%',
                background: 'var(--gold)',
                opacity: 0.25 + (frame.frame_number / scene.frames.length) * 0.45,
                borderRight: '1px solid var(--bg-base)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Beat rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {beats.map(({ frame, ts }) => {
          const label = frame.visual_action || frame.action_breakdown
          const truncated = label.length > 72 ? label.slice(0, 70) + '…' : label

          return (
            <div
              key={frame.frame_number}
              className="bms-import-row"
              style={{
                animationDelay: `${frame.frame_number * 30}ms`,
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '5px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {/* Timestamp */}
              <span style={{
                fontFamily: 'monospace', fontSize: 9,
                color: 'var(--gold)', opacity: 0.7,
                minWidth: 32, flexShrink: 0,
              }}>
                {ts.toFixed(1)}
              </span>

              {/* Action description */}
              <span style={{ flex: 1, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4, opacity: 0.8 }}>
                {truncated}
              </span>

              {/* Shot type badge */}
              <span style={{
                fontSize: 7, letterSpacing: '0.1em', color: 'var(--text-muted)',
                opacity: 0.45, textTransform: 'uppercase', flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
                {frame.shot_type.replace(' Shot', '').replace(' Wide', '').replace('Establishing ', '')}
              </span>

              {/* Dialogue indicator */}
              {frame.dialogue && (
                <span title={frame.dialogue} style={{ fontSize: 8, color: 'var(--gold)', opacity: 0.6, flexShrink: 0 }}>
                  💬
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
