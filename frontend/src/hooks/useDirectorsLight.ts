/**
 * BMS — Director's Light
 *
 * A soft radial studio-light that follows the cursor across dark surfaces.
 * Updates a single CSS custom property `--directors-light` on <body> which
 * the CSS layer applies as a radial-gradient overlay. This keeps the DOM
 * side-effect minimal (one property write per mousemove) and avoids React
 * re-renders entirely.
 *
 * Rules
 *  • Max brightness increase ~4% (radial at 4% opacity white)
 *  • Large blurred falloff (600px radius)
 *  • No-op on touch devices
 *  • No-op when prefers-reduced-motion: reduce
 */
import { useEffect } from 'react'

export function useDirectorsLight() {
  useEffect(() => {
    // Respect accessibility preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    // Disable on touch-primary devices
    const touch = window.matchMedia('(hover: none)')
    if (touch.matches) return

    document.body.classList.add('bms-light-active')

    function onMouseMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      document.body.style.setProperty('--directors-light-pos', `${x}% ${y}%`)
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.body.classList.remove('bms-light-active')
    }
  }, [])
}
