import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { MapStyle } from '../../types'

export interface SpaceCameraState {
  lng: number
  lat: number
  zoom: number
}

interface Star {
  nx: number
  ny: number
  r: number
  baseAlpha: number
  depth: number
  phase: number
  speed: number
  color: string
}

const STAR_COLORS = ['#FFFFFF', '#E0F2FE', '#BAE6FD', '#FEF9C3', '#E9D5FF'] as const

function createSeededStars(count: number): Star[] {
  let seed = 42197
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const big = rand() > 0.86
    stars.push({
      nx: rand(),
      ny: rand(),
      r: big ? 1.2 + rand() * 0.85 : 0.45 + rand() * 0.7,
      baseAlpha: big ? 0.6 + rand() * 0.38 : 0.25 + rand() * 0.48,
      depth: big ? 1.0 : 0.4 + rand() * 0.45,
      phase: rand() * Math.PI * 2,
      speed: 0.45 + rand() * 1.15,
      color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
    })
  }
  return stars
}

const STARS = createSeededStars(210)

/** Hitung posisi pusat & radius lingkaran globe di layar langsung lewat proyeksi MapLibre. */
function measureGlobeCircle(map: MapLibreMap, w: number, h: number): { cx: number; cy: number; r: number } | null {
  try {
    const pad = map.getPadding()
    const cx = (pad.left ?? 0) + Math.max(0, w - (pad.left ?? 0) - (pad.right ?? 0)) / 2
    const cy = (pad.top ?? 0) + Math.max(0, h - (pad.top ?? 0) - (pad.bottom ?? 0)) / 2
    const probe = map.project(map.unproject([cx + 2400, cy]))
    const r = Math.hypot(probe.x - cx, probe.y - cy)
    if (!Number.isFinite(r) || r > 2200) return null
    return { cx, cy, r }
  } catch {
    return null
  }
}

/**
 * Latar antariksa (atmospheric glow, nebula tipis, starfield parallax, dan satelit melintas)
 * yang di-clip khusus di luar lingkaran globe MapLibre.
 */
export default function SpaceBackdrop({
  style,
  mapRef,
  cameraRef,
}: {
  style: MapStyle
  mapRef: React.RefObject<MapLibreMap | null>
  cameraRef: React.RefObject<SpaceCameraState>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const styleRef = useRef(style)
  useEffect(() => {
    styleRef.current = style
  }, [style])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let rafId = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth || window.innerWidth
      h = canvas.clientHeight || window.innerHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (nowMs: number) => {
      const cam = cameraRef.current ?? { lng: 117.5, lat: -2, zoom: 4.3 }
      const map = mapRef.current
      const mapStyle = styleRef.current
      const isLight = mapStyle === 'terang'

      // Hanya tampil saat masih mode globe murni (sebelum interpolasi mercator dimulai di zoom 3.45)
      const visibility = Math.max(0, Math.min(1, (3.42 - cam.zoom) / 0.45))

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const globe = map && visibility > 0.01 ? measureGlobeCircle(map, w, h) : null
      if (!globe || visibility <= 0.01) {
        if (!reducedMotion) rafId = requestAnimationFrame(draw)
        return
      }

      ctx.save()
      // Clip hanya area di LUAR lingkaran globe (even-odd)
      ctx.beginPath()
      ctx.rect(0, 0, w, h)
      ctx.arc(globe.cx, globe.cy, Math.max(0, globe.r + 1), 0, Math.PI * 2, true)
      ctx.clip()

      ctx.globalAlpha = visibility

      if (!isLight) {
        // Nebula tipis di sudut luar angkasa
        const neb1 = ctx.createRadialGradient(w * 0.82, h * 0.18, 10, w * 0.82, h * 0.18, Math.max(w, h) * 0.45)
        neb1.addColorStop(0, 'rgba(56, 189, 248, 0.16)')
        neb1.addColorStop(0.5, 'rgba(37, 99, 235, 0.07)')
        neb1.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = neb1
        ctx.fillRect(0, 0, w, h)

        const neb2 = ctx.createRadialGradient(w * 0.18, h * 0.82, 10, w * 0.18, h * 0.82, Math.max(w, h) * 0.38)
        neb2.addColorStop(0, 'rgba(99, 102, 241, 0.14)')
        neb2.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = neb2
        ctx.fillRect(0, 0, w, h)

        // Bintang-bintang dengan parallax halus
        const t = nowMs * 0.001
        const pxBase = -cam.lng * 0.9
        const pyBase = cam.lat * 0.9

        for (const s of STARS) {
          const x = (((s.nx * w + pxBase * s.depth) % w) + w) % w
          const y = (((s.ny * h + pyBase * s.depth) % h) + h) % h
          const twinkle = reducedMotion ? 1 : 0.62 + 0.38 * Math.sin(t * s.speed + s.phase)
          ctx.globalAlpha = visibility * s.baseAlpha * twinkle
          ctx.fillStyle = s.color
          ctx.beginPath()
          ctx.arc(x, y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }

        // Satelit mini melintas pelan di orbit jauh (setiap ~16 detik)
        if (!reducedMotion) {
          const cycle = (t % 16) / 16
          if (cycle < 0.45) {
            const p = cycle / 0.45
            const sx = w * (0.14 + p * 0.76)
            const sy = h * (0.24 - p * 0.14)
            const alpha = Math.sin(p * Math.PI) * 0.85 * visibility

            const trail = ctx.createLinearGradient(sx - 36, sy + 6.6, sx, sy)
            trail.addColorStop(0, 'rgba(125, 211, 252, 0)')
            trail.addColorStop(1, `rgba(186, 230, 253, ${alpha * 0.6})`)
            ctx.globalAlpha = 1
            ctx.strokeStyle = trail
            ctx.lineWidth = 1.3
            ctx.beginPath()
            ctx.moveTo(sx - 36, sy + 6.6)
            ctx.lineTo(sx, sy)
            ctx.stroke()

            ctx.globalAlpha = alpha
            ctx.fillStyle = '#E0F2FE'
            ctx.beginPath()
            ctx.arc(sx, sy, 1.9, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Halo atmosfer biru melengkung di luar tepi Bumi
      const glowOuter = globe.r + 34
      const atmo = ctx.createRadialGradient(globe.cx, globe.cy, globe.r, globe.cx, globe.cy, glowOuter)
      if (isLight) {
        atmo.addColorStop(0, 'rgba(96, 165, 250, 0.36)')
        atmo.addColorStop(0.45, 'rgba(147, 197, 253, 0.14)')
        atmo.addColorStop(1, 'rgba(147, 197, 253, 0)')
      } else {
        atmo.addColorStop(0, 'rgba(56, 189, 248, 0.42)')
        atmo.addColorStop(0.35, 'rgba(37, 99, 235, 0.18)')
        atmo.addColorStop(1, 'rgba(37, 99, 235, 0)')
      }
      ctx.globalAlpha = visibility
      ctx.fillStyle = atmo
      ctx.beginPath()
      ctx.arc(globe.cx, globe.cy, glowOuter, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
      if (!reducedMotion) {
        rafId = requestAnimationFrame(draw)
      }
    }

    rafId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [cameraRef, mapRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] size-full"
    />
  )
}
