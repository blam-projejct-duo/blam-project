import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ConservationEvent, HazardKind, Profile } from '../../types'

const VERIFIED_HAZARD_COLORS: Record<HazardKind, string> = {
  wildfire: '#EF4444',
  suspected: '#EF4444',
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

function drawHazardGlyph(
  ctx: CanvasRenderingContext2D,
  kind: HazardKind,
  cx: number,
  cy: number,
  color = '#FFFFFF',
  scale = 1,
) {
  const targetSize = 24 * scale
  ctx.save()
  ctx.translate(cx - targetSize / 2, cy - targetSize / 2)
  ctx.scale(scale, scale)
  ctx.strokeStyle = color
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
  const cy = size / 2
  const r = 26

  ctx.shadowColor = 'rgba(15, 23, 42, 0.22)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 251, 235, 0.95)'
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.save()
  ctx.setLineDash([6.5, 4.5])
  ctx.lineWidth = 3.6
  ctx.strokeStyle = '#F59E0B'
  ctx.stroke()
  ctx.restore()

  drawHazardGlyph(ctx, kind, cx, kind === 'volcano' ? cy + 0.5 : cy - 0.5, '#D97706', 0.95)
  return ctx.getImageData(0, 0, size, size)
}

function drawActionBoltBadge(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  br: number,
  fill: string,
) {
  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.25)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1.5
  ctx.beginPath()
  ctx.arc(bx, by, br, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 2.6
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(bx + br * 0.08, by - br * 0.5)
  ctx.lineTo(bx - br * 0.36, by + br * 0.06)
  ctx.lineTo(bx + br * 0.02, by + br * 0.06)
  ctx.lineTo(bx - br * 0.08, by + br * 0.5)
  ctx.lineTo(bx + br * 0.38, by - br * 0.06)
  ctx.lineTo(bx, by - br * 0.06)
  ctx.closePath()
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.restore()
}

function buildVerifiedHazardCanvas(kind: HazardKind): ImageData {
  const size = 84
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2 + 2
  const r = 28

  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)'
  ctx.shadowBlur = 7
  ctx.shadowOffsetY = 3

  if (kind === 'flood') drawDropletPath(ctx, cx, cy, r)
  else if (kind === 'wildfire' || kind === 'suspected') drawFlamePath(ctx, cx, cy, r)
  else if (kind === 'volcano') drawTrianglePeakPath(ctx, cx, cy + 1, r)
  else if (kind === 'storm') drawHexagonPath(ctx, cx, cy - 2, r)
  else drawShieldPath(ctx, cx, cy - 2, r)

  ctx.fillStyle = VERIFIED_HAZARD_COLORS[kind]
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  drawHazardGlyph(ctx, kind, cx, kind === 'volcano' ? cy + 3 : kind === 'flood' ? cy + 2 : cy + 1)
  return ctx.getImageData(0, 0, size, size)
}

function buildActionHazardCanvas(kind: HazardKind): ImageData {
  const size = 90
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2 + 2
  const r = 29

  ctx.shadowColor = 'rgba(15, 23, 42, 0.3)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3

  drawHexagonPath(ctx, cx, cy - 1, r)
  ctx.fillStyle = '#15803D'
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy - 1, 16.5, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()

  drawHazardGlyph(ctx, kind, cx, cy - 1, '#15803D', 0.85)
  drawActionBoltBadge(ctx, cx + 20, cy - 19, 11.2, '#2F8A57')

  return ctx.getImageData(0, 0, size, size)
}

