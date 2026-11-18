import type { LayerSpecification, Map as MapLibreMap, SourceSpecification, StyleSpecification } from 'maplibre-gl'
import { mapEventTone } from '../../lib/constants'
import type { ConservationEvent, MapStyle } from '../../types'
import { severityRank } from './hotspotCluster'
import type { HazardPoint } from './hotspotCluster'

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

const VECTOR_LAYER_IDS = [
  'background',
  'park',
  'landuse-residential',
  'landcover-wood',
  'water',
  'waterway',
  'building',
  'road-path',
  'road-minor',
  'road-major-casing',
  'road-major-inner',
  'road-motorway-casing',
  'road-motorway-inner',
  'boundary-admin',
  'boundary-country',
  'label-water',
  'label-village-town',
  'label-city',
  'label-state',
  'label-country',
] as const

const SATELLITE_LAYER_IDS = ['satelit-imagery', 'satelit-labels'] as const

const TEXT_FIELD_EXPR = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
]

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

const EVENT_COLOR = [
  'match',
  ['get', 'tone'],
  'critical',
  '#ef4444',
  'progress',
  '#f59e0b',
  'resolved',
  '#10b981',
  '#ef4444',
] as never

const OPENMAPTILES_SOURCE: SourceSpecification = {
  type: 'vector',
  url: 'https://tiles.openfreemap.org/planet',
  attribution: '&copy; OpenFreeMap &copy; OpenStreetMap',
}

export function buildHazardGeoJson(list: HazardPoint[]) {
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

export function buildEventGeoJson(list: ConservationEvent[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: list.map((ev) => ({
      type: 'Feature' as const,
      properties: {
        id: ev.id,
        tone: mapEventTone(ev),
        selected: ev.id === selectedId ? 1 : 0,
        title: ev.title,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [ev.lng, ev.lat],
      },
    })),
  }
}

function createVectorLayers(palette: ThemePalette, vecVis: 'visible' | 'none'): LayerSpecification[] {
  return [
      {
        id: 'background',
        type: 'background',
        layout: { visibility: vecVis },
        paint: { 'background-color': palette.background },
      },
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
        layout: { visibility: vecVis },
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['!=', ['get', 'brunnel'], 'tunnel'],
        ],
        paint: { 'fill-color': palette.water, 'fill-antialias': true },
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
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['==', ['get', 'class'], 'path'],
        ],
        paint: {
          'line-color': palette.roadMinor,
          'line-opacity': 0.75,
          'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 13, 1, 18, 4],
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 10,
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        ],
        paint: {
          'line-color': palette.roadMinor,
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 0.8, 17, 7],
        },
      },
      {
        id: 'road-major-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 7,
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        ],
        paint: {
          'line-color': palette.roadMajorCasing,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 7, 1.4, 16, 12],
        },
      },
      {
        id: 'road-major-inner',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 7,
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        ],
        paint: {
          'line-color': palette.roadMajorInner,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 7, 0.8, 16, 9],
        },
      },
      {
        id: 'road-motorway-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 5,
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['==', ['get', 'class'], 'motorway'],
        ],
        paint: {
          'line-color': palette.roadMotorwayCasing,
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5, 1.8, 16, 15],
        },
      },
      {
        id: 'road-motorway-inner',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 5,
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['==', ['get', 'class'], 'motorway'],
        ],
        paint: {
          'line-color': palette.roadMotorwayInner,
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5, 1.1, 16, 12],
        },
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
        layout: { visibility: vecVis, 'line-cap': 'round', 'line-join': 'round' },
        filter: [
          'all',
          ['==', ['get', 'admin_level'], 2],
          ['!=', ['get', 'maritime'], 1],
          ['!=', ['get', 'disputed'], 1],
        ],
        paint: {
          'line-color': palette.boundary,
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
  ]
}

function createOverlayLayers(): LayerSpecification[] {
  return [
    {
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
    },
    {
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
    },
    {
      id: 'blam-hazards-halo',
      type: 'circle',
      source: 'blam-hazards',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'sev'], 1, 12, 3, 22],
        'circle-color': HAZARD_COLOR,
        'circle-opacity': 0.22,
      },
    },
    {
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
    },
    {
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
    },
    {
      id: 'blam-events-selected-ring',
      type: 'circle',
      source: 'blam-events',
      filter: ['==', ['get', 'selected'], 1],
      paint: {
        'circle-radius': 17,
        'circle-color': 'rgba(0, 0, 0, 0)',
        'circle-stroke-color': EVENT_COLOR,
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.95,
      },
    },
    {
      id: 'blam-events-pin',
      type: 'circle',
      source: 'blam-events',
      paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], 1], 13, 9.5],
        'circle-color': EVENT_COLOR,
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 2.5],
      },
    },
  ]
}

