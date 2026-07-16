/**
 * VisualQAPanel — Character Identity QA Score Display
 *
 * Displays the QA Engine result for the most recently generated image.
 * Shows an overall confidence score (0–100%) and per-category breakdown:
 * Identity, Species, Anatomy, Composition, Lighting, Props, Continuity.
 *
 * Also provides a "Run QA Check" button that re-runs the heuristic QA Engine
 * against the current prompt + identity without regenerating the image.
 *
 * Usage:
 *   <VisualQAPanel
 *     qaResult={pkg.qaResult}
 *     onRunQA={() => handleRunQA()}
 *     loading={pkg.loading.qa}
 *   />
 */

import type { QAScoreResult } from '../types/storyboard'

interface Props {
  qaResult: QAScoreResult | null
  onRunQA: () => void
  loading?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  identity:    'Identity',
  species:     'Species',
  anatomy:     'Anatomy',
  composition: 'Composition',
  lighting:    'Lighting',
  props:       'Props',
  continuity:  'Continuity',
}

const CATEGORY_ORDER = ['identity', 'species', 'anatomy', 'composition', 'lighting', 'props', 'continuity']

function scoreColor(score: number): string {
  if (score >= 0.90) return '#4ade80'   // green
  if (score >= 0.75) return 'var(--gold)'
  return '#f87171'                       // red
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100)
  const color = scoreColor(score)

  return (
    <div style={{ marginBottom: 8 }}>
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

export default function VisualQAPanel({ qaResult, onRunQA, loading = false }: Props) {
  const hasResult = qaResult !== null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6 }}>
          Visual QA Engine
        </p>
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
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.3, marginTop: 4 }}>
            Generate an image first, then run QA Check to validate identity, species, and composition.
          </p>
        </div>
      )}

      {hasResult && (
        <>
          {/* Overall score ring */}
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
            {/* Score circle */}
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
              <span style={{ fontSize: 7, color: scoreColor(qaResult.overall), opacity: 0.7, letterSpacing: '0.05em' }}>%</span>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: qaResult.passed ? '#4ade80' : '#f87171' }}>
                {qaResult.passed ? 'QA Passed' : 'QA Failed'}
              </p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6, marginTop: 2, lineHeight: 1.5 }}>
                {qaResult.passed
                  ? 'Character identity, species, and composition validated.'
                  : 'One or more layers need attention before generating more assets.'}
              </p>
            </div>
          </div>

          {/* Per-category bars */}
          <div style={{ marginBottom: 12 }}>
            {CATEGORY_ORDER.map(key => (
              <ScoreBar
                key={key}
                label={CATEGORY_LABELS[key] ?? key}
                score={qaResult.breakdown[key as keyof typeof qaResult.breakdown] ?? 0}
              />
            ))}
          </div>

          {/* Warning banner */}
          {qaResult.warning && (
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

          {/* Passed note */}
          {qaResult.passed && !qaResult.warning && (
            <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.4, lineHeight: 1.6, marginTop: 4 }}>
              All identity, species, and composition checks passed. Safe to continue generating.
            </p>
          )}
        </>
      )}
    </div>
  )
}
