/**
 * ContinuityImpactModal
 *
 * Shown when a canonical asset (character details, location image) changes.
 * Displays exactly which frames are affected and asks the user whether to
 * regenerate them now or skip.
 *
 * Props
 *   impact         — ContinuityImpactResult returned by scanContinuityImpact
 *   isRegenerating — true while the parent is calling reforgeAffectedFrames
 *   onConfirm      — user pressed "Update N frames"
 *   onSkip         — user pressed "Skip for now"
 */
import type { ContinuityImpactResult } from '../api/storyboard'

interface Props {
  impact: ContinuityImpactResult
  isRegenerating: boolean
  onConfirm: () => void
  onSkip: () => void
}

export default function ContinuityImpactModal({ impact, isRegenerating, onConfirm, onSkip }: Props) {
  const n = impact.total_affected
  const sceneNums = [...new Set(impact.affected_scene_numbers)].sort((a, b) => a - b)

  const fieldLabel = impact.changed_field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget && !isRegenerating) onSkip() }}
    >
      {/* Panel */}
      <div
        className="anim-slide-up"
        style={{
          width: 420, maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(201,168,76,0.45)',
          borderRadius: 10,
          boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 24px var(--gold-dim)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{
            fontSize: 9, letterSpacing: '0.35em', color: 'var(--gold)',
            textTransform: 'uppercase', fontWeight: 700,
          }}>
            Continuity Impact Detected
          </span>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* What changed */}
          <div style={{
            background: 'var(--bg-raised)', borderRadius: 6,
            border: '1px solid var(--border)', padding: '10px 14px',
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Change Summary
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Row label="Asset" value={impact.changed_asset_id} />
              <Row label="Field" value={fieldLabel} />
              <Row label="Was" value={impact.old_value || '(empty)'} dim />
              <Row label="Now" value={impact.new_value || '(empty)'} gold />
            </div>
          </div>

          {/* Impact numbers */}
          <div style={{
            background: n > 0 ? 'rgba(201,168,76,0.06)' : 'var(--bg-raised)',
            border: `1px solid ${n > 0 ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
            borderRadius: 6, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
              Affected Assets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <ImpactRow
                icon="🎬"
                label="Storyboard frames"
                count={impact.affected_frame_ids.length}
              />
              {impact.affected_scene_numbers.length > 0 && (
                <ImpactRow
                  icon="🎭"
                  label={`Scene${sceneNums.length > 1 ? 's' : ''} ${sceneNums.join(', ')}`}
                  count={sceneNums.length}
                />
              )}
              {impact.affected_character_ref_ids.length > 0 && (
                <ImpactRow
                  icon="👤"
                  label="Character references"
                  count={impact.affected_character_ref_ids.length}
                />
              )}
            </div>
          </div>

          {n === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6, textAlign: 'center' }}>
              No existing frames reference this asset — no regeneration needed.
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: '12px 20px 18px',
          display: 'flex', gap: 8,
          borderTop: '1px solid var(--border)',
        }}>
          {n > 0 ? (
            <>
              <button
                onClick={onConfirm}
                disabled={isRegenerating}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 4, cursor: isRegenerating ? 'not-allowed' : 'pointer',
                  border: '1px solid var(--gold)',
                  background: isRegenerating ? 'var(--gold-dim)' : 'var(--gold)',
                  color: 'var(--bg-base)', fontSize: 10, letterSpacing: '0.2em',
                  textTransform: 'uppercase', fontWeight: 700,
                  transition: 'background 150ms ease',
                  opacity: isRegenerating ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!isRegenerating) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' } }}
                onMouseLeave={e => { if (!isRegenerating) { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' } }}
              >
                {isRegenerating
                  ? `Updating ${n} frame${n !== 1 ? 's' : ''}…`
                  : `↺ Update ${n} frame${n !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={onSkip}
                disabled={isRegenerating}
                style={{
                  padding: '10px 18px', borderRadius: 4, cursor: isRegenerating ? 'not-allowed' : 'pointer',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.2em',
                  textTransform: 'uppercase', opacity: isRegenerating ? 0.3 : 0.7,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { if (!isRegenerating) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.opacity = '1' } }}
                onMouseLeave={e => { if (!isRegenerating) { e.currentTarget.style.opacity = '0.7' } }}
              >
                Skip
              </button>
            </>
          ) : (
            <button
              onClick={onSkip}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--gold)', background: 'var(--gold)',
                color: 'var(--bg-base)', fontSize: 10, letterSpacing: '0.2em',
                textTransform: 'uppercase', fontWeight: 700,
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, dim, gold }: { label: string; value: string; dim?: boolean; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.55, letterSpacing: '0.1em', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 500, textAlign: 'right',
        color: gold ? 'var(--gold)' : dim ? 'var(--text-muted)' : 'var(--text-base)',
        opacity: dim ? 0.5 : 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
      }}>
        {value}
      </span>
    </div>
  )
}

function ImpactRow({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: count > 0 ? 'var(--gold)' : 'var(--text-muted)',
        opacity: count > 0 ? 1 : 0.4,
      }}>
        {count}
      </span>
    </div>
  )
}
