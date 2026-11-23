import { useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  CalendarPlus,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Flame,
  MapPin,
  Mountain,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { AtlasCoordinateHero } from '../../components/ui/MapMarkers'
import { moderateHotspotAdmin, verifyRadarSignal } from '../../lib/api'
import { shortLocation } from '../../lib/constants'
import type { ConservationEvent, HazardKind, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import FundraisingSection from '../fundraising/FundraisingSection'
import { formatFloodRiskLabel, formatSignalDate, formatSignalSource } from '../map/radarFilters'
import { formatFloodPulseTiles, formatPulseTiles, usePulse } from '../map/usePulse'
import type { PulseTileData } from '../map/usePulse'
import { placeText, usePlaceName } from '../map/usePlaceName'

const KIND_TEXT_CLASS: Record<HazardKind, string> = {
  wildfire: 'text-critical',
  volcano: 'text-volcano',
  flood: 'text-leaf',
  storm: 'text-storm',
  suspected: 'text-progress',
  other: 'text-progress',
}

const STATUS_TONE = {
  good: 'text-resolved',
  warn: 'text-progress',
  bad: 'text-critical',
  neutral: 'text-ink-soft',
} as const

interface Props {
  signal: SatelliteSignal
  linkedEvent: ConservationEvent | null
  onOpenEvent: (eventId: string) => void
  onCreateEvent: (signal: SatelliteSignal) => void
  onModerated: () => Promise<void>
}

function StripMetric({
  value,
  unit,
  label,
  status,
  tone = 'neutral',
  spacious = false,
}: PulseTileData & { spacious?: boolean }) {
  return (
    <div className={spacious ? 'min-w-0 px-4 py-3.5' : 'atlas-strip-cell min-w-0'}>
      <div className="flex items-center justify-between gap-1.5 text-[11px] font-medium text-ink-soft">
        <span className="truncate">{label}</span>
        {status && <span className={`shrink-0 ${STATUS_TONE[tone]}`}>{status}</span>}
      </div>
      <p className={`num flex items-baseline gap-1 text-[17px] leading-none font-semibold text-ink ${spacious ? 'mt-2' : 'mt-1'}`}>
        <span>{value}</span>
        {unit && <span className="text-[11px] font-normal text-ink-soft">{unit}</span>}
      </p>
    </div>
  )
}

function formatHeatScale(totalFrp?: number, frp?: number): string {
  const value = typeof totalFrp === 'number' && totalFrp > 0 ? totalFrp : (frp ?? 0)
  if (value > 80) return 'Ekstrem'
  if (value >= 25) return 'Tinggi'
  return 'Sedang'
}

export default function SatelliteSignalDetail({
  signal,
  linkedEvent,
  onOpenEvent,
  onCreateEvent,
  onModerated,
}: Props) {
  const queryClient = useQueryClient()
  const { profile, memberships } = useAuth()
  const { pulse, status: pulseStatus } = usePulse(signal.lat, signal.lng)
  const place = usePlaceName(signal.lat, signal.lng)
  const [busyModerate, setBusyModerate] = useState(false)
  const [busyVerify, setBusyVerify] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )
  const isAgency = profile?.role === 'agency'
  const isAdmin = profile?.role === 'admin'
  const activeOrgId = memberships.find((m) => m.status === 'active' && m.organization?.is_verified)?.organization_id
  const verifiedInfo = signal.verifiedInfo ?? null
  const isVerified = Boolean(verifiedInfo || signal.verificationState === 'verified')

  const handleVerifySignal = async () => {
    setBusyVerify(true)
    setError(null)
    try {
      await verifyRadarSignal({
        refSource: signal.source,
        refExternalId: signal.externalId,
        memberIds: signal.memberIds,
        hazardKind: signal.kind ?? 'suspected',
        title: signal.title,
        lat: signal.lat,
        lng: signal.lng,
        organizationId: activeOrgId,
      })
      await queryClient.invalidateQueries({ queryKey: ['verified-signals'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memverifikasi titik sinyal')
    } finally {
      setBusyVerify(false)
    }
  }

  const dismissFalseHotspot = async () => {
    setBusyModerate(true)
    setError(null)
    try {
      // satu kawasan bisa berisi banyak titik api: moderasi semua anggotanya
      const ids = (signal.memberIds?.length ? signal.memberIds : [signal.externalId]).slice(0, 50)
      await Promise.all(ids.map((id) => moderateHotspotAdmin(id)))
      await onModerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memoderasi sinyal')
    } finally {
      setBusyModerate(false)
    }
  }

  const kind = signal.kind ?? 'suspected'
  const SignalIcon = kind === 'flood' ? Droplets : kind === 'volcano' ? Mountain : Flame
  const floodRisk = formatFloodRiskLabel(signal)
  const pulseTiles = kind === 'flood' ? formatFloodPulseTiles(pulse) : formatPulseTiles(pulse)
  const tier = linkedEvent ? 'has_action' : isVerified ? 'verified' : 'unverified'
  const sepIdx = signal.title.indexOf(' · ')
  const headline = sepIdx > 0 ? signal.title.slice(0, sepIdx) : signal.title
  const hasFireMetrics = (kind === 'wildfire' || kind === 'suspected') && (signal.pointCount ?? 0) > 0
  const hasFloodMetrics = kind === 'flood' && signal.dischargeM3s != null
  const hasVerifiedBlock = Boolean(verifiedInfo && !linkedEvent)
  const hasWaitStatus = !linkedEvent && !canOrganize
  const showDetailGroup = hasFireMetrics || hasFloodMetrics || hasVerifiedBlock || hasWaitStatus

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[16px] shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <AtlasCoordinateHero
          lat={signal.lat}
          lng={signal.lng}
          kind={kind}
          tier={tier}
          badge={formatSignalSource(signal.source)}
          subtitle={shortLocation(placeText(place))}
        />
      </div>

      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-[20px] leading-snug font-semibold text-ink">
            <SignalIcon className={`size-5 shrink-0 ${KIND_TEXT_CLASS[kind]}`} strokeWidth={1.75} />
            <span className="truncate">{headline}</span>
          </h2>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            {linkedEvent ? (
              <span className="inline-flex items-center gap-1 text-resolved">
                <CheckCircle2 className="size-4" strokeWidth={1.75} />
                Ada Gerakan
              </span>
            ) : isVerified ? (
              <span className="inline-flex items-center gap-1 text-leaf">
                <ShieldCheck className="size-4" strokeWidth={1.75} />
                Terverifikasi
              </span>
            ) : (
              <span className={KIND_TEXT_CLASS[kind]}>
                Belum terverifikasi
              </span>
            )}
            {isAgency && !linkedEvent && (
              <span className="inline-flex items-center gap-1 text-critical">
                <ShieldAlert className="size-4" strokeWidth={1.75} /> Darurat
              </span>
            )}
          </div>
        </div>

        <p
          className="mt-0.5 flex items-start gap-1.5 text-[12px] font-normal text-ink-soft"
          title={`${signal.lat.toFixed(4)}, ${signal.lng.toFixed(4)}`}
        >
          <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={1.75} />
          <span>
            {placeText(place)}
            {signal.date ? ` · ${formatSignalDate(signal)}` : ''}
            {floodRisk ? ` · ${floodRisk}` : ''}
          </span>
        </p>
      </header>

      {linkedEvent ? (
        <button
          type="button"
          onClick={() => onOpenEvent(linkedEvent.id)}
          className="btn-primary h-10 w-full text-[14px]"
        >
          <ExternalLink className="size-4" strokeWidth={1.75} />
          Lihat Gerakan
        </button>
      ) : canOrganize ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCreateEvent(signal)}
            className="btn-primary h-10 flex-1 px-4 text-[14px]"
          >
            <CalendarPlus className="size-4" strokeWidth={1.75} />
            Buat Gerakan
          </button>
          {!isVerified && (
            <button
              type="button"
              disabled={busyVerify}
              onClick={() => void handleVerifySignal()}
              className="btn-soft h-10 gap-1.5 !rounded-[10px] px-3.5 text-[14px] disabled:opacity-50"
            >
              <ShieldCheck className="size-4 text-leaf" strokeWidth={1.75} />
              {busyVerify ? 'Memverifikasi…' : 'Verifikasi'}
            </button>
          )}
          {isAdmin && signal.source === 'nasa_firms' && (
            <button
              type="button"
              disabled={busyModerate}
              onClick={() => void dismissFalseHotspot()}
              className="btn-soft h-10 gap-1.5 !rounded-[10px] px-3 text-[12px] text-ink-soft hover:text-ink disabled:opacity-50"
            >
              <Ban className="size-4" strokeWidth={1.75} />
              Sinyal Palsu
            </button>
          )}
        </div>
      ) : null}

      {error && (
        <p role="alert" className="card-quiet px-3.5 py-2.5 text-[12px] font-medium text-critical">
          {error}
        </p>
      )}

      {showDetailGroup && (
        <div className="atlas-group divide-y divide-ink/6 px-4">
          {hasFireMetrics && (
            <div className="py-1.5">
              <div className="atlas-strip grid-cols-3 divide-x divide-ink/8 border-y-0">
                <StripMetric
                  value={String(signal.pointCount)}
                  label={kind === 'suspected' ? 'Titik Panas' : 'Titik Api'}
                />
                <StripMetric value={formatHeatScale(signal.totalFrp, signal.frp)} label="Skala Panas" />
                <StripMetric value={`±${signal.radiusKm ?? 1}`} unit="km" label="Radius Area" />
              </div>
            </div>
          )}

          {hasFloodMetrics && (
            <div className="py-1.5">
              <div className="atlas-strip grid-cols-3 divide-x divide-ink/8 border-y-0">
                <StripMetric value={String(signal.dischargeM3s)} unit="m³/s" label="Debit Sungai" />
                <StripMetric value={`${signal.dischargeRatio ?? 1}×`} label="Dari Normal" />
                <StripMetric value={String(signal.rainMm ?? 0)} unit="mm" label="Hujan 72j" />
              </div>
            </div>
          )}

          {hasVerifiedBlock && verifiedInfo && (
            <div className="flex items-start gap-2.5 py-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">
                  Terverifikasi oleh {verifiedInfo.verified_org_name ?? verifiedInfo.verified_by_name}
                </p>
                <p className="mt-0.5 text-[12px] font-normal text-ink-soft">
                  Belum ada aksi atau event
                </p>
              </div>
            </div>
          )}

          {hasWaitStatus && (
            <p className="py-3.5 text-[12px] font-normal text-ink-soft">
              {isVerified ? 'Belum ada aksi atau event' : 'Menunggu verifikasi relawan'}
            </p>
          )}
        </div>
      )}

      <div className={`atlas-group grid grid-cols-2 divide-x divide-y divide-ink/6 overflow-hidden ${pulseStatus === 'loading' ? 'opacity-60' : ''}`}>
        {pulseTiles.map((tile) => (
          <StripMetric key={tile.label} {...tile} spacious />
        ))}
      </div>

      <FundraisingSection signal={signal} />
    </div>
  )
}