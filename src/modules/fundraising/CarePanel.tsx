import { BadgeCheck, Check, HeartHandshake, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BlamNatureIcon } from '../../components/ui/bumpIcons'
import { MapMarkerGlyph } from '../../components/ui/MapMarkers'
import { shortLocation } from '../../lib/constants'
import type { FundraisingCampaign, SatelliteSignal } from '../../types'
import { CampaignDetail, compactRupiah, KIND_META, percentOf } from './BlamDonasiModal'
import DonateModal from './DonateModal'
import { findSignalForFundraising, formatRupiah, useFundraisings } from './useFundraisings'

type CareTab = 'Aktif' | 'Selesai' | 'Semua'
type CategoryFilter = 'all' | 'wildfire' | 'flood' | 'volcano' | 'other'
type SortBy = 'latest' | 'collected' | 'progress'

const CARE_TABS: readonly CareTab[] = ['Aktif', 'Selesai', 'Semua']

const CATEGORY_OPTIONS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'Semua kategori' },
  { id: 'wildfire', label: 'Karhutla' },
  { id: 'flood', label: 'Banjir' },
  { id: 'volcano', label: 'Vulkanik' },
  { id: 'other', label: 'Lainnya' },
]

const SORT_OPTIONS: ReadonlyArray<{ id: SortBy; label: string }> = [
  { id: 'latest', label: 'Terbaru' },
  { id: 'collected', label: 'Dana terbanyak' },
  { id: 'progress', label: 'Hampir tercapai' },
]

