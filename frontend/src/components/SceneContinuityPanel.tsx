/**
 * SceneContinuityPanel — Context-Aware Continuity QA
 *
 * Displays a full SceneContinuityReport:
 *   - Scene-level pass/fail badge + overall score
 *   - Continuity groups detected (intentional location/time transitions)
 *   - Per-frame pass/fail rows with expandable issue details
 *   - Issue severity: critical (red), warning (gold), suggestion (blue)
 *
 * Usage:
 *   <SceneContinuityPanel
 *     scene={scene}
 *     report={report}
 *     onRunQA={() => handleRunQA(scene)}
 *     loading={loading}
 *   />
 */

import { useState } from 'react'
import type { SceneContinuityReport, ContinuityGroup, FrameQAResult, FrameQAIssue } from '../types/storyboard'

interface Props {
  sceneNumber: number
  locationHeading: string
  report: SceneContinuityReport | null
  onRunQA: () => void
  loading?: boolean
}

const SEVERITY_COLOR: Record<string, string> = {
  critical:   '#f87171',
  warning:    'var(--gold)',
  suggestion: '#60a5fa',
}

const CATEGORY_LABEL: Record<string, string> = {
  location:        'Location',
  time_of_day:     'Time of Day',
  lighting:        'Lighting',
  characters:      'Characters',
  weather:         'Weather',
  shot_type:       'Shot Type',
  mood:            'Mood',
  prompt_alignment:'Prompt Alignment',
}

function scoreColor(score: number): string {
  if (score >= 0.90) return '#4ade80'
  if (score >= 0.75) return 'var(--gold)'
  return '#f87171'
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = scoreColor(score)
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'Georgia,serif', lineHeight: 1 }}>{pct}</span>
      <span style={{ fontSize: 7, color, opacity: 0.7 }}>%</span>
    </div>
  )
}

function GroupChip({ group }: { group: ContinuityGroup }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '4px 10px', marginRight: 6, marginBottom: 6,
    }}>
      <span style={{ fontSize: 8, color: 'var(--gold)', opacity: 0.7, letterSpacing: '0.06em' }}>
        Frames {group.frame_numbers[0]}–{group.frame_numbers[group.frame_numbers.length - 1]}
      </span>
      <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.55, letterSpacing: '0.04em' }}>
        {group.location_heading} · {group.time_of_day}
      </span>
    </div>
  )
}

