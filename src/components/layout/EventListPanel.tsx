import { ChevronDown, Flame, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ECOSYSTEM_FILTERS, EVENT_STATUS_LABEL, mapEventTone, shortLocation } from '../../lib/constants'
import { formatSignalDate } from '../../modules/map/radarFilters'
import { EcoBadge } from '../ui/atoms'
import type { ConservationEvent, Ecosystem, HazardKind, SatelliteSignal } from '../../types'

type ListTab = 'Disarankan' | 'Terbaru' | 'Dampak' | 'Satelit'

const TABS: ListTab[] = ['Disarankan', 'Terbaru', 'Dampak', 'Satelit']
const DOT = { critical: 'bg-critical', progress: 'bg-progress', resolved: 'bg-resolved' } as const
const RANK = { open: 0, in_progress: 1, resolved: 2, cancelled: 3 } as const

function EventRow({ event, tab, onOpen }: { event: ConservationEvent; tab: ListTab; onOpen: () => void }) {
  const action = event.event_actions?.[0]
  const meta =
    tab === 'Dampak' && action
      ? `${Number(action.waste_kg)} kg · ${action.trees_planted} bibit`
      : event.organization?.name
        ? `${event.organization.name} · ${shortLocation(event.location_name)}`
        : shortLocation(event.location_name)

  return (
    <li className="dashed-row">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-3.5 text-left">
        <EcoBadge ecosystem={event.ecosystem} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{event.title}</span>
          <span className="block truncate text-[13px] text-ink-soft">{meta}</span>
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
  onOpen,
}: {
  signal: SatelliteSignal
  linked: boolean
  onOpen: () => void
}) {
  const sourceLabel = signal.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'
  const dateLabel = formatSignalDate(signal)
  const meta = linked
    ? `${sourceLabel} · Ada Event`
    : `${sourceLabel} · ${signal.categoryLabel}${dateLabel ? ` · ${dateLabel}` : ''}`
  const kind = signal.kind ?? 'suspected'

  return (
    <li className="dashed-row">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-3.5 text-left">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-[14px] border border-line bg-canvas ${SIGNAL_TEXT_COLOR[kind]}`}
        >
          <Flame className="size-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{signal.title}</span>
          <span className="block truncate text-[13px] text-ink-soft">{meta}</span>
        </span>
        <span
          className={`size-2.5 shrink-0 rounded-full ${linked ? 'bg-resolved' : SIGNAL_DOT_COLOR[kind]}`}
          aria-label="Sinyal Satelit"
        />
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
  ecosystemFilter,
  onEcosystemChange,
  showSearch = true,
  autoFocus = false,
  onOpen,
  onOpenSignal,
}: {
  events: ConservationEvent[]
  impactEvents?: ConservationEvent[]
  signals?: SatelliteSignal[]
  query: string
  onQueryChange: (q: string) => void
  ecosystemFilter?: Ecosystem | 'all'
  onEcosystemChange?: (next: Ecosystem | 'all') => void
  showSearch?: boolean
  autoFocus?: boolean
  onOpen: (id: string) => void
  onOpenSignal?: (signal: SatelliteSignal) => void
}) {
  const [tab, setTab] = useState<ListTab>('Disarankan')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (!filterWrapRef.current?.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filterOpen])

  const activeEcosystemLabel =
    ECOSYSTEM_FILTERS.find((f) => f.id === ecosystemFilter)?.label ?? 'Semua'

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
    if (tab === 'Satelit') return []
    if (tab === 'Terbaru') {
      return [...base].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    }
    if (tab === 'Dampak') {
      const source = (impactEvents ?? events).filter(matches)
      return source.filter((ev) => ev.status === 'resolved' && (ev.event_actions?.length ?? 0) > 0)
    }
    return [...base].sort(
      (a, b) => RANK[a.status] - RANK[b.status] || +new Date(b.created_at) - +new Date(a.created_at),
    )
  }, [events, impactEvents, tab, query])

  const shownSignals =
    tab === 'Satelit' ? filteredSignals : tab === 'Disarankan' && onOpenSignal ? filteredSignals.slice(0, 4) : []

  return (
    <div>
      {showSearch && (
        <label className="flex h-12 items-center gap-2.5 rounded-full bg-canvas px-4">
          <Search className="size-4.5 shrink-0 text-ink-soft" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari lokasi"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
          />
          {query && (
            <button type="button" aria-label="Hapus" onClick={() => onQueryChange('')}>
              <X className="size-4 text-ink-soft" />
            </button>
          )}
        </label>
      )}

      <div ref={filterWrapRef} className={`relative ${showSearch ? 'mt-4' : ''}`}>
        <button
          type="button"
          aria-expanded={filterOpen}
          aria-haspopup="listbox"
          onClick={() => setFilterOpen((v) => !v)}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-full border border-line bg-canvas px-4 text-left transition-colors hover:bg-muted/70"
        >
          <span className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0 text-ink-soft" strokeWidth={2.25} />
            <span className="truncate text-[13px] font-bold text-ink">
              {tab}
              {onEcosystemChange && ecosystemFilter && ecosystemFilter !== 'all'
                ? ` · ${activeEcosystemLabel}`
                : ''}
            </span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-ink-soft transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {filterOpen && (
          <div className="mt-2 flex flex-col gap-3 rounded-card border border-line bg-white p-3.5">
            <div>
              <p className="mb-2 text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                Tampilan Radar
              </p>
              <div role="tablist" className="grid grid-cols-2 gap-1.5">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => {
                      setTab(t)
                      setFilterOpen(false)
                    }}
                    className={`h-9 rounded-full px-3 text-[13px] font-bold transition-colors ${
                      tab === t ? 'bg-ink text-white' : 'bg-canvas text-ink hover:bg-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {onEcosystemChange && (
              <div className="border-t-[1.5px] border-dashed border-dash pt-3">
                <p className="mb-2 text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                  Ekosistem
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ECOSYSTEM_FILTERS.map((f) => {
                    const active = ecosystemFilter === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          onEcosystemChange(f.id)
                          setFilterOpen(false)
                        }}
                        className={`h-8 rounded-full px-3 text-[12px] font-bold transition-colors ${
                          active ? 'bg-ink text-white' : 'bg-canvas text-ink hover:bg-muted'
                        }`}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <ul className="mt-2">
          {rows.map((ev) => (
            <EventRow key={ev.id} event={ev} tab={tab} onOpen={() => onOpen(ev.id)} />
          ))}
        </ul>
      )}

      {shownSignals.length > 0 && onOpenSignal && (
        <div className={rows.length > 0 ? 'mt-4 border-t-[1.5px] border-dashed border-dash pt-3' : 'mt-2'}>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
              {tab === 'Satelit' ? `Sinyal Satelit (${filteredSignals.length})` : 'Sinyal Satelit'}
            </p>
            {tab === 'Disarankan' && filteredSignals.length > shownSignals.length && (
              <button
                type="button"
                onClick={() => setTab('Satelit')}
                className="text-[11px] font-bold text-cobalt hover:underline"
              >
                Lihat semua ({filteredSignals.length})
              </button>
            )}
          </div>
          <ul>
            {shownSignals.map((sig) => (
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

      {rows.length === 0 && shownSignals.length === 0 && (
        <p className="py-10 text-center text-sm font-semibold text-ink-soft">
          {tab === 'Satelit' ? 'Belum ada sinyal satelit' : 'Tidak ada event'}
        </p>
      )}
    </div>
  )
}
