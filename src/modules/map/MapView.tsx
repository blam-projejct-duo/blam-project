import { LngLatBounds, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'react'
import { mapEventTone } from '../../lib/constants'
import type { ConservationEvent, MapStyle, SatelliteSignal } from '../../types'
import type { ActiveRoute } from './directions'
import { hazardToSignal, severityRank } from './hotspotCluster'
import type { HazardPoint } from './hotspotCluster'
import { applyMapStyle, createInitialMapStyle } from './mapStyles'
import { formatSignalDate } from './radarFilters'

setWorkerUrl(maplibreWorkerUrl)

const INDONESIA_CENTER: [number, number] = [117.5, -2.0]
const DEFAULT_CENTER: [number, number] = [102.262, -3.8]

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
  locateSignal: number
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
  const src = h.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'
  const dateLabel = formatSignalDate(h)
  meta.textContent = `${h.kindLabel} · ${src}${dateLabel ? ` · ${dateLabel}` : ''}`

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
  locateSignal,
  zoomCommand,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const readyRef = useRef(false)
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const meRef = useRef<Marker | null>(null)
  const popupRef = useRef<Popup | null>(null)

  const onSelectRef = useRef(onSelect)
  const onSelectSignalRef = useRef(onSelectSignal)
  const paddingRef = useRef(padding)
  const eventsRef = useRef(events)
  const hazardsRef = useRef(hazards)
  const activeRouteRef = useRef(activeRoute)
  const styleRef = useRef(style)

  useEffect(() => {
    onSelectRef.current = onSelect
    onSelectSignalRef.current = onSelectSignal
    paddingRef.current = padding
    eventsRef.current = events
    hazardsRef.current = hazards
    activeRouteRef.current = activeRoute
    styleRef.current = style
  })

  const focusOn = (lat: number, lng: number, zoom: number, animate = true) => {
    const map = mapRef.current
    if (!map) return
    const { bottom, right, left = 0 } = paddingRef.current
    const duration = animate && !reducedMotion() ? 850 : 0
    map.flyTo({
      center: [lng, lat],
      zoom,
      padding: { top: 0, bottom, left, right },
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
      minZoom: 3.5,
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
    meEl.className = 'me-dot'
    meRef.current = new Marker({ element: meEl, anchor: 'center' })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map)

    map.once('load', () => {
      readyRef.current = true

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
        },
      })
      map.addLayer({
        id: 'blam-hazards-cluster',
        type: 'circle',
        source: 'blam-hazards',
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': ['step', ['get', 'point_count'], 15, 4, 19, 10, 24],
          'circle-color': [
            'case',
            ['==', ['get', 'hasWildfire'], 1],
            '#DC2626',
            ['==', ['get', 'hasVolcano'], 1],
            '#7C3AED',
            ['>=', ['get', 'sev'], 3],
            '#2563EB',
            '#F59E0B',
          ],
          'circle-opacity': 0.92,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
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
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#FFFFFF' },
      })
      map.addLayer({
        id: 'blam-hazards-halo',
        type: 'circle',
        source: 'blam-hazards',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'sev'], 1, 12, 3, 22],
          'circle-color': HAZARD_COLOR,
          'circle-opacity': 0.22,
        },
      })
      map.addLayer({
        id: 'blam-hazards-core',
        type: 'circle',
        source: 'blam-hazards',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'sev'], 1, 5, 3, 9],
          'circle-color': HAZARD_COLOR,
          'circle-opacity': 0.95,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
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
        void src
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: [lng, lat],
              zoom: Math.min(zoom + 0.3, 12),
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
        existing.el.dataset.status = tone
        existing.el.dataset.selected = String(selected)
        existing.wrapper.style.zIndex = selected ? '10' : '1'
        existing.marker.setLngLat([ev.lng, ev.lat])
      } else {
        // MapLibre owns the transform of the marker element; visuals live in a child.
        const wrapper = document.createElement('div')
        const el = document.createElement('div')
        el.className = 'pin'
        el.dataset.status = tone
        el.dataset.selected = String(selected)
        el.title = ev.title
        el.style.cursor = 'pointer'
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
    focusOn(selectedSignal.lat, selectedSignal.lng, 9.5)
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
    if (locateSignal === 0) return
    const go = (lat: number, lng: number) => {
      meRef.current?.setLngLat([lng, lat])
      focusOn(lat, lng, 13.5)
    }
    if (!navigator.geolocation) return go(DEFAULT_CENTER[1], DEFAULT_CENTER[0])
    navigator.geolocation.getCurrentPosition(
      (p) => go(p.coords.latitude, p.coords.longitude),
      () => go(DEFAULT_CENTER[1], DEFAULT_CENTER[0]),
      { timeout: 4000 },
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