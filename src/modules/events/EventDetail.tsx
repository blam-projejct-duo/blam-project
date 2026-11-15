import { Calendar, Camera, Check, Link2, Lock, MapPin, QrCode, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Pill, StatusPill } from '../../components/ui/atoms'
import { updateEventVisibility } from '../../lib/api'
import type { ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { usePulse } from '../map/usePulse'
import BeforeAfterSlider from './BeforeAfterSlider'
import QrActionModal from './QrActionModal'
import ResolveActionModal from './ResolveActionModal'

interface Props {
  event: ConservationEvent
  joined: boolean
  onJoin: () => Promise<void>
  onRefresh: () => Promise<void>
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

export default function EventDetail({ event, joined, onJoin, onRefresh }: Props) {
  const { profile, openAuthModal, isLeadOf, isActiveMemberOf } = useAuth()
  const [copied, setCopied] = useState(false)
  const [busyJoin, setBusyJoin] = useState(false)
  const [busyVis, setBusyVis] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const { pulse, status: pulseStatus } = usePulse(event.lat, event.lng)
  const latestAction = [...(event.event_actions ?? [])].sort(
    (a, b) => +new Date(b.completed_at) - +new Date(a.completed_at),
  )[0]
  const resolved = event.status === 'resolved' && Boolean(latestAction)
  const participantsCount = event.event_participants?.length ?? 0
  const beforeImage = event.cover_image_url ?? event.report?.before_image_url ?? null

  const canManageVisibility = profile?.role === 'admin' || isLeadOf(event.organization_id)
  const membersOnlyLocked =
    event.visibility === 'members_only' &&
    Boolean(profile) &&
    profile?.role !== 'admin' &&
    !isActiveMemberOf(event.organization_id)
  const scheduleLabel = event.start_at
    ? new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(event.start_at))
    : null
  const canResolve =
    profile &&
    (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin') &&
    event.status !== 'resolved' &&
    event.status !== 'cancelled'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?event=${event.id}`)
    } catch {
      /* clipboard tidak tersedia */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const handleJoin = async () => {
    if (!profile) {
      openAuthModal()
      return
    }
    setBusyJoin(true)
    setActionError(null)
    try {
      await onJoin()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal bergabung')
    } finally {
      setBusyJoin(false)
    }
  }

  const toggleVisibility = async () => {
    setBusyVis(true)
    setActionError(null)
    try {
      const next = event.visibility === 'public' ? 'members_only' : 'public'
      await updateEventVisibility(event.id, next)
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah keterbukaan event')
    } finally {
      setBusyVis(false)
    }
  }

  const fmt = (v: number | null | undefined, digits = 0) =>
    typeof v === 'number' && Number.isFinite(v) ? (digits > 0 ? v.toFixed(digits) : String(v)) : '—'

  const score = latestAction?.ai_recovery_score ?? event.report?.ai_confidence ?? null
  const recommendations = event.report?.ai_recommendations ?? []
  const photoClass = 'relative aspect-[16/10] @md:aspect-[2/1] overflow-hidden rounded-card bg-muted'
  const labelClass = 'absolute top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink'
  const quotaText = event.max_participants ? `${participantsCount}/${event.max_participants}` : `${participantsCount}`

  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
            <StatusPill status={event.status} />
            {score !== null && <span>AI {score}%</span>}
            {event.visibility === 'members_only' && <Lock className="size-3" aria-label="Khusus anggota" />}
          </div>
          <h2 className="mt-3 text-[22px] leading-tight font-extrabold tracking-tight text-ink">
            {event.title}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-ink-soft">
            <MapPin className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="truncate">{event.location_name}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {event.organization && <Pill>{event.organization.name}</Pill>}
            <Pill>{event.category}</Pill>
            {event.ref_source && (
              <Pill>{event.ref_source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'}</Pill>
            )}
            {scheduleLabel && (
              <Pill>
                <Calendar className="size-3" /> {scheduleLabel}
              </Pill>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canResolve && (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="QR Aksi"
              className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-canvas"
            >
              <QrCode className="size-4.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label="Salin tautan event"
            className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-canvas"
          >
            {copied ? <Check className="size-5" strokeWidth={2.5} /> : <Link2 className="size-5" strokeWidth={2} />}
          </button>
        </div>
      </header>

      {resolved && latestAction && beforeImage ? (
        <BeforeAfterSlider before={beforeImage} after={latestAction.after_image_url} />
      ) : resolved && latestAction ? (
        <div className={photoClass}>
          <img src={latestAction.after_image_url} alt="Kondisi sesudah" className="size-full object-cover" />
          <span className={`${labelClass} left-3`}>Sesudah</span>
        </div>
      ) : beforeImage ? (
        <div className={photoClass}>
          <img src={beforeImage} alt="Kondisi lapangan" className="size-full object-cover" />
          <span className={`${labelClass} left-3`}>Sebelum</span>
        </div>
      ) : (
        <div className={`${photoClass} flex flex-col items-center justify-center gap-1 bg-canvas px-4 text-center`}>
          <p className="text-sm font-extrabold text-ink">{event.category}</p>
          <p className="text-xs font-semibold text-ink-soft">
            {event.lat.toFixed(3)}, {event.lng.toFixed(3)}
          </p>
        </div>
      )}

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

      <p className="text-sm leading-relaxed text-ink/80">
        {event.description || event.report?.ai_site_brief || event.category}
      </p>

      {recommendations.length > 0 && (
        <div className="border-t-[1.5px] border-dashed border-dash pt-1 text-[13px] font-medium text-ink-soft">
          {recommendations.slice(0, 2).map((rec) => (
            <p key={rec} className="dashed-row py-2.5">
              {rec}
            </p>
          ))}
        </div>
      )}

      {latestAction && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-dashed border-dash pt-4 text-[13px] font-semibold text-ink-soft">
          <p>
            <span className="text-ink">{Number(latestAction.waste_kg)} kg</span> ·{' '}
            <span className="text-ink">{latestAction.trees_planted}</span> bibit
          </p>
          {latestAction.verified_by_agency && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-ink">
              <ShieldCheck className="size-3.5" /> Sah
            </span>
          )}
        </div>
      )}

      {actionError && (
        <p role="alert" className="rounded-card border border-line bg-white px-4 py-3 text-xs font-semibold text-ink">
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {event.status !== 'resolved' && event.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busyJoin || joined}
            onClick={() => void handleJoin()}
            aria-pressed={joined}
            className={`h-13 w-full text-[15px] ${joined ? 'btn-joined' : 'btn-primary'} disabled:opacity-80`}
          >
            {joined && <Check className="size-5" strokeWidth={2.75} />}
            {joined ? 'Tergabung' : membersOnlyLocked ? 'Khusus Anggota' : 'Gabung'} · {quotaText}
          </button>
        )}

        {canResolve && (
          <button
            type="button"
            onClick={() => setResolveOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-bold text-ink hover:bg-canvas"
          >
            <Camera className="size-4" />
            Foto After
          </button>
        )}

        {canManageVisibility && event.status !== 'resolved' && event.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busyVis}
            onClick={() => void toggleVisibility()}
            className="h-11 w-full rounded-full text-xs font-bold text-ink-soft hover:text-ink disabled:opacity-50"
          >
            {event.visibility === 'public' ? 'Khusus anggota' : 'Buka untuk publik'}
          </button>
        )}
      </div>

      {resolveOpen && (
        <ResolveActionModal
          event={event}
          onClose={() => setResolveOpen(false)}
          onResolved={onRefresh}
        />
      )}

      {qrOpen && <QrActionModal event={event} onClose={() => setQrOpen(false)} />}
    </div>
  )
}
