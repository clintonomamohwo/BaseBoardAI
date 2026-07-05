interface Props {
  message?: string
}

export default function ConstellationLoader({ message = 'Thinking...' }: Props) {
  const nodes = [
    { cx: 30, cy: 20 }, { cx: 70, cy: 15 }, { cx: 110, cy: 30 },
    { cx: 50, cy: 55 }, { cx: 90, cy: 50 }, { cx: 20, cy: 60 },
  ]
  const edges = [[0,1],[1,2],[0,3],[1,4],[3,4],[2,4],[3,5]]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width="130" height="80" viewBox="0 0 130 80" fill="none">
        {edges.map(([a, b], i) => (
          <line key={i}
            x1={nodes[a].cx} y1={nodes[a].cy}
            x2={nodes[b].cx} y2={nodes[b].cy}
            stroke="var(--gold)" strokeWidth="0.8"
            strokeDasharray="40"
            style={{
              animation: `line-connect 600ms cubic-bezier(0.22,1,0.36,1) ${i * 120}ms infinite alternate`,
            }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r="2.5"
            fill="var(--gold)"
            style={{
              animation: `node-pulse 1200ms ease-in-out ${i * 200}ms infinite`,
            }}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.5, textTransform: 'uppercase' }}>
          Granite AI
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>{message}</span>
      </div>
    </div>
  )
}
