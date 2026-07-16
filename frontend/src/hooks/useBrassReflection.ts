/**
 * BMS — Brass Reflection
 *
 * Attaches a mousemove listener to a container ref and writes two CSS custom
 * properties onto the element:
 *   --brass-x  : 0.0–1.0 (normalised cursor X within the element)
 *   --brass-y  : 0.0–1.0 (normalised cursor Y within the element)
 *
 * The CSS layer uses these to position a `conic-gradient` or linear-gradient
 * shine highlight that travels across gold borders, simulating polished brass
 * under moving studio light.
 *
 * Returns `{ onMouseMove, onMouseLeave }` handlers to spread onto the element.
 */
import { useCallback } from 'react'

export function useBrassReflection(ref: React.RefObject<HTMLElement | null>) {
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--brass-x', String(x.toFixed(3)))
    el.style.setProperty('--brass-y', String(y.toFixed(3)))
  }, [ref])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--brass-x', '0.5')
    el.style.setProperty('--brass-y', '0')
  }, [ref])

  return { onMouseMove, onMouseLeave }
}
