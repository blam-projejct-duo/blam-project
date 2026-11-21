import {
  Check,
  ChevronDown,
  Droplets,
  Flame,
  HeartHandshake,
  Mountain,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { shortLocation } from '../../lib/constants'
import type { ConservationEvent, FundraisingCampaign, SatelliteSignal } from '../../types'
import DonateModal from '../fundraising/DonateModal'
import { findSignalForFundraising, formatRupiah, useFundraisings } from '../fundraising/useFundraisings'

type HistoryCategory = 'all' | 'karhutla' | 'banjir' | 'gunung' | 'donasi'
type HistoryStatusFilter = 'all' | 'done' | 'ongoing'

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

const STATUS_FILTERS: { id: HistoryStatusFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'done', label: 'Selesai' },
  { id: 'ongoing', label: 'Ditangani' },
]

const CATEGORY_META: Record<
  Exclude<HistoryCategory, 'all'>,
  { label: string; Icon: typeof Flame; tone: string }
> = {
  karhutla: { label: 'Karhutla', Icon: Flame, tone: 'text-critical' },
  banjir: { label: 'Banjir', Icon: Droplets, tone: 'text-cobalt' },
  gunung: { label: 'Gunung', Icon: Mountain, tone: 'text-progress' },
  donasi: { label: 'Donasi', Icon: HeartHandshake, tone: 'text-critical' },
}

const ARCHIVE_HISTORY: HistoryItem[] = [
  {
    id: 'arc-karhutla-oki',
    category: 'karhutla',
    status: 'done',
    statusLabel: 'Selesai',
    title: 'Karhutla Gambut Ogan Komering Ilir',
    location: 'OKI, Sumsel',
    lat: -3.3833,
    lng: 105.05,
    dateLabel: '14 Okt',
    sortTime: Date.parse('2026-10-14T10:00:00Z'),
    summary: 'Titik api di 3 blok gambut padam melalui sekat kanal dan patroli Manggala Agni bersama relawan.',
    metaLine: '142 ha terkendali · 64 relawan · Manggala Agni',
  },
  {
    id: 'arc-banjir-demak',
    category: 'banjir',
    status: 'done',
    statusLabel: 'Usai',
    title: 'Banjir Tanggul Sungai Wulan Demak',
    location: 'Demak, Jateng',
    lat: -6.8906,
    lng: 110.6396,
    dateLabel: '03 Nov',
    sortTime: Date.parse('2026-11-03T08:00:00Z'),
    summary: 'Genangan di 11 desa surut usai penutupan tanggul darurat dan normalisasi pintu air hilir.',
    metaLine: 'Surut 100% · 11 desa pulih · BPBD Jateng',
  },
  {
    id: 'arc-karhutla-riau',
    category: 'karhutla',
    status: 'ongoing',
    statusLabel: 'Ditangani',
    title: 'Kebakaran Semak Pesisir Bengkalis',
    location: 'Bengkalis, Riau',
    lat: 1.4796,
    lng: 102.1194,
    dateLabel: '18 Nov',
    sortTime: Date.parse('2026-11-18T06:00:00Z'),
    summary: 'Pendinginan sisa asap bawah permukaan dan pemantauan hotspot satelit masih berlangsung.',
    metaLine: 'Pendinginan aktif · 28 personel · Satgas Karhutla',
  },
  {
    id: 'arc-gunung-ruang',
    category: 'gunung',
    status: 'done',
    statusLabel: 'Selesai',
    title: 'Penanganan Abu Vulkanik Gunung Ruang',
    location: 'Sitaro, Sulut',
    lat: 2.3,
    lng: 125.37,
    dateLabel: '19 Sep',
    sortTime: Date.parse('2026-09-19T09:00:00Z'),
    summary: 'Aktivitas vulkanik melandai; pembersihan abu dan pemulihan vegetasi pesisir pulau rampung.',
    metaLine: 'Status Normal · 42 relawan · PVMBG',
  },
  {
    id: 'arc-gunung-lewotobi',
    category: 'gunung',
    status: 'done',
    statusLabel: 'Selesai',
    title: 'Pemulihan Pasca Erupsi Lewotobi',
    location: 'Flores Timur, NTT',
    lat: -8.542,
    lng: 122.775,
    dateLabel: '08 Okt',
    sortTime: Date.parse('2026-10-08T11:00:00Z'),
    summary: 'Filtrasi sumber air desa dan penanaman ulang area terdampak abu selesai dilakukan.',
    metaLine: '4 sumber air pulih · 350 bibit',
  },
  {
    id: 'arc-banjir-aceh',
    category: 'banjir',
    status: 'ongoing',
    statusLabel: 'Ditangani',
    title: 'Luapan DAS Krueng Peusangan',
    location: 'Bireuen, Aceh',
    lat: 5.203,
    lng: 96.7009,
    dateLabel: '17 Nov',
    sortTime: Date.parse('2026-11-17T07:00:00Z'),
    summary: 'Pembersihan material kayu hanyutan dan penguatan tebing alur sungai masih berjalan.',
    metaLine: 'Pembersihan alur · 19 relawan',
  },
]

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Baru'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d)
}

