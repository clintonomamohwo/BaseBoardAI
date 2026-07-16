/**
 * BMS-7: Global Update Engine UI
 *
 * Shown before any regeneration that affects multiple assets.
 * Presents a dependency-aware impact summary and lets the creator
 * choose to update all, update selectively, or skip.
 *
 * Usage:
 *   <GlobalUpdatePanel
 *     title="Updating Character…"
 *     impacts={[
 *       { label: 'Storyboards', count: 26, type: 'storyboard' },
 *       { label: 'Character Sheets', count: 8, type: 'character' },
 *       { label: 'Posters', count: 3, type: 'poster' },
 *     ]}
 *     onUpdateAll={...}
 *     onSkip={...}
 *   />
 */

interface ImpactItem {
  label: string
  count: number
  type: 'storyboard' | 'character' | 'poster' | 'cover' | 'promo' | 'environment'
}

interface Props {
  title: string
  impacts: ImpactItem[]
  onUpdateAll: () => void
  onSkip: () => void
  loading?: boolean
}

const TYPE_ICON: Record<ImpactItem['type'], string> = {
  storyboard:  '🎬',
  character:   '👤',
  poster:      '🎭',
  cover:       '📖',
  promo:       '✦',
  environment: '🌍',
}

export default function GlobalUpdatePanel({ title, impacts, onUpdateAll, onSkip, loading = false }: Props) {
  const totalAffected = impacts.reduce((s, i) => s + i.count, 0)

  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 0 32px var(--gold-dim)',
        width: '100%',
        maxWidth: 360,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          border: '1px solid var(--gold)',
          background: 'var(--bg-raised)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: 'var(--gold)' }}>⟳</span>
        </div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.8 }}>
            {title}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.55, letterSpacing: '0.1em', marginTop: 2 }}>
            Affected Assets
          </p>
        </div>
      </div>

      {/* Impact list */}
      <div style={{ padding: '12px 18px' }}>
        <div className="bms-import-row" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {impacts.map((item, idx) => (
            <div
              key={item.label}
              className="bms-import-row"
              style={{ animationDelay: `${idx * 60}ms`, display: 'flex', alignItems: 'center', gap: 10 }}
            >
              {/* Check mark */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: '1.5px solid rgba(201,168,76,0.6)',
                background: 'rgba(201,168,76,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                  <path d="M1 3.5 L3 5.5 L7 1.5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 10, color: 'var(--gold)', opacity: 0.55, marginRight: 4 }}>
                {TYPE_ICON[item.type]}
              </span>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--text-base)', opacity: 0.85 }}>
                {item.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontFamily: 'Georgia,serif', letterSpacing: '0.05em' }}>
                {item.count}
              </span>
            </div>
          ))}
        </div>

        {/* Divider + total */}
        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0', opacity: 0.6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5 }}>
            Total Affected
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)', fontFamily: 'Georgia,serif' }}>
            {totalAffected}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onUpdateAll}
            disabled={loading}
            className="btn-tactile bms-brass"
            style={{
              width: '100%', padding: '10px 0', borderRadius: 4, cursor: loading ? 'wait' : 'pointer',
              border: '1px solid var(--gold)',
              background: loading ? 'var(--gold-dim)' : 'var(--gold)',
              color: 'var(--bg-base)', fontSize: 10, letterSpacing: '0.2em',
              textTransform: 'uppercase', fontWeight: 700,
              transition: 'background 150ms ease',
              opacity: loading ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg-base)' } }}
          >
            {loading ? 'Updating…' : `Update All ${totalAffected > 0 ? `(${totalAffected})` : ''} →`}
          </button>
          <button
            onClick={onSkip}
            disabled={loading}
            className="btn-tactile"
            style={{
              width: '100%', padding: '8px 0', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.2em',
              textTransform: 'uppercase',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
