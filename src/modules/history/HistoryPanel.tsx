import { useQuery } from '@tanstack/react-query'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock,
  HeartHandshake,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BlamNatureIcon } from '../../components/ui/bumpIcons'
import { fetchReportsQueue } from '../../lib/api'
import { REPORT_STATUS_LABEL, shortLocation } from '../../lib/constants'
import type { CitizenReport, ConservationEvent, FundraisingCampaign, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import DonateModal from '../fundraising/DonateModal'
import { useSideFundraising } from '../fundraising/SideFundraisingContext'
import { findSignalForFundraising, formatRupiah, useFundraisings } from '../fundraising/useFundraisings'

type HistoryCategory = 'all' | 'karhutla' | 'banjir' | 'gunung' | 'donasi'
type HistoryTypeTab = 'all' | 'gerakan' | 'donasi'

interface HistoryItem {
  id: string
  category: Exclude<HistoryCategory, 'all'>
  status: 'done' | 'ongoing'
  statusLabel: string
  title: string
  location: string
  lat: number
  lng: number
  dateLabel: string
  sortTime: number
  summary: string
  metaLine: string
  eventId?: string
  fundraising?: FundraisingCampaign
}

const CATEGORY_OPTIONS: { id: HistoryCategory; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'karhutla', label: 'Karhutla' },
  { id: 'banjir', label: 'Banjir' },
  { id: 'gunung', label: 'Gunung' },
  { id: 'donasi', label: 'Donasi' },
]

const TYPE_TABS: { id: HistoryTypeTab; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'gerakan', label: 'Gerakan' },
  { id: 'donasi', label: 'Donasi' },
]

function formatMonthGroup(sortTime: number): string {
  if (!sortTime) return 'Arsip Lainnya'
  return new Date(sortTime).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Baru'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d)
}

function classifyEventCategory(ev: ConservationEvent): Exclude<HistoryCategory, 'all'> {
  const text = `${ev.title} ${ev.category} ${ev.description} ${ev.ref_source ?? ''}`.toLowerCase()
  if (
    ev.ref_source === 'nasa_firms' ||
    text.includes('karhutla') ||
    text.includes('kebakaran') ||
    text.includes('api') ||
    text.includes('termal')
  ) {
    return 'karhutla'
  }
  if (
    ev.ref_source === 'open_meteo_flood' ||
    ev.ref_source === 'petabencana' ||
    text.includes('banjir') ||
    text.includes('luapan') ||
    text.includes('genangan')
  ) {
    return 'banjir'
  }
  if (text.includes('gunung') || text.includes('erupsi') || text.includes('vulkanik')) {
    return 'gunung'
  }
  return 'karhutla'
}

function classifyReportCategory(r: CitizenReport): Exclude<HistoryCategory, 'all'> {
  const text = `${r.title} ${r.threat_category} ${r.description}`.toLowerCase()
  if (text.includes('banjir') || r.ecosystem === 'watershed') return 'banjir'
  if (text.includes('gunung') || text.includes('erupsi')) return 'gunung'
  return 'karhutla'
}

function eventToHistoryItem(ev: ConservationEvent, userId: string): HistoryItem | null {
  const isParticipant = ev.event_participants?.some((p) => p.user_id === userId)
  const isCreator = ev.created_by === userId
  if (!isParticipant && !isCreator) return null

  const category = classifyEventCategory(ev)
  const latestAction = ev.event_actions?.[0]
  const stamp = latestAction?.completed_at ?? ev.updated_at ?? ev.created_at
  let wasteKg = 0
  let trees = 0
  for (const a of ev.event_actions ?? []) {
    wasteKg += Number(a.waste_kg) || 0
    trees += a.trees_planted || 0
  }

  const parts: string[] = [isCreator ? 'Dibuat kamu' : 'Tergabung']
  if (ev.organization?.name) parts.push(ev.organization.name)
  if (wasteKg > 0) parts.push(`${wasteKg} kg`)
  if (trees > 0) parts.push(`${trees} bibit`)

  const isDone = ev.status === 'resolved'
  return {
    id: `ev-${ev.id}`,
    category,
    status: isDone ? 'done' : 'ongoing',
    statusLabel: isDone ? 'Selesai' : 'Berjalan',
    title: ev.title,
    location: shortLocation(ev.location_name),
    lat: ev.lat,
    lng: ev.lng,
    dateLabel: formatShortDate(stamp),
    sortTime: new Date(stamp).getTime() || 0,
    summary:
      latestAction?.ai_comparison_summary?.trim() ||
      latestAction?.notes?.trim() ||
      ev.description?.trim() ||
      'Kegiatan pemulihan lingkungan.',
    metaLine: parts.join(' · '),
    eventId: ev.id,
  }
}