export function createInitialMapStyle(
  initialStyle: MapStyle,
  initialHazards: HazardPoint[] = [],
  initialEvents: ConservationEvent[] = [],
  initialSelectedId: string | null = null,
): StyleSpecification {
  const isSat = initialStyle === 'satelit'
  const palette = PALETTES[initialStyle === 'gelap' ? 'gelap' : 'terang']
  const satVis = isSat ? 'visible' : 'none'

  const sources: Record<string, SourceSpecification> = {
    'esri-satelit': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Tiles &copy; Esri',
    },
    'esri-satelit-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
    },
    'blam-hazards': {
      type: 'geojson',
      data: buildHazardGeoJson(initialHazards),
      cluster: true,
      clusterRadius: 48,
      clusterMaxZoom: 8,
      clusterProperties: {
        sev: ['max', ['get', 'sev']],
        hasWildfire: ['max', ['case', ['==', ['get', 'kind'], 'wildfire'], 1, 0]],
        hasVolcano: ['max', ['case', ['==', ['get', 'kind'], 'volcano'], 1, 0]],
      },
    },
    'blam-events': {
      type: 'geojson',
      data: buildEventGeoJson(initialEvents, initialSelectedId),
    },
  }

  // Lazy-load vector basemap source so default satellite startup avoids extra TileJSON requests
  if (!isSat) {
    sources.openmaptiles = OPENMAPTILES_SOURCE
  }

  const layers: LayerSpecification[] = [
    {
      id: 'satelit-imagery',
      type: 'raster',
      source: 'esri-satelit',
      layout: { visibility: satVis },
      paint: { 'raster-fade-duration': 0 },
    },
    {
      id: 'satelit-labels',
      type: 'raster',
      source: 'esri-satelit-labels',
      layout: { visibility: satVis },
      paint: { 'raster-fade-duration': 0 },
    },
    ...(isSat ? [] : createVectorLayers(palette, 'visible')),
    ...createOverlayLayers(),
  ]

  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources,
    layers,
  }
}

export function applyMapStyle(map: MapLibreMap, style: MapStyle): void {
  const isSat = style === 'satelit'
  const vecVis = isSat ? 'none' : 'visible'
  const satVis = isSat ? 'visible' : 'none'

  if (!isSat && !map.getSource('openmaptiles')) {
    const palette = PALETTES[style]
    map.addSource('openmaptiles', OPENMAPTILES_SOURCE)
    const beforeOverlay = map.getLayer('blam-hazards-cluster') ? 'blam-hazards-cluster' : undefined
    for (const layer of createVectorLayers(palette, 'visible')) {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer, beforeOverlay)
      }
    }
  }

  for (const id of SATELLITE_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', satVis)
  }
  for (const id of VECTOR_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vecVis)
  }

  if (isSat) return

  const palette = PALETTES[style]
  map.setPaintProperty('background', 'background-color', palette.background)
  map.setPaintProperty('park', 'fill-color', palette.park)
  map.setPaintProperty('landuse-residential', 'fill-color', palette.residential)
  map.setPaintProperty('landcover-wood', 'fill-color', palette.wood)
  map.setPaintProperty('water', 'fill-color', palette.water)
  map.setPaintProperty('waterway', 'line-color', palette.waterway)
  map.setPaintProperty('building', 'fill-color', palette.building)
  map.setPaintProperty('building', 'fill-outline-color', palette.buildingOutline)
  map.setPaintProperty('road-path', 'line-color', palette.roadMinor)
  map.setPaintProperty('road-minor', 'line-color', palette.roadMinor)
  map.setPaintProperty('road-major-casing', 'line-color', palette.roadMajorCasing)
  map.setPaintProperty('road-major-inner', 'line-color', palette.roadMajorInner)
  map.setPaintProperty('road-motorway-casing', 'line-color', palette.roadMotorwayCasing)
  map.setPaintProperty('road-motorway-inner', 'line-color', palette.roadMotorwayInner)
  map.setPaintProperty('boundary-admin', 'line-color', palette.boundary)
  map.setPaintProperty('boundary-country', 'line-color', palette.boundary)
  map.setPaintProperty('label-water', 'text-color', palette.waterLabel)
  map.setPaintProperty('label-water', 'text-halo-color', palette.waterLabelHalo)

  for (const labelId of ['label-village-town', 'label-city', 'label-state', 'label-country']) {
    map.setPaintProperty(labelId, 'text-color', palette.labelText)
    map.setPaintProperty(labelId, 'text-halo-color', palette.labelHalo)
  }
}
