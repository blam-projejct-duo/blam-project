import { LngLatBounds, Map as MapLibreMap, Popup, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'react'
import type { CitizenReport, ConservationEvent, MapStyle, Profile, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import type { ActiveRoute } from './directions'
import { hazardToSignal, severityRank } from './hotspotCluster'
import type { HazardPoint } from './hotspotCluster'
import { getIndonesiaWipeSources, INDONESIA_GEOJSON, WIPE_SOFTNESS } from './indonesiaWipe'
import { buildUserPinImage, ensureEventPinImages, eventPinImageId, registerHazardIcons } from './mapMarkers'
import { applyMapStyle, createInitialMapStyle, ensureGoogleSatelliteLayer } from './mapStyles'
import { formatFloodRiskLabel, formatSignalDate, formatSignalSource } from './radarFilters'
import SpaceBackdrop from './SpaceBackdrop'
import type { SpaceCameraState } from './SpaceBackdrop'

setWorkerUrl(maplibreWorkerUrl)

const INDONESIA_CENTER: [number, number] = [117.5, -2.0]
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [94.8, -11.2],
  [141.2, 6.2],
]
const DEFAULT_CENTER: [number, number] = [102.262, -3.8]
const LOCATE_ZOOM = 17.2
const FLAT_MODE_ZOOM = 4.25
/** Di bawah zoom ini proyeksi masih globe penuh — bola bumi digeser ke area yang tidak tertutup panel. */
const GLOBE_INSET_MAX_ZOOM = 3.45
const ZERO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 }

const WIPE_DURATION_MS = 760

function indonesiaPalette(style: MapStyle) {
  return style === 'terang'
    ? { fill: '#4664FF', glow: '#3B5BFF', outline: '#243AE6', fillPeak: 0.44, outlinePeak: 0.92 }
    : { fill: '#3B82F6', glow: '#60A5FA', outline: '#60A5FA', fillPeak: 0.4, outlinePeak: 0.94 }
}

function zoomOpacityExpr(peak: number, mid: number, wipeProgress?: number) {
  const factor = (val: number) =>
    wipeProgress === undefined
      ? val
      : ['*', val, ['min', 1, ['max', 0, ['/', ['-', wipeProgress, ['get', 'p']], WIPE_SOFTNESS]]]]
  return ['interpolate', ['linear'], ['zoom'], 6.5, factor(peak), 11, factor(mid), 13.5, 0] as never
}

function setIndonesiaLayers(
  map: MapLibreMap,
  prefix: 'blam-indonesia' | 'blam-indonesia-wipe',
  visible: boolean,
  style: MapStyle,
  wipeProgress?: number,
): void {
  const fillId = `${prefix}-fill`
  if (!map.getLayer(fillId)) return
  const c = indonesiaPalette(style)
  map.setPaintProperty(fillId, 'fill-color', c.fill)
  map.setPaintProperty(fillId, 'fill-opacity', visible ? zoomOpacityExpr(c.fillPeak, 0.14, wipeProgress) : 0)
  map.setPaintProperty(`${prefix}-glow`, 'line-color', c.glow)
  map.setPaintProperty(`${prefix}-glow`, 'line-opacity', visible ? zoomOpacityExpr(0.22, 0.08, wipeProgress) : 0)
  map.setPaintProperty(`${prefix}-outline`, 'line-color', c.outline)
  map.setPaintProperty(`${prefix}-outline`, 'line-opacity', visible ? zoomOpacityExpr(c.outlinePeak, 0.45, wipeProgress) : 0)
}

function setBaseTransition(map: MapLibreMap, duration: number): void {
  if (!map.getLayer('blam-indonesia-fill')) return
  const tr = { duration }
  map.setPaintProperty('blam-indonesia-fill', 'fill-opacity-transition', tr)
  map.setPaintProperty('blam-indonesia-glow', 'line-opacity-transition', tr)
  map.setPaintProperty('blam-indonesia-outline', 'line-opacity-transition', tr)
}

function hideWipeLayers(map: MapLibreMap): void {
  for (const suffix of ['fill', 'glow', 'outline'] as const) {
    const id = `blam-indonesia-wipe-${suffix}`
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
  }
}

function showWipeLayers(map: MapLibreMap): void {
  for (const suffix of ['fill', 'glow', 'outline'] as const) {
    const id = `blam-indonesia-wipe-${suffix}`
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible')
  }
}

export interface MapPadding {
  bottom: number
  right: number
  left?: number
}

export interface ZoomCommand {
  id: number
  dir: 1 | -1
}

interface Props {
  events: ConservationEvent[]
  /** kawasan radar (karhutla, gunung berapi, banjir, titik panas) */
  hazards: HazardPoint[]
  selectedId: string | null
  selectedSignal?: SatelliteSignal | null
  activeRoute?: ActiveRoute | null
  onSelect: (id: string) => void
  onSelectSignal?: (signal: SatelliteSignal) => void
  style: MapStyle
  padding: MapPadding
  fitAllSignal: number
  fitIndonesiaSignal?: number
  locateSignal: number
  radarMode?: boolean
  zoomCommand?: ZoomCommand | null
  focusTarget?: { id: number; lat: number; lng: number; zoom?: number } | null
  /** Lebar (px) area kiri yang tertutup panel; di mode globe bumi digeser ke kanan sebesar setengahnya. */
  globeInsetLeft?: number
  /** Titik laporan antrean moderasi yang ditampilkan khusus di mode Admin. */
  adminReports?: CitizenReport[]
}

function buildEventGeoJson(events: ConservationEvent[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: events.map((ev) => {
      const selected = ev.id === selectedId
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [ev.lng, ev.lat] as [number, number] },
        properties: {
          id: ev.id,
          icon: eventPinImageId(ev, selected),
          selected,
        },
      }
    }),
  }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function computeGlobeMinZoom(w: number, h: number): number {
  if (w <= 0 || h <= 0) return 1.4
  const targetPx = Math.min(w, h) * 0.9
  const u = targetPx / h
  const k = (u * u / 3 + Math.sqrt((u ** 4) / 9 + u * u)) / 2
  const z = Math.log2((2 * Math.PI * k * h) / 512)
  return Math.min(4.0, Math.max(0.5, Number(z.toFixed(2))))
}

function normalizeAngle(deg: number): number {
  return ((deg + 540) % 360) - 180
}

