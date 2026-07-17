/**
 * UpgradeStyleMenu — Render Upgrade dropdown
 *
 * Shows all style presets grouped by tier.
 * Appears as a floating panel anchored to a trigger button.
 *
 * Usage:
 *   <UpgradeStyleMenu
 *     currentStyle="bw_sketch"
 *     onSelect={(styleKey) => handleUpgrade(styleKey)}
 *     loading={upgrading}
 *   />
 */

import { useState, useRef, useEffect } from 'react'
import { STYLE_PRESETS, TIER_ORDER, TIER_LABELS, type StylePreset } from '../types/renderUpgrade'

interface Props {
  /** Currently active style key — shown with a ✓ */
  currentStyle?: string
  onSelect: (styleKey: string) => void
  loading?: boolean
  /** Label for the trigger button. Default: "Upgrade Style" */
  label?: string
  /** If true, renders as a compact icon button */
  compact?: boolean
}

const TIER_COLORS: Record<string, string> = {
  storyboard: 'var(--text-muted)',
  color:      '#60a5fa',
  concept:    '#a78bfa',
  cinematic:  'var(--gold)',
}

export default function UpgradeStyleMenu({
  currentStyle, onSelect, loading = false, label = 'Upgrade Style ▾', compact = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(preset: StylePreset) {
    if (preset.key === currentStyle) return
    setOpen(false)
    onSelect(preset.key)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={() => !loading && setOpen(o => !o)}
        disabled={loading}
        title="Upgrade render style"
        style={{
          padding: compact ? '3px 7px' : '5px 10px',
          borderRadius: 4,
          border: '1px solid rgba(201,168,76,0.4)',
          background: open ? 'rgba(201,168,76,0.12)' : 'transparent',
          color: 'var(--gold)',
          fontSize: compact ? 9 : 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.5 : 1,
          transition: 'background 120ms',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!loading && !open) e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        {loading ? '⏳ Upgrading…' : (compact ? '⇧' : label)}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 9999,
            width: 280,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '8px 12px 6px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase' }}>
              Render Upgrade
            </span>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.4 }}>
              Composition preserved
            </span>
          </div>

          {/* Tier groups */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {TIER_ORDER.map(tier => {
              const presets = STYLE_PRESETS.filter(p => p.tier === tier)
              const tierColor = TIER_COLORS[tier] ?? 'var(--text-muted)'
              return (
                <div key={tier}>
                  {/* Tier header */}
                  <div style={{
                    padding: '6px 12px 3px',
                    fontSize: 8,
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: tierColor,
                    opacity: 0.6,
                    fontWeight: 600,
                  }}>
                    {TIER_LABELS[tier]}
                  </div>

                  {/* Preset rows */}
                  {presets.map(preset => {
                    const isActive = preset.key === currentStyle
                    return (
                      <button
                        key={preset.key}
                        onClick={() => handleSelect(preset)}
                        disabled={isActive}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '6px 12px',
                          background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                          border: 'none',
                          borderLeft: isActive ? `2px solid var(--gold)` : '2px solid transparent',
                          cursor: isActive ? 'default' : 'pointer',
                          textAlign: 'left',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-raised)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{preset.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 500, color: isActive ? 'var(--gold)' : 'var(--text-base)' }}>
                              {preset.label}
                            </span>
                            {isActive && (
                              <span style={{ fontSize: 8, color: 'var(--gold)', opacity: 0.7 }}>✓ current</span>
                            )}
                          </div>
                          <span style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.5, lineHeight: 1.4 }}>
                            {preset.description}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '6px 12px',
            borderTop: '1px solid var(--border)',
            fontSize: 8,
            color: 'var(--text-muted)',
            opacity: 0.35,
            lineHeight: 1.6,
          }}>
            Current image used as composition anchor. Pose, camera &amp; layout preserved.
          </div>
        </div>
      )}
    </div>
  )
}
