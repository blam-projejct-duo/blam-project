import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ConservationEvent, HazardKind, Profile } from '../../types'

const VERIFIED_HAZARD_COLORS: Record<HazardKind, string> = {
  wildfire: '#EA580C',
  suspected: '#EAB308',
  volcano: '#6D28D9',
  flood: '#2563EB',
  storm: '#0E7490',
  other: '#D97706',
}

function drawPinpointPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const headY = cy - r * 0.22
  const tipY = cy + r * 1.18
  const headR = r * 0.92
  ctx.beginPath()
  ctx.arc(cx, headY, headR, Math.PI * 0.85, Math.PI * 0.15, false)
  ctx.quadraticCurveTo(cx + headR * 0.86, headY + headR * 0.95, cx, tipY)
  ctx.quadraticCurveTo(cx - headR * 0.86, headY + headR * 0.95, cx - headR * Math.cos(Math.PI * 0.15), headY + headR * Math.sin(Math.PI * 0.15))
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
  const r = 27

  ctx.shadowColor = 'rgba(15, 23, 42, 0.2)'
  ctx.shadowBlur = 5
  ctx.shadowOffsetY = 2

  drawPinpointPath(ctx, cx, cy, r)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.lineWidth = 3.2
  ctx.strokeStyle = '#94A3B8'
  ctx.stroke()
  ctx.restore()

  drawHazardGlyph(ctx, kind, cx, cy - r * 0.22, '#475569', 0.88)
  return ctx.getImageData(0, 0, size, size)
}

function buildVerifiedHazardCanvas(kind: HazardKind): ImageData {
  const size = 84
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = 28

  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)'
  ctx.shadowBlur = 7
  ctx.shadowOffsetY = 3

  drawPinpointPath(ctx, cx, cy, r)
  ctx.fillStyle = VERIFIED_HAZARD_COLORS[kind]
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  drawHazardGlyph(ctx, kind, cx, cy - r * 0.22, '#FFFFFF', 0.9)
  return ctx.getImageData(0, 0, size, size)
}

function buildActionHazardCanvas(kind: HazardKind): ImageData {
  const size = 90
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const r = 29

  ctx.shadowColor = 'rgba(15, 23, 42, 0.3)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3

  drawPinpointPath(ctx, cx, cy, r)
  ctx.fillStyle = '#15803D'
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy - r * 0.22, 15.5, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()

  drawHazardGlyph(ctx, kind, cx, cy - r * 0.22, '#15803D', 0.82)

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

export function buildUserPinImage(profile: Profile | null): Promise<ImageData> {
  const size = 104 // @2x untuk 52x52 logical px (termasuk halo)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2

  const drawFallbackAvatar = () => {
    ctx.clearRect(0, 0, size, size)
    // Halo luar
    ctx.beginPath()
    ctx.arc(cx, cy, 48, 0, Math.PI * 2)
    ctx.fillStyle = profile ? 'rgba(47, 138, 87, 0.24)' : 'rgba(37, 99, 235, 0.22)'
    ctx.fill()

    if (!profile) {
      // Guest dot biru
      ctx.save()
      ctx.shadowColor = 'rgba(15, 23, 42, 0.28)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 3
      ctx.beginPath()
      ctx.arc(cx, cy, 17, 0, Math.PI * 2)
      ctx.fillStyle = '#2563EB'
      ctx.fill()
      ctx.restore()

      ctx.lineWidth = 6
      ctx.strokeStyle = '#FFFFFF'
      ctx.stroke()
      return ctx.getImageData(0, 0, size, size)
    }

    // Lingkaran avatar hijau + inisial
    ctx.save()
    ctx.shadowColor = 'rgba(19, 36, 26, 0.3)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 4
    ctx.beginPath()
    ctx.arc(cx, cy, 35, 0, Math.PI * 2)
    ctx.fillStyle = '#2F8A57'
    ctx.fill()
    ctx.restore()

    ctx.lineWidth = 6
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()

    const initial = profile.full_name?.slice(0, 1).toUpperCase() || 'W'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initial, cx, cy + 1)
    return ctx.getImageData(0, 0, size, size)
  }

  const avatarUrl = profile?.avatar_url
  if (!avatarUrl) {
    return Promise.resolve(drawFallbackAvatar())
  }

  return new Promise<ImageData>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      try {
        ctx.clearRect(0, 0, size, size)
        ctx.beginPath()
        ctx.arc(cx, cy, 48, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(47, 138, 87, 0.24)'
        ctx.fill()

        ctx.save()
        ctx.shadowColor = 'rgba(19, 36, 26, 0.3)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 4
        ctx.beginPath()
        ctx.arc(cx, cy, 35, 0, Math.PI * 2)
        ctx.fillStyle = '#2F8A57'
        ctx.fill()
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, 32, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, cx - 32, cy - 32, 64, 64)
        ctx.restore()

        ctx.beginPath()
        ctx.arc(cx, cy, 35, 0, Math.PI * 2)
        ctx.lineWidth = 6
        ctx.strokeStyle = '#FFFFFF'
        ctx.stroke()

        resolve(ctx.getImageData(0, 0, size, size))
      } catch {
        resolve(drawFallbackAvatar())
      }
    }
    img.onerror = () => resolve(drawFallbackAvatar())
    img.src = avatarUrl
  })
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
  in_progress: { fill: '#15803D', badgeFill: '#22C55E', halo: 'rgba(21, 128, 61, 0.26)' },
  resolved: { fill: '#15803D', badgeFill: '#22C55E', halo: 'rgba(21, 128, 61, 0.26)', check: true },
  cancelled: { fill: '#15803D', badgeFill: '#22C55E', halo: 'rgba(21, 128, 61, 0.26)' },
}

