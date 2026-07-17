import { useRef, useState } from 'react'
import logoSrc from '../assets/logo.png'
import { useCompassNeedle } from '../hooks/useCompassNeedle'
import { useLivingStudio } from '../hooks/useLivingStudio'

interface Props {
  onNewProject: () => void
  onEnter: () => void
  onDemo: () => void
  idle?: boolean
}

export default function LandingPage({ onNewProject, onEnter, onDemo, idle = false }: Props) {
  const [arrowHover, setArrowHover] = useState(false)
  const compassRef  = useRef<HTMLDivElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  // BMS-2: compass needle follows cursor, damped
  const needleAngle = useCompassNeedle(compassRef, null)
  // Living Studio — constellation + particles + mouse spotlight
  useLivingStudio(canvasRef, spotlightRef)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Layer 1 — Constellation + particles canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      />

      {/* Layer 2 — Mouse spotlight */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      />

      {/* Radial glow layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, var(--gold-dim) 0%, transparent 65%)',
          opacity: 0.3,
          animation: 'vignette-breathe 8s ease-in-out infinite',
          zIndex: 2,
        }}
      />

      {/* Film-grain overlay — pure CSS noise via repeating SVG data-URI */}
      <div
        className="absolute inset-0 pointer-events-none grain-overlay"
        aria-hidden="true"
        style={{ zIndex: 3 }}
      />

      {/* Top bar */}
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between z-10">
        <div
          className="flex items-center gap-2"
          style={{ cursor: 'default', transition: 'filter 0.25s ease' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.filter = 'drop-shadow(0 0 6px rgba(201,168,76,0.7))'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.filter = 'none'
          }}
        >
          <img src={logoSrc} alt="Baseboard AI" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(201,168,76,0.5))' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.7, textTransform: 'uppercase', transition: 'opacity 0.25s ease, text-shadow 0.25s ease' }}>
            BASEBOARD AI
          </span>
        </div>
      </div>

      {/* Compass — idle sway after 10s, BMS-2 needle */}
      <div ref={compassRef} className="relative mb-10 z-10" style={{ width: 280, height: 280 }}>

        <svg
          className="compass-ring absolute inset-0"
          width="280" height="280" viewBox="0 0 280 280" fill="none"
          style={idle ? { animation: 'idle-sway 4s ease-in-out infinite' } : undefined}
        >
          <circle cx="140" cy="140" r="130" stroke="var(--gold)" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="4 8" />
          <circle cx="140" cy="140" r="118" stroke="var(--gold)" strokeWidth="0.3" strokeOpacity="0.15" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line key={deg}
              x1="140" y1="12" x2="140" y2={deg % 90 === 0 ? '24' : '18'}
              stroke="var(--gold)"
              strokeWidth={deg % 90 === 0 ? '1.5' : '0.8'}
              strokeOpacity={deg % 90 === 0 ? '0.8' : '0.4'}
              transform={`rotate(${deg} 140 140)`}
            />
          ))}
        </svg>

        <svg className="absolute inset-0" width="280" height="280" viewBox="0 0 280 280" fill="none">
          <circle cx="140" cy="140" r="100" stroke="var(--gold)" strokeWidth="0.5" strokeOpacity="0.2" />
          <circle cx="140" cy="140" r="56"  stroke="var(--gold)" strokeWidth="0.8" strokeOpacity="0.4" />
          {/* BMS-2: needle group rotates toward cursor */}
          <g transform={`rotate(${needleAngle} 140 140)`}
             style={{ transition: 'none' }}>
          <polygon points="140,58 136,138 140,148 144,138"  fill="var(--gold)"   fillOpacity="0.9" />
          <polygon points="140,222 136,142 140,148 144,142" fill="var(--border)" />
          </g>
          <text x="140" y="46"  textAnchor="middle" fill="var(--gold)" fontSize="9" fontWeight="bold" letterSpacing="2" fontFamily="Georgia,serif">N</text>
          <text x="140" y="244" textAnchor="middle" fill="var(--gold)" fontSize="9" fontWeight="bold" letterSpacing="2" fontFamily="Georgia,serif">S</text>
          <text x="236" y="145" textAnchor="middle" fill="var(--gold)" fontSize="9" fontWeight="bold" letterSpacing="2" fontFamily="Georgia,serif">E</text>
          <text x="44"  y="145" textAnchor="middle" fill="var(--gold)" fontSize="9" fontWeight="bold" letterSpacing="2" fontFamily="Georgia,serif">W</text>

          {idle && (
            <>
              <circle cx="80"  cy="80"  r="2" fill="var(--gold)" style={{ animation: 'node-pulse 1500ms ease-in-out infinite' }} />
              <circle cx="200" cy="90"  r="2" fill="var(--gold)" style={{ animation: 'node-pulse 1500ms ease-in-out 300ms infinite' }} />
              <circle cx="180" cy="190" r="2" fill="var(--gold)" style={{ animation: 'node-pulse 1500ms ease-in-out 600ms infinite' }} />
              <line x1="80" y1="80" x2="200" y2="90" stroke="var(--gold)" strokeWidth="0.5"
                strokeDasharray="40" style={{ animation: 'line-connect 1000ms ease-in-out infinite alternate' }} />
              <line x1="200" y1="90" x2="180" y2="190" stroke="var(--gold)" strokeWidth="0.5"
                strokeDasharray="40" style={{ animation: 'line-connect 1000ms ease-in-out 300ms infinite alternate' }} />
            </>
          )}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center gold-glow"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--gold)' }}
          >
            <img src={logoSrc} alt="Baseboard AI" style={{ width: 46, height: 46, objectFit: 'contain', filter: 'drop-shadow(0 0 3px rgba(201,168,76,0.6))' }} />
          </div>
        </div>
      </div>

      {/* Title */}
      <h1
        className="gold-glow-text mb-2 z-10"
        style={{ fontFamily: 'Georgia,serif', letterSpacing: '0.15em', fontSize: 44, fontWeight: 'bold', color: 'var(--gold)' }}
      >
        BASEBOARD AI
      </h1>
      <p style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--text-muted)', opacity: 0.6, textTransform: 'uppercase', marginBottom: 10, position: 'relative', zIndex: 10 }}>
        Where Stories Become Worlds
      </p>

      {/* Genesis Engine tagline */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.55, marginBottom: 36, maxWidth: 360, textAlign: 'center', lineHeight: 1.7, position: 'relative', zIndex: 10 }}>
        Upload your screenplay, novel, or design document.{' '}
        <span style={{ color: 'var(--gold)', opacity: 0.8 }}>Genesis Engine</span> will build your
        characters, world, storyboard, and production bible automatically.
      </p>

      {/* Primary CTA — New Project — BMS-4: brass reflection */}
      <button
        onClick={onNewProject}
        className="btn-tactile gold-glow bms-brass mb-3"
        style={{
          position: 'relative', zIndex: 10,
          padding: '13px 44px', borderRadius: 999,
          border: '1px solid var(--gold)',
          background: 'var(--gold-dim)',
          color: 'var(--gold)',
          fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer', fontWeight: 600,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--gold)'
          e.currentTarget.style.color = 'var(--bg-base)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--gold-dim)'
          e.currentTarget.style.color = 'var(--gold)'
        }}
      >
        ⊕ &nbsp; New Project
      </button>

      {/* Demo CTA */}
      <button
        onClick={onDemo}
        className="btn-tactile mb-4"
        style={{
          position: 'relative', zIndex: 10,
          padding: '9px 32px', borderRadius: 999,
          border: '1px solid rgba(201,168,76,0.35)',
          background: 'transparent',
          color: 'var(--gold)',
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          cursor: 'pointer', opacity: 0.7,
          transition: 'opacity 200ms ease, border-color 200ms ease, background 200ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.borderColor = 'var(--gold)'
          e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.7'
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        ▶ &nbsp; Demo Project
      </button>

      {/* Secondary CTA — Enter Studio with arrow shift on hover */}
      <button
        onClick={onEnter}
        className="btn-tactile enter-studio-btn"
        onMouseEnter={() => setArrowHover(true)}
        onMouseLeave={() => setArrowHover(false)}
        style={{
          position: 'relative', zIndex: 10,
          padding: '8px 28px', borderRadius: 999,
          border: '1px solid var(--border)',
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          color: arrowHover ? 'var(--text-base)' : 'var(--text-muted)',
          borderColor: arrowHover ? 'var(--gold)' : 'var(--border)',
          backgroundColor: arrowHover ? 'rgba(212,168,83,0.10)' : 'transparent',
          transition: 'background-color 220ms ease, border-color 220ms ease, color 220ms ease',
        }}
      >
        <span>Enter Studio</span>
        <span
          style={{
            display: 'inline-block',
            transform: arrowHover ? 'translateX(3px)' : 'translateX(0)',
            transition: 'transform 220ms cubic-bezier(0.25,1,0.5,1)',
            willChange: 'transform',
          }}
        >
          →
        </span>
      </button>

    </div>
  )
}