function syncFlatRotationLock(map: MapLibreMap): void {
  map.setMinPitch(0)
  map.setMaxPitch(0)
  map.touchPitch.disable()
  map.keyboard.disableRotation()
  if (map.getZoom() >= FLAT_MODE_ZOOM) {
    map.dragRotate.enable({ around: 'center' })
    map.touchZoomRotate.enableRotation()
  } else {
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
  }
  if (map.getPitch() !== 0) {
    map.jumpTo({ pitch: 0 })
  }
}

const VERIFIED_HAZARD_COLOR = [
  'match',
  ['get', 'kind'],
  'wildfire',
  '#F97316',
  'suspected',
  '#EAB308',
  'volcano',
  '#7C3AED',
  'flood',
  '#2563EB',
  'storm',
  '#0891B2',
  '#F59E0B',
] as never

function buildHazardGeoJson(list: HazardPoint[], visibleEvents: ConservationEvent[] = []) {
  const visibleEventIds = new Set(visibleEvents.map((ev) => ev.id))
  return {
    type: 'FeatureCollection' as const,
    features: list
      .filter((h) => !(h.verificationState === 'has_action' && h.linkedEventId && visibleEventIds.has(h.linkedEventId)))
      .map((h) => ({
        type: 'Feature' as const,
        properties: {
          id: h.id,
          kind: h.kind,
          kindLabel: h.kindLabel,
          tier: h.verificationState ?? 'unverified',
          sev: severityRank(h.severity),
          n: h.pointCount,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [h.lng, h.lat],
        },
      })),
  }
}

function createHazardPopupNode(h: HazardPoint): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-0.5 text-left'

  const title = document.createElement('p')
  title.className = 'text-[14px] font-semibold text-ink'
  title.textContent = h.title

  const meta = document.createElement('p')
  meta.className = 'text-[12px] font-normal text-ink-soft'
  const src = formatSignalSource(h.source)
  const riskLabel = formatFloodRiskLabel(h)
  const dateLabel = formatSignalDate(h)
  const tierLabel =
    h.verificationState === 'has_action'
      ? 'Ada Gerakan'
      : h.verificationState === 'verified'
        ? 'Terverifikasi'
        : 'Prediksi Satelit'
  meta.textContent = `${tierLabel} · ${riskLabel ?? h.kindLabel} · ${src}${dateLabel ? ` · ${dateLabel}` : ''}`

  root.append(title, meta)
  return root
}

function buildRouteGeoJson(route: ActiveRoute | null) {
  if (!route || route.coordinates.length < 2) {
    return { type: 'FeatureCollection' as const, features: [] }
  }
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: { mode: route.mode },
        geometry: {
          type: 'LineString' as const,
          coordinates: route.coordinates,
        },
      },
    ],
  }
}

function visualOffset(pad: MapPadding, topOffset = 44): [number, number] {
  const left = pad.left ?? 0
  const top = pad.bottom > 0 ? topOffset : 0
  return [Math.round((left - pad.right) / 2), Math.round((top - pad.bottom) / 2)]
}

function fitBox(
  map: MapLibreMap,
  bounds: LngLatBounds | [[number, number], [number, number]],
  pad: { top: number; bottom: number; left: number; right: number },
  duration: number,
  maxZoom = 15,
): void {
  const host = map.getContainer()
  const h = host.clientHeight
  const w = host.clientWidth
  if (h <= 0 || w <= 0) return

  const safeTop = Math.min(pad.top, Math.floor(h * 0.25))
  const safeBottom = Math.min(pad.bottom, Math.max(0, h - safeTop - Math.min(180, Math.floor(h * 0.35))))
  const safeLeft = Math.min(pad.left, Math.max(0, w - Math.min(260, Math.floor(w * 0.45))))
  const safeRight = Math.min(pad.right, Math.max(0, w - safeLeft - Math.min(260, Math.floor(w * 0.45))))
  const safePad = {
    top: safeTop,
    bottom: safeBottom,
    left: safeLeft,
    right: safeRight,
  }

  // Always clear stale persistent padding so cameraForBounds never double-subtracts it.
  // Padding lama (mis. inset globe) dipulihkan lagi sebelum render agar tidak ada lompatan,
  // lalu dianimasikan ke nol bersama kamera.
  map.stop()
  const prevPad = map.getPadding()
  map.setPadding(ZERO_PADDING)
  const cam = map.cameraForBounds(bounds, { padding: safePad, maxZoom })
  map.setPadding(prevPad)
  if (!cam?.center || cam.zoom === undefined) return

  const farJump = Math.abs(map.getZoom() - cam.zoom) > 5
  const opts = { center: cam.center, zoom: cam.zoom, bearing: 0, pitch: 0, padding: ZERO_PADDING, duration, essential: true }
  if (duration > 0 && farJump) {
    map.flyTo(opts)
  } else {
    map.easeTo(opts)
  }
}

function buildSinglePointGeoJson(coords: [number, number] | null) {
  return {
    type: 'FeatureCollection' as const,
    features: coords
      ? [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: coords }, properties: {} }]
      : [],
  }
}

function buildAdminReportsGeoJson(reports: CitizenReport[]) {
  return {
    type: 'FeatureCollection' as const,
    features: reports.map((r) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] as [number, number] },
      properties: {
        id: r.id,
        title: r.title,
        location: r.location_name,
        critical: r.ai_severity === 'critical' || r.status === 'escalated' ? 1 : 0,
        mismatch: r.location_mismatch ? 1 : 0,
      },
    })),
  }
}

