interface Props {
  isDark: boolean
  onToggle: () => void
}

export default function ThemeToggle({ isDark, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-14 h-7 rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)] theme-toggle-track"
      style={{ background: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(138,106,30,0.12)', border: '1px solid var(--border)' }}
    >
      {/* Track background icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none select-none text-[12px]">
        <span style={{ opacity: isDark ? 0.3 : 0.9 }}>☀️</span>
        <span style={{ opacity: isDark ? 0.9 : 0.3 }}>🌙</span>
      </span>
      {/* Sliding thumb */}
      <span
        className="theme-icon absolute top-0.5 w-6 h-6 rounded-full shadow-md flex items-center justify-center text-[12px]"
        style={{
          transform: isDark ? 'translateX(30px)' : 'translateX(2px)',
          background: 'var(--bg-raised)',
          border: '1px solid var(--gold)',
          boxShadow: `0 0 8px var(--gold-dim)`,
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
