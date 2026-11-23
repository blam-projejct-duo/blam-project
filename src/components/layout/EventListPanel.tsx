import { BadgeCheck, Check, LocateFixed, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { requestUserLocation as requestSharedUserLocation, useUserLocation } from '../../lib/location'
import type { ReactNode } from 'react'
import { ECOSYSTEM_FILTERS, EVENT_STATUS_LABEL, mapEventTone, shortLocation } from '../../lib/constants'
import { haversineDistanceKm } from '../../lib/imageCompress'
import { resolveIndonesianProvince } from '../../modules/map/indonesiaProvinces'
import { formatSignalSource } from '../../modules/map/radarFilters'
import { useAreaName } from '../../modules/map/usePlaceName'
import { EcoBadge, MarkerTierLegend } from '../ui/atoms'
import { BlamNatureIcon } from '../ui/bumpIcons'
import { AtlasCoordinateHero, MapMarkerGlyph } from '../ui/MapMarkers'
import type { ConservationEvent, Ecosystem, SatelliteSignal, SignalVerificationState } from '../../types'

export type ListTab = 'Ringkasan' | 'Terbaru' | 'History' | 'Satelit' | 'Terdekat' | 'Semua' | 'Verifikasi'

type EventStatusFilter = 'active' | 'all' | 'open' | 'in_progress' | 'resolved'
type HazardKindFilter = 'all' | 'wildfire' | 'volcano' | 'flood' | 'storm'

const HAZARD_FILTER_OPTIONS: { id: HazardKindFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'wildfire', label: 'Karhutla' },
  { id: 'volcano', label: 'Gunung' },
  { id: 'flood', label: 'Banjir' },
  { id: 'storm', label: 'Badai' },
]

const EVENT_STATUS_OPTIONS: { id: EventStatusFilter; label: string }[] = [
  { id: 'active', label: 'Aktif' },
  { id: 'open', label: 'Terbuka' },
  { id: 'in_progress', label: 'Berjalan' },
  { id: 'resolved', label: 'Selesai' },
  { id: 'all', label: 'Semua status' },
]

const FALLBACK_COORDS = { lat: -2.5, lng: 118.0 }

const TABS: ListTab[] = ['Ringkasan', 'Terbaru', 'History', 'Satelit']
const TONE_TEXT = { critical: 'text-critical', progress: 'text-progress', resolved: 'text-resolved' } as const
const RANK = { open: 0, in_progress: 1, resolved: 2, cancelled: 3 } as const

