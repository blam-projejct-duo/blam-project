import {
  Calendar,
  Camera,
  Check,
  ExternalLink,
  Link2,
  Lock,
  MapPin,
  Navigation,
  Plane,
  QrCode,
  Route,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { DashedOutline, Pill, StatusPill } from '../../components/ui/atoms'
import { updateEventVisibility } from '../../lib/api'
import type { ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'
import type { ActiveRoute, RouteMode } from '../map/directions'
import { formatPulseTiles, usePulse } from '../map/usePulse'
import BeforeAfterSlider from './BeforeAfterSlider'
import QrActionModal from './QrActionModal'
import ResolveActionModal from './ResolveActionModal'

interface Props {
  event: ConservationEvent
  joined: boolean
  onJoin: () => Promise<void>
  onRefresh: () => Promise<void>
  activeRoute?: ActiveRoute | null
  routeLoading?: boolean
  routeError?: string | null
  onStartRoute?: () => Promise<void>
  onSwitchRouteMode?: (mode: RouteMode) => void
  onClearRoute?: () => void
}

function Tile({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="relative rounded-tile bg-[#f5f7ff] p-3.5">
      <DashedOutline rx={13} />
      <p className="num flex flex-wrap items-baseline gap-x-1 text-[16px] leading-snug text-ink">
        <span>{value}</span>
        {unit && <span className="text-xs font-bold text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  )
}

export default function EventDetail({
  event,
  joined,
  onJoin,
  onRefresh,
  activeRoute = null,
  routeLoading = false,
  routeError = null,
  onStartRoute,
  onSwitchRouteMode,
  onClearRoute,
}: Props) {
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

  const pulseTiles = formatPulseTiles(pulse)
  const score = latestAction?.ai_recovery_score ?? event.report?.ai_confidence ?? null
  const recommendations = event.report?.ai_recommendations ?? []
  const photoClass = 'relative aspect-[16/10] @md:aspect-[2/1] overflow-hidden rounded-card bg-muted'
  const labelClass = 'absolute top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink'
  const quotaText = event.max_participants ? `${participantsCount}/${event.max_participants}` : `${participantsCount}`
  const routeForEvent = activeRoute?.eventId === event.id ? activeRoute : null
  const googleMapsUrl = routeForEvent
    ? `https://www.google.com/maps/dir/?api=1&origin=${routeForEvent.origin.lat},${routeForEvent.origin.lng}&destination=${event.lat},${event.lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}&travelmode=driving`
  const distanceLabel = routeForEvent
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(routeForEvent.distanceKm)
    : null

  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-light text-ink-soft">
            <StatusPill status={event.status} />
            {score !== null && <span>AI {score}%</span>}
            {event.visibility === 'members_only' && <Lock className="size-3" aria-label="Khusus anggota" />}
          </div>
          <h2 className="mt-2.5 text-[20px] leading-tight font-semibold tracking-tight text-ink">
            {event.title}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-[13px] font-light text-ink-soft">
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
          {onStartRoute && (
            <button
              type="button"
              disabled={routeLoading}
              onClick={() => (routeForEvent ? onClearRoute?.() : void onStartRoute())}
              aria-label="Arahkan ke lokasi"
              aria-pressed={Boolean(routeForEvent)}
              className={`grid size-11 place-items-center rounded-full border transition-colors ${
                routeForEvent
                  ? 'border-leaf bg-leaf text-white'
                  : 'border-leaf/15 bg-white text-forest hover:bg-mint/30'
              } disabled:opacity-60`}
            >
              <Navigation className="size-4.5" />
            </button>
          )}
          {canResolve && (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="QR Aksi"
              className="grid size-11 place-items-center rounded-full border border-leaf/15 bg-white text-forest transition-colors hover:bg-mint/30"
            >
              <QrCode className="size-4.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label="Salin tautan event"
            className="grid size-11 place-items-center rounded-full border border-leaf/15 bg-white text-forest transition-colors hover:bg-mint/30"
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
          <p className="text-[13.5px] font-semibold text-ink">{event.category}</p>
          <p className="text-[11.5px] font-normal text-ink-soft">
            {event.lat.toFixed(3)}, {event.lng.toFixed(3)}
          </p>
        </div>
      )}

      {(routeLoading || routeError || routeForEvent) && (
        <section className="relative rounded-[20px] bg-[#f5f7ff] p-4">
          <DashedOutline rx={19} />
          {routeLoading && (
            <p className="text-[12px] font-medium text-ink-soft">Menghitung rute…</p>
          )}

          {routeError && !routeLoading && (
            <div className="flex flex-col gap-2.5">
              <p role="alert" className="text-[12px] font-medium text-ink">
                {routeError}
              </p>
              <div className="flex flex-wrap gap-2">
                {onStartRoute && (
                  <button
                    type="button"
                    onClick={() => void onStartRoute()}
                    className="btn-primary h-9 px-3.5 text-[12px]"
                  >
                    Coba lagi
                  </button>
                )}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-medium text-ink hover:bg-muted"
                >
                  <ExternalLink className="size-3.5" /> Google Maps
                </a>
              </div>
            </div>
          )}

          {routeForEvent && !routeLoading && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!routeForEvent.landAvailable}
                    onClick={() => onSwitchRouteMode?.('land')}
                    aria-pressed={routeForEvent.mode === 'land'}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${
                      routeForEvent.mode === 'land'
                        ? 'bg-leaf text-white'
                        : 'border border-line bg-white text-ink hover:bg-muted'
                    } disabled:opacity-45`}
                  >
                    <Route className="size-3.5" /> Darat
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchRouteMode?.('air')}
                    aria-pressed={routeForEvent.mode === 'air'}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${
                      routeForEvent.mode === 'air'
                        ? 'bg-leaf text-white'
                        : 'border border-line bg-white text-ink hover:bg-muted'
                    }`}
                  >
                    <Plane className="size-3.5" /> Udara
                  </button>
                </div>
                {onClearRoute && (
                  <button
                    type="button"
                    onClick={onClearRoute}
                    aria-label="Tutup rute"
                    className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-white hover:text-ink"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="num text-xl text-ink">{distanceLabel} km</p>
                  <p className="text-[12px] font-normal text-ink-soft">
                    {routeForEvent.mode === 'land' ? 'Jalur darat tercepat' : 'Jalur udara'}
                  </p>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-muted"
                >
                  <ExternalLink className="size-3.5" /> Google Maps
                </a>
              </div>

              {!routeForEvent.landAvailable && (
                <p className="text-[11px] font-medium text-ink-soft">
                  {routeForEvent.landError ?? 'Jalur darat tidak terjangkau, menampilkan jalur udara.'}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className={`grid grid-cols-2 gap-2.5 ${pulseStatus === 'loading' ? 'animate-pulse' : ''}`}>
        {pulseTiles.map((tile) => (
          <Tile key={tile.label} value={tile.value} unit={tile.unit} label={tile.label} />
        ))}
      </div>

      <p className="text-sm leading-relaxed text-ink/80">
        {event.description || event.report?.ai_site_brief || event.category}
      </p>

      {recommendations.length > 0 && (
        <div className="relative rounded-[20px] bg-[#f5f7ff] px-4 py-1 text-[13px] font-normal text-ink-soft">
          <DashedOutline rx={19} />
          {recommendations.slice(0, 2).map((rec) => (
            <p key={rec} className="dashed-row py-2.5">
              {rec}
            </p>
          ))}
        </div>
      )}

      {latestAction && (
        <div className="relative flex flex-wrap items-center justify-between gap-2 rounded-[20px] bg-[#f5f7ff] px-4 py-3 text-[13px] font-medium text-ink-soft">
          <DashedOutline rx={19} />
          <p>
            <span className="font-semibold text-ink">{Number(latestAction.waste_kg)} kg</span> ·{' '}
            <span className="font-semibold text-ink">{latestAction.trees_planted}</span> bibit
          </p>
          {latestAction.verified_by_agency && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest">
              <ShieldCheck className="size-3.5" /> Sah
            </span>
          )}
        </div>
      )}

      {actionError && (
        <p role="alert" className="relative rounded-[20px] bg-[#f5f7ff] px-4 py-3 text-[12px] font-medium text-ink">
          <DashedOutline rx={19} />
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {onStartRoute && !routeForEvent && (
          <button
            type="button"
            disabled={routeLoading}
            onClick={() => void onStartRoute()}
            className="relative flex h-11.5 w-full items-center justify-center gap-2 rounded-full bg-[#f5f7ff] text-[13.5px] font-normal text-forest transition-colors hover:bg-mint/35 disabled:opacity-60"
          >
            <DashedOutline rx={23} />
            <Navigation className="size-4" />
            {routeLoading ? 'Menghitung rute…' : 'Rute ke lokasi'}
          </button>
        )}

        {event.status !== 'resolved' && event.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busyJoin || joined}
            onClick={() => void handleJoin()}
            aria-pressed={joined}
            className={`h-12 w-full text-[14px] ${joined ? 'btn-joined' : 'btn-primary'} disabled:opacity-80`}
          >
            {joined && <Check className="size-4.5" strokeWidth={2.75} />}
            {joined ? 'Tergabung' : membersOnlyLocked ? 'Khusus anggota' : 'Gabung'} · {quotaText}
          </button>
        )}

        {canResolve && (
          <button
            type="button"
            onClick={() => setResolveOpen(true)}
            className="relative flex h-11.5 w-full items-center justify-center gap-2 rounded-full bg-[#f5f7ff] text-[13.5px] font-normal text-forest transition-colors hover:bg-mint/35"
          >
            <DashedOutline rx={23} />
            <Camera className="size-4" />
            Foto sesudah
          </button>
        )}

        {canManageVisibility && event.status !== 'resolved' && event.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busyVis}
            onClick={() => void toggleVisibility()}
            className="h-10 w-full rounded-full text-[12px] font-light text-ink-soft hover:text-ink disabled:opacity-50"
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
