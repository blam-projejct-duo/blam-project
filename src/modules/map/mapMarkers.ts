import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ConservationEvent, HazardKind, Profile } from '../../types'

const HAZARD_COLORS: Record<HazardKind, string> = {
  wildfire: '#EF4444',
  suspected: '#F59E0B',
  volcano: '#7C3AED',
  flood: '#2563EB',
  storm: '#0891B2',
  other: '#F59E0B',
}

function drawDropletPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r * 1.15)
  ctx.bezierCurveTo(cx + r * 0.95, cy - r * 0.25, cx + r * 0.95, cy + r * 0.55, cx, cy + r * 0.98)
  ctx.bezierCurveTo(cx - r * 0.95, cy + r * 0.55, cx - r * 0.95, cy - r * 0.25, cx, cy - r * 1.15)
  ctx.closePath()
}

function drawFlamePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r * 1.18)
  ctx.bezierCurveTo(cx + r * 0.55, cy - r * 0.55, cx + r * 1.05, cy - r * 0.05, cx + r * 0.86, cy + r * 0.52)
  ctx.bezierCurveTo(cx + r * 0.68, cy + r * 0.96, cx - r * 0.68, cy + r * 0.96, cx - r * 0.86, cy + r * 0.52)
  ctx.bezierCurveTo(cx - r * 1.05, cy - r * 0.05, cx - r * 0.55, cy - r * 0.55, cx, cy - r * 1.18)
  ctx.closePath()
}

function drawTrianglePeakPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const topY = cy - r * 1.05
  const botY = cy + r * 0.82
  const halfW = r * 1.06
  ctx.beginPath()
  ctx.moveTo(cx, topY)
  ctx.quadraticCurveTo(cx + halfW * 0.58, cy - r * 0.1, cx + halfW, botY - r * 0.18)
  ctx.quadraticCurveTo(cx + halfW, botY, cx + halfW * 0.72, botY)
  ctx.lineTo(cx - halfW * 0.72, botY)
  ctx.quadraticCurveTo(cx - halfW, botY, cx - halfW, botY - r * 0.18)
  ctx.quadraticCurveTo(cx - halfW * 0.58, cy - r * 0.1, cx, topY)
  ctx.closePath()
}

function drawHexagonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawShieldPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r * 0.88, cy - r * 0.65)
  ctx.quadraticCurveTo(cx + r * 0.92, cy + r * 0.45, cx, cy + r * 1.05)
  ctx.quadraticCurveTo(cx - r * 0.92, cy + r * 0.45, cx - r * 0.88, cy - r * 0.65)
  ctx.closePath()
}

const LUCIDE_PATHS: Record<HazardKind, string[]> = {
  wildfire: [
    'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
  ],
  suspected: [
    'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
  ],
  flood: [
    'M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z',
    'M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97',
  ],
  volcano: ['m8 3 4 8 5-5 5 15H2L8 3z'],
  storm: [
    'M12.8 19.6A2 2 0 1 0 14 16H2',
    'M17.5 8a2.5 2.5 0 1 1 2 4H2',
    'M9.8 4.4A2 2 0 1 1 11 8H2',
  ],
  other: [
    'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
  ],
}

function drawHazardGlyph(ctx: CanvasRenderingContext2D, kind: HazardKind, cx: number, cy: number) {
  const iconSize = 24
  const targetSize = 24
  const scale = targetSize / iconSize
  ctx.save()
  ctx.translate(cx - targetSize / 2, cy - targetSize / 2)
  ctx.scale(scale, scale)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2.2
  for (const d of LUCIDE_PATHS[kind]) {
    ctx.stroke(new Path2D(d))
  }
  ctx.restore()
}

function buildHazardCanvas(kind: HazardKind): ImageData {
  const size = 84
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2 + 2
  const r = 27

  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)'
  ctx.shadowBlur = 7
  ctx.shadowOffsetY = 3

  if (kind === 'flood') drawDropletPath(ctx, cx, cy, r)
  else if (kind === 'wildfire' || kind === 'suspected') drawFlamePath(ctx, cx, cy, r)
  else if (kind === 'volcano') drawTrianglePeakPath(ctx, cx, cy + 1, r)
  else if (kind === 'storm') drawHexagonPath(ctx, cx, cy - 2, r)
  else drawShieldPath(ctx, cx, cy - 2, r)

  ctx.fillStyle = HAZARD_COLORS[kind]
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  drawHazardGlyph(ctx, kind, cx, kind === 'volcano' ? cy + 3 : kind === 'flood' ? cy + 2 : cy + 1)
  return ctx.getImageData(0, 0, size, size)
}

