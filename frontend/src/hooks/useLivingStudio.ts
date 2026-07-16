/**
 * useLivingStudio
 *
 * Drives the three ambient layers on the Landing Page:
 *   1. Constellation network  — thin gold lines + glowing nodes on a canvas
 *   2. Gold dust particles    — slow drifting specks on the same canvas
 *   3. Mouse spotlight        — warm radial light that eases toward the cursor
 *
 * Design constraints (from brief):
 *   - opacity 3–6% for lines, 4–8% for particles
 *   - extremely slow movement — nodes drift ~4–8px over 8–14 s cycles
 *   - GPU-only: canvas 2D + CSS transform/opacity, no layout thrashing
 *   - respects prefers-reduced-motion (disables canvas, keeps spotlight at 50/50)
 *   - auto-disables on low-end devices (navigator.hardwareConcurrency <= 4 as heuristic)
 */

import { useEffect, useRef } from 'react'

interface Node {
  x: number; y: number
  vx: number; vy: number
  ox: number; oy: number   // origin — drift back toward this
  r: number                // glow radius
  phase: number            // shimmer phase offset
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number
  opacity: number
  shimmerPhase: number
}

const GOLD_LINE   = 'rgba(201,168,76,'
const GOLD_FILL   = 'rgba(201,168,76,'
const NODE_COUNT  = 28
const EDGE_DIST   = 220   // max distance to draw a line between nodes
const PARTICLE_COUNT = 55

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function useLivingStudio(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  spotlightRef: React.RefObject<HTMLDivElement | null>,
) {
  const mouseRef = useRef({ x: 0.5, y: 0.5 })     // normalised 0–1
  const lightRef = useRef({ x: 0.5, y: 0.5 })      // eased position

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowEnd  = (navigator.hardwareConcurrency ?? 8) <= 2

    // Spotlight always works (CSS only) — canvas only on capable devices
    const canvas = canvasRef.current
    const spotlight = spotlightRef.current
    if (!canvas || !spotlight) return

    // ── Spotlight mouse tracking ──────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    if (reduced || lowEnd) {
      // Reduced motion: just leave the spotlight centred, no canvas work
      return () => window.removeEventListener('mousemove', onMouseMove)
    }

    // ── Canvas setup ──────────────────────────────────────────────────────
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
    let W = 0, H = 0

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width  = W * dpr
      canvas!.height = H * dpr
      canvas!.style.width  = W + 'px'
      canvas!.style.height = H + 'px'
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // ── Constellation nodes ───────────────────────────────────────────────
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => {
      const x = rand(0, W), y = rand(0, H)
      return {
        x, y, ox: x, oy: y,
        vx: rand(-0.12, 0.12),
        vy: rand(-0.12, 0.12),
        r: rand(1.2, 2.8),
        phase: rand(0, Math.PI * 2),
      }
    })

    // ── Particles ─────────────────────────────────────────────────────────
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: rand(0, W),
      y: rand(0, H),
      vx: rand(-0.06, 0.06),
      vy: rand(-0.08, -0.02),   // gentle upward drift
      size: rand(0.6, 2.2),
      opacity: rand(0.03, 0.09),
      shimmerPhase: rand(0, Math.PI * 2),
    }))

    // ── Parallax offset driven by mouse ──────────────────────────────────
    const parallax = { x: 0, y: 0 }   // eased, in pixels

    // ── Render loop ───────────────────────────────────────────────────────
    let raf = 0
    let t = 0

    function draw() {
      t += 0.004   // master clock — very slow

      // Ease spotlight toward mouse
      const mx = mouseRef.current.x, my = mouseRef.current.y
      lightRef.current.x += (mx - lightRef.current.x) * 0.035
      lightRef.current.y += (my - lightRef.current.y) * 0.035
      if (spotlight) {
        spotlight.style.background =
          `radial-gradient(500px circle at ${lightRef.current.x * 100}% ${lightRef.current.y * 100}%,` +
          `rgba(201,168,76,0.045) 0%, transparent 70%)`
      }

      // Ease parallax offset (max ±18px)
      parallax.x += ((mx - 0.5) * 18 - parallax.x) * 0.025
      parallax.y += ((my - 0.5) * 18 - parallax.y) * 0.025

      ctx.clearRect(0, 0, W, H)

      // ── Update & draw particles ──────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        // wrap
        if (p.x < -4) p.x = W + 4
        if (p.x > W + 4) p.x = -4
        if (p.y < -4) { p.y = H + 4; p.x = rand(0, W) }

        const shimmer = 0.5 + 0.5 * Math.sin(t * 1.8 + p.shimmerPhase)
        const alpha = p.opacity * (0.6 + 0.4 * shimmer)

        // Apply parallax at half speed (layer 3 = mid depth)
        const px = p.x + parallax.x * 0.4
        const py = p.y + parallax.y * 0.4

        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = GOLD_FILL + alpha.toFixed(3) + ')'
        ctx.fill()
      }

      // ── Update & draw constellation ──────────────────────────────────
      for (const n of nodes) {
        // Drift slowly — oscillate around origin with noise-like motion
        n.ox += n.vx * 0.15
        n.oy += n.vy * 0.15
        // Softly constrain to viewport
        if (n.ox < 40)    { n.ox = 40;    n.vx *= -1 }
        if (n.ox > W - 40) { n.ox = W-40; n.vx *= -1 }
        if (n.oy < 40)    { n.oy = 40;    n.vy *= -1 }
        if (n.oy > H - 40) { n.oy = H-40; n.vy *= -1 }

        // Apply parallax at full layer speed
        n.x = n.ox + parallax.x * 0.7
        n.y = n.oy + parallax.y * 0.7
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > EDGE_DIST) continue
          const alpha = (1 - dist / EDGE_DIST) * 0.045
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.strokeStyle = GOLD_LINE + alpha.toFixed(4) + ')'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const shimmer = 0.5 + 0.5 * Math.sin(t * 2.2 + n.phase)
        const baseAlpha = 0.06 + 0.06 * shimmer

        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4)
        grd.addColorStop(0, GOLD_FILL + (baseAlpha * 0.9).toFixed(3) + ')')
        grd.addColorStop(1, GOLD_FILL + '0)')
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = GOLD_FILL + (baseAlpha * 2).toFixed(3) + ')'
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])
}
