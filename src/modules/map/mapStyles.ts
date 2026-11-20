import type { Map as MapLibreMap, ProjectionSpecification, SkySpecification, StyleSpecification } from 'maplibre-gl'
import type { MapStyle } from '../../types'

interface ThemePalette {
  background: string
  water: string
  waterway: string
  park: string
  wood: string
  residential: string
  building: string
  buildingOutline: string
  roadMinor: string
  roadMajorCasing: string
  roadMajorInner: string
  roadMotorwayCasing: string
  roadMotorwayInner: string
  boundary: string
  labelText: string
  labelHalo: string
  waterLabel: string
  waterLabelHalo: string
}

const PALETTES: Record<'terang' | 'gelap', ThemePalette> = {
  terang: {
    background: '#f3f1ed',
    water: '#c7d9e5',
    waterway: '#b6cde0',
    park: '#dfeadf',
    wood: '#d3e3d4',
    residential: '#ebe8e1',
    building: '#e5e1d8',
    buildingOutline: '#d8d2c7',
    roadMinor: '#ffffff',
    roadMajorCasing: '#d9d3c7',
    roadMajorInner: '#ffffff',
    roadMotorwayCasing: '#cec7ba',
    roadMotorwayInner: '#ffffff',
    boundary: '#b3aca0',
    labelText: '#1f2937',
    labelHalo: 'rgba(255, 255, 255, 0.9)',
    waterLabel: '#476f8e',
    waterLabelHalo: 'rgba(255, 255, 255, 0.85)',
  },
  gelap: {
    background: '#0f1419',
    water: '#17232e',
    waterway: '#1b2b39',
    park: '#15221c',
    wood: '#182820',
    residential: '#151b22',
    building: '#1b222b',
    buildingOutline: '#262f3b',
    roadMinor: '#262e39',
    roadMajorCasing: '#12171d',
    roadMajorInner: '#303a47',
    roadMotorwayCasing: '#12171d',
    roadMotorwayInner: '#3d4959',
    boundary: '#3b4452',
    labelText: '#d1d5db',
    labelHalo: 'rgba(15, 20, 25, 0.9)',
    waterLabel: '#6b9bc0',
    waterLabelHalo: 'rgba(15, 20, 25, 0.85)',
  },
}

const HYBRID_ROADS = {
  roadMinor: 'rgba(255, 255, 255, 0.45)',
  roadMajorCasing: 'rgba(17, 24, 39, 0.32)',
  roadMajorInner: 'rgba(255, 255, 255, 0.46)',
  roadMotorwayCasing: 'rgba(17, 24, 39, 0.36)',
  roadMotorwayInner: 'rgba(253, 224, 71, 0.52)',
}

const ROAD_LAYER_IDS = [
  'road-path',
  'road-minor',
  'road-major-casing',
  'road-major-inner',
  'road-motorway-casing',
  'road-motorway-inner',
] as const

const VECTOR_LAYER_IDS = [
  'park',
  'landuse-residential',
  'landcover-wood',
  'waterway',
  'building',
  'boundary-admin',
  'label-water',
  'label-village-town',
  'label-city',
  'label-state',
  'label-country',
] as const

const SATELLITE_LAYER_IDS = ['satelit-imagery', 'satelit-detail', 'satelit-google', 'satelit-labels'] as const
const SAT_BG = '#1a3875'
const SAT_WATER = '#386ec4'
const SAT_BOUNDARY = 'rgba(255, 255, 255, 0.48)'
const SAT_WATER_OPACITY = ['interpolate', ['linear'], ['zoom'], 2, 0.14, 8, 0.08, 13, 0.02] as never

const GOOGLE_MAPS_TILE_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_TILE_KEY as string | undefined)?.trim() || ''
const GOOGLE_SESSION_STORAGE_KEY = 'blam_gmaps_tile_session_v1'

interface CachedGoogleSession {
  session: string
  expiry: number
  keyPrefix: string
}

function getCachedGoogleSession(): string | null {
  if (!GOOGLE_MAPS_TILE_KEY || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(GOOGLE_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedGoogleSession>
    if (
      typeof parsed.session === 'string' &&
      typeof parsed.expiry === 'number' &&
      parsed.keyPrefix === GOOGLE_MAPS_TILE_KEY.slice(0, 8) &&
      parsed.expiry > Date.now() + 5 * 60_000
    ) {
      return parsed.session
    }
  } catch {
    return null
  }
  return null
}

function buildGoogleTileUrl(session: string): string {
  return `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(session)}&key=${encodeURIComponent(GOOGLE_MAPS_TILE_KEY)}`
}

const TEXT_FIELD_EXPR = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
]

const GLOBE_PROJECTION: ProjectionSpecification = {
  type: ['interpolate', ['linear'], ['zoom'], 3.45, 'vertical-perspective', 4.25, 'mercator'] as never,
}

