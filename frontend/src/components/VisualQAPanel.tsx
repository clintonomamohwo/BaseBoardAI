/**
 * VisualQAPanel — Project-Aware Visual QA Engine Display
 *
 * Displays the QA Engine result for the most recently generated image.
 *
 * Shows:
 *   - Overall score gauge (pass/fail at 80%)
 *   - 9 per-category score bars:
 *     Identity, Species, Anatomy, Composition, Camera, Lighting, Props,
 *     Environment, Continuity
 *   - Asset type indicator (character / creature / animal / robot / vehicle)
 *   - Targeted repair action buttons for every failing category
 *     e.g. "Regenerate Composition Only", "Regenerate Props Only"
 *     — never suggests full regeneration unless all categories fail
 *
 * Usage:
 *   <VisualQAPanel
 *     qaResult={pkg.qaResult}
 *     onRunQA={() => handleRunQA()}
 *     onRepair={(action) => handleRepair(action)}
 *     loading={pkg.loading.qa}
 *   />
 */

import type { QARepairAction, QAScoreResult } from '../types/storyboard'

interface Props {
  qaResult: QAScoreResult | null
  onRunQA: () => void
  /** Called when the user clicks a targeted repair button */
  onRepair?: (action: QARepairAction) => void
  loading?: boolean
}

// 9 categories in display order
const CATEGORY_ORDER = [
  'identity', 'species', 'anatomy',
  'composition', 'camera', 'lighting',
  'props', 'environment', 'continuity',
]

const CATEGORY_LABELS: Record<string, string> = {
  identity:    'Identity',
  species:     'Species',
  anatomy:     'Anatomy',
  composition: 'Composition',
  camera:      'Camera',
  lighting:    'Lighting',
  props:       'Props',
  environment: 'Environment',
  continuity:  'Continuity',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  character: 'Character',
  creature:  'Creature',
  animal:    'Animal',
  robot:     'Robot / Android',
  vehicle:   'Vehicle',
}

const SEVERITY_COLOR: Record<string, string> = {
  critical:   '#f87171',
  warning:    'var(--gold)',
  suggestion: '#60a5fa',
}

function scoreColor(score: number): string {
  if (score >= 0.90) return '#4ade80'
  if (score >= 0.75) return 'var(--gold)'
  return '#f87171'
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100)
  const color = scoreColor(score)
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.7, letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color, fontFamily: 'Georgia,serif' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 400ms ease',
          boxShadow: score >= 0.90 ? `0 0 4px ${color}` : 'none',
        }} />
      </div>
    </div>
  )
}

function RepairButton({
  action,
  onClick,
}: {
  action: QARepairAction
  onClick: () => void
}) {
  const color = SEVERITY_COLOR[action.severity] ?? 'var(--text-muted)'
  const pct = Math.round(action.score * 100)

  return (
    <button
      onClick={onClick}
      title={`${CATEGORY_LABELS[action.category] ?? action.category}: ${pct}% — ${action.endpoint}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '7px 10px',
        marginBottom: 5,
        borderRadius: 4,
        border: `1px solid ${color}40`,
        background: `${color}08`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${color}18`
        e.currentTarget.style.borderColor = `${color}80`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `${color}08`
        e.currentTarget.style.borderColor = `${color}40`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {/* Severity dot */}
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }} />
        <span style={{ fontSize: 10, color: 'var(--text-base)', fontWeight: 500 }}>
          {action.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8, color, opacity: 0.7, letterSpacing: '0.04em' }}>
          {CATEGORY_LABELS[action.category] ?? action.category} {pct}%
        </span>
        <span style={{ fontSize: 10, color, opacity: 0.6 }}>→</span>
      </div>
    </button>
  )
}

