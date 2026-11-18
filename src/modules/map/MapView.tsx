import { LngLatBounds, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'react'
import { mapEventTone } from '../../lib/constants'
import type { ConservationEvent, MapStyle, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import type { ActiveRoute } from './directions'
import { hazardToSignal, severityRank } from './hotspotCluster'
import type { HazardPoint } from './hotspotCluster'
import { getIndonesiaWipeSources, INDONESIA_GEOJSON, WIPE_SOFTNESS } from './indonesiaWipe'
import { registerHazardIcons, renderEventMarkerElement, syncUserMarkerElement } from './mapMarkers'
import { applyMapStyle, createInitialMapStyle } from './mapStyles'
import { formatFloodRiskLabel, formatSignalDate, formatSignalSource } from './radarFilters'

setWorkerUrl(maplibreWorkerUrl)

const INDONESIA_CENTER: [number, number] = [117.5, -2.0]
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [94.8, -11.2],
  [141.2, 6.2],
]
const DEFAULT_CENTER: [number, number] = [102.262, -3.8]
const LOCATE_ZOOM = 17.2

const WIPE_DURATION_MS = 920

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
}

interface MarkerEntry {
  marker: Marker
  wrapper: HTMLDivElement
  el: HTMLDivElement
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const HAZARD_COLOR = [
  'match',
  ['get', 'kind'],
  'wildfire',
  '#EF4444',
  'suspected',
  '#F59E0B',
  'volcano',
  '#7C3AED',
  'flood',
  '#2563EB',
  'storm',
  '#0891B2',
  '#F59E0B',
] as never

function buildHazardGeoJson(list: HazardPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: list.map((h) => ({
      type: 'Feature' as const,
      properties: {
        id: h.id,
        kind: h.kind,
        kindLabel: h.kindLabel,
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
  title.className = 'text-[13px] font-extrabold text-ink'
  title.textContent = h.title

  const meta = document.createElement('p')
  meta.className = 'text-[11px] font-semibold text-ink-soft'
  const src = formatSignalSource(h.source)
  const riskLabel = formatFloodRiskLabel(h)
  const dateLabel = formatSignalDate(h)
  meta.textContent = `${riskLabel ?? h.kindLabel} · ${src}${dateLabel ? ` · ${dateLabel}` : ''}`

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
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const readyRef = useRef(false)
  const { profile } = useAuth()
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const meRef = useRef<Marker | null>(null)
  const meElRef = useRef<HTMLDivElement | null>(null)
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
  const radarBottomRef = useRef(0)
  const styleRef = useRef(style)
  const radarModeRef = useRef(radarMode)

  useEffect(() => {
    onSelectRef.current = onSelect
    onSelectSignalRef.current = onSelectSignal
    paddingRef.current = padding
    if (radarMode && padding.bottom > 0) radarBottomRef.current = padding.bottom
    eventsRef.current = events
    hazardsRef.current = hazards
    activeRouteRef.current = activeRoute
    selectedIdRef.current = selectedId
    selectedSignalRef.current = selectedSignal
    styleRef.current = style
    radarModeRef.current = radarMode
  })

  const focusOn = (lat: number, lng: number, zoom: number, animate = true) => {
    const map = mapRef.current
    if (!map) return
    const { bottom, right, left = 0 } = paddingRef.current
    const farJump = Math.abs(map.getZoom() - zoom) > 6
    const duration = animate && !reducedMotion() ? (farJump ? 1150 : 850) : 0
    map.flyTo({
      center: [lng, lat],
      zoom,
      padding: { top: bottom > 0 ? 44 : 0, bottom, left, right },
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
      minZoom: 1.8,
      maxZoom: 18,
      maxTileCacheZoomLevels: 15,
      refreshExpiredTiles: false,
      cancelPendingTileRequestsWhileZooming: false,
      fadeDuration: 150,
      attributionControl: { compact: true },
    })

    mapRef.current = map
    readyRef.current = false

    const meEl = document.createElement('div')
    syncUserMarkerElement(meEl, null)
    meElRef.current = meEl
    meRef.current = new Marker({ element: meEl, anchor: 'center' })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map)

    map.once('load', () => {
      readyRef.current = true

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
        data: buildHazardGeoJson(hazardsRef.current),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 8,
        clusterProperties: {
          sev: ['max', ['get', 'sev']],
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
            2.5,
            ['step', ['get', 'point_count'], 0.58, 4, 0.68, 10, 0.78],
            5.5,
            ['step', ['get', 'point_count'], 0.78, 4, 0.9, 10, 1.04],
            8,
            ['step', ['get', 'point_count'], 0.96, 4, 1.12, 10, 1.28],
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
          'text-size': ['interpolate', ['linear'], ['zoom'], 2.5, 9, 5.5, 10.5, 8, 11.5],
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
            2.5,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 6, 3, 10],
            6,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 9, 3, 15],
            9,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 12, 3, 20],
          ],
          'circle-color': HAZARD_COLOR,
          'circle-opacity': 0.22,
        },
      })

      map.addLayer({
        id: 'blam-hazards-core',
        type: 'symbol',
        source: 'blam-hazards',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['concat', 'hazard-', ['get', 'kind']],
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2.5,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.42, 3, 0.56],
            6,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.58, 3, 0.74],
            9,
            ['interpolate', ['linear'], ['get', 'sev'], 1, 0.72, 3, 0.94],
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
          'text-field': ['get', 'kindLabel'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 1.7],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111827',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1.5,
        },
      })

      const setPointer = (on: boolean) => {
        map.getCanvas().style.cursor = on ? 'pointer' : ''
      }
      for (const layerId of ['blam-hazards-cluster', 'blam-hazards-core'] as const) {
        map.on('mouseenter', layerId, () => setPointer(true))
        map.on('mouseleave', layerId, () => setPointer(false))
      }

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

      map.on('click', 'blam-hazards-core', (e) => openHazard(e.features?.[0]?.properties?.id))

      map.on('click', 'blam-hazards-cluster', (e) => {
        const feat = e.features?.[0]
        if (!feat || feat.geometry.type !== 'Point') return
        const clusterId = Number(feat.properties?.cluster_id)
        const src = map.getSource('blam-hazards') as GeoJSONSource | undefined
        if (!src || !Number.isFinite(clusterId)) return
        const [lng, lat] = feat.geometry.coordinates as [number, number]
        const { bottom, right, left = 0 } = paddingRef.current
        void src
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: [lng, lat],
              zoom: Math.min(zoom + 0.3, 12),
              padding: { top: bottom > 0 ? 44 : 0, bottom, left, right },
              duration: reducedMotion() ? 0 : 600,
            })
          })
          .catch(() => undefined)
      })

      applyMapStyle(map, styleRef.current)
    })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(host)

    const markers = markersRef.current
    return () => {
      cancelAnimationFrame(wipeRafRef.current)
      clearTimeout(wipeTimerRef.current)
      if (moveEndHandlerRef.current) map.off('moveend', moveEndHandlerRef.current)
      readyRef.current = false
      ro.disconnect()
      popupRef.current?.remove()
      popupRef.current = null
      for (const entry of markers.values()) entry.marker.remove()
      markers.clear()
      meRef.current?.remove()
      meRef.current = null
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
    if (meElRef.current) {
      syncUserMarkerElement(meElRef.current, profile)
    }
  }, [profile])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const ids = new Set(events.map((ev) => ev.id))

    for (const [id, entry] of markers) {
      if (!ids.has(id)) {
        entry.marker.remove()
        markers.delete(id)
      }
    }

    for (const ev of events) {
      const selected = ev.id === selectedId
      const tone = mapEventTone(ev)
      const existing = markers.get(ev.id)

      if (existing) {
        renderEventMarkerElement(existing.el, ev, tone, selected)
        existing.wrapper.style.zIndex = selected ? '10' : '1'
        existing.marker.setLngLat([ev.lng, ev.lat])
      } else {
        // MapLibre owns the transform of the marker element; visuals live in a child.
        const wrapper = document.createElement('div')
        const el = document.createElement('div')
        renderEventMarkerElement(el, ev, tone, selected)
        wrapper.style.zIndex = selected ? '10' : '1'
        wrapper.appendChild(el)
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectRef.current(ev.id)
        })

        const marker = new Marker({ element: wrapper, anchor: 'center' })
          .setLngLat([ev.lng, ev.lat])
          .addTo(map)
        markers.set(ev.id, { marker, wrapper, el })
      }
    }
  }, [events, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource('blam-hazards') as GeoJSONSource | undefined
    src?.setData(buildHazardGeoJson(hazards))
  }, [hazards])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource('blam-route') as GeoJSONSource | undefined
    src?.setData(buildRouteGeoJson(activeRoute))
    if (!activeRoute || activeRoute.coordinates.length < 2) return

    meRef.current?.setLngLat([activeRoute.origin.lng, activeRoute.origin.lat])
    const bounds = new LngLatBounds()
    for (const coord of activeRoute.coordinates) bounds.extend(coord)
    const { bottom, right, left = 0 } = paddingRef.current
    map.fitBounds(bounds, {
      padding: { top: 96, bottom: 56 + bottom, left: 56 + left, right: 56 + right },
      duration: reducedMotion() ? 0 : 900,
    })
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
    if (fitAllSignal === 0) return
    const map = mapRef.current
    if (!map || eventsRef.current.length === 0) return
    const bounds = new LngLatBounds()
    for (const ev of eventsRef.current) bounds.extend([ev.lng, ev.lat])
    const { bottom, right, left = 0 } = paddingRef.current
    map.fitBounds(bounds, {
      padding: { top: 96, bottom: 48 + bottom, left: 48 + left, right: 48 + right },
      duration: reducedMotion() ? 0 : 950,
    })
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

    const entering = radarMode && !prevRadarRef.current
    prevRadarRef.current = radarMode

    if (!radarMode) {
      const wasRadar = prevRadarRef.current
      const prevBottom = radarBottomRef.current
      radarBottomRef.current = 0
      pendingWipeRef.current = false
      wipeDoneRef.current = false
      clearPendingWipe()
      hideWipeLayers(map)
      setIndonesiaLayers(map, 'blam-indonesia-wipe', false, style)
      setBaseTransition(map, 280)
      setIndonesiaLayers(map, 'blam-indonesia', false, style)

      if (wasRadar && prevBottom > 0 && !selectedSignalRef.current && !selectedIdRef.current) {
        const host = hostRef.current
        if (host && host.clientHeight > 0) {
          const visibleCenterY = Math.round(64 + Math.max(0, host.clientHeight - 64 - prevBottom) / 2)
          const visibleCenter = map.unproject([host.clientWidth / 2, visibleCenterY])
          map.easeTo({
            center: visibleCenter,
            padding: { top: 56, bottom: 84, left: paddingRef.current.left ?? 0, right: paddingRef.current.right },
            duration: reducedMotion() ? 0 : 480,
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
      setIndonesiaLayers(map, 'blam-indonesia-wipe', true, styleRef.current, -WIPE_SOFTNESS)
      let shown = false
      const start = performance.now()

      const tick = (now: number) => {
        if (!mapRef.current || !readyRef.current || !radarModeRef.current) return
        const raw = Math.min(1, (now - start) / WIPE_DURATION_MS)
        const eased = 1 - Math.pow(1 - raw, 2.2)
        const u = eased * (1 + WIPE_SOFTNESS)
        setIndonesiaLayers(map, 'blam-indonesia-wipe', true, styleRef.current, u)
        if (!shown) {
          showWipeLayers(map)
          shown = true
        }
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

    const fitDuration = reducedMotion() ? 0 : 880
    if (radarModeRef.current && pendingWipeRef.current) {
      moveEndHandlerRef.current = runWipe
      map.once('moveend', runWipe)
      wipeTimerRef.current = window.setTimeout(runWipe, Math.max(0, fitDuration - 180))
    }

    map.fitBounds(INDONESIA_BOUNDS, {
      padding: {
        top: 64,
        bottom: bottom > 0 ? 24 + bottom : 88,
        left: 16 + left,
        right: 16 + right,
      },
      duration: fitDuration,
    })
  }, [fitIndonesiaSignal])

  useEffect(() => {
    if (locateSignal === 0) return
    const go = (lat: number, lng: number) => {
      meRef.current?.setLngLat([lng, lat])
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
    if (zoomCommand.dir > 0) map.zoomIn()
    else map.zoomOut()
  }, [zoomCommand])

  return <div ref={hostRef} data-style={style} className="h-full w-full" />
}