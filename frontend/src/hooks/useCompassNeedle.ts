/**
 * BMS — Compass Navigation
 *
 * Returns a `needleAngle` (degrees) driven either by the cursor position
 * relative to the compass centre, or by a pinned destination angle when
 * `pinnedSection` is set (e.g. the user is hovering a nav item).
 *
 * Motion is damped via requestAnimationFrame lerp so it never feels abrupt.
 */
import { useEffect, useRef, useState } from 'react'

const SECTION_ANGLES: Record<string, number> = {
  storyboard:  -20,
  characters:   20,
  'world-bible': 5,
  inspector:   -5,
}

const LERP_FACTOR = 0.08   // lower = more damping

export function useCompassNeedle(
  compassCenterRef: React.RefObject<HTMLElement | SVGElement | null>,
  pinnedSection: string | null,
) {
  const [angle, setAngle] = useState(0)
  const target = useRef(0)
  const current = useRef(0)
  const rafId = useRef<number | null>(null)

  // Drive target from pinned section or cursor
  useEffect(() => {
    if (pinnedSection && SECTION_ANGLES[pinnedSection] !== undefined) {
      target.current = SECTION_ANGLES[pinnedSection]
      return
    }

    function onMove(e: MouseEvent) {
      const el = compassCenterRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      // Clamp to ±12 degrees — subtle, never dramatic
      const raw = Math.atan2(dx, -dy) * (180 / Math.PI)
      target.current = Math.max(-12, Math.min(12, raw * 0.12))
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [pinnedSection, compassCenterRef])

  // Lerp loop
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    function tick() {
      if (mq.matches) {
        current.current = target.current
      } else {
        current.current += (target.current - current.current) * LERP_FACTOR
      }
      const rounded = Math.round(current.current * 100) / 100
      setAngle(rounded)
      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current) }
  }, [])

  return angle
}
