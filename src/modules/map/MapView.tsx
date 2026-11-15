import { LngLatBounds, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'react'
import { pinTone } from '../../lib/constants'
import type { HotspotPoint, MapStyle, Report, SpeciesPoint } from '../../types'
import { applyMapStyle, createInitialMapStyle } from './mapStyles'

setWorkerUrl(maplibreWorkerUrl)

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
  reports: Report[]
  hotspots: HotspotPoint[]
  speciesPoints: SpeciesPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  style: MapStyle
  showHotspots: boolean
  showSpecies: boolean
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

function buildHotspotGeoJson(hotspots: HotspotPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: hotspots.map((h) => ({
      type: 'Feature' as const,
      properties: {
        frp: h.frp,
        brightness: h.brightness,
        confidence: h.confidence,
        acqDate: h.acqDate,
        acqTime: h.acqTime,
        satellite: h.satellite,
        daynight: h.daynight,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [h.lng, h.lat],
      },
    })),
  }
}

function buildSpeciesGeoJson(species: SpeciesPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: species.map((s) => ({
      type: 'Feature' as const,
      properties: {
        id: s.id,
        name: s.name,
        commonName: s.commonName ?? '',
        group: s.group,
        threatened: s.threatened,
        observedOn: s.observedOn ?? '',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.lng, s.lat],
      },
    })),
  }
}

function confidenceLabel(code: unknown): string {
  if (code === 'h') return 'Tinggi'
  if (code === 'l') return 'Rendah'
  return 'Sedang'
}

function createHotspotPopupNode(props: Record<string, unknown>): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-0.5 text-left'

  const title = document.createElement('p')
  title.className = 'text-[13px] font-extrabold text-ink'
  const frp = Number(props.frp)
  title.textContent = Number.isFinite(frp) && frp > 0 ? `Hotspot ${frp.toFixed(1)} MW` : 'Hotspot Satelit'

  const meta = document.createElement('p')
  meta.className = 'text-[11px] font-semibold text-ink-soft'
  const date = typeof props.acqDate === 'string' && props.acqDate ? props.acqDate : '-'
  meta.textContent = `${confidenceLabel(props.confidence)} · ${date}`

  root.append(title, meta)
  return root
}

function createSpeciesPopupNode(props: Record<string, unknown>): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-0.5 text-left'

  const commonName = typeof props.commonName === 'string' ? props.commonName.trim() : ''
  const latinName = typeof props.name === 'string' ? props.name.trim() : 'Spesies'
  const group = typeof props.group === 'string' && props.group ? props.group : 'iNaturalist'
  const threatened = props.threatened === true || props.threatened === 'true'

  const title = document.createElement('p')
  title.className = 'text-[13px] font-extrabold text-ink'
  title.textContent = commonName || latinName

  const meta = document.createElement('p')
  meta.className = 'text-[11px] font-semibold text-ink-soft'
  const baseLabel = commonName ? `${latinName} · ${group}` : group
  meta.textContent = threatened ? `${baseLabel} · Terancam` : baseLabel

  root.append(title, meta)
  return root
}

