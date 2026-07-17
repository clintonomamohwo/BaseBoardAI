import { useEffect, useRef, useState } from 'react'
import logoSrc from '../assets/logo.png'
import { useCompassNeedle } from '../hooks/useCompassNeedle'

type Section = 'storyboard' | 'characters' | 'world-bible' | 'library'

interface Props {
  onSelect: (section: Section) => void
  entering?: boolean
  onEntered?: () => void
}

interface SectionDef {
  id: Section
  label: string
  sub: string
  dir: 'N' | 'S' | 'E' | 'W'
}

const SECTIONS: SectionDef[] = [
  { id: 'library',     label: 'LIBRARY',     sub: 'Browse saved projects', dir: 'N' },
  { id: 'world-bible', label: 'WORLD BIBLE', sub: 'Build your universe',   dir: 'S' },
  { id: 'storyboard',  label: 'STORYBOARD',  sub: 'Visualize your scenes', dir: 'W' },
  { id: 'characters',  label: 'CHARACTERS',  sub: 'Bring people to life',  dir: 'E' },
]

// ── Card positions (tightened ~13% vs previous) ───────────────────────────
// Cards sit on top of connector lines; these are the translate values
const NODE_TRANSFORMS: Record<string, string> = {
  N: 'translateY(-138px)',
  S: 'translateY(138px)',
  W: 'translateX(-174px)',
  E: 'translateX(174px)',
}

const NODE_DELAYS: Record<string, number> = { N: 300, S: 350, W: 400, E: 450 }

// Connector line endpoints (from center 240,240 toward each card midpoint)
// Lines stop just short of the card so they look attached, not overlapping
const LINE_ENDPOINTS: Record<string, { x2: number; y2: number }> = {
  N: { x2: 240, y2: 112 },   // center - 128
  S: { x2: 240, y2: 368 },
  W: { x2: 112, y2: 240 },
  E: { x2: 368, y2: 240 },
}

const C_OUTER = 2 * Math.PI * 200
const C_INNER = 2 * Math.PI * 140

