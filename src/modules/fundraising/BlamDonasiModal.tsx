import {
  ArrowUpDown,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Filter,
  Flame,
  HeartHandshake,
  MapPin,
  Mountain,
  SlidersHorizontal,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import { shortLocation } from '../../lib/constants'
import type { FundraisingCampaign, HazardKind, SatelliteSignal } from '../../types'
import DonateModal from './DonateModal'
import { findSignalForFundraising, formatRupiah, useFundraisings } from './useFundraisings'

const KIND_META: Record<
  HazardKind,
  { Icon: typeof Flame; label: string; iconCls: string }
> = {
  wildfire: {
    Icon: Flame,
    label: 'Karhutla',
    iconCls: 'text-critical',
  },
  suspected: {
    Icon: Flame,
    label: 'Titik Panas',
    iconCls: 'text-progress',
  },
  volcano: {
    Icon: Mountain,
    label: 'Vulkanik',
    iconCls: 'text-progress',
  },
  flood: {
    Icon: Droplets,
    label: 'Banjir',
    iconCls: 'text-cobalt',
  },
  storm: {
    Icon: Droplets,
    label: 'Badai',
    iconCls: 'text-ink-soft',
  },
  other: {
    Icon: HeartHandshake,
    label: 'Konservasi',
    iconCls: 'text-forest',
  },
}

type CategoryFilter = 'all' | 'wildfire' | 'flood' | 'volcano' | 'other'
type SortBy = 'latest' | 'collected' | 'progress'
type StatusFilter = 'active' | 'done' | 'all'
type MenuKey = 'category' | 'sort' | 'status' | null

const CATEGORY_OPTIONS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'wildfire', label: 'Karhutla' },
  { id: 'flood', label: 'Banjir' },
  { id: 'volcano', label: 'Vulkanik' },
  { id: 'other', label: 'Lainnya' },
]

const SORT_OPTIONS: ReadonlyArray<{ id: SortBy; label: string }> = [
  { id: 'latest', label: 'Terbaru' },
  { id: 'collected', label: 'Dana Terbanyak' },
  { id: 'progress', label: 'Hampir Tercapai' },
]

const STATUS_OPTIONS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: 'active', label: 'Sedang Aktif' },
  { id: 'done', label: 'Sudah Selesai' },
  { id: 'all', label: 'Semua Status' },
]

function compactRupiah(n: number): string {
  if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (n >= 1_000) return `Rp${Math.round(n / 1_000).toLocaleString('id-ID')} rb`
  return `Rp${n.toLocaleString('id-ID')}`
}

function percentOf(c: FundraisingCampaign): number {
  return Math.min(100, Math.round((c.collected_amount / Math.max(1, c.target_amount)) * 100))
}