function reportToHistoryItem(r: CitizenReport, userId: string): HistoryItem | null {
  if (r.reporter_id !== userId) return null
  const isDone = r.status === 'verified'
  return {
    id: `rep-${r.id}`,
    category: classifyReportCategory(r),
    status: isDone ? 'done' : 'ongoing',
    statusLabel: REPORT_STATUS_LABEL[r.status],
    title: r.title || 'Laporan Lapangan',
    location: shortLocation(r.location_name),
    lat: r.lat,
    lng: r.lng,
    dateLabel: formatShortDate(r.created_at),
    sortTime: new Date(r.created_at).getTime() || 0,
    summary: r.description?.trim() || r.ai_site_brief?.trim() || 'Laporan lapangan Blam Snap.',
    metaLine: `Blam Snap · ${REPORT_STATUS_LABEL[r.status]}${r.location_name ? ` · ${shortLocation(r.location_name)}` : ''}`,
  }
}

function fundraisingToHistoryItem(f: FundraisingCampaign, userId: string): HistoryItem | null {
  const myDonations = f.donations.filter((d) => d.donor_id === userId)
  if (myDonations.length === 0) return null

  const totalMine = myDonations.reduce((sum, d) => sum + d.amount, 0)
  const latestAt = myDonations[0]?.created_at ?? f.created_at
  const isDone = f.status === 'completed' || f.status === 'closed' || f.collected_amount >= f.target_amount

  return {
    id: `don-${f.id}`,
    category: 'donasi',
    status: isDone ? 'done' : 'ongoing',
    statusLabel: isDone ? 'Selesai' : 'Berjalan',
    title: f.title,
    location: shortLocation(f.location_name),
    lat: f.lat,
    lng: f.lng,
    dateLabel: formatShortDate(latestAt),
    sortTime: new Date(latestAt).getTime() || 0,
    summary: f.description?.trim() || `Penggalangan dana darurat oleh ${f.organizer_name}.`,
    metaLine: `Donasimu ${formatRupiah(totalMine)} (${myDonations.length}×)`,
    fundraising: f,
  }
}

