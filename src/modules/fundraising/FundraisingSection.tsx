import { Building2, EyeOff, HeartHandshake, Landmark, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { DashedOutline } from '../../components/ui/atoms'
import type { OrganizerKind, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import CreateFundraisingModal from './CreateFundraisingModal'
import DonateModal from './DonateModal'
import {
  findFundraisingForSignal,
  formatRupiah,
  isCriticalRadarSignal,
  useFundraisings,
} from './useFundraisings'

const ORGANIZER_BADGE: Record<OrganizerKind, { label: string; Icon: typeof Landmark }> = {
  agency: { label: 'Pemerintah', Icon: Landmark },
  organization: { label: 'Organisasi', Icon: Building2 },
  admin: { label: 'Admin', Icon: ShieldCheck },
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60_000))
  if (mins < 60) return `${mins} mnt lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hr lalu`
}

interface Props {
  signal: SatelliteSignal
}

export default function FundraisingSection({ signal }: Props) {
  const { profile, memberships } = useAuth()
  const { fundraisings, refreshFundraisings } = useFundraisings()
  const [showCreate, setShowCreate] = useState(false)
  const [showDonate, setShowDonate] = useState(false)

  const campaign = findFundraisingForSignal(fundraisings, signal)
  const isCritical = isCriticalRadarSignal(signal)

  const hasActiveOrg = memberships.some((m) => m.status === 'active')
  const canCreateFundraising = Boolean(
    profile && (profile.role === 'admin' || profile.role === 'agency' || hasActiveOrg),
  )

  if (!campaign && (!isCritical || !canCreateFundraising)) {
    return null
  }

  if (!campaign) {
    return (
      <>
        <section className="relative flex flex-col gap-3 rounded-[20px] bg-[#f5f7ff] p-4">
          <DashedOutline rx={19} />
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-critical/12 text-critical">
              <HeartHandshake className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-sans text-[11px] font-normal tracking-wider text-critical uppercase">
                Galang Dana
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed font-light text-ink-soft">
                Buka donasi cepat untuk warga terdampak di titik ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-[12.5px] font-normal text-critical shadow-[0_1px_2px_rgba(18,29,79,0.04)] transition hover:bg-critical/8"
          >
            <HeartHandshake className="size-4" />
            Buka Galang Dana
          </button>
        </section>

        {showCreate && (
          <CreateFundraisingModal
            signal={signal}
            onClose={() => setShowCreate(false)}
            onCreated={refreshFundraisings}
          />
        )}
      </>
    )
  }

  const pct = Math.min(100, Math.round((campaign.collected_amount / Math.max(1, campaign.target_amount)) * 100))
  const badge = ORGANIZER_BADGE[campaign.organizer_kind] ?? ORGANIZER_BADGE.organization
  const BadgeIcon = badge.Icon

  return (
    <>
      <section className="relative flex flex-col gap-3.5 rounded-[20px] bg-[#f5f7ff] p-4">
        <DashedOutline rx={19} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-critical/10 px-2.5 py-1 text-[11px] font-normal text-critical">
            <HeartHandshake className="size-3.5" />
            Galang Dana
          </span>
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-light text-ink">
            <BadgeIcon className="size-3 shrink-0 text-leaf" />
            <span className="truncate">
              {badge.label} · {campaign.organizer_name}
            </span>
          </span>
        </div>

        <div>
          <h3 className="font-sans text-[14.5px] leading-snug font-normal text-ink">{campaign.title}</h3>
          {campaign.description && (
            <p className="mt-1 text-[12px] leading-relaxed font-light text-ink-soft">{campaign.description}</p>
          )}
        </div>

        <div className="relative flex flex-col gap-2 rounded-tile bg-white p-3.5">
          <DashedOutline rx={13} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <p className="num text-lg text-forest">{formatRupiah(campaign.collected_amount)}</p>
            <p className="text-xs font-light text-ink-soft">
              dari {formatRupiah(campaign.target_amount)} ({pct}%)
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-leaf transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-light text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5 text-leaf" />
              {campaign.donations.length} Donatur
            </span>
            {campaign.collected_amount >= campaign.target_amount && (
              <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-medium text-forest">
                Target Tercapai!
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDonate(true)}
          className="btn-primary h-12 w-full px-5 text-sm"
        >
          <HeartHandshake className="size-4" />
          Donasi Sekarang
        </button>

        <div className="flex flex-col gap-2 pt-1">
          <h4 className="text-[10.5px] font-light tracking-wider text-ink-soft uppercase">
            Donatur ({campaign.donations.length})
          </h4>
          {campaign.donations.length === 0 ? (
            <p className="relative rounded-[16px] bg-white px-3.5 py-3 text-center text-[12px] font-light text-ink-soft">
              <DashedOutline rx={15} />
              Belum ada donasi
            </p>
          ) : (
            <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-0.5">
              {campaign.donations.map((d) => (
                <li key={d.id} className="relative rounded-[16px] bg-white px-3.5 py-2.5">
                  <DashedOutline rx={15} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] font-normal text-ink">
                      {d.is_anonymous && <EyeOff className="size-3 shrink-0 text-ink-soft" />}
                      <span className="truncate">{d.donor_name}</span>
                    </span>
                    <span className="num shrink-0 text-xs text-forest">+{formatRupiah(d.amount)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-light text-ink-soft">
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-normal text-ink-soft">
                      {d.payment_method === 'qris' ? 'QRIS' : `m-Banking ${d.bank_name ?? ''}`.trim()}
                    </span>
                    <span>{formatTimeAgo(d.created_at)}</span>
                  </div>
                  {d.message && (
                    <p className="mt-2 border-t border-line/60 pt-1.5 text-xs leading-relaxed italic text-ink-soft">
                      “{d.message}”
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {showDonate && (
        <DonateModal
          campaign={campaign}
          onClose={() => setShowDonate(false)}
          onDonated={refreshFundraisings}
        />
      )}
    </>
  )
}
