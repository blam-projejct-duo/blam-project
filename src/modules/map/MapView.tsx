import { LngLatBounds, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'react'
import type { ConservationEvent, MapStyle, SatelliteSignal } from '../../types'
import { hazardToSignal } from './hotspotCluster'
import type { HazardPoint } from './hotspotCluster'
import {
  applyMapStyle,
  buildEventGeoJson,
  buildHazardGeoJson,
  createInitialMapStyle,
} from './mapStyles'

setWorkerUrl(maplibreWorkerUrl)

const DEFAULT_CENTER: [number, number] = [102.262, -3.8]
const INDONESIA_OVERVIEW: [number, number] = [117.5, -2.5]

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
  onSelect: (id: string) => void
  onSelectSignal?: (signal: SatelliteSignal) => void
  style: MapStyle
  padding: MapPadding
  fitAllSignal: number
  locateSignal: number
  zoomCommand?: ZoomCommand | null
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function createHazardPopupNode(h: HazardPoint): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-0.5 text-left'

  const title = document.createElement('p')
  title.className = 'text-[13px] font-extrabold text-ink'
  title.textContent = h.title

  const meta = document.createElement('p')
  meta.className = 'text-[11px] font-semibold text-ink-soft'
  const src = h.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'
  meta.textContent = `${h.kindLabel} · ${src} · ${h.date || '-'}`

  root.append(title, meta)
  return root
}

export default function MapView({
  events,
  hazards,
  selectedId,
  selectedSignal = null,
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
  const meRef = useRef<Marker | null>(null)
  const popupRef = useRef<Popup | null>(null)

  const onSelectRef = useRef(onSelect)
  const onSelectSignalRef = useRef(onSelectSignal)
  const paddingRef = useRef(padding)
  const eventsRef = useRef(events)
  const hazardsRef = useRef(hazards)
  const selectedIdRef = useRef(selectedId)
  const styleRef = useRef(style)
  const appliedStyleRef = useRef<MapStyle>(style)
  const hadInitialFocusRef = useRef(false)
  const lastFocusedIdRef = useRef<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
    onSelectSignalRef.current = onSelectSignal
    paddingRef.current = padding
    eventsRef.current = events
    hazardsRef.current = hazards
    selectedIdRef.current = selectedId
    styleRef.current = style
  })

  const focusOn = (lat: number, lng: number, zoom: number, animate = true) => {
    const map = mapRef.current
    if (!map) return
    const { bottom, right, left = 0 } = paddingRef.current
    const duration = animate && !reducedMotion() ? 850 : 0
    if (duration === 0) {
      map.jumpTo({
        center: [lng, lat],
        zoom,
        padding: { top: 0, bottom, left, right },
      })
      return
    }
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

    const initialEv = selectedIdRef.current
      ? eventsRef.current.find((x) => x.id === selectedIdRef.current)
      : undefined
    const initialCenter: [number, number] = initialEv
      ? [initialEv.lng, initialEv.lat]
      : INDONESIA_OVERVIEW
    const initialZoom = initialEv ? 10.5 : 4.5

    if (initialEv) {
      hadInitialFocusRef.current = true
      lastFocusedIdRef.current = initialEv.id
    }

    const map = new MapLibreMap({
      container: host,
      style: createInitialMapStyle(
        styleRef.current,
        hazardsRef.current,
        eventsRef.current,
        selectedIdRef.current,
      ),
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 3.5,
      maxZoom: 18,
      fadeDuration: 0,
      cancelPendingTileRequestsWhileZooming: true,
      maxTileCacheSize: 512,
      attributionControl: { compact: true },
    })

    const { bottom, right, left = 0 } = paddingRef.current
    map.setPadding({ top: 0, bottom, left, right })

    mapRef.current = map
    appliedStyleRef.current = styleRef.current

    const meEl = document.createElement('div')
    meEl.className = 'me-dot'
    meRef.current = new Marker({ element: meEl, anchor: 'center' })
      .setLngLat(initialEv ? [initialEv.lng, initialEv.lat] : DEFAULT_CENTER)
      .addTo(map)

    const syncSources = () => {
      const hazardSrc = map.getSource('blam-hazards') as GeoJSONSource | undefined
      hazardSrc?.setData(buildHazardGeoJson(hazardsRef.current))
      const eventSrc = map.getSource('blam-events') as GeoJSONSource | undefined
      eventSrc?.setData(buildEventGeoJson(eventsRef.current, selectedIdRef.current))
    }

    map.once('style.load', syncSources)
    map.once('load', syncSources)

    const interactiveLayers = ['blam-events-pin', 'blam-hazards-core', 'blam-hazards-cluster'] as const
    const setPointer = (on: boolean) => {
      map.getCanvas().style.cursor = on ? 'pointer' : ''
    }
    for (const layerId of interactiveLayers) {
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
      popupRef.current = new Popup({
        closeButton: false,
        maxWidth: '250px',
        className: 'blam-popup',
        offset: 10,
      })
        .setLngLat([hz.lng, hz.lat])
        .setDOMContent(createHazardPopupNode(hz))
        .addTo(map)
    }

    map.on('click', (e) => {
      const available = interactiveLayers.filter((id) => Boolean(map.getLayer(id)))
      if (available.length === 0) return
      const hits = map.queryRenderedFeatures(e.point, { layers: available })
      const top = hits[0]
      if (!top) return

      const layerId = top.layer.id
      if (layerId === 'blam-events-pin') {
        const eventId = top.properties?.id
        if (typeof eventId === 'string') onSelectRef.current(eventId)
        return
      }

      if (layerId === 'blam-hazards-core') {
        openHazard(top.properties?.id)
        return
      }

      if (layerId === 'blam-hazards-cluster' && top.geometry.type === 'Point') {
        const clusterId = Number(top.properties?.cluster_id)
        const src = map.getSource('blam-hazards') as GeoJSONSource | undefined
        if (!src || !Number.isFinite(clusterId)) return
        const [lng, lat] = top.geometry.coordinates as [number, number]
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
      }
    })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(host)

    return () => {
      ro.disconnect()
      popupRef.current?.remove()
      popupRef.current = null
      meRef.current?.remove()
      meRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || style === appliedStyleRef.current) return
    const apply = () => {
      applyMapStyle(map, style)
      appliedStyleRef.current = style
    }
    if (map.isStyleLoaded()) {
      apply()
    } else {
      map.once('style.load', apply)
    }
  }, [style])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const src = map.getSource('blam-events') as GeoJSONSource | undefined
    src?.setData(buildEventGeoJson(events, selectedId))
  }, [events, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const src = map.getSource('blam-hazards') as GeoJSONSource | undefined
    src?.setData(buildHazardGeoJson(hazards))
  }, [hazards])

  useEffect(() => {
    if (!selectedId || selectedSignal) return
    if (lastFocusedIdRef.current === selectedId) return
    const ev = eventsRef.current.find((x) => x.id === selectedId)
    if (!ev) return
    const animate = hadInitialFocusRef.current
    hadInitialFocusRef.current = true
    lastFocusedIdRef.current = selectedId
    focusOn(ev.lat, ev.lng, 10.5, animate)
  }, [selectedId, selectedSignal])

  useEffect(() => {
    if (!selectedSignal) return
    hadInitialFocusRef.current = true
    focusOn(selectedSignal.lat, selectedSignal.lng, 9.5, true)
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
      focusOn(lat, lng, 13.5, true)
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