function ProgressBar({ pct, hasFunds, thick = false }: { pct: number; hasFunds: boolean; thick?: boolean }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${thick ? 'h-2.5' : 'h-[4px]'}`}>
      <div
        className="h-full rounded-full bg-leaf transition-[width] duration-300"
        style={{ width: `${Math.max(pct, hasFunds ? 4 : 0)}%` }}
      />
    </div>
  )
}

export default function BlamDonasiModal({
  signals,
  embedded = false,
  onClose,
  onOpenSignal,
  onFocusLocation,
}: {
  signals: SatelliteSignal[]
  embedded?: boolean
  onClose: () => void
  onOpenSignal: (signal: SatelliteSignal) => void
  onFocusLocation: (lat: number, lng: number) => void
}) {
  const { fundraisings, isLoading, refreshFundraisings } = useFundraisings()
  const [tab, setTab] = useState<StatusFilter>('active')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [openMenu, setOpenMenu] = useState<MenuKey>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [donateTarget, setDonateTarget] = useState<FundraisingCampaign | null>(null)
  const filterBarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openMenu) return
    const onDown = (e: PointerEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  const list = useMemo(() => {
    const filtered = fundraisings.filter((f) => {
      if (tab === 'active' && f.status !== 'active') return false
      if (tab === 'done' && f.status === 'active') return false
      if (category === 'all') return true
      if (category === 'wildfire') return f.hazard_kind === 'wildfire' || f.hazard_kind === 'suspected'
      if (category === 'other') return f.hazard_kind === 'other' || f.hazard_kind === 'storm'
      return f.hazard_kind === category
    })
    return [...filtered].sort((a, b) => {
      if (sortBy === 'collected') return b.collected_amount - a.collected_amount
      if (sortBy === 'progress') return percentOf(b) - percentOf(a)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [fundraisings, tab, category, sortBy])

  const detail = useMemo(() => fundraisings.find((f) => f.id === detailId) ?? null, [fundraisings, detailId])

  const openPoint = (c: FundraisingCampaign) => {
    const matchedSignal = findSignalForFundraising(signals, c)
    onClose()
    if (matchedSignal) onOpenSignal(matchedSignal)
    else onFocusLocation(c.lat, c.lng)
  }

  const content = detail ? (
    <div className={embedded ? '' : 'pt-3'}>
      <CampaignDetail
        campaign={detail}
        onBack={() => setDetailId(null)}
        onOpenPoint={() => openPoint(detail)}
        onDonate={() => setDonateTarget(detail)}
      />
    </div>
  ) : (
    <div className="flex flex-col pb-5">
      {/* Bar atas gaya Kitabisa dengan dropdown */}
      <div
        ref={filterBarRef}
        className={`relative border-b border-line bg-white ${embedded ? '-mx-5' : '-mx-4 sm:-mx-5'}`}
      >
              <div className="grid grid-cols-3 divide-x divide-line py-2.5 text-[12px]">
                <button
                  type="button"
                  aria-expanded={openMenu === 'category'}
                  onClick={() => setOpenMenu((m) => (m === 'category' ? null : 'category'))}
                  className={`inline-flex items-center justify-center gap-1 px-2 transition-colors ${
                    category !== 'all' || openMenu === 'category'
                      ? 'font-medium text-leaf'
                      : 'font-normal text-ink hover:text-leaf'
                  }`}
                >
                  <SlidersHorizontal className="size-3.5 shrink-0 text-leaf" />
                  <span className="truncate">
                    {category === 'all'
                      ? 'Kategori'
                      : CATEGORY_OPTIONS.find((o) => o.id === category)?.label}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-65" />
                </button>

                <button
                  type="button"
                  aria-expanded={openMenu === 'sort'}
                  onClick={() => setOpenMenu((m) => (m === 'sort' ? null : 'sort'))}
                  className={`inline-flex items-center justify-center gap-1 px-2 transition-colors ${
                    sortBy !== 'latest' || openMenu === 'sort'
                      ? 'font-medium text-leaf'
                      : 'font-normal text-ink hover:text-leaf'
                  }`}
                >
                  <ArrowUpDown className="size-3.5 shrink-0 text-leaf" />
                  <span className="truncate">
                    {sortBy === 'latest'
                      ? 'Urutkan'
                      : SORT_OPTIONS.find((o) => o.id === sortBy)?.label}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-65" />
                </button>

                <button
                  type="button"
                  aria-expanded={openMenu === 'status'}
                  onClick={() => setOpenMenu((m) => (m === 'status' ? null : 'status'))}
                  className={`inline-flex items-center justify-center gap-1 px-2 transition-colors ${
                    openMenu === 'status' ? 'font-medium text-leaf' : 'font-normal text-ink hover:text-leaf'
                  }`}
                >
                  <Filter className="size-3.5 shrink-0 text-leaf" />
                  <span className="truncate">
                    {tab === 'active' ? 'Aktif' : tab === 'done' ? 'Selesai' : 'Semua'}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-65" />
                </button>
              </div>

              {openMenu && (
                <div className="absolute inset-x-3 top-full z-30 mt-1.5 rounded-[16px] border border-line bg-white p-1.5 shadow-[0_14px_34px_-6px_rgba(15,29,50,0.18)] sm:inset-x-4">
                  {(openMenu === 'category'
                    ? CATEGORY_OPTIONS.map((o) => ({
                        id: o.id,
                        label: o.label,
                        active: category === o.id,
                        onSelect: () => {
                          setCategory(o.id)
                          setOpenMenu(null)
                        },
                      }))
                    : openMenu === 'sort'
                      ? SORT_OPTIONS.map((o) => ({
                          id: o.id,
                          label: o.label,
                          active: sortBy === o.id,
                          onSelect: () => {
                            setSortBy(o.id)
                            setOpenMenu(null)
                          },
                        }))
                      : STATUS_OPTIONS.map((o) => ({
                          id: o.id,
                          label: o.label,
                          active: tab === o.id,
                          onSelect: () => {
                            setTab(o.id)
                            setOpenMenu(null)
                          },
                        }))
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={opt.onSelect}
                      className={`flex w-full items-center justify-between rounded-[11px] px-3 py-2 text-left text-[13px] transition-colors ${
                        opt.active
                          ? 'bg-mint font-medium text-leaf'
                          : 'font-normal text-ink hover:bg-canvas'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.active && <Check className="size-4 text-leaf" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-4 pt-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[104px] rounded-[12px] border border-line bg-canvas" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="card-quiet mt-4 flex flex-col items-center gap-2 px-6 py-10 text-center">
                <HeartHandshake className="size-7 text-leaf" strokeWidth={1.75} />
                <p className="text-[14px] font-medium text-ink">
                  {tab === 'active' ? 'Belum ada penggalangan aktif' : 'Belum ada penggalangan selesai'}
                </p>
                <p className="text-[12px] leading-relaxed font-normal text-ink-soft">
                  Muncul saat organisasi membuka donasi di titik kejadian
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((c) => {
                  const meta = KIND_META[c.hazard_kind] ?? KIND_META.other
                  const pct = percentOf(c)

                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setDetailId(c.id)}
                        className="flex w-full items-stretch gap-3.5 py-4 text-left transition-colors hover:bg-canvas/70 active:opacity-80"
                      >
                        <div className="relative flex w-[132px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[12px] border border-line bg-canvas sm:w-[152px]">
                          {c.cover_image_url ? (
                            <img
                              src={c.cover_image_url}
                              alt={c.title}
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : (
                            <meta.Icon className={`size-8 ${meta.iconCls}`} strokeWidth={1.75} />
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                          <div>
                            <p className={`text-[12px] font-medium ${meta.iconCls}`}>{meta.label}</p>
                            <h3 className="mt-0.5 line-clamp-2 text-[14px] leading-snug font-semibold text-ink">
                              {c.title}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-[12px] font-normal text-ink-soft">
                              <span className="truncate">{c.organizer_name}</span>
                              <BadgeCheck className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <ProgressBar pct={pct} hasFunds={c.collected_amount > 0} />
                            <div className="flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[12px] font-normal text-ink-soft">Terkumpul</p>
                                <p className="num truncate text-[14px] font-semibold text-ink">
                                  {formatRupiah(c.collected_amount)}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[12px] font-normal text-ink-soft">Donatur</p>
                                <p className="num text-[14px] font-semibold text-ink">{c.donations.length}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
  )

  return (
    <>
      {embedded ? (
        <div className="flex flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-[20px] font-semibold text-ink">
              {detail ? 'Detail Penggalangan' : 'Blam Care'}
            </h2>
          </div>
          {content}
        </div>
      ) : (
        <ModalShell
          title={detail ? 'Detail Penggalangan' : 'Blam Care'}
          onClose={onClose}
          panelClassName="max-h-[92dvh] md:max-w-[600px]"
          bodyClassName="px-4 pt-0 pb-0 sm:px-5"
        >
          {content}
        </ModalShell>
      )}

      {donateTarget && (
        <DonateModal
          campaign={donateTarget}
          onClose={() => setDonateTarget(null)}
          onDonated={refreshFundraisings}
        />
      )}
    </>
  )
}

function CampaignDetail({
  campaign: c,
  onBack,
  onOpenPoint,
  onDonate,
}: {
  campaign: FundraisingCampaign
  onBack: () => void
  onOpenPoint: () => void
  onDonate: () => void
}) {
  const meta = KIND_META[c.hazard_kind] ?? KIND_META.other
  const pct = percentOf(c)
  const remaining = Math.max(0, c.target_amount - c.collected_amount)
  const recentDonors = [...c.donations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)
  const location = shortLocation(c.location_name)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex w-fit items-center gap-1 rounded-full py-1 pr-2 text-[13px] font-normal text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        Semua penggalangan
      </button>

      <div className="mt-3 flex flex-col gap-5 pb-4">
        {c.cover_image_url && (
          <div className="h-44 w-full overflow-hidden rounded-[12px] border border-line bg-canvas sm:h-52">
            <img src={c.cover_image_url} alt={c.title} className="size-full object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className={`inline-flex w-fit items-center gap-1.5 text-[12px] font-medium ${meta.iconCls}`}>
            <meta.Icon className="size-4" strokeWidth={1.75} />
            {meta.label}
          </span>
          <h3 className="text-[20px] leading-snug font-semibold text-ink">{c.title}</h3>
          <p className="flex items-center gap-1 text-[12px] font-normal text-ink-soft">
            <span className="truncate">{c.organizer_name}</span>
            <BadgeCheck className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />
          </p>
        </div>

        <div className="card-quiet p-4">
          <p className="text-[12px] font-normal text-ink-soft">Terkumpul</p>
          <p className="num mt-0.5 text-[24px] leading-tight font-semibold text-ink">
            {formatRupiah(c.collected_amount)}
          </p>
          <p className="mt-0.5 text-[12px] font-normal text-ink-soft">dari target {formatRupiah(c.target_amount)}</p>
          <div className="mt-3">
            <ProgressBar pct={pct} hasFunds={c.collected_amount > 0} thick />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <p className="num font-semibold text-ink">{c.donations.length}</p>
              <p className="font-normal text-ink-soft">Donatur</p>
            </div>
            <div className="text-right">
              <p className="num font-semibold text-ink">{compactRupiah(remaining)}</p>
              <p className="font-normal text-ink-soft">Kurang</p>
            </div>
          </div>
        </div>

        {c.description?.trim() && (
          <div>
            <p className="mb-1.5 text-[14px] font-medium text-ink">Tentang penggalangan</p>
            <p className="text-[14px] leading-relaxed font-normal text-ink-soft">{c.description}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenPoint}
          className="card-quiet flex items-center gap-3 p-3.5 text-left transition-colors hover:border-dash"
        >
          <span className="row-icon text-leaf">
            <MapPin className="size-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">{location || 'Lokasi titik kejadian'}</span>
            <span className="block text-[12px] font-normal text-ink-soft">Lihat titik di peta</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
        </button>

        {recentDonors.length > 0 && (
          <div>
            <p className="mb-2 text-[14px] font-medium text-ink">Donatur terbaru</p>
            <ul className="list-group">
              {recentDonors.map((d) => (
                <li key={d.id} className="list-row justify-between text-[14px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-canvas text-[12px] font-semibold text-forest">
                      {(d.is_anonymous ? 'O' : d.donor_name?.slice(0, 1) || 'D').toUpperCase()}
                    </span>
                    <span className="truncate font-normal text-ink">
                      {d.is_anonymous ? 'Orang Baik' : d.donor_name}
                    </span>
                  </span>
                  <span className="num shrink-0 font-medium text-ink">{compactRupiah(d.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] sm:-mx-5 sm:px-5">
        {c.status === 'active' ? (
          <button type="button" onClick={onDonate} className="btn-primary h-12 w-full text-[14px]">
            <HeartHandshake className="size-4" strokeWidth={1.75} />
            Donasi Sekarang
          </button>
        ) : (
          <p className="py-3 text-center text-[14px] font-normal text-ink-soft">Penggalangan selesai</p>
        )}
      </div>
    </div>
  )
}
