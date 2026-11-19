import { Droplets, Flame, HeartHandshake, Mountain, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EVENT_STATUS_LABEL, mapEventTone, shortLocation } from '../../lib/constants'
import { findFundraisingForSignal, useFundraisings } from '../../modules/fundraising/useFundraisings'
import { formatFloodRiskLabel, formatSignalSource } from '../../modules/map/radarFilters'
import { DashedOutline, EcoBadge, MarkerTierLegend } from '../ui/atoms'
import type { ConservationEvent, HazardKind, SatelliteSignal } from '../../types'

export type ListTab = 'Utama' | 'Terbaru' | 'History' | 'Satelit' | 'Berjalan' | 'Verifikasi' | 'Selesai'

const TABS: ListTab[] = ['Utama', 'Terbaru', 'History', 'Satelit']
const DOT = { critical: 'bg-critical', progress: 'bg-progress', resolved: 'bg-resolved' } as const
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
    <li className="relative rounded-[20px] bg-[#f5f7ff] transition-colors hover:bg-mint/30">
      <DashedOutline rx={19} />
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <EcoBadge ecosystem={event.ecosystem} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-normal text-ink">{event.title}</span>
          <span className="block truncate text-[12px] font-light text-ink-soft">{meta}</span>
        </span>
        <span
          className={`size-2.5 shrink-0 rounded-full ${DOT[mapEventTone(event)]}`}
          aria-label={EVENT_STATUS_LABEL[event.status]}
        />
      </button>
    </li>
  )
}

const SIGNAL_TEXT_COLOR: Record<HazardKind, string> = {
  wildfire: 'text-critical',
  volcano: 'text-purple-600',
  flood: 'text-cobalt',
  storm: 'text-cyan-600',
  suspected: 'text-progress',
  other: 'text-progress',
}