function IssueRow({ issue }: { issue: FrameQAIssue }) {
  const color = SEVERITY_COLOR[issue.severity] ?? 'var(--text-muted)'
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      padding: '5px 8px', borderRadius: 4,
      background: `${color}08`, border: `1px solid ${color}25`,
      marginBottom: 4,
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: color, marginTop: 4,
        boxShadow: `0 0 3px ${color}`,
      }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 9, color: 'var(--text-base)', lineHeight: 1.5 }}>
          <span style={{ color, fontWeight: 600 }}>{CATEGORY_LABEL[issue.category] ?? issue.category}: </span>
          {issue.message}
        </p>
        {(issue.expected || issue.detected) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
            {issue.expected && (
              <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.55 }}>
                Expected: <span style={{ color: '#4ade80' }}>{issue.expected}</span>
              </span>
            )}
            {issue.detected && (
              <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.55 }}>
                Detected: <span style={{ color: '#f87171' }}>{issue.detected}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FrameRow({ result }: { result: FrameQAResult }) {
  const [expanded, setExpanded] = useState(false)
  const color = scoreColor(result.overall)
  const hasIssues = result.issues.length > 0

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => hasIssues && setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          background: result.passed ? 'transparent' : `${SEVERITY_COLOR.warning}06`,
          border: `1px solid ${result.passed ? 'var(--border)' : `${color}30`}`,
          borderRadius: 5, padding: '6px 10px', cursor: hasIssues ? 'pointer' : 'default',
          textAlign: 'left', transition: 'background 120ms',
        }}
        onMouseEnter={e => { if (hasIssues) e.currentTarget.style.background = `${color}0c` }}
        onMouseLeave={e => { e.currentTarget.style.background = result.passed ? 'transparent' : `${SEVERITY_COLOR.warning}06` }}
      >
        {/* Pass/fail dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: result.passed ? '#4ade80' : '#f87171',
          boxShadow: `0 0 4px ${result.passed ? '#4ade80' : '#f87171'}`,
        }} />

        {/* Frame label */}
        <span style={{ fontSize: 10, color: 'var(--text-base)', fontWeight: 500, minWidth: 60 }}>
          Frame {result.frame_number}
        </span>

        {/* Score */}
        <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'Georgia,serif', marginLeft: 'auto', marginRight: 6 }}>
          {Math.round(result.overall * 100)}%
        </span>

        {/* Issue count badge */}
        {hasIssues && (
          <span style={{
            fontSize: 8, color, background: `${color}18`,
            border: `1px solid ${color}40`, borderRadius: 3,
            padding: '1px 6px', letterSpacing: '0.04em',
          }}>
            {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} {expanded ? '▲' : '▼'}
          </span>
        )}
        {!hasIssues && (
          <span style={{ fontSize: 8, color: '#4ade80', opacity: 0.7 }}>✓ Pass</span>
        )}
      </button>

      {/* Expanded issues */}
      {expanded && hasIssues && (
        <div style={{ padding: '6px 10px 2px 24px' }}>
          {result.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SceneContinuityPanel({
  sceneNumber, locationHeading, report, onRunQA, loading = false,
}: Props) {
  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.6, marginBottom: 3 }}>
            Continuity QA — Scene {sceneNumber}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.45, lineHeight: 1.5 }}>
            {locationHeading}
          </p>
        </div>
        <button
          onClick={onRunQA}
          disabled={loading}
          style={{
            padding: '4px 10px', borderRadius: 3,
            border: '1px solid var(--gold)', background: 'transparent',
            color: 'var(--gold)', fontSize: 9, cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.1em', opacity: loading ? 0.5 : 1,
            transition: 'background 120ms', flexShrink: 0,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(201,168,76,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {loading ? 'Checking…' : 'Run QA'}
        </button>
      </div>

      {/* Empty state */}
      {!report && !loading && (
        <div style={{
          padding: '18px 12px', textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 6,
          background: 'var(--bg-raised)',
        }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.4 }}>
            No QA run yet.
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.28, marginTop: 4, lineHeight: 1.6 }}>
            Run QA to validate every frame against the storyboard plan — location,
            time of day, characters, lighting, and shot type.
          </p>
        </div>
      )}

      {report && (
        <>
          {/* Scene-level score + summary */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '10px 14px', borderRadius: 6, marginBottom: 14,
            border: `1px solid ${report.frames_failed === 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            background: report.frames_failed === 0 ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)',
          }}>
            <ScoreRing score={report.overall} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: report.frames_failed === 0 ? '#4ade80' : '#f87171' }}>
                {report.frames_failed === 0 ? 'All Frames Pass' : `${report.frames_failed} Frame${report.frames_failed !== 1 ? 's' : ''} Failed`}
              </p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6, marginTop: 2, lineHeight: 1.5 }}>
                {report.summary}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: '#4ade80' }}>✓ {report.frames_passed} passed</span>
              {report.frames_failed > 0 && (
                <span style={{ fontSize: 9, color: '#f87171' }}>✕ {report.frames_failed} failed</span>
              )}
            </div>
          </div>

          {/* Continuity groups */}
          {report.continuity_groups.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.45, marginBottom: 7 }}>
                {report.continuity_groups.length} Continuity Groups Detected
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {report.continuity_groups.map(g => (
                  <GroupChip key={g.group_id} group={g} />
                ))}
              </div>
              <p style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.35, marginTop: 4, lineHeight: 1.5 }}>
                Transitions between groups are intentional — only drift within a group is flagged.
              </p>
            </div>
          )}

          {/* Per-frame results */}
          <div>
            <p style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.45, marginBottom: 8 }}>
              Frame Results
            </p>
            {report.frame_results.map(r => (
              <FrameRow key={r.frame_number} result={r} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
