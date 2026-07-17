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
  inspector:    0,    // N
  characters:   90,   // E
  'world-bible': 180, // S
  storyboard:  -90,   // W
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
      // Full 360° — needle points toward the cursor
      target.current = Math.atan2(dx, -dy) * (180 / Math.PI)
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
        // Keep current in [-180, 180] so the shortest-path diff stays valid
        // no matter how many full rotations the needle has made.
        current.current = ((current.current + 180) % 360 + 360) % 360 - 180
        let diff = target.current - current.current
        diff = ((diff + 180) % 360 + 360) % 360 - 180
        current.current += diff * LERP_FACTOR
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