function SignalDonutChart({
  items,
  total,
}: {
  items: { label: string; count: number; color: string }[]
  total: number
}) {
  const r = 40
  const circ = 2 * Math.PI * r
  const safeTotal = Math.max(1, total)
  const segments = items.reduce<{ label: string; color: string; dash: number; offset: number }[]>(
    (acc, item) => {
      const prevLen = acc.reduce((sum, s) => sum + s.dash, 0)
      const dash = (item.count / safeTotal) * circ
      acc.push({ label: item.label, color: item.color, dash, offset: -prevLen })
      return acc
    },
    [],
  )

  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="12" />
        {segments.map((seg) =>
          seg.dash > 0 ? (
            <circle
              key={seg.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="butt"
            />
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="num text-[20px] leading-none font-semibold text-ink">{total}</span>
        <span className="mt-0.5 text-[10px] font-medium text-ink-soft uppercase">Sinyal</span>
      </div>
    </div>
  )
}

function EventRow({ event, tab, onOpen }: { event: ConservationEvent; tab: ListTab; onOpen: () => void }) {
  const action = event.event_actions?.[0]
  const meta =
    tab === 'History' && action
      ? `${EVENT_STATUS_LABEL[event.status]} · ${Number(action.waste_kg)} kg · ${action.trees_planted} bibit`
      : tab === 'History'
        ? `${EVENT_STATUS_LABEL[event.status]} · ${shortLocation(event.location_name)}`
        : event.organization?.name
          ? `${event.organization.name} · ${shortLocation(event.location_name)}`
          : shortLocation(event.location_name)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-canvas"
      >
        <EcoBadge ecosystem={event.ecosystem} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{event.title}</span>
          <span className="block truncate text-[12px] font-normal text-ink-soft">{meta}</span>
        </span>
        <span className={`shrink-0 text-[12px] font-medium ${TONE_TEXT[mapEventTone(event)]}`}>
          {EVENT_STATUS_LABEL[event.status]}
        </span>
      </button>
    </li>
  )
}

function SignalRow({
  signal,
  linked,
  onOpen,
}: {
  signal: SatelliteSignal
  linked: boolean
  onOpen: () => void
}) {
  const isAction = linked || signal.verificationState === 'has_action'
  const isVerified = !isAction && signal.verificationState === 'verified'
  const tier: SignalVerificationState = isAction ? 'has_action' : isVerified ? 'verified' : 'unverified'
  const kind = signal.kind ?? 'suspected'
  const sepIdx = signal.title.indexOf(' · ')
  const headline = sepIdx > 0 ? signal.title.slice(0, sepIdx) : signal.title
  const areaName = useAreaName(signal.lat, signal.lng)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-canvas"
      >
        <MapMarkerGlyph kind={kind} tier={tier} size="md" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[14px] leading-snug font-medium text-ink">{headline}</span>
          <span className="mt-0.5 block truncate text-[12px] font-normal text-ink-soft">{areaName}</span>
        </span>
      </button>
    </li>
  )
}

function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 1000))} m`
  if (km >= 100) return `${Math.round(km)} km`
  return `${km.toFixed(1).replace('.', ',')} km`
}

function formatScheduleShort(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function ActionFeedCard({
  event,
  distanceKm,
  onOpen,
}: {
  event: ConservationEvent
  distanceKm?: number | null
  onOpen: () => void
}) {
  const coverUrl = event.cover_image_url || event.report?.before_image_url || null
  const participants = event.event_participants?.length ?? 0
  const maxPart = event.max_participants
  const quotaPct = maxPart ? Math.min(100, Math.round((participants / maxPart) * 100)) : null
  const schedule = formatScheduleShort(event.start_at)
  const distanceLabel = distanceKm !== null && distanceKm !== undefined ? formatDistanceKm(distanceKm) : null
  const topRightMeta = [distanceLabel, schedule].filter(Boolean).join(' · ')
  const tone = mapEventTone(event)
  const loc = shortLocation(event.location_name)
  const showLoc = Boolean(loc) && !event.title.toLowerCase().includes(loc.slice(0, 12).toLowerCase())

  return (
    <li className="atlas-group overflow-hidden transition-shadow hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
      <button type="button" onClick={onOpen} className="flex w-full flex-col text-left">
        <div className="h-32 w-full overflow-hidden bg-canvas">
          {coverUrl ? (
            <img src={coverUrl} alt={event.title} className="size-full object-cover" />
          ) : (
            <AtlasCoordinateHero
              lat={event.lat}
              lng={event.lng}
              kind="event"
              tier="has_action"
              compact
              subtitle={showLoc ? loc : event.category}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className={`font-medium ${TONE_TEXT[tone]}`}>{EVENT_STATUS_LABEL[event.status]}</span>
            {topRightMeta && <span className="num text-ink-soft">{topRightMeta}</span>}
          </div>

          <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink">{event.title}</h3>

          <div className="flex items-center gap-1 text-[12px] font-normal text-ink-soft">
            {event.organization?.name && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <span className="truncate">{event.organization.name}</span>
                {event.organization.is_verified && <BadgeCheck className="size-3.5 shrink-0 text-leaf" />}
              </span>
            )}
            {showLoc && (
              <>
                {event.organization?.name && <span aria-hidden="true">·</span>}
                <span className="truncate">{loc}</span>
              </>
            )}
          </div>

          {(quotaPct !== null || participants > 0) && (
            <div className="flex flex-col gap-1.5 pt-1">
              {quotaPct !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-leaf transition-[width] duration-300"
                    style={{ width: `${Math.max(quotaPct, participants > 0 ? 6 : 0)}%` }}
                  />
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 text-[12px] font-normal text-ink-soft">
                <Users className="size-3.5 text-leaf" strokeWidth={1.75} />
                <span className="num font-medium text-ink">
                  {maxPart ? `${participants}/${maxPart}` : participants}
                </span>
                relawan
              </span>
            </div>
          )}
        </div>
      </button>
    </li>
  )
}

function summarizeResolvedEvent(event: ConservationEvent) {
  let wasteKg = 0
  let trees = 0
  for (const a of event.event_actions ?? []) {
    wasteKg += Number(a.waste_kg) || 0
    trees += a.trees_planted || 0
  }
  const latestAction = event.event_actions?.[0]
  const summary =
    latestAction?.ai_comparison_summary?.trim() ||
    latestAction?.notes?.trim() ||
    event.description?.trim() ||
    'Event konservasi telah diselesaikan'
  const meta = event.organization?.name
    ? `${event.organization.name} · ${shortLocation(event.location_name)}`
    : shortLocation(event.location_name)
  const photoUrl = latestAction?.after_image_url || event.cover_image_url || event.report?.before_image_url || null
  return {
    wasteKg,
    trees,
    recoveryScore: latestAction?.ai_recovery_score ?? null,
    participantCount: event.event_participants?.length ?? 0,
    summary,
    meta,
    photoUrl,
  }
}

function ResolvedEventRow({ event, onOpen }: { event: ConservationEvent; onOpen: () => void }) {
  const { wasteKg, trees, recoveryScore, participantCount, summary, meta, photoUrl } = summarizeResolvedEvent(event)
  const metrics = [
    `${wasteKg} kg sampah`,
    `${trees} bibit`,
    ...(recoveryScore !== null ? [`${recoveryScore}% pulih`] : []),
    ...(participantCount > 0 ? [`${participantCount} relawan`] : []),
  ]

  return (
    <li className="card-quiet overflow-hidden rounded-[12px] transition-colors hover:border-dash">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-3 p-4 text-left"
      >
        <div className="flex items-start gap-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={event.title}
              className="h-16 w-20 shrink-0 rounded-[8px] border border-line object-cover"
            />
          ) : (
            <EcoBadge ecosystem={event.ecosystem} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-normal text-ink-soft">{meta}</span>
              <span className="shrink-0 text-[12px] font-medium text-resolved">Selesai</span>
            </div>
            <span className="mt-1 block line-clamp-2 text-[14px] leading-snug font-semibold text-ink">
              {event.title}
            </span>
          </div>
        </div>

        <p className="line-clamp-2 text-[12px] leading-relaxed font-normal text-ink-soft">{summary}</p>

        <p className="num text-[12px] font-medium text-forest">{metrics.join(' · ')}</p>
      </button>
    </li>
  )
}

export default function EventListPanel({
  events,
  impactEvents,
  signals = [],
  query,
  onQueryChange,
  showSearch = true,
  showTitle = true,
  tabs = TABS,
  initialTab,
  autoFocus = false,
  title = 'Gerakan',
  onExpand,
  onOpen,
  onOpenSignal,
  activeTiers,
  onToggleTier,
  renderTabContent,
  expanded = false,
}: {
  events: ConservationEvent[]
  impactEvents?: ConservationEvent[]
  signals?: SatelliteSignal[]
  query: string
  onQueryChange: (q: string) => void
  showSearch?: boolean
  showTitle?: boolean
  tabs?: readonly ListTab[]
  initialTab?: ListTab
  autoFocus?: boolean
  title?: string
  onExpand?: () => void
  onOpen: (id: string) => void
  onOpenSignal?: (signal: SatelliteSignal) => void
  activeTiers?: Set<SignalVerificationState>
  onToggleTier?: (tier: SignalVerificationState) => void
  renderTabContent?: (tab: ListTab) => ReactNode
  expanded?: boolean
}) {
  const [rawTab, setTab] = useState<ListTab>(() =>
    initialTab && tabs.includes(initialTab) ? initialTab : (tabs[0] ?? 'Ringkasan'),
  )
  const tab = tabs.includes(rawTab) ? rawTab : (tabs[0] ?? 'Ringkasan')
  const [tierMenuOpen, setTierMenuOpen] = useState(false)
  const [eventFilterOpen, setEventFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('active')
  const [ecosystemFilter, setEcosystemFilter] = useState<Ecosystem | 'all'>('all')
  const [hazardFilter, setHazardFilter] = useState<HazardKindFilter>('all')
  const sharedLoc = useUserLocation()
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => sharedLoc.coords)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'unsupported'>(() =>
    sharedLoc.coords ? 'ready' : sharedLoc.permission === 'denied' ? 'denied' : sharedLoc.permission === 'unsupported' ? 'unsupported' : 'idle',
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const tierMenuRef = useRef<HTMLDivElement>(null)
  const eventFilterRef = useRef<HTMLDivElement>(null)
  const locationRequestedRef = useRef(false)

  useEffect(() => {
    if (sharedLoc.coords) {
      setUserCoords(sharedLoc.coords)
      setLocationStatus('ready')
    } else if (sharedLoc.permission === 'denied') {
      setLocationStatus('denied')
    } else if (sharedLoc.permission === 'unsupported') {
      setLocationStatus('unsupported')
    }
  }, [sharedLoc.coords, sharedLoc.permission])

  const requestUserLocation = useCallback(() => {
    setLocationStatus('loading')
    void requestSharedUserLocation({ forceRefresh: true }).then((coords) => {
      if (coords) {
        setUserCoords(coords)
        setLocationStatus('ready')
      } else {
        setLocationStatus('denied')
      }
    })
  }, [])

  useEffect(() => {
    if (tab !== 'Terdekat' || locationRequestedRef.current) return
    locationRequestedRef.current = true
    if (sharedLoc.coords) return
    void requestSharedUserLocation().then((coords) => {
      if (coords) {
        setUserCoords(coords)
        setLocationStatus('ready')
      } else {
        setLocationStatus('denied')
      }
    })
  }, [tab, sharedLoc.coords])

  useEffect(() => {
    if (!tierMenuOpen && !eventFilterOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (tierMenuOpen && !tierMenuRef.current?.contains(e.target as Node)) setTierMenuOpen(false)
      if (eventFilterOpen && !eventFilterRef.current?.contains(e.target as Node)) setEventFilterOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTierMenuOpen(false)
        setEventFilterOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [tierMenuOpen, eventFilterOpen])

  useEffect(() => {
    if (!autoFocus) return
    const timer = window.setTimeout(() => {
      searchRef.current?.focus({ preventScroll: true })
    }, 260)
    return () => window.clearTimeout(timer)
  }, [autoFocus])

  const linkedSet = useMemo(() => {
    const s = new Set<string>()
    for (const ev of events) {
      if (ev.ref_source && ev.ref_external_id) {
        s.add(`${ev.ref_source}:${ev.ref_external_id}`)
      }
    }
    return s
  }, [events])

  const filteredSignals = useMemo(() => {
    const q = query.trim().toLowerCase()
    return signals.filter(
      (sig) => !q || sig.title.toLowerCase().includes(q) || sig.categoryLabel.toLowerCase().includes(q),
    )
  }, [signals, query])

  const isMovementTab = tab === 'Terdekat' || tab === 'Semua'
  const activeFilterCount = (statusFilter !== 'active' ? 1 : 0) + (ecosystemFilter !== 'all' ? 1 : 0)
  const refCoords = userCoords ?? FALLBACK_COORDS

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matchesQuery = (ev: ConservationEvent) =>
      !q || ev.title.toLowerCase().includes(q) || ev.location_name.toLowerCase().includes(q)
    const matchesMovementFilter = (ev: ConservationEvent) => {
      if (ecosystemFilter !== 'all' && ev.ecosystem !== ecosystemFilter) return false
      if (statusFilter === 'active') return ev.status !== 'resolved' && ev.status !== 'cancelled'
      if (statusFilter === 'open') return ev.status === 'open'
      if (statusFilter === 'in_progress') return ev.status === 'in_progress'
      if (statusFilter === 'resolved') return ev.status === 'resolved'
      return ev.status !== 'cancelled'
    }

    if (tab === 'Satelit' || tab === 'Verifikasi') return []
    if (tab === 'Terbaru') {
      return [...events.filter(matchesQuery)].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    }
    if (tab === 'Terdekat' || tab === 'Semua') {
      const source = statusFilter === 'resolved' || statusFilter === 'all' ? (impactEvents ?? events) : events
      const filtered = source.filter((ev) => matchesQuery(ev) && matchesMovementFilter(ev))
      if (tab === 'Terdekat') {
        return [...filtered].sort(
          (a, b) =>
            haversineDistanceKm(refCoords.lat, refCoords.lng, a.lat, a.lng) -
            haversineDistanceKm(refCoords.lat, refCoords.lng, b.lat, b.lng),
        )
      }
      return [...filtered].sort(
        (a, b) => RANK[a.status] - RANK[b.status] || +new Date(b.created_at) - +new Date(a.created_at),
      )
    }
    if (tab === 'History') {
      const source = (impactEvents ?? events).filter(matchesQuery)
      return source
        .filter((ev) => ev.status === 'resolved' || ev.status === 'in_progress')
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    }
    return [...events.filter(matchesQuery)].sort(
      (a, b) => RANK[a.status] - RANK[b.status] || +new Date(b.created_at) - +new Date(a.created_at),
    )
  }, [events, impactEvents, tab, query, statusFilter, ecosystemFilter, refCoords.lat, refCoords.lng])

  const resolvedTotals = useMemo(() => {
    if (!isMovementTab || statusFilter !== 'resolved') return null
    let wasteKg = 0
    let trees = 0
    for (const ev of rows) {
      for (const a of ev.event_actions ?? []) {
        wasteKg += Number(a.waste_kg) || 0
        trees += a.trees_planted || 0
      }
    }
    return { count: rows.length, wasteKg, trees }
  }, [rows, isMovementTab, statusFilter])

  const summaryData = useMemo(() => {
    if (tab !== 'Ringkasan') return null
    let verifiedCount = 0
    let actionSignalCount = 0
    let unverifiedCount = 0
    let highRiskCount = 0
    let mediumRiskCount = 0
    let lowRiskCount = 0
    const counts = { wildfire: 0, volcano: 0, flood: 0, storm: 0, other: 0 }
    const provinceCounts = new Map<string, number>()
    const sourceCounts = new Map<string, number>()

    for (const sig of filteredSignals) {
      const isAction = linkedSet.has(sig.id) || sig.verificationState === 'has_action'
      if (isAction) {
        actionSignalCount += 1
        verifiedCount += 1
      } else if (sig.verificationState === 'verified') {
        verifiedCount += 1
      } else {
        unverifiedCount += 1
      }
      if (sig.severity === 'high') highRiskCount += 1
      else if (sig.severity === 'medium') mediumRiskCount += 1
      else lowRiskCount += 1

      const k = sig.kind ?? 'suspected'
      if (k === 'wildfire' || k === 'suspected') counts.wildfire += 1
      else if (k === 'volcano') counts.volcano += 1
      else if (k === 'flood') counts.flood += 1
      else if (k === 'storm') counts.storm += 1
      else counts.other += 1

      const prov = resolveIndonesianProvince(sig.lat, sig.lng)
      provinceCounts.set(prov, (provinceCounts.get(prov) ?? 0) + 1)
      const srcLabel = formatSignalSource(sig.source)
      sourceCounts.set(srcLabel, (sourceCounts.get(srcLabel) ?? 0) + 1)
    }

    const total = Math.max(1, filteredSignals.length)
    const topProvinces = [...provinceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.max(8, Math.round((count / total) * 100)),
      }))
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
    const baseDist: { key: HazardKindFilter; label: string; count: number; color: string }[] = [
      { key: 'wildfire', label: 'Karhutla', count: counts.wildfire, color: '#EA580C' },
      { key: 'volcano', label: 'Gunung', count: counts.volcano, color: '#6D28D9' },
      { key: 'flood', label: 'Banjir', count: counts.flood, color: '#2563EB' },
    ]
    if (counts.storm > 0) {
      baseDist.push({ key: 'storm', label: 'Badai', count: counts.storm, color: '#0E7490' })
    }
    if (counts.other > 0) {
      baseDist.push({ key: 'all', label: 'Lainnya', count: counts.other, color: '#D97706' })
    }
    const distribution = baseDist
      .sort((a, b) => b.count - a.count)
      .map((d) => ({ ...d, pct: d.count > 0 ? Math.max(6, Math.round((d.count / total) * 100)) : 0 }))

    const activeEvents = events
      .filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled')
      .sort((a, b) => RANK[a.status] - RANK[b.status] || +new Date(b.created_at) - +new Date(a.created_at))

    const sourceForImpact = impactEvents ?? events
    let resolvedCount = 0
    let wasteKg = 0
    let treesPlanted = 0
    for (const ev of sourceForImpact) {
      if (ev.status === 'resolved') resolvedCount += 1
      for (const a of ev.event_actions ?? []) {
        wasteKg += Number(a.waste_kg) || 0
        treesPlanted += a.trees_planted || 0
      }
    }

    const prioritySignals = [...filteredSignals]
      .sort((a, b) => {
        const rank = (s: SatelliteSignal) => {
          if (linkedSet.has(s.id) || s.verificationState === 'has_action') return 300
          if (s.verificationState === 'verified') return 200
          if (s.severity === 'high') return 100
          return 0
        }
        return rank(b) - rank(a) || (b.pointCount ?? 0) - (a.pointCount ?? 0)
      })
      .slice(0, expanded ? 6 : 3)

    return {
      totalSignals: filteredSignals.length,
      verifiedCount,
      verifiedOnlyCount: verifiedCount - actionSignalCount,
      actionSignalCount,
      unverifiedCount,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      activeActionCount: activeEvents.length,
      resolvedCount,
      wasteKg,
      treesPlanted,
      distribution,
      topProvinces,
      topSources,
      featuredEvent: activeEvents[0] ?? null,
      prioritySignals,
    }
  }, [tab, filteredSignals, events, impactEvents, linkedSet, expanded])

  const shownSignals = useMemo(() => {
    if (tab !== 'Satelit') return []
    if (hazardFilter === 'all') return filteredSignals
    return filteredSignals.filter((sig) => {
      const k = sig.kind ?? 'suspected'
      if (hazardFilter === 'wildfire') return k === 'wildfire' || k === 'suspected'
      return k === hazardFilter
    })
  }, [tab, filteredSignals, hazardFilter])
  const customContent = renderTabContent?.(tab)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 pb-2.5">
        {showTitle && (
          <h2 className="mb-2.5 text-[20px] font-semibold text-ink">{title}</h2>
        )}

      {showSearch && (
        <label className="flex h-9 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 transition-colors focus-within:border-leaf focus-within:bg-white">
          <Search className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />
          <input
            ref={searchRef}
            value={query}
            onFocus={() => onExpand?.()}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-ink outline-none focus:outline-none focus-visible:outline-none placeholder:text-ink-soft"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus"
              onClick={() => {
                onExpand?.()
                onQueryChange('')
              }}
            >
              <X className="size-4 text-ink-soft" />
            </button>
          )}
        </label>
      )}

      <div className={`relative flex items-center gap-2 ${showSearch ? 'mt-2' : ''}`}>
        <div role="tablist" className="panel-tabs min-w-0 flex-1">
          {tabs.map((t) => {
            const active = tab === t
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  onExpand?.()
                  setTab(t)
                }}
                className={`panel-tab flex-1 whitespace-nowrap ${active ? 'is-active' : ''}`}
              >
                {t}
              </button>
            )
          })}
        </div>

        {(tab === 'Satelit' || tab === 'Ringkasan') && onToggleTier && (
          <div ref={tierMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setTierMenuOpen((v) => !v)}
              aria-expanded={tierMenuOpen}
              aria-label="Filter status sinyal"
              title="Filter status sinyal"
              className={`relative grid size-9 place-items-center rounded-[11px] transition-colors ${(activeTiers?.size ?? 0) > 0 || tierMenuOpen
                  ? 'bg-leaf text-white shadow-xs'
                  : 'bg-white/85 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:text-ink'
                }`}
            >
              <SlidersHorizontal className="size-4" strokeWidth={2} />
              {(activeTiers?.size ?? 0) > 0 && (
                <span className="num absolute -top-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-white bg-forest text-[10px] font-semibold text-white">
                  {activeTiers!.size}
                </span>
              )}
            </button>

            {tierMenuOpen && (
              <div
                role="dialog"
                aria-label="Filter status titik"
                className="atlas-sheet absolute top-11 right-0 z-30 w-48 rounded-[16px] p-1.5"
              >
                <MarkerTierLegend vertical activeTiers={activeTiers} onToggleTier={onToggleTier} />
              </div>
            )}
          </div>
        )}

        {isMovementTab && (
          <div ref={eventFilterRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setEventFilterOpen((v) => !v)}
              aria-expanded={eventFilterOpen}
              aria-label="Filter gerakan"
              title="Filter gerakan"
              className={`relative grid size-9 place-items-center rounded-[11px] transition-colors ${activeFilterCount > 0 || eventFilterOpen
                  ? 'bg-leaf text-white shadow-xs'
                  : 'bg-white/85 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:text-ink'
                }`}
            >
              <SlidersHorizontal className="size-4" strokeWidth={2} />
              {activeFilterCount > 0 && (
                <span className="num absolute -top-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-white bg-forest text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {eventFilterOpen && (
              <div
                role="dialog"
                aria-label="Filter gerakan"
                className="atlas-sheet absolute top-11 right-0 z-30 w-52 rounded-[16px] p-2"
              >
                <div className="flex items-center justify-between px-2 pb-1">
                  <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Status</span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('active')
                        setEcosystemFilter('all')
                      }}
                      className="text-[11px] font-medium text-leaf hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {EVENT_STATUS_OPTIONS.map((opt) => {
                  const active = statusFilter === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => setStatusFilter(opt.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[13px] transition-colors ${active ? 'bg-mint font-medium text-forest' : 'text-ink hover:bg-canvas/80'
                        }`}
                    >
                      <span>{opt.label}</span>
                      {active && <Check className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />}
                    </button>
                  )
                })}

                <div className="my-1.5 border-t border-ink/8" />

                <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Ekosistem
                </p>
                {ECOSYSTEM_FILTERS.map((opt) => {
                  const active = ecosystemFilter === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => setEcosystemFilter(opt.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[13px] transition-colors ${active ? 'bg-mint font-medium text-forest' : 'text-ink hover:bg-canvas/80'
                        }`}
                    >
                      <span>{opt.label}</span>
                      {active && <Check className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-0.5 pb-8">
      {customContent ? (
        <div className="mt-3">{customContent}</div>
      ) : tab === 'Ringkasan' && summaryData && expanded ? (
        <div className="mt-3 flex flex-col gap-3">
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="atlas-group p-3.5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Total Sinyal</p>
              <p className="num mt-1.5 text-[22px] leading-none font-semibold text-ink">{summaryData.totalSignals}</p>
              <p className="mt-1.5 text-[11px] text-critical">{summaryData.highRiskCount} tingkat tinggi</p>
            </div>
            <div className="atlas-group p-3.5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Sudah Dicek</p>
              <p className="num mt-1.5 text-[22px] leading-none font-semibold text-leaf">{summaryData.verifiedCount}</p>
              <p className="num mt-1.5 text-[11px] text-ink-soft">
                {Math.round((summaryData.verifiedCount / Math.max(1, summaryData.totalSignals)) * 100)}% dari total
              </p>
            </div>
            <div className="atlas-group p-3.5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Gerakan Aktif</p>
              <p className="num mt-1.5 text-[22px] leading-none font-semibold text-resolved">{summaryData.activeActionCount}</p>
              <p className="num mt-1.5 text-[11px] text-ink-soft">{summaryData.resolvedCount} selesai</p>
            </div>
            <div className="atlas-group p-3.5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Dampak Pulih</p>
              <p className="num mt-1.5 text-[22px] leading-none font-semibold text-forest">{summaryData.wasteKg} kg</p>
              <p className="num mt-1.5 text-[11px] text-ink-soft">{summaryData.treesPlanted} pohon ditanam</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="atlas-group flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Distribusi Ancaman
                </p>
                <span className="text-[11px] text-ink-soft">Klik untuk filter</span>
              </div>
              <div className="flex items-center gap-5">
                <SignalDonutChart items={summaryData.distribution} total={summaryData.totalSignals} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {summaryData.distribution.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => {
                        setHazardFilter(d.key)
                        setTab('Satelit')
                      }}
                      className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1 text-left text-[12px] transition-colors hover:bg-canvas"
                    >
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.label}
                      </span>
                      <span className="num font-semibold text-ink-soft">{d.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="atlas-group flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Sebaran Provinsi Teratas
                </p>
                <span className="text-[11px] text-ink-soft">Top {summaryData.topProvinces.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {summaryData.topProvinces.map((prov) => (
                  <div key={prov.name} className="flex items-center gap-2.5 text-[12px]">
                    <span className="w-32 shrink-0 truncate font-medium text-ink">{prov.name}</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-leaf" style={{ width: `${prov.pct}%` }} />
                    </div>
                    <span className="num w-7 shrink-0 text-right font-semibold text-ink-soft">{prov.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Breakdown Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="atlas-group flex flex-col gap-3 p-4">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                Status Tindak Lanjut
              </p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {summaryData.actionSignalCount > 0 && (
                  <div
                    className="h-full bg-resolved"
                    style={{ width: `${(summaryData.actionSignalCount / Math.max(1, summaryData.totalSignals)) * 100}%` }}
                  />
                )}
                {summaryData.verifiedOnlyCount > 0 && (
                  <div
                    className="h-full bg-leaf"
                    style={{ width: `${(summaryData.verifiedOnlyCount / Math.max(1, summaryData.totalSignals)) * 100}%` }}
                  />
                )}
                {summaryData.unverifiedCount > 0 && (
                  <div
                    className="h-full bg-ink-soft/30"
                    style={{ width: `${(summaryData.unverifiedCount / Math.max(1, summaryData.totalSignals)) * 100}%` }}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <div>
                  <p className="flex items-center gap-1.5 text-ink-soft">
                    <span className="size-2 rounded-full bg-ink-soft/35" /> Belum Cek
                  </p>
                  <p className="num mt-0.5 text-[15px] font-semibold text-ink">{summaryData.unverifiedCount}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-ink-soft">
                    <span className="size-2 rounded-full bg-leaf" /> Terverifikasi
                  </p>
                  <p className="num mt-0.5 text-[15px] font-semibold text-leaf">{summaryData.verifiedOnlyCount}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-ink-soft">
                    <span className="size-2 rounded-full bg-resolved" /> Ada Gerakan
                  </p>
                  <p className="num mt-0.5 text-[15px] font-semibold text-resolved">{summaryData.actionSignalCount}</p>
                </div>
              </div>
            </div>

            <div className="atlas-group flex flex-col gap-3 p-4">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                Tingkat Keparahan &amp; Sumber
              </p>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <div className="rounded-[10px] bg-canvas px-3 py-2">
                  <p className="text-ink-soft">Tinggi</p>
                  <p className="num mt-0.5 text-[16px] font-semibold text-critical">{summaryData.highRiskCount}</p>
                </div>
                <div className="rounded-[10px] bg-canvas px-3 py-2">
                  <p className="text-ink-soft">Sedang</p>
                  <p className="num mt-0.5 text-[16px] font-semibold text-progress">{summaryData.mediumRiskCount}</p>
                </div>
                <div className="rounded-[10px] bg-canvas px-3 py-2">
                  <p className="text-ink-soft">Rendah</p>
                  <p className="num mt-0.5 text-[16px] font-semibold text-ink">{summaryData.lowRiskCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {summaryData.topSources.map((src) => (
                  <span
                    key={src.name}
                    className="num inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-soft"
                  >
                    <span>{src.name}</span>
                    <span className="font-semibold text-ink">{src.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Priority Signals Grid */}
          {summaryData.prioritySignals.length > 0 && onOpenSignal && (
            <div className="atlas-group p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Perlu Perhatian ({summaryData.prioritySignals.length})
                </p>
                {filteredSignals.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setTab('Satelit')}
                    className="text-[12px] font-medium text-leaf hover:underline"
                  >
                    Lihat semua ({filteredSignals.length})
                  </button>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-1.5">
                {summaryData.prioritySignals.map((sig) => (
                  <SignalRow
                    key={sig.id}
                    signal={sig}
                    linked={linkedSet.has(sig.id)}
                    onOpen={() => onOpenSignal(sig)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : tab === 'Ringkasan' && summaryData ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="atlas-group p-1">
            <div className="atlas-strip grid-cols-3 divide-x divide-ink/8 border-y-0 text-center">
              <div className="atlas-strip-cell">
                <p className="num text-[17px] font-semibold text-leaf">{summaryData.verifiedCount}</p>
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Sudah Dicek</p>
              </div>
              <div className="atlas-strip-cell">
                <p className="num text-[17px] font-semibold text-ink">{summaryData.highRiskCount}</p>
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Rawan</p>
              </div>
              <div className="atlas-strip-cell">
                <p className="num text-[17px] font-semibold text-resolved">{summaryData.activeActionCount}</p>
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Gerakan</p>
              </div>
            </div>
          </div>

          {summaryData.distribution.length > 0 && (
            <div className="atlas-group flex flex-col gap-2.5 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Kondisi Terkini
                </p>
                <span className="text-[10px] font-medium text-ink-soft">NASA FIRMS &amp; EONET</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {summaryData.distribution.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => {
                      setHazardFilter(d.key)
                      setTab('Satelit')
                    }}
                    className="flex items-center gap-2.5 rounded-[8px] px-1 py-0.5 text-left text-[12px] transition-colors hover:bg-canvas"
                  >
                    <span className="w-16 shrink-0 font-medium text-ink">{d.label}</span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                    </div>
                    <span className={`num w-8 shrink-0 text-right font-medium ${d.count > 0 ? 'text-ink-soft' : 'text-ink-soft/45'}`}>
                      {d.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(summaryData.resolvedCount > 0 || summaryData.wasteKg > 0 || summaryData.treesPlanted > 0) && (
            <div className="atlas-group p-1">
              <div className="px-2.5 pt-2 pb-1">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Dampak Pemulihan
                </p>
              </div>
              <div className="atlas-strip grid-cols-3 divide-x divide-ink/8 border-y-0 text-center">
                <div className="atlas-strip-cell">
                  <p className="num text-[16px] font-semibold text-resolved">{summaryData.resolvedCount}</p>
                  <p className="text-[10px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Pulih</p>
                </div>
                <div className="atlas-strip-cell">
                  <p className="num text-[16px] font-semibold text-forest">{summaryData.wasteKg} kg</p>
                  <p className="text-[10px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Sampah</p>
                </div>
                <div className="atlas-strip-cell">
                  <p className="num text-[16px] font-semibold text-forest">{summaryData.treesPlanted}</p>
                  <p className="text-[10px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Pohon</p>
                </div>
              </div>
            </div>
          )}

          {summaryData.featuredEvent && (
            <div className="atlas-group overflow-hidden p-1">
              <button
                type="button"
                onClick={() => onOpen(summaryData.featuredEvent!.id)}
                className="flex w-full items-center gap-3 rounded-[12px] p-2.5 text-left transition-colors hover:bg-canvas"
              >
                {summaryData.featuredEvent.cover_image_url || summaryData.featuredEvent.report?.before_image_url ? (
                  <img
                    src={
                      summaryData.featuredEvent.cover_image_url ||
                      summaryData.featuredEvent.report?.before_image_url ||
                      ''
                    }
                    alt={summaryData.featuredEvent.title}
                    className="size-12 shrink-0 rounded-[10px] object-cover"
                  />
                ) : (
                  <EcoBadge ecosystem={summaryData.featuredEvent.ecosystem} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold tracking-[0.04em] text-resolved uppercase">
                    Butuh Relawan
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] font-semibold text-ink">
                    {summaryData.featuredEvent.title}
                  </span>
                  <span className="block truncate text-[12px] text-ink-soft">
                    {summaryData.featuredEvent.event_participants?.length ?? 0} relawan ·{' '}
                    {shortLocation(summaryData.featuredEvent.location_name)}
                  </span>
                </span>
              </button>
            </div>
          )}

          {summaryData.prioritySignals.length > 0 && onOpenSignal && (
            <div className="atlas-group p-1">
              <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  Perlu Perhatian
                </p>
                {filteredSignals.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setTab('Satelit')}
                    className="text-[12px] font-medium text-leaf hover:underline"
                  >
                    Lihat semua ({filteredSignals.length})
                  </button>
                )}
              </div>
              <ul className="divide-y divide-ink/6">
                {summaryData.prioritySignals.map((sig) => (
                  <SignalRow
                    key={sig.id}
                    signal={sig}
                    linked={linkedSet.has(sig.id)}
                    onOpen={() => onOpenSignal(sig)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          {tab === 'Terdekat' && (locationStatus === 'denied' || locationStatus === 'unsupported') && (
            <div className="atlas-group mt-2.5 flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-soft">
                <LocateFixed className="size-3.5 shrink-0 text-leaf" strokeWidth={2} />
                <span className="truncate">
                  {locationStatus === 'denied'
                    ? 'Lokasi belum aktif · urut dari pusat Indonesia'
                    : 'GPS tidak tersedia · urut dari pusat Indonesia'}
                </span>
              </span>
              {locationStatus === 'denied' && (
                <button
                  type="button"
                  onClick={requestUserLocation}
                  className="shrink-0 font-medium text-leaf hover:underline"
                >
                  Aktifkan
                </button>
              )}
            </div>
          )}

          {resolvedTotals && rows.length > 0 && (
            <div className="atlas-group mt-3 p-1">
              <div className="atlas-strip grid-cols-3 divide-x divide-ink/8 border-y-0 text-center">
                <div className="atlas-strip-cell">
                  <p className="num text-[17px] font-semibold text-forest">{resolvedTotals.count}</p>
                  <p className="text-[11px] font-medium text-ink-soft uppercase tracking-[0.04em]">Selesai</p>
                </div>
                <div className="atlas-strip-cell">
                  <p className="num text-[17px] font-semibold text-forest">{resolvedTotals.wasteKg} kg</p>
                  <p className="text-[11px] font-medium text-ink-soft uppercase tracking-[0.04em]">Sampah</p>
                </div>
                <div className="atlas-strip-cell">
                  <p className="num text-[17px] font-semibold text-forest">{resolvedTotals.trees}</p>
                  <p className="text-[11px] font-medium text-ink-soft uppercase tracking-[0.04em]">Bibit</p>
                </div>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <ul className={isMovementTab ? 'mt-3 flex flex-col gap-3' : 'atlas-group mt-2.5 divide-y divide-ink/6 p-1'}>
              {rows.map((ev) =>
                ev.status === 'resolved' && isMovementTab ? (
                  <ResolvedEventRow key={ev.id} event={ev} onOpen={() => onOpen(ev.id)} />
                ) : isMovementTab ? (
                  <ActionFeedCard
                    key={ev.id}
                    event={ev}
                    distanceKm={
                      tab === 'Terdekat' && userCoords
                        ? haversineDistanceKm(userCoords.lat, userCoords.lng, ev.lat, ev.lng)
                        : null
                    }
                    onOpen={() => onOpen(ev.id)}
                  />
                ) : (
                  <EventRow key={ev.id} event={ev} tab={tab} onOpen={() => onOpen(ev.id)} />
                ),
              )}
            </ul>
          )}

          {(shownSignals.length > 0 || (tab === 'Satelit' && Boolean(onOpenSignal))) && onOpenSignal && (
            <div className={rows.length > 0 ? 'mt-4 border-t border-ink/8 pt-4' : 'mt-2.5'}>
              {tab === 'Satelit' && (
                <div className="mb-2.5 flex flex-col gap-2">
                  <div role="tablist" aria-label="Filter kategori sinyal" className="panel-tabs min-w-0 flex-1">
                    {HAZARD_FILTER_OPTIONS.filter(
                      (opt) => opt.id !== 'storm' || filteredSignals.some((s) => s.kind === 'storm'),
                    ).map((opt) => {
                      const active = hazardFilter === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setHazardFilter(opt.id)}
                          className={`panel-tab shrink-0 flex-1 whitespace-nowrap ${
                            expanded ? '' : '!px-2 !text-[11.5px]'
                          } ${active ? 'is-active' : ''}`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {shownSignals.length === 0 ? (
                <div className="atlas-group flex flex-col items-center gap-2 py-8 text-center">
                  <BlamNatureIcon className="size-12 opacity-85" />
                  <p className="text-[12px] text-ink-soft">Tidak ada sinyal dengan status terpilih</p>
                </div>
              ) : (
                <ul className={expanded ? 'atlas-group grid grid-cols-2 gap-1.5 p-2' : 'atlas-group divide-y divide-ink/6 p-1'}>
                  {shownSignals.map((sig) => (
                    <SignalRow
                      key={sig.id}
                      signal={sig}
                      linked={linkedSet.has(sig.id)}
                      onOpen={() => onOpenSignal(sig)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          {rows.length === 0 && shownSignals.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BlamNatureIcon className="size-12 opacity-85" />
              <p className="text-[14px] font-normal text-ink-soft">
                {tab === 'Satelit'
                  ? 'Belum ada sinyal'
                  : isMovementTab && activeFilterCount > 0
                    ? 'Tidak ada gerakan cocok dengan filter'
                    : 'Belum ada gerakan'}
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
