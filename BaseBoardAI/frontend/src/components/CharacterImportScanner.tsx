/**
 * BMS-8: Character Import Scanner
 *
 * Replaces a plain upload spinner with a step-by-step analysis workflow.
 * Each step appears sequentially as it "detects" a category (portrait,
 * expressions, poses, outfits, props, metadata). Steps animate in one-by-one
 * using the .bms-import-row CSS class.
 *
 * The final step "Creating Character Package…" triggers onComplete().
 *
 * Usage:
 *   <CharacterImportScanner
 *     characterName="Emma"
 *     onComplete={(result) => ...}
 *     onCancel={...}
 *   />
 */

import { useEffect, useState } from 'react'

interface ScanStep {
  id: string
  label: string
  duration: number  // ms before this step becomes "done"
}

const SCAN_STEPS: ScanStep[] = [
  { id: 'portrait',     label: 'Portrait',            duration: 420 },
  { id: 'expressions',  label: 'Expressions',          duration: 680 },
  { id: 'poses',        label: 'Poses',                duration: 900 },
  { id: 'outfits',      label: 'Outfits',              duration: 1100 },
  { id: 'props',        label: 'Props',                duration: 1280 },
  { id: 'relationships',label: 'Relationships',        duration: 1460 },
  { id: 'package',      label: 'Creating Character Package…', duration: 1800 },
]

type StepState = 'pending' | 'scanning' | 'done'

interface Props {
  characterName: string
  /** Called when all scan steps are done — pass the created package data */
  onComplete: () => void
  onCancel?: () => void
}

export default function CharacterImportScanner({ characterName, onComplete, onCancel }: Props) {
  const [stepStates, setStepStates] = useState<Record<string, StepState>>(
    Object.fromEntries(SCAN_STEPS.map(s => [s.id, 'pending']))
  )
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    SCAN_STEPS.forEach((step, idx) => {
      // scanning: start when prev step starts + short overlap
      const scanAt = idx === 0 ? 0 : SCAN_STEPS[idx - 1].duration - 80
      // done: at step.duration
      const doneAt = step.duration

      timers.push(
        setTimeout(() => setStepStates(p => ({ ...p, [step.id]: 'scanning' })), scanAt),
        setTimeout(() => setStepStates(p => ({ ...p, [step.id]: 'done' })), doneAt),
      )
    })

    const finalStep = SCAN_STEPS[SCAN_STEPS.length - 1]
    timers.push(setTimeout(() => {
      setDone(true)
      onComplete()
    }, finalStep.duration + 300))

    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 0 24px var(--gold-dim)',
        width: '100%',
        maxWidth: 340,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.35em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 }}>
          Analysing Character
        </p>
        <p style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.04em' }}>
          {characterName}
        </p>
      </div>

      {/* Steps */}
      <div style={{ padding: '12px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SCAN_STEPS.map((step, idx) => {
          const state = stepStates[step.id]
          const isDone = state === 'done'
          const isScanning = state === 'scanning'
          const isFinal = idx === SCAN_STEPS.length - 1

          return (
            <div
              key={step.id}
              className="bms-import-row"
              style={{
                animationDelay: `${idx * 80}ms`,
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: state === 'pending' ? 0.3 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              {/* Status indicator */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: isDone ? 'none' : `1.5px solid ${isScanning ? 'var(--gold)' : 'var(--border)'}`,
                background: isDone ? 'var(--gold)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isDone ? '0 0 6px var(--gold-dim)' : isScanning ? '0 0 4px var(--gold-dim)' : 'none',
                transition: 'background 200ms ease, box-shadow 200ms ease',
              }}>
                {isDone && (
                  <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                    <path d="M1 3.5 L3 5.5 L7 1.5" stroke="var(--bg-base)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isScanning && !isDone && (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', animation: 'pulse-gold 0.9s ease-in-out infinite' }} />
                )}
              </div>

              {/* Label */}
              <span style={{
                flex: 1,
                fontSize: isFinal ? 11 : 11,
                fontWeight: isFinal ? 600 : 400,
                color: isDone
                  ? (isFinal ? 'var(--gold)' : 'var(--text-base)')
                  : isScanning ? 'var(--gold)' : 'var(--text-muted)',
                letterSpacing: isFinal ? '0.04em' : undefined,
                transition: 'color 200ms ease',
              }}>
                {step.label}
              </span>

              {/* Done tick label */}
              {isDone && !isFinal && (
                <span style={{ fontSize: 9, color: 'var(--gold)', opacity: 0.6, letterSpacing: '0.1em' }}>✓</span>
              )}
            </div>
          )
        })}

        {/* Cancel button — only before done */}
        {!done && onCancel && (
          <button
            onClick={onCancel}
            style={{
              marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-muted)', opacity: 0.4,
              textTransform: 'uppercase', textAlign: 'left', padding: 0,
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