function classifyEventCategory(ev: ConservationEvent): Exclude<HistoryCategory, 'all'> | null {
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
  return null
}

function eventToHistoryItem(ev: ConservationEvent): HistoryItem | null {
  if (ev.status !== 'resolved' && ev.status !== 'in_progress') return null
  const category = classifyEventCategory(ev)
  if (!category) return null

  const latestAction = ev.event_actions?.[0]
  const stamp = latestAction?.completed_at ?? ev.updated_at ?? ev.created_at
  let wasteKg = 0
  let trees = 0
  for (const a of ev.event_actions ?? []) {
    wasteKg += Number(a.waste_kg) || 0
    trees += a.trees_planted || 0
  }

  const parts: string[] = []
  if (ev.organization?.name) parts.push(ev.organization.name)
  if (wasteKg > 0) parts.push(`${wasteKg} kg`)
  if (trees > 0) parts.push(`${trees} bibit`)
  if (latestAction?.ai_recovery_score != null) parts.push(`${latestAction.ai_recovery_score}% pulih`)

  const isDone = ev.status === 'resolved'
  return {
    id: `ev-${ev.id}`,
    category,
    status: isDone ? 'done' : 'ongoing',
    statusLabel: isDone ? 'Selesai' : 'Ditangani',
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
    metaLine: parts.join(' · ') || (isDone ? 'Gerakan selesai' : 'Penanganan berjalan'),
    eventId: ev.id,
  }
}

function fundraisingToHistoryItem(f: FundraisingCampaign): HistoryItem {
  const isDone =
    f.status === 'completed' || f.status === 'closed' || f.collected_amount >= f.target_amount
  const pct = Math.min(100, Math.round((f.collected_amount / Math.max(1, f.target_amount)) * 100))

  return {
    id: `don-${f.id}`,
    category: 'donasi',
    status: isDone ? 'done' : 'ongoing',
    statusLabel: isDone ? 'Selesai' : 'Berjalan',
    title: f.title,
    location: shortLocation(f.location_name),
    lat: f.lat,
    lng: f.lng,
    dateLabel: formatShortDate(f.created_at),
    sortTime: new Date(f.created_at).getTime() || 0,
    summary: f.description?.trim() || `Penggalangan dana darurat oleh ${f.organizer_name}.`,
    metaLine: `${formatRupiah(f.collected_amount)} / ${formatRupiah(f.target_amount)} (${pct}%) · ${f.donations.length} donatur`,
    fundraising: f,
  }
}