const SIGNAL_DOT_COLOR: Record<HazardKind, string> = {
  wildfire: 'bg-critical',
  volcano: 'bg-purple-600',
  flood: 'bg-cobalt',
  storm: 'bg-cyan-600',
  suspected: 'bg-progress',
  other: 'bg-progress',
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
    ? `${sourceLabel} · Sudah Ada Aksi`
    : isVerified
      ? `${sourceLabel} · Terverifikasi`
      : `${sourceLabel} · ${riskLabel ?? signal.categoryLabel}`
  const kind = signal.kind ?? 'suspected'
  const SignalIcon = kind === 'flood' ? Droplets : kind === 'volcano' ? Mountain : Flame

  return (
    <li className="relative rounded-[20px] bg-[#f5f7ff] transition-colors hover:bg-mint/30">
      <DashedOutline rx={19} />
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-[14px] bg-white shadow-[0_1px_2px_rgba(18,29,79,0.04)] ${SIGNAL_TEXT_COLOR[kind]}`}
        >
          <SignalIcon className="size-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-normal text-ink">{signal.title}</span>
          <span className="block truncate text-[12px] font-light text-ink-soft">{meta}</span>
        </span>
        {isAction ? (
          <span className="shrink-0 rounded-full bg-mint/75 px-2 py-0.5 text-[10.5px] font-medium text-forest">
            Aksi
          </span>
        ) : isVerified ? (
          <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10.5px] font-medium text-teal-800">
            ✓ Valid
          </span>
        ) : null}
        {hasFundraising && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-[10.5px] font-normal text-critical">
            <HeartHandshake className="size-3" />
            Donasi
          </span>
        )}
        <span
          className={`size-2.5 shrink-0 rounded-full ${
            isAction ? 'bg-resolved' : isVerified ? 'bg-teal-600' : SIGNAL_DOT_COLOR[kind]
          }`}
          aria-label="Sinyal Satelit"
        />
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
    'Event konservasi telah diselesaikan.'
  const meta = event.organization?.name
    ? `${event.organization.name} · ${shortLocation(event.location_name)}`
    : shortLocation(event.location_name)
  return {
    wasteKg,
    trees,
    recoveryScore: latestAction?.ai_recovery_score ?? null,
    participantCount: event.event_participants?.length ?? 0,
    summary,
    meta,
  }
}

function ResolvedEventRow({ event, onOpen }: { event: ConservationEvent; onOpen: () => void }) {
  const { wasteKg, trees, recoveryScore, participantCount, summary, meta } = summarizeResolvedEvent(event)

  return (
    <li className="relative rounded-[20px] bg-[#f5f7ff] transition-colors hover:bg-mint/30">
      <DashedOutline rx={19} />
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-2.5 px-3.5 py-3.5 text-left">
        <div className="flex items-center gap-3">
          <EcoBadge ecosystem={event.ecosystem} />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-normal text-ink">{event.title}</span>
            <span className="block truncate text-[12px] font-light text-ink-soft">{meta}</span>
          </div>
          <span className="shrink-0 rounded-full bg-mint/75 px-2.5 py-0.5 text-[10.5px] font-normal text-forest">
            Selesai
          </span>
        </div>

        <p className="line-clamp-2 text-[12px] leading-relaxed font-light text-ink-soft">{summary}</p>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-leaf/10 pt-2 text-[11px] font-normal text-forest">
          <span className="num rounded-full bg-white px-2.5 py-0.5 text-forest">{wasteKg} kg sampah</span>
          <span className="num rounded-full bg-white px-2.5 py-0.5 text-forest">{trees} bibit</span>
          {recoveryScore !== null && (
            <span className="num rounded-full bg-mint/50 px-2.5 py-0.5 text-forest">{recoveryScore}% pulih</span>
          )}
          {participantCount > 0 && (
            <span className="num rounded-full bg-white px-2.5 py-0.5 text-ink-soft">{participantCount} relawan</span>
          )}
        </div>
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
  title = 'Aksi',
  onExpand,
  onOpen,
  onOpenSignal,
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
        <h2 className="mb-2.5 text-[21px] font-semibold tracking-tight text-ink">{title}</h2>
      )}

      {showSearch && (
        <label className="flex h-10 items-center gap-2 rounded-full bg-[#f5f7ff] px-3.5 transition-colors focus-within:bg-mint/45">
          <Search className="size-4 shrink-0 text-leaf" />
          <input
            ref={searchRef}
            value={query}
            onFocus={() => onExpand?.()}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-light text-ink outline-none focus:outline-none focus-visible:outline-none placeholder:font-light placeholder:text-ink-soft"
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

      <div role="tablist" className={`flex items-center gap-1 overflow-x-auto ${showSearch ? 'mt-2.5' : ''}`}>
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
              className={`h-7.5 shrink-0 rounded-full px-3 text-[12px] whitespace-nowrap transition-colors ${
                active
                  ? 'bg-mint/80 font-medium text-forest'
                  : 'font-light text-ink-soft hover:text-forest'
              }`}
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
            <div className="relative mt-3 grid grid-cols-3 gap-2 rounded-[20px] bg-[#f5f7ff] p-3 text-center">
              <DashedOutline rx={19} />
              <div>
                <p className="num text-base font-semibold text-forest">{resolvedTotals.count}</p>
                <p className="text-[11px] font-light text-ink-soft">Selesai</p>
              </div>
              <div>
                <p className="num text-base font-semibold text-forest">{resolvedTotals.wasteKg} kg</p>
                <p className="text-[11px] font-light text-ink-soft">Sampah</p>
              </div>
              <div>
                <p className="num text-base font-semibold text-forest">{resolvedTotals.trees}</p>
                <p className="text-[11px] font-light text-ink-soft">Bibit</p>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {rows.map((ev) =>
                tab === 'Selesai' ? (
                  <ResolvedEventRow key={ev.id} event={ev} onOpen={() => onOpen(ev.id)} />
                ) : (
                  <EventRow key={ev.id} event={ev} tab={tab} onOpen={() => onOpen(ev.id)} />
                ),
              )}
            </ul>
          )}

          {shownSignals.length > 0 && onOpenSignal && (
            <div className={rows.length > 0 ? 'mt-4 pt-1' : 'mt-3'}>
              {tab === 'Satelit' && (
                <div className="mb-2.5 rounded-[14px] bg-[#f5f7ff] px-3 py-2">
                  <MarkerTierLegend compact />
                </div>
              )}
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10.5px] font-normal tracking-wider text-ink-soft uppercase">
                  {tab === 'Satelit' ? `Satelit (${filteredSignals.length})` : 'Satelit'}
                </p>
                {tab === 'Utama' && filteredSignals.length > shownSignals.length && (
                  <button
                    type="button"
                    onClick={() => {
                      onExpand?.()
                      setTab('Satelit')
                    }}
                    className="text-[11.5px] font-normal text-leaf hover:underline"
                  >
                    Lihat semua ({filteredSignals.length})
                  </button>
                )}
              </div>
              <ul className="flex flex-col gap-2">
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
            </div>
          )}

          {rows.length === 0 && shownSignals.length === 0 && (
            <p className="py-10 text-center text-[13px] font-light text-ink-soft">
              {tab === 'Satelit'
                ? 'Belum ada sinyal'
                : tab === 'Berjalan'
                  ? 'Belum ada aksi berjalan'
                  : tab === 'Selesai'
                    ? 'Belum ada aksi selesai'
                    : 'Belum ada aksi'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
