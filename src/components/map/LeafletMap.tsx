import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { pinTone } from '../../data/mockConservationData'
import type { ConservationSite, MapStyle } from '../../types/conservation'

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const esri = (path: string) => `${ESRI}/${path}/MapServer/tile/{z}/{y}/{x}`

const TILES: Record<MapStyle, string[]> = {
  terang: [esri('Canvas/World_Light_Gray_Base'), esri('Canvas/World_Light_Gray_Reference')],
  gelap: [esri('Canvas/World_Dark_Gray_Base'), esri('Canvas/World_Dark_Gray_Reference')],
  satelit: [esri('World_Imagery'), esri('Reference/World_Boundaries_and_Places')],
}

const DEMO_POSITION: [number, number] = [-3.8, 102.262]

export interface MapPadding {
  bottom: number
  right: number
}

interface Props {
  sites: ConservationSite[]
  selectedId: string | null
  onSelect: (id: string) => void
  style: MapStyle
  showHotspots: boolean
  showSpecies: boolean
  padding: MapPadding
  fitAllSignal: number
  locateSignal: number
}

function pinIcon(site: ConservationSite, selected: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div class="pin" data-status="${pinTone(site.status)}" data-selected="${selected}">${site.aiScore}</div>`,
  })
}

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function LeafletMap({
  sites,
  selectedId,
  onSelect,
  style,
  showHotspots,
  showSpecies,
  padding,
  fitAllSignal,
  locateSignal,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const overlayRef = useRef<L.LayerGroup | null>(null)
  const meRef = useRef<L.Marker | null>(null)

  const onSelectRef = useRef(onSelect)
  const paddingRef = useRef(padding)
  const sitesRef = useRef(sites)
  useEffect(() => {
    onSelectRef.current = onSelect
    paddingRef.current = padding
    sitesRef.current = sites
  })

  const focusOn = (lat: number, lng: number, zoom: number, animate = true) => {
    const map = mapRef.current
    if (!map) return
    const { bottom, right } = paddingRef.current
    const target = map.unproject(
      map.project([lat, lng], zoom).add([right / 2, bottom / 2]),
      zoom,
    )
    if (animate && !reducedMotion()) {
      map.flyTo(target, zoom, { duration: 0.9, easeLinearity: 0.25 })
    } else {
      map.setView(target, zoom, { animate: false })
    }
  }

  // init
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.5,
      minZoom: 4,
    })
    map.attributionControl.setPrefix(false)
    mapRef.current = map
    overlayRef.current = L.layerGroup().addTo(map)
    map.setView(DEMO_POSITION, 11, { animate: false })

    const me = L.marker(DEMO_POSITION, {
      icon: L.divIcon({
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: '<div class="me-dot"></div>',
      }),
      interactive: false,
      zIndexOffset: -500,
    }).addTo(map)
    meRef.current = me

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(host)

    const markers = markersRef.current
    return () => {
      ro.disconnect()
      markers.clear()
      map.remove()
      mapRef.current = null
      tileRef.current = null
    }
  }, [])

  // tiles
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    tileRef.current?.remove()
    const group = L.layerGroup(
      TILES[style].map((url) =>
        L.tileLayer(url, { attribution: 'Tiles &copy; Esri', maxNativeZoom: 16, maxZoom: 18 }),
      ),
    ).addTo(map)
    tileRef.current = group
  }, [style])

  // markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const ids = new Set(sites.map((s) => s.id))
    for (const [id, m] of markers) {
      if (!ids.has(id)) {
        m.remove()
        markers.delete(id)
      }
    }
    for (const site of sites) {
      const selected = site.id === selectedId
      const existing = markers.get(site.id)
      if (existing) {
        existing.setIcon(pinIcon(site, selected))
        existing.setZIndexOffset(selected ? 1000 : 0)
      } else {
        const m = L.marker([site.lat, site.lng], {
          icon: pinIcon(site, selected),
          title: site.title,
          zIndexOffset: selected ? 1000 : 0,
        }).addTo(map)
        m.on('click', () => onSelectRef.current(site.id))
        markers.set(site.id, m)
      }
    }
  }, [sites, selectedId])

  // overlays
  useEffect(() => {
    const group = overlayRef.current
    if (!group) return
    group.clearLayers()
    for (const s of sites) {
      if (showHotspots && s.pulse.hotspots > 0) {
        L.circle([s.lat + 0.05, s.lng + 0.07], {
          radius: 18000,
          color: '#EF4444',
          weight: 1.5,
          dashArray: '6 6',
          fillColor: '#EF4444',
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(group)
      }
      if (showSpecies) {
        const n = Math.min(6, Math.ceil(s.pulse.species / 8))
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + s.lat
          const r = 0.012 + (i % 3) * 0.006
          L.circleMarker([s.lat + Math.sin(a) * r, s.lng + Math.cos(a) * r], {
            radius: 4,
            color: '#fff',
            weight: 1.5,
            fillColor: '#059669',
            fillOpacity: 1,
            interactive: false,
          }).addTo(group)
        }
      }
    }
  }, [sites, showHotspots, showSpecies])

  // focus selection
  useEffect(() => {
    if (!selectedId) return
    const site = sitesRef.current.find((s) => s.id === selectedId)
    if (site) focusOn(site.lat, site.lng, 11)
  }, [selectedId])

  // fit all
  useEffect(() => {
    if (fitAllSignal === 0) return
    const map = mapRef.current
    if (!map || sitesRef.current.length === 0) return
    const { bottom, right } = paddingRef.current
    map.flyToBounds(
      L.latLngBounds(sitesRef.current.map((s) => [s.lat, s.lng] as [number, number])),
      {
        paddingTopLeft: [48, 96],
        paddingBottomRight: [48 + right, 48 + bottom],
        duration: reducedMotion() ? 0 : 1.1,
      },
    )
  }, [fitAllSignal])

  // locate me
  useEffect(() => {
    if (locateSignal === 0) return
    const go = (lat: number, lng: number) => {
      meRef.current?.setLatLng([lat, lng])
      focusOn(lat, lng, 14)
    }
    if (!navigator.geolocation) return go(...DEMO_POSITION)
    navigator.geolocation.getCurrentPosition(
      (p) => go(p.coords.latitude, p.coords.longitude),
      () => go(...DEMO_POSITION),
      { timeout: 4000 },
    )
  }, [locateSignal])

  return <div ref={hostRef} data-style={style} className="h-full w-full" />
}
