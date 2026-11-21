import type { ConservationEvent, HazardKind, SatelliteSignal, SignalVerificationState } from '../../types'
import type { HazardPoint } from './hotspotCluster'

export type RadarLayer = 'wildfire' | 'suspected' | 'flood' | 'volcano' | 'event'

export const LAYER_CHIPS: ReadonlyArray<{ layer: RadarLayer; label: string; dot: string }> = [
  { layer: 'wildfire', label: 'Karhutla', dot: 'bg-critical' },
  { layer: 'suspected', label: 'Titik Panas', dot: 'bg-progress' },
  { layer: 'flood', label: 'Banjir', dot: 'bg-cobalt' },
  { layer: 'volcano', label: 'Gunung Berapi', dot: 'bg-progress' },
  { layer: 'event', label: 'Gerakan', dot: 'bg-resolved' },
]

function matchesHazardLayer(layers: Set<RadarLayer>, kind?: HazardKind): boolean {
  if (layers.size === 0) return true
  if (kind === 'wildfire' || kind === 'suspected' || kind === 'flood' || kind === 'volcano') {
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
  tiers?: Set<SignalVerificationState>,
) {
  const hasTierFilter = Boolean(tiers && tiers.size > 0)
  const showEvents = (layers.size === 0 || layers.has('event')) && (!hasTierFilter || Boolean(tiers?.has('has_action')))
  const visibleEvents = showEvents
    ? events.filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled')
    : []
  const visibleHazards = hazards.filter(
    (h) =>
      matchesHazardLayer(layers, h.kind) &&
      (!hasTierFilter || Boolean(tiers?.has(h.verificationState ?? 'unverified'))),
  )
  const visibleSignals = signals.filter((s) => {
    const tier: SignalVerificationState = s.verificationState ?? (s.linkedEventId ? 'has_action' : 'unverified')
    return matchesHazardLayer(layers, s.kind) && (!hasTierFilter || Boolean(tiers?.has(tier)))
  })
  return { visibleEvents, visibleHazards, visibleSignals }
}

export function formatSignalSource(source: string): string {
  if (source === 'nasa_firms') return 'NASA FIRMS'
  if (source === 'nasa_eonet') return 'NASA EONET'
  if (source === 'open_meteo_flood') return 'Open-Meteo Flood'
  if (source === 'petabencana') return 'PetaBencana.id'
  return source
}

export function formatFloodRiskLabel(item: {
  kind?: HazardKind
  source?: string
  severity?: 'high' | 'medium' | 'low'
}): string | null {
  if (item.kind !== 'flood') return null
  if (item.source === 'open_meteo_flood') {
    return item.severity === 'high' ? 'Risiko Tinggi' : 'Risiko Sedang'
  }
  return 'Sedang Banjir'
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
