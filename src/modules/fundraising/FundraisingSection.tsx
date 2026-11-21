import { Building2, EyeOff, HeartHandshake, Landmark, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import type { ConservationEvent, OrganizerKind, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import CreateFundraisingModal from './CreateFundraisingModal'
import DonateModal from './DonateModal'
import {
  findFundraisingForEvent,
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
  signal?: SatelliteSignal
  event?: ConservationEvent
}

export default function FundraisingSection({ signal, event }: Props) {
  const { profile, memberships } = useAuth()
  const { fundraisings, refreshFundraisings } = useFundraisings()
  const [showCreate, setShowCreate] = useState(false)
  const [showDonate, setShowDonate] = useState(false)

  const campaign = signal
    ? findFundraisingForSignal(fundraisings, signal)
    : event
      ? findFundraisingForEvent(fundraisings, event)
      : null
  const isCritical = signal ? isCriticalRadarSignal(signal) : false

  const hasActiveOrg = memberships.some((m) => m.status === 'active')
  const canCreateFundraising = Boolean(
    profile && (profile.role === 'admin' || profile.role === 'agency' || hasActiveOrg),
  )

  if (!campaign && (!signal || !isCritical || !canCreateFundraising)) {
    return null
  }

  if (!campaign && signal) {
    return (
      <>
        <section className="card-quiet flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="row-icon text-critical">
              <HeartHandshake className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[14px] font-medium text-critical">
                Galang Dana
              </h3>
              <p className="mt-0.5 text-[12px] leading-relaxed font-normal text-ink-soft">
                Galang dana untuk titik ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-soft h-10 w-full gap-2 px-4 text-[12px] text-critical hover:bg-critical/8"
          >
            <HeartHandshake className="size-4" strokeWidth={1.75} />
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

  if (!campaign) return null

  const pct = Math.min(100, Math.round((campaign.collected_amount / Math.max(1, campaign.target_amount)) * 100))
  const badge = ORGANIZER_BADGE[campaign.organizer_kind] ?? ORGANIZER_BADGE.organization
  const BadgeIcon = badge.Icon
  const showOrganizerBadge = !event || campaign.organizer_name !== event.organization?.name
  const displayTitle = campaign.title.split(/\s+[—-]\s+/)[0]?.trim() || campaign.title
  const isTemplateDesc = Boolean(
    campaign.description && /^Penggalangan dana darurat untuk membantu warga terdampak\b/i.test(campaign.description),
  )

  return (
    <>
      <section className="card-quiet flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-critical">
            <HeartHandshake className="size-4" strokeWidth={1.75} />
            Galang Dana
          </span>
          {showOrganizerBadge && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-[8px] border border-line bg-canvas px-2 py-0.5 text-[12px] font-normal text-ink">
              <BadgeIcon className="size-3.5 shrink-0 text-leaf" strokeWidth={1.75} />
              <span className="truncate">
                {badge.label} · {campaign.organizer_name}
              </span>
            </span>
          )}
        </div>

        <div>
          <h3 className="text-[14px] leading-snug font-medium text-ink">{displayTitle}</h3>
          {campaign.description && !isTemplateDesc && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed font-normal text-ink-soft">
              {campaign.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-canvas p-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <p className="num text-[16px] font-semibold text-ink">{formatRupiah(campaign.collected_amount)}</p>
            <p className="text-[12px] font-normal text-ink-soft">
              dari {formatRupiah(campaign.target_amount)} ({pct}%)
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-leaf transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[12px] font-normal text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Users className="size-4 text-leaf" strokeWidth={1.75} />
              {campaign.donations.length} Donatur
            </span>
            {campaign.collected_amount >= campaign.target_amount && (
              <span className="text-[12px] font-medium text-resolved">
                Target Tercapai
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDonate(true)}
          className="btn-primary h-11 w-full px-5 text-[14px]"
        >
          <HeartHandshake className="size-4" strokeWidth={1.75} />
          Donasi Sekarang
        </button>

        <div className="flex flex-col gap-2 pt-1">
          <h4 className="text-[12px] font-medium text-ink-soft">
            Donatur ({campaign.donations.length})
          </h4>
          {campaign.donations.length === 0 ? (
            <p className="rounded-[12px] border border-line bg-canvas px-3.5 py-3 text-center text-[12px] font-normal text-ink-soft">
              Belum ada donasi
            </p>
          ) : (
            <ul className="list-group max-h-60 overflow-y-auto">
              {campaign.donations.map((d) => (
                <li key={d.id} className="list-row flex-col items-stretch gap-1 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-ink">
                      {d.is_anonymous && <EyeOff className="size-3.5 shrink-0 text-ink-soft" strokeWidth={1.75} />}
                      <span className="truncate">{d.donor_name}</span>
                    </span>
                    <span className="num shrink-0 text-[12px] font-medium text-forest">+{formatRupiah(d.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] font-normal text-ink-soft">
                    <span>
                      {d.payment_method === 'qris' ? 'QRIS' : `m-Banking ${d.bank_name ?? ''}`.trim()}
                    </span>
                    <span>{formatTimeAgo(d.created_at)}</span>
                  </div>
                  {d.message && (
                    <p className="mt-1 border-t border-line pt-1.5 text-[12px] leading-relaxed text-ink-soft">
                      {d.message}
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