export default function HistoryPanel({
  events,
  signals = [],
  onSelectEvent,
  onOpenSignal,
  onFocusLocation,
}: {
  events: ConservationEvent[]
  signals?: SatelliteSignal[]
  onSelectEvent: (id: string) => void
  onOpenSignal?: (signal: SatelliteSignal) => void
  onFocusLocation: (lat: number, lng: number) => void
}) {
  const { fundraisings, refreshFundraisings } = useFundraisings()
  const [category, setCategory] = useState<HistoryCategory>('all')
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [donateCampaign, setDonateCampaign] = useState<FundraisingCampaign | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

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
    const liveEvents = events
      .map(eventToHistoryItem)
      .filter((item): item is HistoryItem => item !== null)
    const liveDonations = fundraisings.map(fundraisingToHistoryItem)
    return [...liveEvents, ...liveDonations, ...ARCHIVE_HISTORY].sort(
      (a, b) => b.sortTime - a.sortTime,
    )
  }, [events, fundraisings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allItems.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      )
    })
  }, [allItems, category, statusFilter, query])

  const activeCategoryLabel =
    category === 'all' ? 'Filter' : (CATEGORY_META[category]?.label ?? 'Filter')

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[20px] font-semibold text-ink">History</h2>
        <span className="num rounded-[8px] border border-line bg-white px-2 py-0.5 text-[12px] font-medium text-ink-soft">
          {filtered.length}
        </span>
      </div>

      <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-full border border-line bg-white px-3.5 transition-colors focus-within:border-leaf">
        <Search className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-soft"
        />
        {query && (
          <button type="button" aria-label="Hapus" onClick={() => setQuery('')}>
            <X className="size-4 text-ink-soft" strokeWidth={1.75} />
          </button>
        )}
      </label>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Filter status riwayat"
          className="panel-tabs p-0.5"
        >
          {STATUS_FILTERS.map((sf) => {
            const active = statusFilter === sf.id
            return (
              <button
                key={sf.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(sf.id)}
                className={`panel-tab whitespace-nowrap px-2.5 py-1 text-[12px] ${active ? 'is-active' : ''}`}
              >
                {sf.label}
              </button>
            )
          })}
        </div>

        <div ref={filterRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            onClick={() => setFilterOpen((v) => !v)}
            className={`inline-flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
              category !== 'all'
                ? 'bg-ink text-white'
                : 'btn-soft'
            }`}
          >
            <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.75} />
            <span>{activeCategoryLabel}</span>
            <ChevronDown
              className={`size-4 shrink-0 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
            />
          </button>

          {filterOpen && (
            <div
              role="menu"
              aria-label="Filter kategori riwayat"
              className="absolute top-10 right-0 z-30 min-w-[168px] rounded-[12px] border border-line bg-white p-1.5 shadow-[0_12px_28px_rgba(15,29,50,0.14)]"
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
                    className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                      active ? 'bg-mint text-forest' : 'text-ink-soft hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-quiet p-5 text-center">
          <p className="text-xs font-medium text-ink-soft">Tidak ada riwayat cocok</p>
        </div>
      ) : (
        <ul className="flex min-w-0 flex-col gap-2">
          {filtered.map((item) => {
            const meta = CATEGORY_META[item.category]
            const Icon = meta.Icon
            const expanded = expandedId === item.id
            const isDone = item.status === 'done'
            const matchedSignal =
              item.fundraising && onOpenSignal
                ? findSignalForFundraising(signals, item.fundraising)
                : null
            const opensDirect = Boolean(item.eventId || matchedSignal)

            return (
              <li
                key={item.id}
                className="card-quiet min-w-0 transition-colors hover:border-dash"
              >
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
                  className="flex w-full min-w-0 flex-col gap-2 px-3 py-2.5 text-left"
                >
                  <div className="flex w-full min-w-0 items-center gap-2.5">
                    <span className={`row-icon ${meta.tone}`}>
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                      <p className="truncate text-[12px] text-ink-soft">
                        {meta.label} · {item.location} · {item.dateLabel}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`text-[12px] font-medium ${isDone ? 'text-resolved' : 'text-progress'}`}>
                        {item.statusLabel}
                      </span>
                      {!opensDirect && (
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
                    <div className="w-full min-w-0 border-t border-line pt-2 text-[12px] leading-relaxed break-words text-ink-soft">
                      <p>{item.summary}</p>
                      <p className="mt-1 font-medium text-forest">{item.metaLine}</p>
                      {item.fundraising && item.fundraising.status === 'active' && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDonateCampaign(item.fundraising ?? null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              setDonateCampaign(item.fundraising ?? null)
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
      )}

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