export default function CompassNavPage({ onSelect, entering = false, onEntered }: Props) {
  const [hoveredId,  setHoveredId]  = useState<Section | null>(null)
  const [centerHover, setCenterHov] = useState(false)
  const [ringAngle,   setRingAngle] = useState(0)  // degrees — driven by hover direction
  const compassContainerRef = useRef<HTMLDivElement>(null)
  // BMS-2: needle follows cursor, pinned to hovered section when hovering a card
  const needleAngle = useCompassNeedle(compassContainerRef, hoveredId)

  const [phase, setPhase] = useState<'center' | 'rings' | 'nodes' | 'bloom' | 'done'>(
    entering ? 'center' : 'done'
  )

  useEffect(() => {
    if (!entering) { setPhase('done'); return }
    const t1 = setTimeout(() => setPhase('rings'),  200)
    const t2 = setTimeout(() => setPhase('nodes'),  400)
    const t3 = setTimeout(() => setPhase('bloom'),  600)
    const t4 = setTimeout(() => { setPhase('done'); onEntered?.() }, 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [entering])

  // When a card is hovered, nudge the ring toward its direction
  useEffect(() => {
    const angles: Record<string, number> = { N: -8, S: 8, W: -8, E: 8 }
    if (hoveredId) {
      const s = SECTIONS.find(x => x.id === hoveredId)
      if (s) setRingAngle(angles[s.dir] ?? 0)
    } else {
      setRingAngle(0)
    }
  }, [hoveredId])

  const ringsVisible = phase !== 'center'
  const nodesVisible = phase === 'nodes' || phase === 'bloom' || phase === 'done'
  const bloomVisible = phase === 'bloom' || phase === 'done'

  // Center B size — larger on entrance phase, expanded on center-hover
  const centerSize = phase === 'center' ? 76 : centerHover ? 72 : 64

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient glow — brightens on center hover */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 65%)',
          opacity: centerHover ? 1 : bloomVisible ? 0.7 : 0,
          transition: 'opacity 400ms ease',
        }}
      />
      <div className="absolute inset-0 pointer-events-none grain-overlay" aria-hidden="true" />

      <p
        style={{
          fontSize: 10, letterSpacing: '0.35em', color: 'var(--gold)',
          textTransform: 'uppercase', marginBottom: 36, opacity: nodesVisible ? 0.5 : 0,
          transform: nodesVisible ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 300ms ease 500ms, transform 300ms ease 500ms',
        }}
      >
        Choose your destination
      </p>

      {/* ── Compass container ─────────────────────────────────────────────── */}
      <div ref={compassContainerRef} className="relative" style={{ width: 480, height: 480 }}>

        {/* ── Rotating outer tick ring ─────────────────────────────────── */}
        <svg
          className="compass-ring absolute inset-0"
          width="480" height="480" viewBox="0 0 480 480" fill="none"
          style={{
            opacity: ringsVisible ? 0.6 : 0,
            transition: 'opacity 400ms ease',
            transform: `rotate(${ringAngle}deg)`,
            transformOrigin: '240px 240px',
            transitionProperty: 'opacity, transform',
            transitionDuration: '400ms, 600ms',
            transitionTimingFunction: 'ease, cubic-bezier(0.25,1,0.5,1)',
          }}
        >
          <circle cx="240" cy="240" r="228"
            stroke="var(--gold)" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="3 9" />
          {[...Array(36)].map((_, i) => {
            const rad = ((i * 10 - 90) * Math.PI) / 180
            const r1 = 228, r2 = 220
            return (
              <line key={i}
                x1={240 + r1 * Math.cos(rad)} y1={240 + r1 * Math.sin(rad)}
                x2={240 + r2 * Math.cos(rad)} y2={240 + r2 * Math.sin(rad)}
                stroke="var(--gold)" strokeWidth="0.6" strokeOpacity="0.25"
              />
            )
          })}
        </svg>

        {/* ── Static drawn rings + crosshairs + connector lines ────────── */}
        <svg className="absolute inset-0" width="480" height="480" viewBox="0 0 480 480" fill="none">
          {/* Outer ring */}
          <circle cx="240" cy="240" r="200"
            stroke="var(--gold)" strokeWidth="0.5" strokeOpacity="0.3"
            strokeDasharray={C_OUTER} strokeDashoffset={ringsVisible ? 0 : C_OUTER}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* BMS-2: Compass needle — rotates via needleAngle */}
          <g transform={`rotate(${needleAngle} 240 240)`} style={{ transition: 'none' }}>
            <polygon points="240,100 236,238 240,252 244,238" fill="var(--gold)" fillOpacity="0.9" />
            <polygon points="240,380 236,242 240,252 244,242" fill="var(--border)" />
          </g>
          {/* Inner ring — expands on center hover */}
          <circle cx="240" cy="240" r={centerHover ? 148 : 140}
            stroke="var(--gold)" strokeWidth={centerHover ? 0.8 : 0.4}
            strokeOpacity={centerHover ? 0.5 : 0.2}
            strokeDasharray={C_INNER} strokeDashoffset={ringsVisible ? 0 : C_INNER}
            style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.4,0,0.2,1) 100ms, r 300ms ease, stroke-width 300ms ease, stroke-opacity 300ms ease' }}
          />

          {/* Crosshairs */}
          <line x1="240" y1="40" x2="240" y2="440"
            stroke="var(--gold)" strokeWidth="0.3" strokeOpacity="0.12"
            strokeDasharray="400" strokeDashoffset={ringsVisible ? 0 : 400}
            style={{ transition: 'stroke-dashoffset 400ms ease 150ms' }}
          />
          <line x1="40" y1="240" x2="440" y2="240"
            stroke="var(--gold)" strokeWidth="0.3" strokeOpacity="0.12"
            strokeDasharray="400" strokeDashoffset={ringsVisible ? 0 : 400}
            style={{ transition: 'stroke-dashoffset 400ms ease 200ms' }}
          />

          {/* Diagonal spurs */}
          {([[98,98,140,140],[382,98,340,140],[98,382,140,340],[382,382,340,340]] as number[][])
            .map(([x1,y1,x2,y2], idx) => {
              const len = Math.hypot(x2-x1, y2-y1)
              return (
                <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--gold)" strokeWidth="0.5" strokeOpacity="0.2"
                  strokeDasharray={len} strokeDashoffset={ringsVisible ? 0 : len}
                  style={{ transition: `stroke-dashoffset 350ms ease ${200+idx*40}ms` }}
                />
              )
            })
          }

          {/* ── Blueprint connector lines N/S/W/E ──────────────────────── */}
          {SECTIONS.map((s) => {
            const ep       = LINE_ENDPOINTS[s.dir]
            const isHov    = hoveredId === s.id
            const isCtrHov = centerHover
            const len      = s.dir === 'N' || s.dir === 'S' ? 128 : 128
            const glowing  = isHov || isCtrHov

            return (
              <line key={s.id}
                x1="240" y1="240" x2={ep.x2} y2={ep.y2}
                stroke="var(--gold)"
                strokeWidth={glowing ? 1 : 0.6}
                strokeOpacity={glowing ? 0.9 : 0.25}
                strokeDasharray={len}
                strokeDashoffset={nodesVisible ? 0 : len}
                style={{
                  filter: glowing ? 'drop-shadow(0 0 3px var(--gold))' : 'none',
                  transition: `stroke-dashoffset 400ms ease ${NODE_DELAYS[s.dir]}ms,
                               stroke-width 200ms ease,
                               stroke-opacity 200ms ease,
                               filter 200ms ease`,
                }}
              />
            )
          })}

          {/* ── Connector dots at line ends ──────────────────────────── */}
          {SECTIONS.map((s) => {
            const ep    = LINE_ENDPOINTS[s.dir]
            const isHov = hoveredId === s.id || centerHover
            return (
              <circle key={s.id + '-dot'}
                cx={ep.x2} cy={ep.y2} r={isHov ? 3 : 2}
                fill="var(--gold)"
                opacity={nodesVisible ? (isHov ? 1 : 0.35) : 0}
                style={{
                  filter: isHov ? 'drop-shadow(0 0 4px var(--gold))' : 'none',
                  transition: 'opacity 300ms ease, r 200ms ease, filter 200ms ease',
                }}
              />
            )
          })}
        </svg>

        {/* ── Cardinal node cards ───────────────────────────────────────── */}
        {SECTIONS.map((s) => {
          const isHovered = hoveredId === s.id
          const baseTransform = nodesVisible ? NODE_TRANSFORMS[s.dir] : 'translate(0,0)'
          const hoverScale    = isHovered ? ' scale(1.06)' : centerHover ? ' scale(1.02)' : ' scale(1)'

          return (
            <button
              key={s.id}
              className="bms-brass"
              onClick={() => onSelect(s.id)}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: 'absolute',
                left: '50%', top: '50%',
                marginLeft: -65, marginTop: -30,
                width: 130,
                opacity: nodesVisible ? 1 : 0,
                transform: baseTransform + hoverScale,
                transition: nodesVisible
                  ? `transform 200ms cubic-bezier(0.25,1,0.5,1),
                     box-shadow 200ms ease,
                     background 150ms ease,
                     border-color 150ms ease,
                     opacity 180ms ease`
                  : `opacity 400ms cubic-bezier(0.25,1,0.5,1) ${NODE_DELAYS[s.dir]}ms,
                     transform 400ms cubic-bezier(0.25,1,0.5,1) ${NODE_DELAYS[s.dir]}ms`,
                borderRadius: 3,
                cursor: 'pointer',
                willChange: 'transform, box-shadow',
                // ── Brass plaque styling ──────────────────────────────
                background: isHovered
                  ? 'linear-gradient(160deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.06) 60%, rgba(201,168,76,0.10) 100%)'
                  : 'linear-gradient(160deg, var(--bg-raised) 0%, var(--bg-surface) 60%, var(--bg-raised) 100%)',
                border: isHovered
                  ? '1px solid rgba(201,168,76,0.9)'
                  : bloomVisible
                  ? '1px solid rgba(201,168,76,0.45)'
                  : '1px solid rgba(201,168,76,0.1)',
                boxShadow: isHovered
                  // Hovered: outer glow + outer shadow + bevel (light top-left, dark bottom-right)
                  ? `0 0 28px rgba(201,168,76,0.35),
                     0 6px 18px rgba(0,0,0,0.55),
                     inset 0 1px 0 rgba(201,168,76,0.4),
                     inset 0 -1px 0 rgba(0,0,0,0.35),
                     inset 1px 0 0 rgba(201,168,76,0.2),
                     inset -1px 0 0 rgba(0,0,0,0.25)`
                  : bloomVisible
                  // Resting: subtle bevel
                  ? `0 4px 12px rgba(0,0,0,0.4),
                     inset 0 1px 0 rgba(201,168,76,0.25),
                     inset 0 -1px 0 rgba(0,0,0,0.3),
                     inset 1px 0 0 rgba(201,168,76,0.1),
                     inset -1px 0 0 rgba(0,0,0,0.2)`
                  : 'none',
                padding: '13px 16px 12px',
                textAlign: 'center',
              }}
            >
              {/* Reflection strip — top micro-highlight mimics brushed metal */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)',
                opacity: isHovered ? 1 : 0.5,
                transition: 'opacity 150ms ease',
                borderRadius: '0 0 1px 1px',
              }} />

              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                marginBottom: 5,
                color: 'var(--gold)',
                letterSpacing: isHovered ? '0.32em' : '0.25em',
                transition: 'letter-spacing 150ms ease',
                textShadow: isHovered ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 9, letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                opacity: isHovered ? 0.9 : 0.55,
                transition: 'opacity 150ms ease',
              }}>
                {s.sub}
              </div>
            </button>
          )
        })}

        {/* ── Centre B — interactive ────────────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none', zIndex: 10 }}>
          <div
            onMouseEnter={() => setCenterHov(true)}
            onMouseLeave={() => setCenterHov(false)}
            style={{
              pointerEvents: 'auto',
              width: centerSize,
              height: centerSize,
              borderRadius: '50%',
              cursor: 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              // Brass plaque treatment on the B circle too
              background: centerHover
                ? 'linear-gradient(135deg, var(--bg-raised) 0%, rgba(201,168,76,0.12) 50%, var(--bg-raised) 100%)'
                : 'var(--bg-raised)',
              border: centerHover
                ? '1px solid rgba(201,168,76,0.9)'
                : '1px solid var(--gold)',
              boxShadow: centerHover
                ? `0 0 40px rgba(201,168,76,0.5),
                   0 0 14px rgba(201,168,76,0.3),
                   inset 0 1px 0 rgba(201,168,76,0.45),
                   inset 0 -1px 0 rgba(0,0,0,0.3)`
                : phase === 'center'
                ? '0 0 32px var(--gold), 0 0 8px var(--gold)'
                : `0 0 18px var(--gold-dim),
                   0 0 6px rgba(0,0,0,0.3),
                   inset 0 1px 0 rgba(201,168,76,0.2),
                   inset 0 -1px 0 rgba(0,0,0,0.25)`,
              transition: 'width 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease, background 250ms ease, border-color 250ms ease',
              willChange: 'transform',
              animation: centerHover ? 'center-pulse 1.6s ease-in-out infinite' : 'none',
            }}
          >
            <img
              src={logoSrc}
              alt="Baseboard AI"
              style={{
                width: centerHover ? 48 : 42,
                height: centerHover ? 48 : 42,
                objectFit: 'contain',
                filter: centerHover
                  ? 'drop-shadow(0 0 6px rgba(201,168,76,0.8))'
                  : 'drop-shadow(0 0 2px rgba(201,168,76,0.4))',
                transition: 'width 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1), filter 300ms ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
