import { Ban, CalendarPlus, ExternalLink, Flame, MapPin, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Pill } from '../../components/ui/atoms'
import { moderateHotspotAdmin } from '../../lib/api'
import type { ConservationEvent, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { usePulse } from '../map/usePulse'

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
      await moderateHotspotAdmin(signal.externalId)
      await onModerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memoderasi hotspot')
    } finally {
      setBusyModerate(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
          <span className="inline-flex items-center gap-1.5 text-ink">
            <span className="size-2 rounded-full bg-progress" />
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
            <Flame className="size-3.5 text-progress" />
            {signal.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'}
          </Pill>
          <Pill>{signal.categoryLabel}</Pill>
        </div>
      </header>

      <div className={`grid grid-cols-2 gap-2.5 ${pulseStatus === 'loading' ? 'animate-pulse' : ''}`}>
        <Tile value={fmt(pulse?.aqi)} label="Udara" />
        <Tile
          value={fmt(pulse?.waveM, 1)}
          unit={typeof pulse?.waveM === 'number' ? 'm' : undefined}
          label="Gelombang"
        />
        <Tile value={fmt(pulse?.hotspots)} label="Hotspot" />
        <Tile value={fmt(pulse?.species)} label="Spesies" />
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
            Belum ada event organisasi
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onCreateEvent(signal)}
              className="btn-primary h-13 w-full text-[15px]"
            >
              <CalendarPlus className="size-4" />
              Adakan Event di Titik Ini
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

