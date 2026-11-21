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
import { AtlasCoordinateHero, MapMarkerGlyph } from '../../components/ui/MapMarkers'
import { moderateHotspotAdmin, verifyRadarSignal } from '../../lib/api'
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

function Tile({ value, unit, label, status, tone = 'neutral' }: PulseTileData) {
  return (
    <div className="card-quiet p-3.5">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate font-normal text-ink-soft">{label}</span>
        {status && <span className={`shrink-0 font-medium ${STATUS_TONE[tone]}`}>{status}</span>}
      </div>
      <p className="num mt-1.5 flex items-baseline gap-1 text-[20px] leading-none font-semibold text-ink">
        <span>{value}</span>
        {unit && <span className="text-[12px] font-normal text-ink-soft">{unit}</span>}
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

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-5 border-b border-line">
        <AtlasCoordinateHero
          lat={signal.lat}
          lng={signal.lng}
          kind={kind}
          tier={tier}
          badge={formatSignalSource(signal.source)}
          subtitle={placeText(place)}
        />
      </div>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-ink-soft">
          <MapMarkerGlyph kind={kind} tier={tier} size="sm" />
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

        <h2 className="mt-0.5 text-[20px] leading-snug font-semibold text-ink">
          {signal.title}
        </h2>

        <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-normal text-ink-soft">
          <SignalIcon className={`size-4 shrink-0 ${KIND_TEXT_CLASS[kind]}`} strokeWidth={1.75} />
          <span>{formatSignalSource(signal.source)}</span>
          <span aria-hidden="true">·</span>
          <span>{signal.categoryLabel}</span>
          {floodRisk && (
            <>
              <span aria-hidden="true">·</span>
              <span className={signal.severity === 'high' ? 'font-medium text-critical' : 'font-medium text-progress'}>
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

      <div className="divide-y divide-line border-t border-line">
        <div className="flex items-start gap-3 py-3.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={1.75} />
          <span className="text-[14px] font-normal text-ink" title={`${signal.lat.toFixed(4)}, ${signal.lng.toFixed(4)}`}>
            {placeText(place)}
            {signal.date ? ` · ${formatSignalDate(signal)}` : ''}
          </span>
        </div>

        {signal.reason && (
          <div className="py-3.5">
            <p className="text-[14px] leading-relaxed font-normal text-ink">{signal.reason}</p>
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
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">
                Terverifikasi oleh {verifiedInfo.verified_org_name ?? verifiedInfo.verified_by_name}
              </p>
              <p className="mt-0.5 text-[12px] font-normal text-ink-soft">
                Valid · menunggu gerakan
              </p>
            </div>
          </div>
        )}

        {!linkedEvent && !canOrganize && (
          <p className="py-3.5 text-[12px] font-normal text-ink-soft">
            {isVerified ? 'Terverifikasi · menunggu gerakan' : 'Menunggu verifikasi relawan'}
          </p>
        )}
      </div>

      <div className={`grid grid-cols-2 gap-3 ${pulseStatus === 'loading' ? 'opacity-60' : ''}`}>
        {pulseTiles.map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </div>

      <FundraisingSection signal={signal} />
    </div>
  )
}