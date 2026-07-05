interface Props {
  message: string
  type?: 'success' | 'info'
}

export default function GraniteNotification({ message, type = 'success' }: Props) {
  return (
    <div className="anim-notif-enter pointer-events-auto" style={{
      background: 'var(--bg-surface)',
      border: `1px solid var(--gold)`,
      borderRadius: 4,
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 200,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 12px var(--gold-dim)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 8, letterSpacing: '0.25em', color: 'var(--gold)', opacity: 0.6, textTransform: 'uppercase' }}>
          Granite AI
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-base)', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: type === 'success' ? 'var(--gold)' : 'var(--cyan)' }}>
            {type === 'success' ? '✓' : '◈'}
          </span>
          {message}
        </span>
      </div>
    </div>
  )
}