export default function CarePanel({
  signals,
  query = '',
  headerAction,
  onOpenSignal,
  onFocusLocation,
}: {
  signals: SatelliteSignal[]
  query?: string
  headerAction?: ReactNode
  onOpenSignal: (signal: SatelliteSignal) => void
  onFocusLocation: (lat: number, lng: number) => void
}) {
  const { fundraisings, isLoading, refreshFundraisings } = useFundraisings()
  const [tab, setTab] = useState<CareTab>('Aktif')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [filterOpen, setFilterOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [donateTarget, setDonateTarget] = useState<FundraisingCampaign | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [filterOpen])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = fundraisings.filter((f) => {
      if (tab === 'Aktif' && f.status !== 'active') return false
      if (tab === 'Selesai' && f.status === 'active') return false
      if (category === 'wildfire' && f.hazard_kind !== 'wildfire' && f.hazard_kind !== 'suspected') return false
      if (category === 'other' && f.hazard_kind !== 'other' && f.hazard_kind !== 'storm') return false
      if (category !== 'all' && category !== 'wildfire' && category !== 'other' && f.hazard_kind !== category) {
        return false
      }
      if (q) {
        const hay = `${f.title} ${f.organizer_name} ${f.location_name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'collected') return b.collected_amount - a.collected_amount
      if (sortBy === 'progress') return percentOf(b) - percentOf(a)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [fundraisings, tab, category, sortBy, query])

  const detail = useMemo(() => fundraisings.find((f) => f.id === detailId) ?? null, [fundraisings, detailId])
  const activeFilterCount = (category !== 'all' ? 1 : 0) + (sortBy !== 'latest' ? 1 : 0)

  const openPoint = (c: FundraisingCampaign) => {
    const matchedSignal = findSignalForFundraising(signals, c)
    if (matchedSignal) onOpenSignal(matchedSignal)
    else onFocusLocation(c.lat, c.lng)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-semibold text-ink">
          {detail ? 'Detail Penggalangan' : 'Blam Care'}
        </h2>
        {headerAction}
      </div>

      {detail ? (
        <CampaignDetail
          campaign={detail}
          onBack={() => setDetailId(null)}
          onOpenPoint={() => openPoint(detail)}
          onDonate={() => setDonateTarget(detail)}
        />
      ) : (
        <>
          <div className="relative flex items-center gap-2">
            <div role="tablist" className="panel-tabs min-w-0 flex-1">
              {CARE_TABS.map((t) => {
                const active = tab === t
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    className={`panel-tab flex-1 whitespace-nowrap ${active ? 'is-active' : ''}`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>

            <div ref={filterRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                aria-label="Filter penggalangan dana"
                title="Filter & urutkan"
                className={`relative grid size-9 place-items-center rounded-[11px] transition-colors ${
                  activeFilterCount > 0 || filterOpen
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

              {filterOpen && (
                <div
                  role="dialog"
                  aria-label="Filter & urutkan penggalangan"
                  className="atlas-sheet absolute top-11 right-0 z-30 w-52 rounded-[16px] p-2"
                >
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Kategori</span>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategory('all')
                          setSortBy('latest')
                        }}
                        className="text-[11px] font-medium text-leaf hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {CATEGORY_OPTIONS.map((opt) => {
                    const active = category === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => setCategory(opt.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                          active ? 'bg-mint font-medium text-forest' : 'text-ink hover:bg-canvas/80'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {active && <Check className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />}
                      </button>
                    )
                  })}

                  <div className="my-1.5 border-t border-ink/8" />

                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                    Urutkan
                  </p>
                  {SORT_OPTIONS.map((opt) => {
                    const active = sortBy === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => setSortBy(opt.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[13px] transition-colors ${
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

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="atlas-group h-44 animate-pulse bg-canvas/70" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="atlas-group flex flex-col items-center gap-2 py-8 text-center">
              <BlamNatureIcon className="size-12 opacity-85" />
              <p className="text-[13px] font-medium text-ink">
                {tab === 'Aktif'
                  ? 'Belum ada penggalangan aktif'
                  : tab === 'Selesai'
                    ? 'Belum ada penggalangan selesai'
                    : 'Tidak ada penggalangan cocok'}
              </p>
              <p className="max-w-[240px] text-[12px] leading-relaxed text-ink-soft">
                Muncul saat organisasi membuka donasi di titik kejadian
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((c) => {
                const meta = KIND_META[c.hazard_kind] ?? KIND_META.other
                const pct = percentOf(c)
                const isActive = c.status === 'active'
                const loc = shortLocation(c.location_name)
                const showLoc = Boolean(loc) && !c.title.toLowerCase().includes(loc.slice(0, 12).toLowerCase())

                return (
                  <li
                    key={c.id}
                    className="atlas-group overflow-hidden transition-shadow hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                  >
                    <button
                      type="button"
                      onClick={() => setDetailId(c.id)}
                      className="flex w-full flex-col text-left"
                    >
                      {c.cover_image_url && (
                        <div className="h-28 w-full overflow-hidden bg-canvas">
                          <img src={c.cover_image_url} alt={c.title} className="size-full object-cover" />
                        </div>
                      )}

                      <div className="flex flex-col gap-2 p-4 pb-3">
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            {!c.cover_image_url && (
                              <MapMarkerGlyph kind={c.hazard_kind} tier="verified" size="sm" />
                            )}
                            <span className={meta.iconCls}>{meta.label}</span>
                          </span>
                          {tab === 'Semua' && (
                            <span className={`font-medium ${isActive ? 'text-leaf' : 'text-resolved'}`}>
                              {isActive ? 'Aktif' : 'Tercapai'}
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink">
                          {c.title}
                        </h3>

                        <p className="flex items-center gap-1 text-[12px] text-ink-soft">
                          <span className="truncate">{c.organizer_name}</span>
                          <BadgeCheck className="size-3.5 shrink-0 text-leaf" />
                          {showLoc && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{loc}</span>
                            </>
                          )}
                        </p>

                        <div className="flex flex-col gap-1.5 pt-0.5">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                            <div
                              className="h-full rounded-full bg-leaf transition-[width] duration-300"
                              style={{ width: `${Math.max(pct, c.collected_amount > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                          <div className="flex items-baseline justify-between gap-2 text-[12px]">
                            <span className="num font-semibold text-forest">
                              {formatRupiah(c.collected_amount)}
                              <span className="font-normal text-ink-soft"> / {compactRupiah(c.target_amount)}</span>
                            </span>
                            <span className="num shrink-0 text-ink-soft">{c.donations.length} donatur</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {isActive && (
                      <div className="px-4 pb-4">
                        <button
                          type="button"
                          onClick={() => setDonateTarget(c)}
                          className="btn-primary h-9 w-full !rounded-[10px] text-[12px]"
                        >
                          <HeartHandshake className="size-3.5" strokeWidth={1.85} />
                          Donasi
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {donateTarget && (
        <DonateModal
          campaign={donateTarget}
          onClose={() => setDonateTarget(null)}
          onDonated={refreshFundraisings}
        />
      )}
    </div>
  )
}
