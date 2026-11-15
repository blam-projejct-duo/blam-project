import {
  Ban,
  CalendarPlus,
  ExternalLink,
  Flame,
  MapPin,
  ShieldAlert,
} from 'lucide-react'
import { useState } from 'react'
import { Pill } from '../../components/ui/atoms'
import { moderateHotspotAdmin } from '../../lib/api'
import type { ConservationEvent, HazardKind, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { usePulse } from '../map/usePulse'

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

function Tile({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="rounded-tile bg-canvas p-3.5">
      <p className="num text-[22px] leading-none text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  )
}

export default function SatelliteSignalDetail({
  signal,
  linkedEvent,
  onOpenEvent,
  onCreateEvent,
  onModerated,
}: Props) {
  const { profile } = useAuth()
  const { pulse, status: pulseStatus } = usePulse(signal.lat, signal.lng)
  const [busyModerate, setBusyModerate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )
  const isAgency = profile?.role === 'agency'
  const isAdmin = profile?.role === 'admin'

  const fmt = (v: number | null | undefined, digits = 0) =>
    typeof v === 'number' && Number.isFinite(v) ? (digits > 0 ? v.toFixed(digits) : String(v)) : '—'

  const dismissFalseHotspot = async () => {
    setBusyModerate(true)
    setError(null)
    try {
      // satu kawasan bisa berisi banyak titik api: moderasi semua anggotanya
      const ids = (signal.memberIds?.length ? signal.memberIds : [signal.externalId]).slice(0, 50)
      await Promise.all(ids.map((id) => moderateHotspotAdmin(id)))
      await onModerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memoderasi hotspot')
    } finally {
      setBusyModerate(false)
    }
  }

  const kind = signal.kind ?? 'suspected'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
          <span className="inline-flex items-center gap-1.5 text-ink">
            <span className={`size-2 rounded-full ${KIND_DOT_CLASS[kind]}`} />
            Sinyal Satelit
          </span>
          {isAgency && !linkedEvent && (
            <span className="inline-flex items-center gap-1 text-critical">
              <ShieldAlert className="size-3.5" /> Prioritas Darurat
            </span>
          )}
        </div>

        <h2 className="mt-1 text-[22px] leading-tight font-extrabold tracking-tight text-ink">
          {signal.title}
        </h2>

        <p className="flex items-center gap-1 text-sm font-medium text-ink-soft">
          <MapPin className="size-3.5 shrink-0" strokeWidth={2.25} />
          <span>
            {signal.lat.toFixed(4)}, {signal.lng.toFixed(4)}
            {signal.date ? ` · ${signal.date}` : ''}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>
            <Flame className={`size-3.5 ${KIND_TEXT_CLASS[kind]}`} />
            {signal.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'}
          </Pill>
          <Pill>{signal.categoryLabel}</Pill>
        </div>
      </header>

      {signal.reason && (
        <section className="rounded-card border border-line bg-canvas p-4">
          <h3 className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Detail Radar</h3>
          <p className="mt-1.5 text-sm leading-relaxed font-medium text-ink">{signal.reason}</p>
          {(signal.kind === 'wildfire' || signal.kind === 'suspected') && (signal.pointCount ?? 0) > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Tile
                value={String(signal.pointCount)}
                label={signal.kind === 'suspected' ? 'Titik panas' : 'Titik api'}
              />
              <Tile value={String(Math.round(signal.totalFrp ?? 0))} unit="MW" label="Total daya" />
              <Tile value={`±${signal.radiusKm ?? 1}`} unit="km" label="Sebaran" />
            </div>
          )}
        </section>
      )}

      <div className={`grid grid-cols-2 gap-2.5 ${pulseStatus === 'loading' ? 'animate-pulse' : ''}`}>
        <Tile value={fmt(pulse?.aqi)} label="Udara" />
        <Tile
          value={fmt(pulse?.waveM, 1)}
          unit={typeof pulse?.waveM === 'number' ? 'm' : undefined}
          label="Gelombang"
        />
        <Tile value={fmt(pulse?.hotspots)} label="Hotspot" />
        <Tile
          value={fmt(pulse?.windKmh)}
          unit={typeof pulse?.windKmh === 'number' ? 'km/j' : undefined}
          label="Angin"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-card border border-line bg-white px-4 py-3 text-xs font-semibold text-ink">
          {error}
        </p>
      )}

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
          <div className="rounded-card border border-line bg-canvas px-4 py-3.5 text-center text-sm font-bold text-ink-soft">
            {signal.kind === 'suspected'
              ? 'Menunggu verifikasi langsung relawan di lapangan'
              : 'Belum ada event organisasi'}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onCreateEvent(signal)}
              className="btn-primary h-13 w-full text-[15px]"
            >
              <CalendarPlus className="size-4" />
              {signal.kind === 'suspected'
                ? 'Bantu Verifikasi Langsung di Titik Ini'
                : 'Adakan Event di Titik Ini'}
            </button>
            {isAdmin && signal.source === 'nasa_firms' && (
              <button
                type="button"
                disabled={busyModerate}
                onClick={() => void dismissFalseHotspot()}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line bg-white text-xs font-bold text-ink-soft hover:text-ink disabled:opacity-50"
              >
                <Ban className="size-3.5" />
                Tandai False Hotspot
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}