export default function HistoryPanel({
  events,
  signals = [],
  query: externalQuery,
  showSearch = true,
  headerAction,
  onSelectEvent,
  onOpenSignal,
  onFocusLocation,
}: {
  events: ConservationEvent[]
  signals?: SatelliteSignal[]
  query?: string
  showSearch?: boolean
  headerAction?: ReactNode
  onSelectEvent: (id: string) => void
  onOpenSignal?: (signal: SatelliteSignal) => void
  onFocusLocation: (lat: number, lng: number) => void
}) {
  const { profile, openAuthModal } = useAuth()
  const { fundraisings, refreshFundraisings } = useFundraisings()
  const sideFundraising = useSideFundraising()
  const { data: reports = [] } = useQuery({
    queryKey: ['reports-queue', profile?.id ?? 'guest'],
    queryFn: () => fetchReportsQueue(true),
    enabled: Boolean(profile),
  })
  const [category, setCategory] = useState<HistoryCategory>('all')
  const [typeTab, setTypeTab] = useState<HistoryTypeTab>('all')
  const [localQuery, setLocalQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [donateCampaign, setDonateCampaign] = useState<FundraisingCampaign | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const effectiveQuery = externalQuery ?? localQuery

  useEffect(() => {
    if (!filterOpen) return
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [filterOpen])

  const allItems = useMemo(() => {
    if (!profile) return []
    const myEvents = events
      .map((ev) => eventToHistoryItem(ev, profile.id))
      .filter((item): item is HistoryItem => item !== null)
    const myReports = reports
      .map((r) => reportToHistoryItem(r, profile.id))
      .filter((item): item is HistoryItem => item !== null)
    const myDonations = fundraisings
      .map((f) => fundraisingToHistoryItem(f, profile.id))
      .filter((item): item is HistoryItem => item !== null)
    return [...myEvents, ...myReports, ...myDonations].sort(
      (a, b) => b.sortTime - a.sortTime,
    )
  }, [profile, events, reports, fundraisings])

  const stats = useMemo(() => {
    let actionsCount = 0
    let donationsCount = 0
    for (const item of allItems) {
      if (item.category === 'donasi') donationsCount += 1
      else actionsCount += 1
    }
    return {
      points: profile?.points ?? 0,
      actionsCount,
      donationsCount,
    }
  }, [allItems, profile?.points])

  const filtered = useMemo(() => {
    const q = effectiveQuery.trim().toLowerCase()
    return allItems.filter((item) => {
      if (typeTab === 'gerakan' && item.category === 'donasi') return false
      if (typeTab === 'donasi' && item.category !== 'donasi') return false
      if (category !== 'all' && item.category !== category) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      )
    })
  }, [allItems, category, typeTab, effectiveQuery])

  const monthGroups = useMemo(() => {
    const groups: { month: string; items: HistoryItem[] }[] = []
    for (const item of filtered) {
      const month = formatMonthGroup(item.sortTime)
      const last = groups[groups.length - 1]
      if (last && last.month === month) last.items.push(item)
      else groups.push({ month, items: [item] })
    }
    return groups
  }, [filtered])

  if (!profile) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[20px] font-semibold text-ink">History</h2>
          {headerAction}
        </div>
        <div className="atlas-group flex flex-col items-center gap-2.5 p-6 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-mint text-leaf">
            <Clock className="size-5" strokeWidth={2} />
          </span>
          <p className="text-[14px] font-semibold text-ink">Riwayat Aktivitas Kamu</p>
          <button
            type="button"
            onClick={openAuthModal}
            className="btn-primary mt-1 h-9 px-5 text-[13px]"
          >
            Masuk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[20px] font-semibold text-ink">History</h2>
          <span className="num text-[12px] font-normal text-ink-soft">{filtered.length} catatan</span>
        </div>
        {headerAction}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pt-0.5 pb-8">

      <div className="atlas-group p-1">
        <div className="atlas-strip grid-cols-3 divide-x divide-ink/8 border-y-0 text-center">
          <div className="atlas-strip-cell">
            <p className="num text-[17px] font-semibold text-leaf">{stats.points}</p>
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Poin</p>
          </div>
          <div className="atlas-strip-cell">
            <p className="num text-[17px] font-semibold text-ink">{stats.actionsCount}</p>
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Gerakan</p>
          </div>
          <div className="atlas-strip-cell">
            <p className="num text-[17px] font-semibold text-resolved">{stats.donationsCount}</p>
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Donasi</p>
          </div>
        </div>
      </div>

      {showSearch && (
        <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-full bg-white px-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] focus-within:ring-2 focus-within:ring-leaf/25">
          <Search className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Cari riwayat"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-soft"
          />
          {localQuery && (
            <button type="button" aria-label="Hapus" onClick={() => setLocalQuery('')}>
              <X className="size-4 text-ink-soft" strokeWidth={1.75} />
            </button>
          )}
        </label>
      )}

      <div className="flex min-w-0 items-center gap-2">
        <div role="tablist" aria-label="Jenis riwayat" className="panel-tabs min-w-0 flex-1">
          {TYPE_TABS.map((t) => {
            const active = typeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeTab(t.id)}
                className={`panel-tab flex-1 whitespace-nowrap ${active ? 'is-active' : ''}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div ref={filterRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            aria-label="Filter kategori riwayat"
            title="Filter kategori riwayat"
            onClick={() => setFilterOpen((v) => !v)}
            className={`relative grid size-9 place-items-center rounded-[11px] transition-colors ${
              category !== 'all' || filterOpen
                ? 'bg-leaf text-white shadow-xs'
                : 'bg-white/85 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:text-ink'
            }`}
          >
            <SlidersHorizontal className="size-4" strokeWidth={2} />
            {category !== 'all' && (
              <span className="num absolute -top-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-white bg-forest text-[10px] font-semibold text-white">
                1
              </span>
            )}
          </button>

          {filterOpen && (
            <div
              role="menu"
              aria-label="Filter kategori riwayat"
              className="atlas-sheet absolute top-11 right-0 z-30 w-44 rounded-[16px] p-1.5"
            >
              {CATEGORY_OPTIONS.map((opt) => {
                const active = category === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setCategory(opt.id)
                      setFilterOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                      active ? 'bg-mint font-medium text-forest' : 'text-ink hover:bg-canvas/80'
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
      </div>

      {filtered.length === 0 ? (
        <div className="atlas-group flex flex-col items-center gap-2 p-6 text-center">
          <BlamNatureIcon className="size-12 opacity-85" />
          <p className="text-[12px] font-medium text-ink-soft">Tidak ada riwayat cocok</p>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-3.5">
          {monthGroups.map((group) => (
            <section key={group.month} className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                  {group.month}
                </h3>
                <span className="num text-[11px] font-medium text-ink-soft">{group.items.length}</span>
              </div>

              <ul className="atlas-group divide-y divide-ink/6 p-1">
                {group.items.map((item, idx) => {
                  const expanded = expandedId === item.id
                  const isDone = item.status === 'done'
                  const matchedSignal =
                    item.fundraising && onOpenSignal
                      ? findSignalForFundraising(signals, item.fundraising)
                      : null
                  const opensDirect = Boolean(item.eventId || matchedSignal)
                  const isLastInGroup = idx === group.items.length - 1
                  const donationPct = item.fundraising
                    ? Math.min(
                        100,
                        Math.round(
                          (item.fundraising.collected_amount / Math.max(1, item.fundraising.target_amount)) * 100,
                        ),
                      )
                    : null

                  return (
                    <li key={item.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.eventId) {
                            onSelectEvent(item.eventId)
                          } else if (matchedSignal && onOpenSignal) {
                            onOpenSignal(matchedSignal)
                          } else {
                            onFocusLocation(item.lat, item.lng)
                            setExpandedId((prev) => (prev === item.id ? null : item.id))
                          }
                        }}
                        className="flex w-full min-w-0 flex-col gap-2 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-canvas"
                      >
                        <div className="flex w-full min-w-0 items-start gap-2.5">
                          {/* Kolom tanggal + simpul timeline */}
                          <div className="flex shrink-0 items-center gap-2 pt-0.5">
                            <span className="num w-10 text-right text-[11px] font-medium text-ink-soft">
                              {item.dateLabel}
                            </span>
                            <div className="relative flex flex-col items-center">
                              {isDone ? (
                                <CheckCircle2 className="size-3.5 text-resolved" strokeWidth={2.1} aria-label="Selesai" />
                              ) : (
                                <CircleDashed className="size-3.5 text-leaf" strokeWidth={2.1} aria-label="Berjalan" />
                              )}
                              {!isLastInGroup && (
                                <span
                                  aria-hidden="true"
                                  className="absolute top-4 h-6 w-px bg-ink/10"
                                />
                              )}
                            </div>
                          </div>

                          {/* Judul & ringkasan dampak */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                            <p className="mt-0.5 truncate text-[12px] text-ink-soft">{item.metaLine}</p>
                            {donationPct !== null && (
                              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-leaf"
                                  style={{ width: `${Math.max(6, donationPct)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 pt-0.5">
                            {opensDirect ? (
                              <ChevronRight className="size-4 text-ink-soft" strokeWidth={1.75} />
                            ) : (
                              <ChevronDown
                                className={`size-4 text-ink-soft transition-transform ${
                                  expanded ? 'rotate-180' : ''
                                }`}
                                strokeWidth={1.75}
                              />
                            )}
                          </div>
                        </div>

                        {expanded && (
                          <div className="ml-[58px] min-w-0 border-t border-ink/6 pt-2 text-[12px] leading-relaxed break-words text-ink-soft">
                            <p>{item.summary}</p>
                            {item.location && (
                              <p className="mt-1 font-medium text-ink">{item.location}</p>
                            )}
                            {item.fundraising && item.fundraising.status === 'active' && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (item.fundraising) {
                                    if (sideFundraising) sideFundraising.openDonate(item.fundraising, refreshFundraisings)
                                    else setDonateCampaign(item.fundraising)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (item.fundraising) {
                                      if (sideFundraising) sideFundraising.openDonate(item.fundraising, refreshFundraisings)
                                      else setDonateCampaign(item.fundraising)
                                    }
                                  }
                                }}
                                className="btn-primary mt-2 inline-flex h-8 px-3.5 text-[12px]"
                              >
                                <HeartHandshake className="size-4" strokeWidth={1.75} />
                                Donasi Sekarang
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      </div>

      {donateCampaign && (
        <DonateModal
          campaign={donateCampaign}
          onClose={() => setDonateCampaign(null)}
          onDonated={refreshFundraisings}
        />
      )}
    </div>
  )
}