export function registerHazardIcons(map: MapLibreMap): void {
  const kinds: HazardKind[] = ['wildfire', 'suspected', 'volcano', 'flood', 'storm', 'other']
  for (const kind of kinds) {
    const id = `hazard-${kind}`
    if (!map.hasImage(id)) {
      map.addImage(id, buildHazardCanvas(kind), { pixelRatio: 2 })
    }
  }
}

export function syncUserMarkerElement(el: HTMLDivElement, profile: Profile | null): void {
  el.replaceChildren()
  if (!profile) {
    el.className = 'me-dot'
    el.style.cssText = ''
    el.title = 'Lokasi Anda'
    return
  }

  el.className = 'me-avatar-pin'
  el.style.cssText = [
    'width: 38px',
    'height: 38px',
    'border-radius: 9999px',
    'border: 3px solid #FFFFFF',
    'background: #2F8A57',
    'color: #FFFFFF',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'overflow: hidden',
    'font-weight: 800',
    'font-size: 14px',
    'box-shadow: 0 0 0 6px rgba(47, 138, 87, 0.22), 0 4px 12px rgba(19, 36, 26, 0.28)',
  ].join(';')
  el.title = profile.full_name || 'Lokasi Anda'

  if (profile.avatar_url) {
    const img = document.createElement('img')
    img.src = profile.avatar_url
    img.alt = profile.full_name
    img.referrerPolicy = 'no-referrer'
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
    el.appendChild(img)
  } else {
    el.textContent = profile.full_name?.slice(0, 1).toUpperCase() || 'W'
  }
}

const EVENT_TONE_COLOR: Record<string, string> = {
  critical: '#EF4444',
  medium: '#F59E0B',
  open: '#2F8A57',
  in_progress: '#2563EB',
  resolved: '#0EA5E9',
  cancelled: '#6B7280',
}

function detectEventShapeKind(ev: ConservationEvent): 'flood' | 'wildfire' | 'waste' | 'leaf' {
  const txt = `${ev.category} ${ev.title} ${ev.ecosystem}`.toLowerCase()
  if (txt.includes('banjir') || txt.includes('flood') || ev.ecosystem === 'watershed') return 'flood'
  if (txt.includes('bakar') || txt.includes('api') || txt.includes('fire')) return 'wildfire'
  if (txt.includes('sampah') || txt.includes('limbah') || txt.includes('waste')) return 'waste'
  return 'leaf'
}

export function renderEventMarkerElement(
  el: HTMLDivElement,
  ev: ConservationEvent,
  tone: string,
  selected: boolean,
): void {
  const kind = detectEventShapeKind(ev)
  const fill = EVENT_TONE_COLOR[tone] ?? '#2F8A57'
  const scale = selected ? 1.18 : 1

  el.className = 'blam-event-pin'
  el.dataset.status = tone
  el.dataset.selected = String(selected)
  el.title = ev.title
  el.style.cssText = `cursor:pointer;transform:scale(${scale});transition:transform 150ms ease;filter:drop-shadow(0 3px 6px rgba(15,23,42,0.28));`

  const outerShape =
    kind === 'flood'
      ? '<path d="M18 3C18 3 6 15.5 6 24C6 30.6 11.4 36 18 36C24.6 36 30 30.6 30 24C30 15.5 18 3 18 3Z" fill="' + fill + '" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>'
      : kind === 'wildfire'
        ? '<path d="M18 2C24 9 30 15.5 30 23C30 30.2 24.6 36 18 36C11.4 36 6 30.2 6 23C6 15.5 12 9 18 2Z" fill="' + fill + '" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>'
        : kind === 'waste'
          ? '<polygon points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5" fill="' + fill + '" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>'
          : '<path d="M18 3C26.5 3 31 11.5 31 20C31 28.5 23.5 34.5 18 36C12.5 34.5 5 28.5 5 20C5 11.5 9.5 3 18 3Z" fill="' + fill + '" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>'

  const glyph =
    kind === 'flood'
      ? '<path d="M12 22.5Q15 19.5 18 22.5T24 22.5M12 27Q15 24 18 27T24 27" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>'
      : kind === 'wildfire'
        ? '<path d="M18 13C21 16.5 22.5 19.5 22.5 22.5C22.5 25.2 20.5 27.5 18 27.5C15.5 27.5 13.5 25.2 13.5 22.5C13.5 19.5 15 16.5 18 13Z" fill="#FFFFFF"/>'
        : kind === 'waste'
          ? '<path d="M13 15H23M15 15V13.5H21V15M14.5 15L15.3 24.5H20.7L21.5 15" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="M18 27V17M18 22C14.5 22 12.5 19.5 12.5 16.5C15.5 16.5 18 18.5 18 22ZM18 19.5C21.5 19.5 23.5 17 23.5 14C20.5 14 18 16 18 19.5Z" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'

  el.innerHTML = `<svg width="34" height="36" viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg">${outerShape}${glyph}</svg>`
}