function detectEventShapeKind(ev: ConservationEvent): 'flood' | 'wildfire' | 'waste' | 'leaf' {
  const txt = `${ev.category} ${ev.title} ${ev.ecosystem}`.toLowerCase()
  if (txt.includes('banjir') || txt.includes('flood') || ev.ecosystem === 'watershed') return 'flood'
  if (txt.includes('bakar') || txt.includes('api') || txt.includes('fire')) return 'wildfire'
  if (txt.includes('sampah') || txt.includes('limbah') || txt.includes('waste')) return 'waste'
  return 'leaf'
}

export function eventPinImageId(ev: ConservationEvent, selected: boolean): string {
  const kind = detectEventShapeKind(ev)
  const status = EVENT_STATUS_STYLE[ev.status] ? ev.status : 'open'
  return `event-pin-${kind}-${status}-${selected ? 'sel' : 'def'}`
}

function buildEventPinSvg(ev: ConservationEvent, selected: boolean): string {
  const kind = detectEventShapeKind(ev)
  const palette = EVENT_STATUS_STYLE[ev.status] ?? EVENT_STATUS_STYLE.open
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

  const ring = selected
    ? `<circle cx="23" cy="19.7" r="20" fill="none" stroke="${palette.badgeFill}" stroke-opacity="0.45" stroke-width="3"/>`
    : ''

  return `<svg width="46" height="56" viewBox="0 0 46 56" style="display:block" xmlns="http://www.w3.org/2000/svg">${ring}<ellipse cx="23" cy="50.5" rx="8.5" ry="3" fill="${palette.halo}"/><path d="M23 3.2C13.9 3.2 6.5 10.6 6.5 19.7C6.5 31.2 19.4 44.6 22 47.1C22.6 47.7 23.4 47.7 24 47.1C26.6 44.6 39.5 31.2 39.5 19.7C39.5 10.6 32.1 3.2 23 3.2Z" fill="${palette.fill}" stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round"/><circle cx="23" cy="19.2" r="11.2" fill="#FFFFFF"/>${glyph}${cornerBadge}</svg>`
}

const pendingEventIcons = new Map<string, Promise<void>>()

export function ensureEventPinImages(
  map: MapLibreMap,
  events: ConservationEvent[],
  selectedId: string | null,
): Promise<void> {
  const jobs: Promise<void>[] = []
  for (const ev of events) {
    const selected = ev.id === selectedId
    const id = eventPinImageId(ev, selected)
    if (map.hasImage(id)) continue
    let job = pendingEventIcons.get(id)
    if (!job) {
      const svg = buildEventPinSvg(ev, selected)
      job = new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          try {
            if (!map.hasImage(id)) {
              const canvas = document.createElement('canvas')
              canvas.width = 112
              canvas.height = 132
              const ctx = canvas.getContext('2d')!
              ctx.shadowColor = selected ? 'rgba(21,128,61,0.45)' : 'rgba(15,23,42,0.3)'
              ctx.shadowBlur = selected ? 14 : 10
              ctx.shadowOffsetY = 5
              ctx.drawImage(img, 10, 10, 92, 112)
              map.addImage(id, ctx.getImageData(0, 0, 112, 132), { pixelRatio: 2 })
            }
          } finally {
            pendingEventIcons.delete(id)
            resolve()
          }
        }
        img.onerror = () => {
          pendingEventIcons.delete(id)
          resolve()
        }
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
      })
      pendingEventIcons.set(id, job)
    }
    jobs.push(job)
  }
  return Promise.all(jobs).then(() => undefined)
}

export function renderEventMarkerElement(
  el: HTMLDivElement,
  ev: ConservationEvent,
  tone: string,
  selected: boolean,
): void {
  const scale = selected ? 1.16 : 1

  el.className = 'blam-event-pin'
  el.dataset.status = tone
  el.dataset.selected = String(selected)
  el.title = `Aksi: ${ev.title}`
  el.style.cssText = `cursor:pointer;transform-origin:50% 89%;transform:scale(${scale});transition:transform 150ms ease;filter:${
    selected
      ? 'drop-shadow(0 0 9px rgba(21,128,61,0.52)) drop-shadow(0 5px 12px rgba(15,23,42,0.34))'
      : 'drop-shadow(0 4px 8px rgba(15,23,42,0.3))'
  };`

  el.innerHTML = buildEventPinSvg(ev, selected)
}
