import { BadgeCheck, Droplets, Flame, HeartHandshake, Mountain, Search, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EVENT_STATUS_LABEL, mapEventTone, shortLocation } from '../../lib/constants'
import { findFundraisingForSignal, useFundraisings } from '../../modules/fundraising/useFundraisings'
import { formatFloodRiskLabel, formatSignalSource } from '../../modules/map/radarFilters'
import { EcoBadge, MarkerTierLegend } from '../ui/atoms'
import type { ConservationEvent, HazardKind, SatelliteSignal, SignalVerificationState } from '../../types'

export type ListTab = 'Utama' | 'Terbaru' | 'History' | 'Satelit' | 'Berjalan' | 'Verifikasi' | 'Selesai'

const TABS: ListTab[] = ['Utama', 'Terbaru', 'History', 'Satelit']
const TONE_TEXT = { critical: 'text-critical', progress: 'text-progress', resolved: 'text-resolved' } as const
const RANK = { open: 0, in_progress: 1, resolved: 2, cancelled: 3 } as const

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

const SIGNAL_TEXT_COLOR: Record<HazardKind, string> = {
  wildfire: 'text-critical',
  volcano: 'text-progress',
  flood: 'text-leaf',
  storm: 'text-leaf',
  suspected: 'text-progress',
  other: 'text-ink-soft',
}

function SignalRow({
  signal,
  linked,
  hasFundraising,
  onOpen,
}: {
  signal: SatelliteSignal
  linked: boolean
  hasFundraising: boolean
  onOpen: () => void
}) {
  const sourceLabel = formatSignalSource(signal.source)
  const riskLabel = formatFloodRiskLabel(signal)
  const isAction = linked || signal.verificationState === 'has_action'
  const isVerified = !isAction && signal.verificationState === 'verified'
  const meta = isAction
    ? `${sourceLabel} · Ada gerakan`
    : isVerified
      ? `${sourceLabel} · Terverifikasi`
      : `${sourceLabel} · ${riskLabel ?? signal.categoryLabel}`
  const kind = signal.kind ?? 'suspected'
  const SignalIcon = kind === 'flood' ? Droplets : kind === 'volcano' ? Mountain : Flame

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-canvas"
      >
        <span className={`row-icon ${SIGNAL_TEXT_COLOR[kind]}`}>
          <SignalIcon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{signal.title}</span>
          <span className="block truncate text-[12px] font-normal text-ink-soft">{meta}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2 text-[12px] font-medium">
          {hasFundraising && (
            <span className="inline-flex items-center gap-1 text-critical" title="Penggalangan dana aktif">
              <HeartHandshake className="size-3.5" strokeWidth={1.75} />
              Donasi
            </span>
          )}
          <span className={isAction ? 'text-resolved' : isVerified ? 'text-leaf' : SIGNAL_TEXT_COLOR[kind]}>
            {isAction ? 'Gerakan' : isVerified ? 'Valid' : 'Sinyal'}
          </span>
        </div>
      </button>
    </li>
  )
}

