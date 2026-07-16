interface Props {
  onStart: () => void
}

export default function EmptyBlueprintState({ onStart }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 mb-10 anim-studio-unfold">
      {/* Blueprint paper SVG */}
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
        {/* Grid lines */}
        {[15,30,45,60,75].map(y => (
          <line key={y} x1="10" y1={y} x2="110" y2={y}
            stroke="var(--gold)" strokeWidth="0.4" strokeOpacity="0.2"
            strokeDasharray="80"
            style={{ animation: `blueprint-reveal 800ms ease-out ${y * 10}ms forwards`, opacity: 0 }} />
        ))}
        {[25,50,75,100].map(x => (
          <line key={x} x1={x} y1="10" x2={x} y2="80"
            stroke="var(--gold)" strokeWidth="0.4" strokeOpacity="0.2"
            strokeDasharray="80"
            style={{ animation: `blueprint-reveal 800ms ease-out ${x * 6}ms forwards`, opacity: 0 }} />
        ))}
        {/* Compass mini */}
        <circle cx="60" cy="45" r="22" stroke="var(--gold)" strokeWidth="0.8" strokeOpacity="0.5"
          strokeDasharray="140"
          style={{ animation: 'blueprint-reveal 1s ease-out 400ms forwards', opacity: 0 }} />
        <line x1="60" y1="25" x2="60" y2="65" stroke="var(--gold)" strokeWidth="0.6" strokeOpacity="0.4"
          style={{ animation: 'blueprint-reveal 600ms ease-out 700ms forwards', opacity: 0 }} />
        <line x1="40" y1="45" x2="80" y2="45" stroke="var(--gold)" strokeWidth="0.6" strokeOpacity="0.4"
          style={{ animation: 'blueprint-reveal 600ms ease-out 800ms forwards', opacity: 0 }} />
        <polygon points="60,28 58,43 60,47 62,43" fill="var(--gold)" fillOpacity="0.6"
          style={{ animation: 'fill-in 1s ease-out 1000ms forwards', opacity: 0 }} />
        {/* Corner marks */}
        {[[10,10],[110,10],[10,80],[110,80]].map(([x,y], i) => (
          <g key={i}>
            <line x1={x} y1={y} x2={x + (x < 60 ? 8 : -8)} y2={y}
              stroke="var(--gold)" strokeWidth="1" strokeOpacity="0.6"
              style={{ animation: `blueprint-reveal 400ms ease-out ${900 + i*60}ms forwards`, opacity: 0 }} />
            <line x1={x} y1={y} x2={x} y2={y + (y < 50 ? 8 : -8)}
              stroke="var(--gold)" strokeWidth="1" strokeOpacity="0.6"
              style={{ animation: `blueprint-reveal 400ms ease-out ${940 + i*60}ms forwards`, opacity: 0 }} />
          </g>
        ))}
      </svg>

      <div className="text-center space-y-2" style={{ animation: 'fill-in 800ms ease-out 1200ms forwards', opacity: 0 }}>
        <p style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--text-base)', opacity: 0.7 }}>
          Begin Your First Story
        </p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.05em' }}>
          Run the pipeline to generate your storyboard
        </p>
      </div>

      <button onClick={onStart} className="btn-tactile gold-glow"
        style={{
          padding: '10px 32px', borderRadius: 4,
          border: '1px solid var(--gold)', color: 'var(--gold)',
          fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
          background: 'transparent', cursor: 'pointer',
          animation: 'fill-in 600ms ease-out 1400ms forwards', opacity: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-dim)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        + New Pipeline
      </button>
    </div>
  )
}
