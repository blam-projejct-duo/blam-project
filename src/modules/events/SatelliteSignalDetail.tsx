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
import { DashedOutline } from '../../components/ui/atoms'
import { moderateHotspotAdmin, verifyRadarSignal } from '../../lib/api'
import type { ConservationEvent, HazardKind, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import FundraisingSection from '../fundraising/FundraisingSection'
import { formatFloodRiskLabel, formatSignalDate, formatSignalSource } from '../map/radarFilters'
import { formatFloodPulseTiles, formatPulseTiles, usePulse } from '../map/usePulse'
import { placeText, usePlaceName } from '../map/usePlaceName'

const KIND_DOT_CLASS: Record<HazardKind, string> = {
  wildfire: 'bg-critical',
  volcano: 'bg-purple-600',
  flood: 'bg-cobalt',
  storm: 'bg-cyan-600',
  suspected: 'bg-progress',
  other: 'bg-progress',
}

const KIND_TEXT_CLASS: Record<HazardKind, string> = {
  wildfire: 'text-critical',
  volcano: 'text-purple-600',
  flood: 'text-cobalt',
  storm: 'text-cyan-600',
  suspected: 'text-progress',
  other: 'text-progress',
}

interface Props {
  signal: SatelliteSignal
  linkedEvent: ConservationEvent | null
  onOpenEvent: (eventId: string) => void
  onCreateEvent: (signal: SatelliteSignal) => void
  onModerated: () => Promise<void>
}

function Tile({
  value,
  unit,
  label,
  surface = 'bg-[#f4f5f7]',
}: {
  value: string
  unit?: string
  label: string
  surface?: string
}) {
  return (
    <div className={`relative rounded-tile p-3.5 ${surface}`}>
      <DashedOutline rx={13} />
      <p className="num flex flex-wrap items-baseline gap-x-1 text-[16px] leading-snug text-ink">
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-light text-ink-soft">{label}</p>
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

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-light text-ink-soft">
          {linkedEvent ? (
            <span className="inline-flex items-center gap-1 font-medium text-forest">
              <CheckCircle2 className="size-3.5" />
              Ada Gerakan
            </span>
          ) : isVerified ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-700">
              <ShieldCheck className="size-3.5" />
              Terverifikasi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <span className={`size-2 rounded-full ${KIND_DOT_CLASS[kind]}`} />
              Belum terverifikasi
            </span>
          )}
          {isAgency && !linkedEvent && (
            <span className="inline-flex items-center gap-1 font-medium text-critical">
              <ShieldAlert className="size-3.5" /> Darurat
            </span>
          )}
        </div>

        <h2 className="mt-0.5 text-[20px] leading-snug font-semibold tracking-tight text-ink">
          {signal.title}
        </h2>

        <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-light text-ink-soft">
          <SignalIcon className={`size-3.5 shrink-0 ${KIND_TEXT_CLASS[kind]}`} />
          <span>{formatSignalSource(signal.source)}</span>
          <span aria-hidden="true">·</span>
          <span>{signal.categoryLabel}</span>
          {floodRisk && (
            <>
              <span aria-hidden="true">·</span>
              <span className={signal.severity === 'high' ? 'font-normal text-critical' : 'font-normal text-progress'}>
                {floodRisk}
              </span>
            </>
          )}
        </p>
      </header>

      {linkedEvent ? (
        <button
          type="button"
          onClick={() => onOpenEvent(linkedEvent.id)}
          className="btn-primary h-10 w-full text-[13.5px]"
        >
          <ExternalLink className="size-4" />
          Lihat Gerakan
        </button>
      ) : canOrganize ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCreateEvent(signal)}
            className="btn-primary h-9.5 flex-1 px-4 text-[13px]"
          >
            <CalendarPlus className="size-3.5" />
            Buat Gerakan
          </button>
          {!isVerified && (
            <button
              type="button"
              disabled={busyVerify}
              onClick={() => void handleVerifySignal()}
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-xl bg-[#f4f5f7] px-3.5 text-[13px] font-normal text-ink transition-colors hover:bg-[#eaecf0] disabled:opacity-50"
            >
              <ShieldCheck className="size-3.5 text-teal-700" />
              {busyVerify ? 'Memverifikasi…' : 'Verifikasi'}
            </button>
          )}
          {isAdmin && signal.source === 'nasa_firms' && (
            <button
              type="button"
              disabled={busyModerate}
              onClick={() => void dismissFalseHotspot()}
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-xl bg-[#f4f5f7] px-3 text-[12.5px] font-normal text-ink-soft transition-colors hover:bg-[#eaecf0] hover:text-ink disabled:opacity-50"
            >
              <Ban className="size-3.5" />
              Sinyal Palsu
            </button>
          )}
        </div>
      ) : null}

      {error && (
        <p role="alert" className="rounded-xl bg-critical/8 px-3.5 py-2.5 text-xs font-normal text-critical">
          {error}
        </p>
      )}

      <div className="divide-y divide-line border-t border-line">
        <div className="flex items-start gap-3 py-3.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#2563eb]" />
          <span className="text-[13px] font-normal text-ink" title={`${signal.lat.toFixed(4)}, ${signal.lng.toFixed(4)}`}>
            {placeText(place)}
            {signal.date ? ` · ${formatSignalDate(signal)}` : ''}
          </span>
        </div>

        {signal.reason && (
          <div className="py-3.5">
            <p className="text-[13px] leading-relaxed font-light text-ink">{signal.reason}</p>
            {(signal.kind === 'wildfire' || signal.kind === 'suspected') && (signal.pointCount ?? 0) > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Tile
                  value={String(signal.pointCount)}
                  label={signal.kind === 'suspected' ? 'Titik Panas' : 'Titik Api'}
                />
                <Tile value={formatHeatScale(signal.totalFrp, signal.frp)} label="Skala Panas" />
                <Tile value={`±${signal.radiusKm ?? 1}`} unit="km" label="Radius Area" />
              </div>
            )}
            {signal.kind === 'flood' && signal.dischargeM3s != null && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Tile value={String(signal.dischargeM3s)} unit="m³/s" label="Debit Sungai" />
                <Tile value={`${signal.dischargeRatio ?? 1}×`} label="Dari Normal" />
                <Tile value={String(signal.rainMm ?? 0)} unit="mm" label="Hujan 72j" />
              </div>
            )}
          </div>
        )}

        {verifiedInfo && !linkedEvent && (
          <div className="flex items-start gap-2.5 py-3.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">
                Terverifikasi oleh {verifiedInfo.verified_org_name ?? verifiedInfo.verified_by_name}
              </p>
              <p className="mt-0.5 text-[12px] font-light text-ink-soft">
                Terverifikasi valid · menunggu gerakan dibuat
              </p>
            </div>
          </div>
        )}

        {!linkedEvent && !canOrganize && (
          <p className="py-3.5 text-[12.5px] font-light text-ink-soft">
            {isVerified ? 'Terverifikasi · menunggu gerakan' : 'Menunggu verifikasi relawan'}
          </p>
        )}
      </div>

      <div className={`grid grid-cols-2 gap-2.5 ${pulseStatus === 'loading' ? 'animate-pulse' : ''}`}>
        {pulseTiles.map((tile) => (
          <Tile key={tile.label} value={tile.value} unit={tile.unit} label={tile.label} />
        ))}
      </div>

      <FundraisingSection signal={signal} />
    </div>
  )
}