function skyForStyle(style: MapStyle): SkySpecification {
  const atmosphereBlend = ['interpolate', ['linear'], ['zoom'], 1.2, 1, 3.8, 0.65, 4.25, 0] as never
  if (style === 'satelit') {
    return {
      'sky-color': '#09142c',
      'horizon-color': '#2563eb',
      'sky-horizon-blend': 0.6,
      'atmosphere-blend': atmosphereBlend,
    }
  }
  if (style === 'gelap') {
    return {
      'sky-color': '#0a0f15',
      'horizon-color': '#1e3a5f',
      'sky-horizon-blend': 0.55,
      'atmosphere-blend': atmosphereBlend,
    }
  }
  return {
    'sky-color': '#cde3f3',
    'horizon-color': '#7bc2ee',
    'sky-horizon-blend': 0.6,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 1.2, 0.9, 3.8, 0.5, 4.25, 0] as never,
  }
}

export function createInitialMapStyle(initialStyle: MapStyle): StyleSpecification {
  const isSat = initialStyle === 'satelit'
  const palette = PALETTES[initialStyle === 'gelap' ? 'gelap' : 'terang']
  const roadPalette = isSat ? HYBRID_ROADS : palette
  const vecVis = isSat ? 'none' : 'visible'
  const satVis = isSat ? 'visible' : 'none'
  const cachedGoogleSession = getCachedGoogleSession()
  const useGoogleSat = Boolean(cachedGoogleSession)

  return {
    version: 8,
    projection: GLOBE_PROJECTION,
    sky: skyForStyle(initialStyle),
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution: '&copy; OpenFreeMap &copy; OpenStreetMap',
      },
      'eox-sentinel2': {
        type: 'raster',
        tiles: [
          'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 13,
        attribution: 'Sentinel-2 cloudless &copy; EOX',
      },
      'esri-satelit': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        minzoom: 11,
        maxzoom: 18,
        attribution: 'Tiles &copy; Esri',
      },
      ...(cachedGoogleSession
        ? {
            'google-satelit': {
              type: 'raster' as const,
              tiles: [buildGoogleTileUrl(cachedGoogleSession)],
              tileSize: 256,
              maxzoom: 20,
              attribution: 'Map data &copy; Google',
            },
          }
        : {}),
      'esri-satelit-labels': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 13,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        layout: { visibility: 'visible' },
        paint: { 'background-color': isSat ? SAT_BG : palette.background },
      },
      {
        id: 'satelit-imagery',
        type: 'raster',
        source: 'eox-sentinel2',
        layout: { visibility: satVis },
        paint: {
          'raster-fade-duration': 150,
          'raster-resampling': 'linear',
          'raster-opacity': 1,
          'raster-hue-rotate': 12,
          'raster-saturation': 0.14,
          'raster-contrast': 0.16,
          'raster-brightness-min': 0.12,
          'raster-brightness-max': 1,
        },
      },
      {
        id: 'satelit-detail',
        type: 'raster',
        source: 'esri-satelit',
        minzoom: 11,
        layout: { visibility: satVis },
        paint: {
          'raster-fade-duration': 150,
          'raster-resampling': 'linear',
          'raster-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0, 13, 1],
          'raster-saturation': -0.04,
          'raster-contrast': -0.06,
          'raster-brightness-min': 0.06,
          'raster-brightness-max': 1,
        },
      },
      ...(cachedGoogleSession
        ? [
            {
              id: 'satelit-google',
              type: 'raster' as const,
              source: 'google-satelit',
              layout: { visibility: satVis as 'visible' | 'none' },
              paint: {
                'raster-fade-duration': 150,
                'raster-resampling': 'linear' as const,
              },
            },
          ]
        : []),
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        layout: { visibility: vecVis },
        filter: ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        paint: { 'fill-color': palette.park },
      },
      {
        id: 'landuse-residential',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        maxzoom: 16,
        layout: { visibility: vecVis },
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['==', ['get', 'class'], 'residential'],
        ],
        paint: { 'fill-color': palette.residential, 'fill-opacity': 0.7 },
      },
      {
        id: 'landcover-wood',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        minzoom: 9,
        layout: { visibility: vecVis },
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['==', ['get', 'class'], 'wood'],
        ],
        paint: {
          'fill-color': palette.wood,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.2, 12, 0.9],
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        layout: { visibility: 'visible' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['!=', ['get', 'brunnel'], 'tunnel'],
        ],
        paint: {
          'fill-color': isSat ? SAT_WATER : palette.water,
          'fill-opacity': isSat ? (useGoogleSat ? 0 : SAT_WATER_OPACITY) : 1,
          'fill-antialias': true,
        },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        layout: { visibility: vecVis },
        filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        paint: {
          'line-color': palette.waterway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 15, 3],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        layout: { visibility: vecVis },
        paint: {
          'fill-color': palette.building,
          'fill-outline-color': palette.buildingOutline,
          'fill-antialias': true,
        },
      },
      {
        id: 'road-path',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['==', ['get', 'class'], 'path'],
        ],
        paint: {
          'line-color': roadPalette.roadMinor,
          'line-opacity': isSat ? 0.24 : 0.75,
          'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 13, 1, 18, 4],
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 10,
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        ],
        paint: {
          'line-color': roadPalette.roadMinor,
          'line-opacity': isSat ? 0.32 : 0.9,
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 0.8, 17, 7],
        },
      },
      {
        id: 'road-major-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 7,
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        ],
        paint: {
          'line-color': roadPalette.roadMajorCasing,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 7, 1.4, 16, 12],
        },
      },
      {
        id: 'road-major-inner',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 7,
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        ],
        paint: {
          'line-color': roadPalette.roadMajorInner,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 7, 0.8, 16, 9],
        },
      },
      {
        id: 'road-motorway-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 5,
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['==', ['get', 'class'], 'motorway'],
        ],
        paint: {
          'line-color': roadPalette.roadMotorwayCasing,
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5, 1.8, 16, 15],
        },
      },
      {
        id: 'road-motorway-inner',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 5,
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['==', ['get', 'class'], 'motorway'],
        ],
        paint: {
          'line-color': roadPalette.roadMotorwayInner,
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5, 1.1, 16, 12],
        },
      },
      {
        id: 'satelit-labels',
        type: 'raster',
        source: 'esri-satelit-labels',
        layout: { visibility: satVis },
        paint: { 'raster-fade-duration': 120 },
      },
      {
        id: 'boundary-admin',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        minzoom: 7,
        layout: { visibility: vecVis },
        filter: [
          'all',
          ['==', ['typeof', ['get', 'admin_level']], 'number'],
          ['>=', ['get', 'admin_level'], 3],
          ['<=', ['get', 'admin_level'], 6],
          ['!=', ['get', 'maritime'], 1],
          ['!=', ['get', 'disputed'], 1],
        ],
        paint: {
          'line-color': palette.boundary,
          'line-dasharray': [2, 2],
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 12, 1.5],
        },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        layout: { visibility: 'visible', 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['==', ['get', 'admin_level'], 2],
          ['!=', ['get', 'maritime'], 1],
          ['!=', ['get', 'disputed'], 1],
        ],
        paint: {
          'line-color': isSat ? SAT_BOUNDARY : palette.boundary,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 10, 2],
        },
      },
      {
        id: 'label-water',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'water_name',
        layout: {
          visibility: vecVis,
          'text-field': TEXT_FIELD_EXPR as never,
          'text-font': ['Noto Sans Italic'],
          'text-letter-spacing': 0.15,
          'text-max-width': 6,
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 10, 13],
        },
        paint: {
          'text-color': palette.waterLabel,
          'text-halo-color': palette.waterLabelHalo,
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'label-village-town',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 7,
        layout: {
          visibility: vecVis,
          'text-field': TEXT_FIELD_EXPR as never,
          'text-font': ['Noto Sans Regular'],
          'text-max-width': 8,
          'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 13, 13],
        },
        filter: ['match', ['get', 'class'], ['village', 'town', 'suburb'], true, false],
        paint: {
          'text-color': palette.labelText,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'label-city',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 4,
        layout: {
          visibility: vecVis,
          'text-field': TEXT_FIELD_EXPR as never,
          'text-font': ['Noto Sans Bold'],
          'text-max-width': 8,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 11, 16],
        },
        filter: ['==', ['get', 'class'], 'city'],
        paint: {
          'text-color': palette.labelText,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.6,
        },
      },
      {
        id: 'label-state',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 5,
        maxzoom: 9,
        layout: {
          visibility: vecVis,
          'text-field': TEXT_FIELD_EXPR as never,
          'text-font': ['Noto Sans Italic'],
          'text-letter-spacing': 0.12,
          'text-max-width': 9,
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 8, 12],
          'text-transform': 'uppercase',
        },
        filter: ['==', ['get', 'class'], 'state'],
        paint: {
          'text-color': palette.labelText,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'label-country',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        maxzoom: 7,
        layout: {
          visibility: vecVis,
          'text-field': TEXT_FIELD_EXPR as never,
          'text-font': ['Noto Sans Bold'],
          'text-max-width': 7,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 14],
        },
        filter: ['==', ['get', 'class'], 'country'],
        paint: {
          'text-color': palette.labelText,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.6,
        },
      },
    ],
  }
}

