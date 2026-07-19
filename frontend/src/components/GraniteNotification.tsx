interface Props {
  message: string
  detail?: string
  type?: 'success' | 'info' | 'error'
  onDismiss?: () => void
}

const TYPE_STYLES = {
  success: {
    border: 'var(--gold)',
    icon: '✓',
    iconColor: 'var(--gold)',
    label: 'Granite AI',
    labelColor: 'var(--gold)',
    glow: 'var(--gold-dim)',
  },
  info: {
    border: 'var(--cyan)',
    icon: '◈',
    iconColor: 'var(--cyan)',
    label: 'Granite AI',
    labelColor: 'var(--cyan)',
    glow: 'rgba(0,212,255,0.08)',
  },
  error: {
    border: 'rgba(220,60,60,0.7)',
    icon: '✕',
    iconColor: '#e06060',
    label: 'Error',
    labelColor: '#e06060',
    glow: 'rgba(220,60,60,0.08)',
  },
}

export default function GraniteNotification({ message, detail, type = 'success', onDismiss }: Props) {
  const s = TYPE_STYLES[type]

  return (
    <div className="anim-notif-enter pointer-events-auto" style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${s.border}`,
      borderRadius: 4,
      padding: '9px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      minWidth: 220,
      maxWidth: 340,
      boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${s.glow}`,
    }}>
      {/* Icon */}
      <span style={{ fontSize: 13, color: s.iconColor, flexShrink: 0, lineHeight: 1.6, fontWeight: 700 }}>
        {s.icon}
      </span>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 8, letterSpacing: '0.25em', color: s.labelColor, opacity: 0.65, textTransform: 'uppercase' }}>
          {s.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-base)', opacity: 0.9, lineHeight: 1.5 }}>
          {message}
        </span>
        {detail && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6, lineHeight: 1.5, marginTop: 2 }}>
            {detail}
          </span>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', opacity: 0.35, fontSize: 13,
            lineHeight: 1, padding: 0, flexShrink: 0, marginTop: 1,
            transition: 'opacity 100ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
          aria-label="Dismiss"
        >✕</button>
      )}
    </div>
  )
}