export default function MapView({
  events,
  hazards,
  selectedId,
  selectedSignal = null,
  activeRoute = null,
  onSelect,
  onSelectSignal,
  style,
  padding,
  fitAllSignal,
  fitIndonesiaSignal = 0,
  locateSignal,
  radarMode = false,
  zoomCommand,
  focusTarget = null,
  globeInsetLeft = 0,
  adminReports = [],
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const readyRef = useRef(false)
  const { profile } = useAuth()
  const userCoordRef = useRef<[number, number]>(DEFAULT_CENTER)
  const profileRef = useRef<Profile | null>(profile)
  const focusCoordRef = useRef<[number, number] | null>(null)
  const adminReportsRef = useRef<CitizenReport[]>(adminReports)
  const popupRef = useRef<Popup | null>(null)
  const wipeRafRef = useRef<number>(0)
  const wipeTimerRef = useRef<number>(0)
  const moveEndHandlerRef = useRef<(() => void) | null>(null)
  const pendingWipeRef = useRef(false)
  const wipeDoneRef = useRef(false)
  const prevRadarRef = useRef(false)

  const onSelectRef = useRef(onSelect)
  const onSelectSignalRef = useRef(onSelectSignal)
  const paddingRef = useRef(padding)
  const eventsRef = useRef(events)
  const hazardsRef = useRef(hazards)
  const activeRouteRef = useRef(activeRoute)
  const selectedIdRef = useRef(selectedId)
  const selectedSignalRef = useRef(selectedSignal)
  const radarPadRef = useRef<{ bottom: number; left: number; right: number }>({ bottom: 0, left: 0, right: 0 })
  const styleRef = useRef(style)
  const radarModeRef = useRef(radarMode)
  const fitIndonesiaSignalRef = useRef(fitIndonesiaSignal)
  const rotatingRef = useRef(false)
  const rotatedGestureRef = useRef(false)
  const internalBearingRef = useRef(false)
  const prevZoomRef = useRef(4.3)
  const zoomStartRef = useRef(4.3)
  const globeInsetRef = useRef(globeInsetLeft)
  const spaceCamRef = useRef<SpaceCameraState>({
    lng: INDONESIA_CENTER[0],
    lat: INDONESIA_CENTER[1],
    zoom: 4.3,
  })

  /** Padding kamera untuk zoom tertentu: penuh di mode globe, memudar ke nol saat transisi ke peta datar. */
  const globePaddingFor = (zoom: number) => {
    const inset = globeInsetRef.current
    if (inset <= 0 || zoom >= FLAT_MODE_ZOOM) return ZERO_PADDING
    const t = Math.min(1, Math.max(0, (FLAT_MODE_ZOOM - zoom) / (FLAT_MODE_ZOOM - GLOBE_INSET_MAX_ZOOM)))
    return { top: 0, bottom: 0, right: 0, left: Math.round(inset * t) }
  }

  /** Geser bumi (animasi) bila padding saat ini tidak sesuai target untuk zoom sekarang. */
  const syncGlobeInset = (duration: number) => {
    const map = mapRef.current
    if (!map || map.isMoving()) return
    const target = globePaddingFor(map.getZoom())
    if (Math.abs((map.getPadding().left ?? 0) - target.left) < 1) return
    map.easeTo({ padding: target, duration: reducedMotion() ? 0 : duration, essential: true })
  }

  useEffect(() => {
    globeInsetRef.current = globeInsetLeft
    syncGlobeInset(420)
  }, [globeInsetLeft])
  useEffect(() => {
    onSelectRef.current = onSelect
    onSelectSignalRef.current = onSelectSignal
    paddingRef.current = padding
    if (radarMode && (padding.bottom > 0 || (padding.left ?? 0) > 0)) {
      radarPadRef.current = {
        bottom: padding.bottom,
        left: padding.left ?? 0,
        right: padding.right,
      }
    }
    eventsRef.current = events
    hazardsRef.current = hazards
    activeRouteRef.current = activeRoute
    selectedIdRef.current = selectedId
    selectedSignalRef.current = selectedSignal
    styleRef.current = style
    profileRef.current = profile
    radarModeRef.current = radarMode
    fitIndonesiaSignalRef.current = fitIndonesiaSignal
    if (mapRef.current) syncFlatRotationLock(mapRef.current)
  })

  const focusOn = (lat: number, lng: number, zoom: number, animate = true) => {
    const map = mapRef.current
    if (!map) return
    const farJump = Math.abs(map.getZoom() - zoom) > 6
    const duration = animate && !reducedMotion() ? (farJump ? 1150 : 850) : 0
    map.flyTo({
      center: [lng, lat],
      zoom,
      bearing: 0,
      pitch: 0,
      padding: globePaddingFor(zoom),
      offset: visualOffset(paddingRef.current),
      duration,
      essential: true,
    })
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const map = new MapLibreMap({
      container: host,
      style: createInitialMapStyle(styleRef.current),
      center: INDONESIA_CENTER,
      zoom: 4.3,
      minZoom: computeGlobeMinZoom(host.clientWidth, host.clientHeight),
      maxZoom: 18,
      bearing: 0,
      pitch: 0,
      minPitch: 0,
      maxPitch: 0,
      pitchWithRotate: false,
      rollEnabled: false,
      dragRotate: { around: 'center' },
      touchZoomRotate: true,
      touchPitch: false,
      maxTileCacheZoomLevels: 18,
      refreshExpiredTiles: false,
      cancelPendingTileRequestsWhileZooming: true,
      fadeDuration: 0,
      attributionControl: { compact: true },
      canvasContextAttributes: { alpha: true },
    })

    const userToggledAttribRef = { current: false }
    const collapseDefaultAttrib = () => {
      if (userToggledAttribRef.current) return
      const attrib = host.querySelector('.maplibregl-ctrl-attrib')
      if (attrib) {
        attrib.classList.remove('maplibregl-compact-show')
        attrib.removeAttribute('open')
      }
    }
    const onAttribClick = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest('.maplibregl-ctrl-attrib-button')) {
        userToggledAttribRef.current = true
      }
    }
    host.addEventListener('click', onAttribClick, true)
    collapseDefaultAttrib()
    requestAnimationFrame(collapseDefaultAttrib)

    syncFlatRotationLock(map)
    prevZoomRef.current = map.getZoom()
    zoomStartRef.current = map.getZoom()
    spaceCamRef.current = {
      lng: map.getCenter().lng,
      lat: map.getCenter().lat,
      zoom: map.getZoom(),
    }

    map.on('move', () => {
      const c = map.getCenter()
      spaceCamRef.current = { lng: c.lng, lat: c.lat, zoom: map.getZoom() }
    })

    map.on('rotatestart', (e) => {
      if (!e.originalEvent || internalBearingRef.current) return
      rotatingRef.current = true
      rotatedGestureRef.current = true
    })

    map.on('rotateend', () => {
      rotatingRef.current = false
    })

    map.on('zoomstart', () => {
      const z = map.getZoom()
      zoomStartRef.current = z
      prevZoomRef.current = z
      if (!rotatingRef.current) rotatedGestureRef.current = false
    })

    map.on('zoom', (e) => {
      syncFlatRotationLock(map)
      const z = map.getZoom()
      // Zoom oleh gesture pengguna: inset globe mengikuti zoom secara mulus (animasi program sudah membawa padding sendiri).
      if (e.originalEvent) {
        const target = globePaddingFor(z)
        if (Math.abs((map.getPadding().left ?? 0) - target.left) >= 1) map.setPadding(target)
      }
      const dz = z - prevZoomRef.current
      prevZoomRef.current = z
      if (internalBearingRef.current || rotatingRef.current || map.isZooming() || Math.abs(dz) < 1e-4) return

      const b = normalizeAngle(map.getBearing())
      if (Math.abs(b) <= 0.05) return

      let nextB = b
      if (z < FLAT_MODE_ZOOM) {
        nextB = 0
      } else if (dz < 0) {
        const decayed = b * Math.pow(0.14, -dz)
        nextB = Math.abs(decayed) < 0.8 ? 0 : decayed
      } else {
        const decayed = b * Math.pow(0.72, dz)
        nextB = Math.abs(decayed) < 0.4 ? 0 : decayed
      }

      if (nextB !== b) {
        internalBearingRef.current = true
        try {
          map.setBearing(nextB)
        } finally {
          internalBearingRef.current = false
        }
      }
    })

    map.on('zoomend', () => {
      syncFlatRotationLock(map)
      const wasRotating = rotatingRef.current || rotatedGestureRef.current
      rotatedGestureRef.current = false
      if (internalBearingRef.current || wasRotating) return

      const b = normalizeAngle(map.getBearing())
      if (Math.abs(b) <= 0.1) return

      const netDz = map.getZoom() - zoomStartRef.current
      if (map.getZoom() < FLAT_MODE_ZOOM || netDz < -0.04) {
        map.easeTo({
          bearing: 0,
          pitch: 0,
          duration: reducedMotion() ? 0 : 180,
          essential: true,
        })
      }
    })

    mapRef.current = map
    readyRef.current = false

    // Setelah setiap pergerakan selesai, pastikan bumi berada di area yang tidak tertutup panel.
    map.on('moveend', () => {
      window.setTimeout(() => syncGlobeInset(260), 0)
    })

    const syncUserPinTexture = (prof: Profile | null) => {
      void buildUserPinImage(prof).then((img) => {
        const m = mapRef.current
        if (!m || !readyRef.current) return
        if (m.hasImage('blam-user-pin')) m.removeImage('blam-user-pin')
        m.addImage('blam-user-pin', img, { pixelRatio: 2 })
        const src = m.getSource('blam-user') as GeoJSONSource | undefined
        src?.setData(buildSinglePointGeoJson(userCoordRef.current))
      })
    }

    const googleSessionAbort = new AbortController()
    const canvas = map.getCanvas()
    const onContextLost = (e: Event) => {
      e.preventDefault()
    }
    const onContextRestored = () => {
      map.resize()
      map.triggerRepaint()
    }
    canvas.addEventListener('webglcontextlost', onContextLost, false)
    canvas.addEventListener('webglcontextrestored', onContextRestored, false)

    let initialized = false
    const initMapOnce = () => {
      if (initialized) return
      initialized = true
      readyRef.current = true
      void ensureGoogleSatelliteLayer(map, styleRef.current, googleSessionAbort.signal)
      collapseDefaultAttrib()

      const fillBefore = map.getLayer('building') ? 'building' : undefined
      const lineBefore = map.getLayer('satelit-labels') ? 'satelit-labels' : undefined
      const initialPalette = indonesiaPalette(styleRef.current)
      const wipeSources = getIndonesiaWipeSources()

      map.addSource('blam-indonesia', {
        type: 'geojson',
        data: INDONESIA_GEOJSON,
      })
      map.addSource('blam-indonesia-wipe-fill', {
        type: 'geojson',
        data: wipeSources.fill,
      })
      map.addSource('blam-indonesia-wipe-line', {
        type: 'geojson',
        data: wipeSources.line,
      })

      const addHighlightSet = (
        prefix: 'blam-indonesia' | 'blam-indonesia-wipe',
        fillSource: string,
        lineSource: string,
        hiddenInitially: boolean,
        fadeMs: number,
        antialias: boolean,
      ) => {
        const vis = hiddenInitially ? 'none' : 'visible'
        map.addLayer(
          {
            id: `${prefix}-fill`,
            type: 'fill',
            source: fillSource,
            layout: { visibility: vis },
            paint: {
              'fill-antialias': antialias,
              'fill-color': initialPalette.fill,
              'fill-opacity': 0,
              'fill-opacity-transition': { duration: fadeMs },
            },
          },
          fillBefore,
        )
        map.addLayer(
          {
            id: `${prefix}-glow`,
            type: 'line',
            source: lineSource,
            layout: { visibility: vis, 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': initialPalette.glow,
              'line-width': ['interpolate', ['linear'], ['zoom'], 2, 4.5, 6, 6.5, 11, 3.5],
              'line-blur': 3,
              'line-opacity': 0,
              'line-opacity-transition': { duration: fadeMs },
            },
          },
          lineBefore,
        )
        map.addLayer(
          {
            id: `${prefix}-outline`,
            type: 'line',
            source: lineSource,
            layout: { visibility: vis, 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': initialPalette.outline,
              'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.4, 6, 2.2, 11, 1.2],
              'line-opacity': 0,
              'line-opacity-transition': { duration: fadeMs },
            },
          },
          lineBefore,
        )
      }

      addHighlightSet('blam-indonesia', 'blam-indonesia', 'blam-indonesia', false, 280, true)
      addHighlightSet('blam-indonesia-wipe', 'blam-indonesia-wipe-fill', 'blam-indonesia-wipe-line', true, 0, false)
      setIndonesiaLayers(map, 'blam-indonesia', radarModeRef.current, styleRef.current)
      wipeDoneRef.current = radarModeRef.current
      prevRadarRef.current = radarModeRef.current

      map.addSource('blam-route', {
        type: 'geojson',
        data: buildRouteGeoJson(activeRouteRef.current),
      })
      map.addLayer({
        id: 'blam-route-casing',
        type: 'line',
        source: 'blam-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#FFFFFF',
          'line-opacity': 0.92,
          'line-width': ['case', ['==', ['get', 'mode'], 'air'], 6, 8],
        },
      })
      map.addLayer({
        id: 'blam-route-land',
        type: 'line',
        source: 'blam-route',
        filter: ['==', ['get', 'mode'], 'land'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563EB',
          'line-width': 4.5,
        },
      })
      map.addLayer({
        id: 'blam-route-air',
        type: 'line',
        source: 'blam-route',
        filter: ['==', ['get', 'mode'], 'air'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563EB',
          'line-width': 3.5,
          'line-dasharray': [2, 2],
        },
      })

      registerHazardIcons(map)

      // Kawasan radar: digabung otomatis saat zoom-out, terpecah saat zoom-in
      map.addSource('blam-hazards', {
        type: 'geojson',
        data: buildHazardGeoJson(hazardsRef.current, eventsRef.current),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 8,
        clusterProperties: {
          sev: ['max', ['get', 'sev']],
          hasAction: ['max', ['case', ['==', ['get', 'tier'], 'has_action'], 1, 0]],
          hasVerified: ['max', ['case', ['==', ['get', 'tier'], 'verified'], 1, 0]],
          hasVerifiedVolcano: [
            'max',
            ['case', ['all', ['==', ['get', 'tier'], 'verified'], ['==', ['get', 'kind'], 'volcano']], 1, 0],
          ],
          hasVerifiedFlood: [
            'max',
            ['case', ['all', ['==', ['get', 'tier'], 'verified'], ['==', ['get', 'kind'], 'flood']], 1, 0],
          ],
          hasVerifiedStorm: [
            'max',
            ['case', ['all', ['==', ['get', 'tier'], 'verified'], ['==', ['get', 'kind'], 'storm']], 1, 0],
          ],
          hasWildfire: ['max', ['case', ['==', ['get', 'kind'], 'wildfire'], 1, 0]],
          hasVolcano: ['max', ['case', ['==', ['get', 'kind'], 'volcano'], 1, 0]],
          hasFlood: ['max', ['case', ['==', ['get', 'kind'], 'flood'], 1, 0]],
          hasStorm: ['max', ['case', ['==', ['get', 'kind'], 'storm'], 1, 0]],
        },
      })
      map.addLayer({
        id: 'blam-hazards-cluster',
        type: 'symbol',
        source: 'blam-hazards',
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'hasAction'], 1],
            'hazard-action-wildfire',
            ['==', ['get', 'hasVerifiedVolcano'], 1],
            'hazard-verified-volcano',
            ['==', ['get', 'hasVerifiedFlood'], 1],
            'hazard-verified-flood',
            ['==', ['get', 'hasVerifiedStorm'], 1],
            'hazard-verified-storm',
            ['==', ['get', 'hasVerified'], 1],
            'hazard-verified-wildfire',
            ['==', ['get', 'hasWildfire'], 1],
            'hazard-wildfire',
            ['==', ['get', 'hasVolcano'], 1],
            'hazard-volcano',
            ['==', ['get', 'hasFlood'], 1],
            'hazard-flood',
            ['==', ['get', 'hasStorm'], 1],
            'hazard-storm',
            'hazard-suspected',
          ],
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            ['step', ['get', 'point_count'], 0.38, 4, 0.44, 10, 0.5],
            3.2,
            ['step', ['get', 'point_count'], 0.54, 4, 0.62, 10, 0.7],
            5.5,
            ['step', ['get', 'point_count'], 0.78, 4, 0.9, 10, 1.02],
            8,
            ['step', ['get', 'point_count'], 0.98, 4, 1.12, 10, 1.26],
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
      map.addLayer({
        id: 'blam-hazards-cluster-count',
        type: 'symbol',
        source: 'blam-hazards',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 7.5, 3.2, 8.5, 5.5, 10, 8, 11.5],
          'text-offset': [0.95, -0.95],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#111827',
          'text-halo-width': 2.2,
        },
      })
      map.addLayer({
        id: 'blam-hazards-halo',
        type: 'circle',
        source: 'blam-hazards',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 4, 3, 6],
            3.2,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 5.5, 3, 8.5],
            6,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 8, 3, 13.5],
            9,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 11, 3, 18],
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'tier'], 'has_action'],
            '#15803D',
            ['==', ['get', 'tier'], 'verified'],
            VERIFIED_HAZARD_COLOR,
            '#F59E0B',
          ],
          'circle-opacity': ['case', ['==', ['get', 'tier'], 'unverified'], 0.14, 0.25],
        },
      })

      map.addLayer({
        id: 'blam-hazards-core',
        type: 'symbol',
        source: 'blam-hazards',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'tier'], 'has_action'],
            ['concat', 'hazard-action-', ['get', 'kind']],
            ['==', ['get', 'tier'], 'verified'],
            ['concat', 'hazard-verified-', ['get', 'kind']],
            ['concat', 'hazard-', ['get', 'kind']],
          ],
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.36, 3, 0.44],
            3.2,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.48, 3, 0.58],
            6,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.68, 3, 0.84],
            9,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.88, 3, 1.04],
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
      map.addLayer({
        id: 'blam-hazards-label',
        type: 'symbol',
        source: 'blam-hazards',
        minzoom: 5,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': [
            'case',
            ['==', ['get', 'tier'], 'has_action'],
            ['concat', '⚡ ', ['get', 'kindLabel']],
            ['==', ['get', 'tier'], 'verified'],
            ['concat', '✓ ', ['get', 'kindLabel']],
            ['get', 'kindLabel'],
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 1.9],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111827',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1.5,
        },
      })

      map.addSource('blam-events', {
        type: 'geojson',
        data: buildEventGeoJson(eventsRef.current, selectedIdRef.current),
      })
      map.addLayer({
        id: 'blam-events-layer',
        type: 'symbol',
        source: 'blam-events',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1.5,
            ['case', ['==', ['get', 'selected'], true], 0.42, 0.34],
            3.2,
            ['case', ['==', ['get', 'selected'], true], 0.56, 0.46],
            5.5,
            ['case', ['==', ['get', 'selected'], true], 0.76, 0.65],
            9,
            ['case', ['==', ['get', 'selected'], true], 0.96, 0.82],
          ],
          'icon-anchor': 'bottom',
          'icon-offset': [0, 6],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['case', ['==', ['get', 'selected'], true], 10, 1],
        },
      })
      void ensureEventPinImages(map, eventsRef.current, selectedIdRef.current).then(() => {
        if (!mapRef.current || !readyRef.current) return
        const src = map.getSource('blam-events') as GeoJSONSource | undefined
        src?.setData(buildEventGeoJson(eventsRef.current, selectedIdRef.current))
      })

      const setPointer = (on: boolean) => {
        map.getCanvas().style.cursor = on ? 'pointer' : ''
      }
      for (const layerId of ['blam-hazards-cluster', 'blam-hazards-core', 'blam-events-layer'] as const) {
        map.on('mouseenter', layerId, () => setPointer(true))
        map.on('mouseleave', layerId, () => setPointer(false))
      }

      map.on('click', 'blam-events-layer', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') onSelectRef.current(id)
      })

      const openHazard = (id: unknown) => {
        const hz = hazardsRef.current.find((x) => x.id === id)
        if (!hz) return
        if (onSelectSignalRef.current) {
          onSelectSignalRef.current(hazardToSignal(hz))
          return
        }
        popupRef.current?.remove()
        popupRef.current = new Popup({ closeButton: false, maxWidth: '250px', className: 'blam-popup', offset: 10 })
          .setLngLat([hz.lng, hz.lat])
          .setDOMContent(createHazardPopupNode(hz))
          .addTo(map)
      }

      map.on('click', 'blam-hazards-core', (e) => {
        if (map.queryRenderedFeatures(e.point, { layers: ['blam-events-layer'] }).length > 0) return
        openHazard(e.features?.[0]?.properties?.id)
      })

      map.on('click', 'blam-hazards-cluster', (e) => {
        const feat = e.features?.[0]
        if (!feat || feat.geometry.type !== 'Point') return
        const clusterId = Number(feat.properties?.cluster_id)
        const src = map.getSource('blam-hazards') as GeoJSONSource | undefined
        if (!src || !Number.isFinite(clusterId)) return
        const [lng, lat] = feat.geometry.coordinates as [number, number]
        void src
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            const nextZoom = Math.min(zoom + 0.3, 12)
            map.easeTo({
              center: [lng, lat],
              zoom: nextZoom,
              padding: globePaddingFor(nextZoom),
              offset: visualOffset(paddingRef.current),
              duration: reducedMotion() ? 0 : 600,
            })
          })
          .catch(() => undefined)
      })

      map.addSource('blam-admin-reports', {
        type: 'geojson',
        data: buildAdminReportsGeoJson(adminReportsRef.current),
      })
      map.addLayer({
        id: 'blam-admin-reports-halo',
        type: 'circle',
        source: 'blam-admin-reports',
        paint: {
          'circle-radius': 13,
          'circle-color': ['case', ['==', ['get', 'critical'], 1], '#DC2626', '#F59E0B'],
          'circle-opacity': 0.22,
        },
      })
      map.addLayer({
        id: 'blam-admin-reports-dot',
        type: 'circle',
        source: 'blam-admin-reports',
        paint: {
          'circle-radius': 6.5,
          'circle-color': ['case', ['==', ['get', 'critical'], 1], '#DC2626', '#F59E0B'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      })
      map.on('mouseenter', 'blam-admin-reports-dot', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'blam-admin-reports-dot', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('click', 'blam-admin-reports-dot', (e) => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        const props = f.properties as { title?: string; location?: string; mismatch?: number } | undefined
        const box = document.createElement('div')
        box.className = 'flex flex-col gap-0.5 text-left'
        const t = document.createElement('p')
        t.className = 'text-[13px] font-semibold text-ink'
        t.textContent = props?.title ?? 'Laporan Warga'
        const m = document.createElement('p')
        m.className = 'text-[11px] text-ink-soft'
        m.textContent = `${props?.location ?? ''}${props?.mismatch ? ' · Mismatch >5km' : ''}`
        box.append(t, m)
        popupRef.current?.remove()
        popupRef.current = new Popup({ offset: 12, closeButton: false })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setDOMContent(box)
          .addTo(map)
      })

      map.addSource('blam-focus', {
        type: 'geojson',
        data: buildSinglePointGeoJson(focusCoordRef.current),
      })
      map.addLayer({
        id: 'blam-focus-halo',
        type: 'circle',
        source: 'blam-focus',
        paint: {
          'circle-radius': 14,
          'circle-color': '#2563EB',
          'circle-opacity': 0.2,
        },
      })
      map.addLayer({
        id: 'blam-focus-dot',
        type: 'circle',
        source: 'blam-focus',
        paint: {
          'circle-radius': 7,
          'circle-color': '#2563EB',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      })

      map.addSource('blam-user', {
        type: 'geojson',
        data: buildSinglePointGeoJson(userCoordRef.current),
      })
      map.addLayer({
        id: 'blam-user-layer',
        type: 'symbol',
        source: 'blam-user',
        layout: {
          'icon-image': 'blam-user-pin',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.62, 4.5, 0.84, 8, 1],
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
      syncUserPinTexture(profileRef.current)

      applyMapStyle(map, styleRef.current)
      window.dispatchEvent(new Event('blam:map-ready'))
    }

    map.once('style.load', initMapOnce)
    map.once('load', initMapOnce)

    let resizeRaf = 0
    const ro = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        if (host.clientWidth <= 0 || host.clientHeight <= 0) return
        map.setMinZoom(computeGlobeMinZoom(host.clientWidth, host.clientHeight))
        map.resize()
        collapseDefaultAttrib()
      })
    })
    ro.observe(host)

    return () => {
      googleSessionAbort.abort()
      canvas.removeEventListener('webglcontextlost', onContextLost, false)
      canvas.removeEventListener('webglcontextrestored', onContextRestored, false)
      host.removeEventListener('click', onAttribClick, true)
      cancelAnimationFrame(resizeRaf)
      cancelAnimationFrame(wipeRafRef.current)
      clearTimeout(wipeTimerRef.current)
      if (moveEndHandlerRef.current) map.off('moveend', moveEndHandlerRef.current)
      readyRef.current = false
      ro.disconnect()
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    applyMapStyle(map, style)
  }, [style])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    let cancelled = false
    void buildUserPinImage(profile).then((img) => {
      if (cancelled || !mapRef.current || !readyRef.current) return
      if (map.hasImage('blam-user-pin')) map.removeImage('blam-user-pin')
      map.addImage('blam-user-pin', img, { pixelRatio: 2 })
      const src = map.getSource('blam-user') as GeoJSONSource | undefined
      src?.setData(buildSinglePointGeoJson(userCoordRef.current))
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    let cancelled = false
    void ensureEventPinImages(map, events, selectedId).then(() => {
      if (cancelled || !mapRef.current || !readyRef.current) return
      const src = map.getSource('blam-events') as GeoJSONSource | undefined
      src?.setData(buildEventGeoJson(events, selectedId))
    })
    return () => {
      cancelled = true
    }
  }, [events, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource('blam-hazards') as GeoJSONSource | undefined
    src?.setData(buildHazardGeoJson(hazards, events))
  }, [hazards, events])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource('blam-route') as GeoJSONSource | undefined
    src?.setData(buildRouteGeoJson(activeRoute))
    if (!activeRoute || activeRoute.coordinates.length < 2) return

    userCoordRef.current = [activeRoute.origin.lng, activeRoute.origin.lat]
    const userSrc = map.getSource('blam-user') as GeoJSONSource | undefined
    userSrc?.setData(buildSinglePointGeoJson(userCoordRef.current))
    const bounds = new LngLatBounds()
    for (const coord of activeRoute.coordinates) bounds.extend(coord)
    const { bottom, right, left = 0 } = paddingRef.current
    fitBox(
      map,
      bounds,
      { top: 96, bottom: 56 + bottom, left: 56 + left, right: 56 + right },
      reducedMotion() ? 0 : 900,
    )
  }, [activeRoute])

  useEffect(() => {
    if (!selectedId || selectedSignal) return
    if (activeRouteRef.current?.eventId === selectedId) return
    const ev = eventsRef.current.find((x) => x.id === selectedId)
    if (ev) focusOn(ev.lat, ev.lng, 10.5)
  }, [selectedId, selectedSignal])

  useEffect(() => {
    if (!selectedSignal) return
    const currentZoom = mapRef.current?.getZoom() ?? 0
    focusOn(selectedSignal.lat, selectedSignal.lng, Math.max(currentZoom, 9.5))
  }, [selectedSignal])

  useEffect(() => {
    const map = mapRef.current
    if (!focusTarget || selectedId || selectedSignal) {
      focusCoordRef.current = null
      const src = map?.getSource('blam-focus') as GeoJSONSource | undefined
      src?.setData(buildSinglePointGeoJson(null))
      return
    }
    focusOn(focusTarget.lat, focusTarget.lng, focusTarget.zoom ?? 10.5)
    focusCoordRef.current = [focusTarget.lng, focusTarget.lat]
    const src = map?.getSource('blam-focus') as GeoJSONSource | undefined
    src?.setData(buildSinglePointGeoJson(focusCoordRef.current))
  }, [focusTarget, selectedId, selectedSignal])

  useEffect(() => {
    if (fitAllSignal === 0) return
    const map = mapRef.current
    if (!map || eventsRef.current.length === 0) return
    const bounds = new LngLatBounds()
    for (const ev of eventsRef.current) bounds.extend([ev.lng, ev.lat])
    const { bottom, right, left = 0 } = paddingRef.current
    fitBox(
      map,
      bounds,
      { top: 96, bottom: 48 + bottom, left: 48 + left, right: 48 + right },
      reducedMotion() ? 0 : 950,
    )
  }, [fitAllSignal])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return

    const clearPendingWipe = () => {
      cancelAnimationFrame(wipeRafRef.current)
      wipeRafRef.current = 0
      clearTimeout(wipeTimerRef.current)
      wipeTimerRef.current = 0
      if (moveEndHandlerRef.current) {
        map.off('moveend', moveEndHandlerRef.current)
        moveEndHandlerRef.current = null
      }
    }

    const wasRadar = prevRadarRef.current
    const entering = radarMode && !wasRadar
    prevRadarRef.current = radarMode

    if (!radarMode) {
      const prevPad = radarPadRef.current
      radarPadRef.current = { bottom: 0, left: 0, right: 0 }
      pendingWipeRef.current = false
      wipeDoneRef.current = false
      clearPendingWipe()
      hideWipeLayers(map)
      setIndonesiaLayers(map, 'blam-indonesia-wipe', false, style)
      setBaseTransition(map, 280)
      setIndonesiaLayers(map, 'blam-indonesia', false, style)

      const currentLeft = paddingRef.current.left ?? 0
      const currentRight = paddingRef.current.right
      const shiftedBottom = prevPad.bottom > 0 && paddingRef.current.bottom === 0
      const shiftedLeft = prevPad.left > currentLeft

      if (wasRadar && (shiftedBottom || shiftedLeft) && !selectedSignalRef.current && !selectedIdRef.current) {
        const host = hostRef.current
        if (host && host.clientWidth > 0 && host.clientHeight > 0) {
          const visibleCenterX = shiftedLeft
            ? Math.round(prevPad.left + Math.max(0, host.clientWidth - prevPad.left - prevPad.right) / 2)
            : Math.round(host.clientWidth / 2)
          const visibleCenterY = shiftedBottom
            ? Math.round(64 + Math.max(0, host.clientHeight - 64 - prevPad.bottom) * 0.68)
            : Math.round(host.clientHeight / 2)
          const visibleCenter = map.unproject([visibleCenterX, visibleCenterY])
          const globePad = globePaddingFor(map.getZoom())
          map.easeTo({
            center: visibleCenter,
            padding: globePad,
            offset: shiftedBottom
              ? [0, -14]
              : [Math.round((currentLeft - currentRight - globePad.left) / 2), 0],
            duration: reducedMotion() ? 0 : 400,
          })
        }
      }
      return
    }

    if (!entering) {
      if (wipeDoneRef.current && wipeRafRef.current === 0) {
        setIndonesiaLayers(map, 'blam-indonesia', true, style)
      }
      return
    }

    clearPendingWipe()
    wipeDoneRef.current = false
    hideWipeLayers(map)
    setIndonesiaLayers(map, 'blam-indonesia-wipe', false, style)
    setBaseTransition(map, 0)
    setIndonesiaLayers(map, 'blam-indonesia', false, style)

    if (reducedMotion()) {
      pendingWipeRef.current = false
      wipeDoneRef.current = true
      setIndonesiaLayers(map, 'blam-indonesia', true, style)
      return
    }

    pendingWipeRef.current = true
  }, [radarMode, style])

  useEffect(() => {
    if (fitIndonesiaSignal === 0) return
    const map = mapRef.current
    if (!map) return
    const { bottom, right, left = 0 } = paddingRef.current

    const runWipe = () => {
      if (!mapRef.current || !readyRef.current) return
      if (!pendingWipeRef.current || !radarModeRef.current) return
      pendingWipeRef.current = false
      clearTimeout(wipeTimerRef.current)
      wipeTimerRef.current = 0
      if (moveEndHandlerRef.current) {
        map.off('moveend', moveEndHandlerRef.current)
        moveEndHandlerRef.current = null
      }

      setBaseTransition(map, 0)
      setIndonesiaLayers(map, 'blam-indonesia', false, styleRef.current)
      setIndonesiaLayers(map, 'blam-indonesia-wipe', true, styleRef.current, 0.05)
      showWipeLayers(map)
      const start = performance.now()

      const tick = (now: number) => {
        if (!mapRef.current || !readyRef.current || !radarModeRef.current) return
        const raw = Math.min(1, (now - start) / WIPE_DURATION_MS)
        const eased = 1 - Math.pow(1 - raw, 2.2)
        const u = 0.05 + eased * (1 + WIPE_SOFTNESS - 0.05)
        setIndonesiaLayers(map, 'blam-indonesia-wipe', true, styleRef.current, u)
        if (raw < 1) {
          wipeRafRef.current = requestAnimationFrame(tick)
        } else {
          wipeRafRef.current = 0
          wipeDoneRef.current = true
          setBaseTransition(map, 0)
          setIndonesiaLayers(map, 'blam-indonesia', true, styleRef.current)
          hideWipeLayers(map)
          setIndonesiaLayers(map, 'blam-indonesia-wipe', false, styleRef.current)
        }
      }

      wipeRafRef.current = requestAnimationFrame(tick)
    }

    if (moveEndHandlerRef.current) {
      map.off('moveend', moveEndHandlerRef.current)
      moveEndHandlerRef.current = null
    }
    clearTimeout(wipeTimerRef.current)

    const fitDuration = reducedMotion() ? 0 : 650
    const host = hostRef.current
    if (bottom > 0 && left === 0 && right === 0 && host && host.clientWidth > 0 && host.clientHeight > 0) {
      const w = host.clientWidth
      const h = host.clientHeight
      const availW = Math.max(240, w - 12)
      const availH = Math.max(160, h - bottom - 60)
      const zoomW = Math.log2((360 * availW) / (512 * 47.5))
      const zoomH = Math.log2((180 * availH) / (512 * 18))
      const targetZoom = Math.min(4.2, Math.max(2.1, Math.min(zoomW, zoomH)))
      const offsetY = -Math.round(bottom * 0.25)

      map.stop()
      map.easeTo({
        center: [118.0, -0.5],
        zoom: targetZoom,
        bearing: 0,
        pitch: 0,
        padding: ZERO_PADDING,
        offset: [0, offsetY],
        duration: fitDuration,
        essential: true,
      })
    } else {
      fitBox(
        map,
        INDONESIA_BOUNDS,
        {
          top: 64,
          bottom: bottom > 0 ? 24 + bottom : 88,
          left: 16 + left,
          right: 16 + right,
        },
        fitDuration,
        6,
      )
    }

    // Register moveend AFTER fitBox's map.stop() so stopping a prior move never triggers wipe prematurely.
    if (radarModeRef.current && pendingWipeRef.current) {
      moveEndHandlerRef.current = runWipe
      map.once('moveend', runWipe)
      wipeTimerRef.current = window.setTimeout(runWipe, Math.max(0, fitDuration - 220))
    }
  }, [fitIndonesiaSignal])

  useEffect(() => {
    adminReportsRef.current = adminReports
    if (!readyRef.current) return
    const src = mapRef.current?.getSource('blam-admin-reports') as GeoJSONSource | undefined
    src?.setData(buildAdminReportsGeoJson(adminReports))
  }, [adminReports])

  useEffect(() => {
    if (locateSignal === 0) return
    const fitAtStart = fitIndonesiaSignalRef.current
    const go = (lat: number, lng: number) => {
      userCoordRef.current = [lng, lat]
      const userSrc = mapRef.current?.getSource('blam-user') as GeoJSONSource | undefined
      userSrc?.setData(buildSinglePointGeoJson(userCoordRef.current))
      if (fitIndonesiaSignalRef.current !== fitAtStart || radarModeRef.current) return
      const currentZoom = mapRef.current?.getZoom() ?? 0
      focusOn(lat, lng, Math.min(18, Math.max(currentZoom, LOCATE_ZOOM)))
    }
    if (!navigator.geolocation) return go(DEFAULT_CENTER[1], DEFAULT_CENTER[0])
    navigator.geolocation.getCurrentPosition(
      (p) => go(p.coords.latitude, p.coords.longitude),
      () => go(DEFAULT_CENTER[1], DEFAULT_CENTER[0]),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 6000 },
    )
  }, [locateSignal])

  useEffect(() => {
    if (!zoomCommand) return
    const map = mapRef.current
    if (!map) return
    const duration = reducedMotion() ? 0 : 280
    if (zoomCommand.dir > 0) {
      const b = normalizeAngle(map.getBearing())
      const nextB = Math.abs(b) < 0.8 ? 0 : b * 0.72
      const nextZoom = Math.min(map.getMaxZoom(), map.getZoom() + 1)
      map.easeTo({
        zoom: nextZoom,
        padding: globePaddingFor(nextZoom),
        bearing: nextB,
        pitch: 0,
        duration,
        essential: true,
      })
    } else {
      const nextZoom = Math.max(map.getMinZoom(), map.getZoom() - 1)
      map.easeTo({
        zoom: nextZoom,
        padding: globePaddingFor(nextZoom),
        bearing: 0,
        pitch: 0,
        duration,
        essential: true,
      })
    }
  }, [zoomCommand])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={hostRef} data-style={style} className="h-full w-full" />
      <SpaceBackdrop style={style} mapRef={mapRef} cameraRef={spaceCamRef} />
    </div>
  )
}