export default function MapView({
  reports,
  hotspots,
  speciesPoints,
  selectedId,
  onSelect,
  style,
  showHotspots,
  showSpecies,
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
  const paddingRef = useRef(padding)
  const reportsRef = useRef(reports)
  const hotspotsRef = useRef(hotspots)
  const speciesRef = useRef(speciesPoints)
  const styleRef = useRef(style)
  const showHotspotsRef = useRef(showHotspots)
  const showSpeciesRef = useRef(showSpecies)

  useEffect(() => {
    onSelectRef.current = onSelect
    paddingRef.current = padding
    reportsRef.current = reports
    hotspotsRef.current = hotspots
    speciesRef.current = speciesPoints
    styleRef.current = style
    showHotspotsRef.current = showHotspots
    showSpeciesRef.current = showSpecies
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
      center: DEFAULT_CENTER,
      zoom: 10.5,
      minZoom: 3.5,
      maxZoom: 18,
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
      const hotspotVis = showHotspotsRef.current ? 'visible' : 'none'
      const speciesVis = showSpeciesRef.current ? 'visible' : 'none'

      map.addSource('blam-hotspots', {
        type: 'geojson',
        data: buildHotspotGeoJson(hotspotsRef.current),
      })
      map.addLayer({
        id: 'blam-hotspots-halo',
        type: 'circle',
        source: 'blam-hotspots',
        layout: { visibility: hotspotVis },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'frp'], 1], 0, 12, 10, 16, 50, 22],
          'circle-color': '#EF4444',
          'circle-opacity': 0.22,
        },
      })
      map.addLayer({
        id: 'blam-hotspots-core',
        type: 'circle',
        source: 'blam-hotspots',
        layout: { visibility: hotspotVis },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'frp'], 1], 0, 5, 10, 7.5, 50, 11],
          'circle-color': '#EF4444',
          'circle-opacity': 0.92,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
        },
      })

      map.addSource('blam-species', {
        type: 'geojson',
        data: buildSpeciesGeoJson(speciesRef.current),
      })
      map.addLayer({
        id: 'blam-species-circle',
        type: 'circle',
        source: 'blam-species',
        layout: { visibility: speciesVis },
        paint: {
          'circle-radius': 6,
          'circle-color': '#10B981',
          'circle-opacity': 0.85,
          'circle-stroke-color': ['case', ['boolean', ['get', 'threatened'], false], '#F59E0B', '#059669'],
          'circle-stroke-width': 2,
        },
      })

      const setPointer = (on: boolean) => {
        map.getCanvas().style.cursor = on ? 'pointer' : ''
      }
      for (const layerId of ['blam-hotspots-core', 'blam-species-circle'] as const) {
        map.on('mouseenter', layerId, () => setPointer(true))
        map.on('mouseleave', layerId, () => setPointer(false))
      }

      map.on('click', 'blam-hotspots-core', (e) => {
        const feat = e.features?.[0]
        if (!feat || feat.geometry.type !== 'Point') return
        const [lng, lat] = feat.geometry.coordinates as [number, number]
        popupRef.current?.remove()
        popupRef.current = new Popup({ closeButton: false, maxWidth: '220px', className: 'blam-popup', offset: 10 })
          .setLngLat([lng, lat])
          .setDOMContent(createHotspotPopupNode((feat.properties ?? {}) as Record<string, unknown>))
          .addTo(map)
      })

      map.on('click', 'blam-species-circle', (e) => {
        const feat = e.features?.[0]
        if (!feat || feat.geometry.type !== 'Point') return
        const [lng, lat] = feat.geometry.coordinates as [number, number]
        popupRef.current?.remove()
        popupRef.current = new Popup({ closeButton: false, maxWidth: '240px', className: 'blam-popup', offset: 10 })
          .setLngLat([lng, lat])
          .setDOMContent(createSpeciesPopupNode((feat.properties ?? {}) as Record<string, unknown>))
          .addTo(map)
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
    const ids = new Set(reports.map((r) => r.id))

    for (const [id, entry] of markers) {
      if (!ids.has(id)) {
        entry.marker.remove()
        markers.delete(id)
      }
    }

    for (const report of reports) {
      const selected = report.id === selectedId
      const tone = pinTone(report.status)
      const source = report.source ?? 'user'
      const existing = markers.get(report.id)

      if (existing) {
        existing.el.dataset.status = tone
        existing.el.dataset.source = source
        existing.el.dataset.selected = String(selected)
        existing.wrapper.style.zIndex = selected ? '10' : '1'
        existing.marker.setLngLat([report.lng, report.lat])
      } else {
        // MapLibre owns the transform of the marker element; visuals live in a child.
        const wrapper = document.createElement('div')
        const el = document.createElement('div')
        el.className = 'pin'
        el.dataset.status = tone
        el.dataset.source = source
        el.dataset.selected = String(selected)
        el.title = report.title
        el.style.cursor = 'pointer'
        wrapper.style.zIndex = selected ? '10' : '1'
        wrapper.appendChild(el)
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectRef.current(report.id)
        })

        const marker = new Marker({ element: wrapper, anchor: 'center' })
          .setLngLat([report.lng, report.lat])
          .addTo(map)
        markers.set(report.id, { marker, wrapper, el })
      }
    }
  }, [reports, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const hotspotSrc = map.getSource('blam-hotspots') as GeoJSONSource | undefined
    hotspotSrc?.setData(buildHotspotGeoJson(hotspots))
  }, [hotspots])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const speciesSrc = map.getSource('blam-species') as GeoJSONSource | undefined
    speciesSrc?.setData(buildSpeciesGeoJson(speciesPoints))
  }, [speciesPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const hotspotVis = showHotspots ? 'visible' : 'none'
    const speciesVis = showSpecies ? 'visible' : 'none'
    if (map.getLayer('blam-hotspots-halo')) map.setLayoutProperty('blam-hotspots-halo', 'visibility', hotspotVis)
    if (map.getLayer('blam-hotspots-core')) map.setLayoutProperty('blam-hotspots-core', 'visibility', hotspotVis)
    if (map.getLayer('blam-species-circle')) map.setLayoutProperty('blam-species-circle', 'visibility', speciesVis)
    if (!showHotspots && !showSpecies) popupRef.current?.remove()
  }, [showHotspots, showSpecies])

  useEffect(() => {
    if (!selectedId) return
    const r = reportsRef.current.find((x) => x.id === selectedId)
    if (r) focusOn(r.lat, r.lng, 10.5)
  }, [selectedId])

  useEffect(() => {
    if (fitAllSignal === 0) return
    const map = mapRef.current
    if (!map || reportsRef.current.length === 0) return
    const bounds = new LngLatBounds()
    for (const r of reportsRef.current) bounds.extend([r.lng, r.lat])
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