export function applyMapStyle(map: MapLibreMap, style: MapStyle): void {
  const isSat = style === 'satelit'
  const vecVis = isSat ? 'none' : 'visible'
  const satVis = isSat ? 'visible' : 'none'

  map.setSky(skyForStyle(style))

  for (const id of SATELLITE_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', satVis)
  }
  for (const id of VECTOR_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vecVis)
  }
  for (const id of ['water', 'boundary-country', ...ROAD_LAYER_IDS]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible')
  }

  const roadPalette = isSat ? HYBRID_ROADS : PALETTES[style]
  map.setPaintProperty('road-path', 'line-color', roadPalette.roadMinor)
  map.setPaintProperty('road-path', 'line-opacity', isSat ? 0.24 : 0.75)
  map.setPaintProperty('road-minor', 'line-color', roadPalette.roadMinor)
  map.setPaintProperty('road-minor', 'line-opacity', isSat ? 0.32 : 0.9)
  map.setPaintProperty('road-major-casing', 'line-color', roadPalette.roadMajorCasing)
  map.setPaintProperty('road-major-inner', 'line-color', roadPalette.roadMajorInner)
  map.setPaintProperty('road-motorway-casing', 'line-color', roadPalette.roadMotorwayCasing)
  map.setPaintProperty('road-motorway-inner', 'line-color', roadPalette.roadMotorwayInner)

  if (isSat) {
    const hasGoogle = Boolean(map.getLayer('satelit-google'))
    map.setPaintProperty('background', 'background-color', SAT_BG)
    map.setPaintProperty('water', 'fill-color', SAT_WATER)
    map.setPaintProperty('water', 'fill-opacity', hasGoogle ? 0 : SAT_WATER_OPACITY)
    map.setPaintProperty('boundary-country', 'line-color', SAT_BOUNDARY)
    return
  }

  const palette = PALETTES[style]
  map.setPaintProperty('background', 'background-color', palette.background)
  map.setPaintProperty('park', 'fill-color', palette.park)
  map.setPaintProperty('landuse-residential', 'fill-color', palette.residential)
  map.setPaintProperty('landcover-wood', 'fill-color', palette.wood)
  map.setPaintProperty('water', 'fill-color', palette.water)
  map.setPaintProperty('water', 'fill-opacity', 1)
  map.setPaintProperty('waterway', 'line-color', palette.waterway)
  map.setPaintProperty('building', 'fill-color', palette.building)
  map.setPaintProperty('building', 'fill-outline-color', palette.buildingOutline)
  map.setPaintProperty('boundary-admin', 'line-color', palette.boundary)
  map.setPaintProperty('boundary-country', 'line-color', palette.boundary)
  map.setPaintProperty('label-water', 'text-color', palette.waterLabel)
  map.setPaintProperty('label-water', 'text-halo-color', palette.waterLabelHalo)

  for (const labelId of ['label-village-town', 'label-city', 'label-state', 'label-country']) {
    map.setPaintProperty(labelId, 'text-color', palette.labelText)
    map.setPaintProperty(labelId, 'text-halo-color', palette.labelHalo)
  }
}

