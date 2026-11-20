import { Droplets, Flame, HeartHandshake, MapPin, Mountain, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DashedOutline, ModalShell } from '../../components/ui/atoms'
import { shortLocation } from '../../lib/constants'
import type { FundraisingCampaign, HazardKind, SatelliteSignal } from '../../types'
import DonateModal from './DonateModal'
import { findSignalForFundraising, formatRupiah, useFundraisings } from './useFundraisings'

const KIND_ICON: Record<HazardKind, { Icon: typeof Flame; tone: string }> = {
  wildfire: { Icon: Flame, tone: 'text-critical' },
  volcano: { Icon: Mountain, tone: 'text-purple-600' },
  flood: { Icon: Droplets, tone: 'text-cobalt' },
  storm: { Icon: Droplets, tone: 'text-cyan-600' },
  suspected: { Icon: Flame, tone: 'text-progress' },
  other: { Icon: HeartHandshake, tone: 'text-critical' },
}

export default function BlamDonasiModal({
  signals,
  onClose,
  onOpenSignal,
  onFocusLocation,
}: {
  signals: SatelliteSignal[]
  onClose: () => void
  onOpenSignal: (signal: SatelliteSignal) => void
  onFocusLocation: (lat: number, lng: number) => void
}) {
  const { fundraisings, isLoading, refreshFundraisings } = useFundraisings()
  const [tab, setTab] = useState<'active' | 'all'>('active')
  const [selectedCampaign, setSelectedCampaign] = useState<FundraisingCampaign | null>(null)

  const list = useMemo(() => {
    const sorted = [...fundraisings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    if (tab === 'active') {
      const actives = sorted.filter((f) => f.status === 'active')
      return actives.length > 0 ? actives : sorted
    }
    return sorted
  }, [fundraisings, tab])

  const activeCount = useMemo(
    () => fundraisings.filter((f) => f.status === 'active').length,
    [fundraisings],
  )

  return (
    <>
      <ModalShell title="Blam Donasi" onClose={onClose}>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-full border border-line/80 bg-[#f3f6f2] p-0.5">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`font-display rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  tab === 'active'
                    ? 'bg-leaf text-white shadow-[0_2px_8px_rgba(29,92,58,0.22)]'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`font-display rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  tab === 'all'
                    ? 'bg-leaf text-white shadow-[0_2px_8px_rgba(29,92,58,0.22)]'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Semua ({fundraisings.length})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-[14px] bg-[#f4f5f7]" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="relative flex flex-col items-center gap-2 rounded-[14px] bg-[#f4f5f7] p-6 text-center">
              <DashedOutline rx={13} />
              <HeartHandshake className="size-7 text-[#2563eb]" />
              <p className="font-display text-sm font-bold text-ink">Belum ada penggalangan dana</p>
              <p className="text-xs leading-relaxed text-ink-soft">
                Buka titik radar kritis di peta untuk memulai penggalangan dana darurat.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((c) => {
                const { Icon, tone } = KIND_ICON[c.hazard_kind] ?? KIND_ICON.other
                const pct = Math.min(
                  100,
                  Math.round((c.collected_amount / Math.max(1, c.target_amount)) * 100),
                )
                const isDone = c.status !== 'active' || c.collected_amount >= c.target_amount
                const matchedSignal = findSignalForFundraising(signals, c)

                return (
                  <li key={c.id} className="relative rounded-[14px] bg-[#f4f5f7] p-4">
                    <DashedOutline rx={13} />
                    <div className="flex items-start gap-3">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-[10px] border border-line bg-white ${tone}`}
                      >
                        <Icon className="size-4.5" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-semibold text-ink-soft">
                            {c.organizer_name}
                          </span>
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                              isDone ? 'bg-white text-forest' : 'bg-critical/10 text-critical'
                            }`}
                          >
                            {c.status === 'active'
                              ? c.collected_amount >= c.target_amount
                                ? 'Target Tercapai'
                                : 'Aktif'
                              : 'Selesai'}
                          </span>
                        </div>
                        <h3 className="font-display mt-0.5 text-[14.5px] leading-snug font-bold text-ink">
                          {c.title}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] font-medium text-ink-soft">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{shortLocation(c.location_name)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[14px] bg-white p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-1">
                        <span className="num text-base text-forest">{formatRupiah(c.collected_amount)}</span>
                        <span className="text-[11px] font-semibold text-ink-soft">
                          dari {formatRupiah(c.target_amount)} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-leaf transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
                        <Users className="size-3.5 text-leaf" />
                        <span>{c.donations.length} donatur</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          if (matchedSignal) {
                            onOpenSignal(matchedSignal)
                          } else {
                            onFocusLocation(c.lat, c.lng)
                          }
                        }}
                        className="font-display inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink transition-colors hover:bg-canvas"
                      >
                        <MapPin className="size-3.5 text-forest" />
                        Lihat Titik
                      </button>

                      {c.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => setSelectedCampaign(c)}
                          className="btn-primary h-9 flex-1 px-3 text-xs"
                        >
                          <HeartHandshake className="size-3.5" />
                          Donasi
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </ModalShell>

      {selectedCampaign && (
        <DonateModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onDonated={refreshFundraisings}
        />
      )}
    </>
  )
}
