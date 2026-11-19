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
import { DashedOutline, Pill } from '../../components/ui/atoms'
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
  surface = 'bg-[#f5f7ff]',
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
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-light text-ink-soft">
          {linkedEvent ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/70 px-2.5 py-0.5 font-medium text-forest">
              <CheckCircle2 className="size-3.5 text-leaf" />
              Sudah Ada Aksi
            </span>
          ) : isVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 font-medium text-teal-800">
              <ShieldCheck className="size-3.5 text-teal-600" />
              Terverifikasi Lapangan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <span className={`size-2 rounded-full ${KIND_DOT_CLASS[kind]}`} />
              Prediksi Satelit · Belum Diverifikasi
            </span>
          )}
          {isAgency && !linkedEvent && (
            <span className="inline-flex items-center gap-1 text-critical">
              <ShieldAlert className="size-3.5" /> Darurat
            </span>
          )}
        </div>

        <h2 className="mt-0.5 text-[20px] leading-tight font-semibold tracking-tight text-ink">
          {signal.title}
        </h2>

        <p className="flex items-start gap-1 text-[12.5px] font-light text-ink-soft">
          <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.25} />
          <span title={`${signal.lat.toFixed(4)}, ${signal.lng.toFixed(4)}`}>
            {placeText(place)}
            {signal.date ? ` · ${formatSignalDate(signal)}` : ''}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>
            <SignalIcon className={`size-3.5 ${KIND_TEXT_CLASS[kind]}`} />
            {formatSignalSource(signal.source)}
          </Pill>
          <Pill>{signal.categoryLabel}</Pill>
          {floodRisk && (
            <Pill>
              <span
                className={`size-2 rounded-full ${
                  signal.severity === 'high' ? 'bg-critical' : 'bg-progress'
                }`}
              />
              {floodRisk}
            </Pill>
          )}
        </div>
      </header>

      {signal.reason && (
        <section className="relative rounded-[20px] bg-[#f5f7ff] p-4">
          <DashedOutline rx={19} />
          <h3 className="font-sans text-[10.5px] font-light tracking-wider text-ink-soft uppercase">Info Radar</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed font-normal text-ink">{signal.reason}</p>
          {(signal.kind === 'wildfire' || signal.kind === 'suspected') && (signal.pointCount ?? 0) > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Tile
                surface="bg-white"
                value={String(signal.pointCount)}
                label={signal.kind === 'suspected' ? 'Titik Panas' : 'Titik Api'}
              />
              <Tile surface="bg-white" value={formatHeatScale(signal.totalFrp, signal.frp)} label="Skala Panas" />
              <Tile surface="bg-white" value={`±${signal.radiusKm ?? 1}`} unit="km" label="Radius Area" />
            </div>
          )}
          {signal.kind === 'flood' && signal.dischargeM3s != null && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Tile surface="bg-white" value={String(signal.dischargeM3s)} unit="m³/s" label="Debit Sungai" />
              <Tile surface="bg-white" value={`${signal.dischargeRatio ?? 1}×`} label="Dari Normal" />
              <Tile surface="bg-white" value={String(signal.rainMm ?? 0)} unit="mm" label="Hujan 72j" />
            </div>
          )}
        </section>
      )}

      <div className={`grid grid-cols-2 gap-2.5 ${pulseStatus === 'loading' ? 'animate-pulse' : ''}`}>
        {pulseTiles.map((tile) => (
          <Tile key={tile.label} value={tile.value} unit={tile.unit} label={tile.label} />
        ))}
      </div>

      {error && (
        <p role="alert" className="relative rounded-[20px] bg-[#f5f7ff] px-4 py-3 text-xs font-semibold text-ink">
          <DashedOutline rx={19} />
          {error}
        </p>
      )}

      {verifiedInfo && !linkedEvent && (
        <section className="relative rounded-[20px] bg-teal-50/75 p-3.5">
          <DashedOutline rx={19} />
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-teal-950">
                Terverifikasi oleh {verifiedInfo.verified_org_name ?? verifiedInfo.verified_by_name}
              </p>
              <p className="mt-0.5 text-[11.5px] font-light text-teal-800">
                Kondisi lapangan sudah dikonfirmasi valid. Menunggu organisasi membuka aksi penanganan.
              </p>
            </div>
          </div>
        </section>
      )}

      <FundraisingSection signal={signal} />

      <div className="flex flex-col gap-2">
        {linkedEvent ? (
          <button
            type="button"
            onClick={() => onOpenEvent(linkedEvent.id)}
            className="btn-primary h-13 w-full text-[15px]"
          >
            <ExternalLink className="size-4" />
            Lihat Event Resmi
          </button>
        ) : !canOrganize ? (
          <div className="relative rounded-[20px] bg-[#f5f7ff] px-4 py-3 text-center text-[13px] font-normal text-ink-soft">
            <DashedOutline rx={19} />
            {isVerified
              ? 'Sudah terverifikasi · menunggu aksi dari organisasi'
              : 'Menunggu verifikasi relawan di lapangan'}
          </div>
        ) : (
          <>
            {!isVerified && (
              <button
                type="button"
                disabled={busyVerify}
                onClick={() => void handleVerifySignal()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-5 text-[14px] font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
              >
                <ShieldCheck className="size-4" />
                {busyVerify ? 'Memverifikasi…' : 'Verifikasi Titik Ini'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onCreateEvent(signal)}
              className="btn-primary h-12 w-full text-[14px]"
            >
              <CalendarPlus className="size-4" />
              Buat Aksi di Sini
            </button>
            {isAdmin && signal.source === 'nasa_firms' && (
              <button
                type="button"
                disabled={busyModerate}
                onClick={() => void dismissFalseHotspot()}
                className="font-display relative inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#f5f7ff] text-xs font-semibold text-ink-soft transition-colors hover:bg-mint/35 hover:text-forest disabled:opacity-50"
              >
                <DashedOutline rx={21} />
                <Ban className="size-3.5" />
                Tandai Sinyal Palsu
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}