export default function VisualQAPanel({ qaResult, onRunQA, onRepair, loading = false }: Props) {
  const hasResult = qaResult !== null

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6 }}>
            Visual QA Engine
          </p>
          {hasResult && (
            <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.4, marginTop: 2 }}>
              {ASSET_TYPE_LABELS[qaResult.asset_type] ?? qaResult.asset_type} validator
            </p>
          )}
        </div>
        <button
          onClick={onRunQA}
          disabled={loading}
          style={{
            padding: '4px 10px',
            borderRadius: 3,
            border: '1px solid var(--gold)',
            background: 'transparent',
            color: 'var(--gold)',
            fontSize: 9,
            cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.1em',
            opacity: loading ? 0.5 : 1,
            transition: 'background 120ms ease',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(201,168,76,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {loading ? 'Checking…' : 'Run QA Check'}
        </button>
      </div>

      {/* Empty state */}
      {!hasResult && !loading && (
        <div style={{
          padding: '20px 12px',
          textAlign: 'center',
          border: '1px dashed var(--border)',
          borderRadius: 6,
          background: 'var(--bg-raised)',
        }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.45 }}>
            No QA check run yet.
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.3, marginTop: 4, lineHeight: 1.6 }}>
            Generate an image first, then run QA Check to validate structure,
            composition, camera, lighting, and continuity against the Project Canon.
          </p>
        </div>
      )}

      {hasResult && (
        <>
          {/* Overall score gauge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            border: `1px solid ${qaResult.passed ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            borderRadius: 6,
            background: qaResult.passed ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)',
            marginBottom: 14,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${scoreColor(qaResult.overall)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
              boxShadow: `0 0 10px ${scoreColor(qaResult.overall)}30`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(qaResult.overall), fontFamily: 'Georgia,serif', lineHeight: 1 }}>
                {Math.round(qaResult.overall * 100)}
              </span>
              <span style={{ fontSize: 7, color: scoreColor(qaResult.overall), opacity: 0.7 }}>%</span>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: qaResult.passed ? '#4ade80' : '#f87171' }}>
                {qaResult.passed ? 'QA Passed' : 'QA Failed'}
              </p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6, marginTop: 2, lineHeight: 1.5 }}>
                {qaResult.passed
                  ? `All 9 categories validated. ${ASSET_TYPE_LABELS[qaResult.asset_type] ?? qaResult.asset_type} structure confirmed.`
                  : `${qaResult.repairs.length} issue${qaResult.repairs.length !== 1 ? 's' : ''} found. Use targeted repairs below.`}
              </p>
            </div>
          </div>

          {/* 9-category score bars */}
          <div style={{ marginBottom: 14 }}>
            {CATEGORY_ORDER.map(key => (
              <ScoreBar
                key={key}
                label={CATEGORY_LABELS[key] ?? key}
                score={qaResult.breakdown[key] ?? 0}
              />
            ))}
          </div>

          {/* Targeted repair actions */}
          {qaResult.repairs.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <p style={{
                  fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', opacity: 0.5,
                }}>
                  Targeted Repairs
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Legend */}
                  {(['critical', 'warning', 'suggestion'] as const).map(sev => {
                    const hasAny = qaResult.repairs.some(r => r.severity === sev)
                    if (!hasAny) return null
                    return (
                      <span key={sev} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: SEVERITY_COLOR[sev] }} />
                        <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.5, textTransform: 'capitalize' }}>{sev}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              {qaResult.repairs.map((action, idx) => (
                <RepairButton
                  key={`${action.category}-${idx}`}
                  action={action}
                  onClick={() => onRepair?.(action)}
                />
              ))}

              <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, marginTop: 6, lineHeight: 1.6 }}>
                Each repair regenerates only the failing layer — nothing else changes.
              </p>
            </div>
          )}

          {/* Warning banner (legacy plain-text) */}
          {qaResult.warning && qaResult.repairs.length === 0 && (
            <div style={{
              padding: '8px 10px',
              borderRadius: 4,
              border: '1px solid rgba(248,113,113,0.35)',
              background: 'rgba(248,113,113,0.05)',
              marginBottom: 8,
            }}>
              <p style={{ fontSize: 9, color: '#f87171', lineHeight: 1.6 }}>
                ⚠ {qaResult.warning}
              </p>
            </div>
          )}

          {/* All passed */}
          {qaResult.passed && qaResult.repairs.length === 0 && (
            <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.4, lineHeight: 1.6, marginTop: 4 }}>
              All categories passed. Safe to continue generating.
            </p>
          )}
        </>
      )}
    </div>
  )
}
