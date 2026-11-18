import type { ConservationEvent, HazardKind, SatelliteSignal } from '../../types'
import type { HazardPoint } from './hotspotCluster'

export type RadarLayer = 'wildfire' | 'suspected' | 'volcano' | 'event'

export const LAYER_CHIPS: ReadonlyArray<{ layer: RadarLayer; label: string; dot: string }> = [
  { layer: 'wildfire', label: 'Karhutla', dot: 'bg-critical' },
  { layer: 'suspected', label: 'Titik Panas', dot: 'bg-progress' },
  { layer: 'volcano', label: 'Gunung Berapi', dot: 'bg-purple-600' },
  { layer: 'event', label: 'Event Aksi', dot: 'bg-resolved' },
]

function matchesHazardLayer(layers: Set<RadarLayer>, kind?: HazardKind): boolean {
  if (layers.size === 0) return true
  if (kind === 'wildfire' || kind === 'suspected' || kind === 'volcano') {
    return layers.has(kind)
  }
  return false
}

/**
 * Filter unified across map layers and radar list:
 * empty set = show everything; otherwise show only selected layers.
 */
export function filterRadarItems(
  events: ConservationEvent[],
  hazards: HazardPoint[],
  signals: SatelliteSignal[],
  layers: Set<RadarLayer>,
) {
  const showEvents = layers.size === 0 || layers.has('event')
  const visibleEvents = showEvents
    ? events.filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled')
    : []
  const visibleHazards = layers.size === 0 ? hazards : hazards.filter((h) => matchesHazardLayer(layers, h.kind))
  const visibleSignals = layers.size === 0 ? signals : signals.filter((s) => matchesHazardLayer(layers, s.kind))
  return { visibleEvents, visibleHazards, visibleSignals }
}

/**
 * NASA EONET volcano events stay `status=open` for ongoing eruptive episodes,
 * so their geometry date is the episode start date rather than a daily log.
 */
export function formatSignalDate(item: { source?: string; kind?: HazardKind; date?: string }): string {
  if (!item.date) return ''
  if (item.source === 'nasa_eonet' && item.kind === 'volcano') {
    return `Aktif sejak ${item.date}`
  }
  return item.date
}