export function registerHazardIcons(map: MapLibreMap): void {
  const kinds: HazardKind[] = ['wildfire', 'suspected', 'volcano', 'flood', 'storm', 'other']
  for (const kind of kinds) {
    const rawId = `hazard-${kind}`
    if (!map.hasImage(rawId)) {
      map.addImage(rawId, buildHazardCanvas(kind), { pixelRatio: 2 })
    }
    const verifiedId = `hazard-verified-${kind}`
    if (!map.hasImage(verifiedId)) {
      map.addImage(verifiedId, buildVerifiedHazardCanvas(kind), { pixelRatio: 2 })
    }
    const actionId = `hazard-action-${kind}`
    if (!map.hasImage(actionId)) {
      map.addImage(actionId, buildActionHazardCanvas(kind), { pixelRatio: 2 })
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

const EVENT_STATUS_STYLE: Record<string, { fill: string; badgeFill: string; halo: string; check?: boolean }> = {
  open: { fill: '#15803D', badgeFill: '#22C55E', halo: 'rgba(21, 128, 61, 0.26)' },
  in_progress: { fill: '#2563EB', badgeFill: '#3B82F6', halo: 'rgba(37, 99, 235, 0.26)' },
  resolved: { fill: '#059669', badgeFill: '#047857', halo: 'rgba(5, 150, 105, 0.24)', check: true },
  cancelled: { fill: '#6B7280', badgeFill: '#9CA3AF', halo: 'rgba(107, 114, 128, 0.2)' },
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
  const palette = EVENT_STATUS_STYLE[ev.status] ?? EVENT_STATUS_STYLE.open
  const scale = selected ? 1.16 : 1

  el.className = 'blam-event-pin'
  el.dataset.status = tone
  el.dataset.selected = String(selected)
  el.title = `Gerakan: ${ev.title}`
  el.style.cssText = `cursor:pointer;transform-origin:50% 100%;transform:scale(${scale});transition:transform 150ms ease;filter:${
    selected
      ? 'drop-shadow(0 0 9px rgba(21,128,61,0.52)) drop-shadow(0 5px 12px rgba(15,23,42,0.34))'
      : 'drop-shadow(0 4px 8px rgba(15,23,42,0.3))'
  };`

  const glyphColor = palette.fill
  const glyph =
    kind === 'flood'
      ? `<path d="M16.5 18.2Q19.75 15.4 23 18.2T29.5 18.2M16.5 22.4Q19.75 19.6 23 22.4T29.5 22.4" fill="none" stroke="${glyphColor}" stroke-width="2.2" stroke-linecap="round"/>`
      : kind === 'wildfire'
        ? `<path d="M23 12.2C25.8 15.2 27 17.6 27 20.1C27 22.5 25.2 24.5 23 24.5C20.8 24.5 19 22.5 19 20.1C19 17.6 20.2 15.2 23 12.2Z" fill="${glyphColor}"/>`
        : kind === 'waste'
          ? `<path d="M18 15.5H28M20 15.5V14H26V15.5M19.4 15.5L20.1 24H25.9L26.6 15.5" fill="none" stroke="${glyphColor}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="M23 25V16M23 20.5C19.8 20.5 18 18.3 18 15.5C20.8 15.5 23 17.3 23 20.5ZM23 18.3C26.2 18.3 28 16.1 28 13.3C25.2 13.3 23 15.1 23 18.3Z" fill="none" stroke="${glyphColor}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`

  const cornerBadge = palette.check
    ? `<circle cx="36" cy="9.5" r="6.4" fill="${palette.badgeFill}" stroke="#FFFFFF" stroke-width="2.2"/><path d="M33.2 9.6l1.9 1.9 3.6-3.7" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="36" cy="9.5" r="6.4" fill="${palette.badgeFill}" stroke="#FFFFFF" stroke-width="2.2"/><path d="M36.5 5.8L33.6 9.8H36.1L35.4 13.2L38.4 9.2H35.9L36.5 5.8Z" fill="#FFFFFF"/>`

  el.innerHTML = `<svg width="46" height="56" viewBox="0 0 46 56" xmlns="http://www.w3.org/2000/svg"><ellipse cx="23" cy="50.5" rx="8.5" ry="3" fill="${palette.halo}"/><path d="M23 3.2C13.9 3.2 6.5 10.6 6.5 19.7C6.5 31.2 19.4 44.6 22 47.1C22.6 47.7 23.4 47.7 24 47.1C26.6 44.6 39.5 31.2 39.5 19.7C39.5 10.6 32.1 3.2 23 3.2Z" fill="${palette.fill}" stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round"/><circle cx="23" cy="19.2" r="11.2" fill="#FFFFFF"/>${glyph}${cornerBadge}</svg>`
}