export async function ensureGoogleSatelliteLayer(
  map: MapLibreMap,
  style: MapStyle,
  signal?: AbortSignal,
): Promise<void> {
  if (!GOOGLE_MAPS_TILE_KEY) return

  let session = getCachedGoogleSession()
  if (!session) {
    try {
      const res = await fetch(
        `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(GOOGLE_MAPS_TILE_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapType: 'satellite', language: 'id', region: 'ID' }),
          signal,
        },
      )
      if (!res.ok) return
      const data = (await res.json()) as { session?: string; expiry?: string | number }
      if (!data.session) return
      session = data.session
      const expirySec = Number(data.expiry)
      const expiryMs = Number.isFinite(expirySec) ? expirySec * 1000 : Date.now() + 7 * 24 * 3600_000
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          GOOGLE_SESSION_STORAGE_KEY,
          JSON.stringify({
            session,
            expiry: expiryMs,
            keyPrefix: GOOGLE_MAPS_TILE_KEY.slice(0, 8),
          } satisfies CachedGoogleSession),
        )
      }
    } catch {
      return
    }
  }

  if (signal?.aborted || map.getSource('google-satelit')) return

  map.addSource('google-satelit', {
    type: 'raster',
    tiles: [buildGoogleTileUrl(session)],
    tileSize: 256,
    maxzoom: 20,
    attribution: 'Map data &copy; Google',
  })

  if (!map.getLayer('satelit-google')) {
    map.addLayer(
      {
        id: 'satelit-google',
        type: 'raster',
        source: 'google-satelit',
        layout: { visibility: style === 'satelit' ? 'visible' : 'none' },
        paint: {
          'raster-fade-duration': 150,
          'raster-resampling': 'linear',
        },
      },
      map.getLayer('water') ? 'water' : undefined,
    )
  }

  if (style === 'satelit' && map.getLayer('water')) {
    map.setPaintProperty('water', 'fill-opacity', 0)
  }
}