function formatScheduleShort(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function ActionFeedCard({ event, onOpen }: { event: ConservationEvent; onOpen: () => void }) {
  const coverUrl = event.cover_image_url || event.report?.before_image_url || null
  const participants = event.event_participants?.length ?? 0
  const maxPart = event.max_participants
  const quotaPct = maxPart ? Math.min(100, Math.round((participants / maxPart) * 100)) : null
  const schedule = formatScheduleShort(event.start_at)
  const tone = mapEventTone(event)
  const loc = shortLocation(event.location_name)
  const showLoc = Boolean(loc) && !event.title.toLowerCase().includes(loc.slice(0, 12).toLowerCase())

  return (
    <li className="card-quiet overflow-hidden rounded-[12px] transition-colors hover:border-dash">
      <button type="button" onClick={onOpen} className="flex w-full flex-col text-left">
        <div className="h-32 w-full overflow-hidden border-b border-line bg-canvas">
          {coverUrl ? (
            <img src={coverUrl} alt={event.title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <EcoBadge ecosystem={event.ecosystem} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className={`font-medium ${TONE_TEXT[tone]}`}>
              {EVENT_STATUS_LABEL[event.status]}
            </span>
            {schedule && <span className="num text-ink-soft">{schedule}</span>}
          </div>

          <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink">
            {event.title}
          </h3>

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
}) {
  const [tab, setTab] = useState<ListTab>(() =>
    initialTab && tabs.includes(initialTab) ? initialTab : (tabs[0] ?? 'Utama'),
  )
  const { fundraisings } = useFundraisings()
  const searchRef = useRef<HTMLInputElement>(null)

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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (ev: ConservationEvent) =>
      !q || ev.title.toLowerCase().includes(q) || ev.location_name.toLowerCase().includes(q)
    const base = events.filter(matches)
    if (tab === 'Satelit' || tab === 'Verifikasi') return []
    if (tab === 'Terbaru') {
      return [...base].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    }
    if (tab === 'Berjalan') {
      return base
        .filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled')
        .sort((a, b) => RANK[a.status] - RANK[b.status] || +new Date(b.created_at) - +new Date(a.created_at))
    }
    if (tab === 'Selesai') {
      const source = (impactEvents ?? events).filter(matches)
      return source
        .filter((ev) => ev.status === 'resolved')
        .sort(
          (a, b) =>
            +new Date(b.event_actions?.[0]?.completed_at ?? b.updated_at) -
            +new Date(a.event_actions?.[0]?.completed_at ?? a.updated_at),
        )
    }
    if (tab === 'History') {
      const source = (impactEvents ?? events).filter(matches)
      return source
        .filter((ev) => ev.status === 'resolved' || ev.status === 'in_progress')
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    }
    return [...base].sort(
      (a, b) => RANK[a.status] - RANK[b.status] || +new Date(b.created_at) - +new Date(a.created_at),
    )
  }, [events, impactEvents, tab, query])

  const resolvedTotals = useMemo(() => {
    if (tab !== 'Selesai') return null
    let wasteKg = 0
    let trees = 0
    for (const ev of rows) {
      for (const a of ev.event_actions ?? []) {
        wasteKg += Number(a.waste_kg) || 0
        trees += a.trees_planted || 0
      }
    }
    return { count: rows.length, wasteKg, trees }
  }, [rows, tab])

  const shownSignals =
    tab === 'Satelit' ? filteredSignals : tab === 'Utama' && onOpenSignal ? filteredSignals.slice(0, 4) : []
  const customContent = renderTabContent?.(tab)

  return (
    <div>
      {showTitle && (
        <h2 className="mb-3 text-[20px] font-semibold text-ink">{title}</h2>
      )}

      {showSearch && (
        <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-canvas px-4 transition-colors focus-within:border-leaf focus-within:bg-white">
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

      <div role="tablist" className={`panel-tabs ${showSearch ? 'mt-3' : ''}`}>
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

      {customContent ? (
        <div className="mt-3">{customContent}</div>
      ) : (
        <>
          {resolvedTotals && rows.length > 0 && (
            <div className="card-quiet mt-3 grid grid-cols-3 divide-x divide-line p-3 text-center">
              <div>
                <p className="num text-base font-semibold text-forest">{resolvedTotals.count}</p>
                <p className="text-[12px] font-normal text-ink-soft">Selesai</p>
              </div>
              <div>
                <p className="num text-base font-semibold text-forest">{resolvedTotals.wasteKg} kg</p>
                <p className="text-[12px] font-normal text-ink-soft">Sampah</p>
              </div>
              <div>
                <p className="num text-base font-semibold text-forest">{resolvedTotals.trees}</p>
                <p className="text-[12px] font-normal text-ink-soft">Bibit</p>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <ul className={tab === 'Berjalan' || tab === 'Selesai' ? 'mt-3 flex flex-col gap-3' : 'mt-2 divide-y divide-line'}>
              {rows.map((ev) =>
                tab === 'Selesai' ? (
                  <ResolvedEventRow key={ev.id} event={ev} onOpen={() => onOpen(ev.id)} />
                ) : tab === 'Berjalan' ? (
                  <ActionFeedCard key={ev.id} event={ev} onOpen={() => onOpen(ev.id)} />
                ) : (
                  <EventRow key={ev.id} event={ev} tab={tab} onOpen={() => onOpen(ev.id)} />
                ),
              )}
            </ul>
          )}

          {(shownSignals.length > 0 || (tab === 'Satelit' && Boolean(onOpenSignal))) && onOpenSignal && (
            <div className={rows.length > 0 ? 'mt-4 border-t border-line pt-4' : 'mt-3'}>
              {tab === 'Satelit' && (
                <div className="card-quiet mb-3 px-3 py-2">
                  <MarkerTierLegend compact activeTiers={activeTiers} onToggleTier={onToggleTier} />
                </div>
              )}
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[12px] font-medium text-ink-soft">
                  {tab === 'Satelit' ? `Satelit · ${filteredSignals.length}` : 'Satelit'}
                </p>
                {tab === 'Utama' && filteredSignals.length > shownSignals.length && (
                  <button
                    type="button"
                    onClick={() => {
                      onExpand?.()
                      setTab('Satelit')
                    }}
                    className="text-[12px] font-medium text-leaf hover:underline"
                  >
                    Lihat semua ({filteredSignals.length})
                  </button>
                )}
              </div>
              {shownSignals.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-ink-soft">Tidak ada sinyal dengan status terpilih</p>
              ) : (
                <ul className="divide-y divide-line">
                  {shownSignals.map((sig) => (
                    <SignalRow
                      key={sig.id}
                      signal={sig}
                      linked={linkedSet.has(sig.id)}
                      hasFundraising={Boolean(findFundraisingForSignal(fundraisings, sig))}
                      onOpen={() => onOpenSignal(sig)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          {rows.length === 0 && shownSignals.length === 0 && (
            <p className="py-10 text-center text-[13px] font-normal text-ink-soft">
              {tab === 'Satelit'
                ? 'Belum ada sinyal'
                : tab === 'Berjalan'
                  ? 'Belum ada gerakan berjalan'
                  : tab === 'Selesai'
                    ? 'Belum ada gerakan selesai'
                    : 'Belum ada gerakan'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
