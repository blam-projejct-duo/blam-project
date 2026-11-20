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
import { DashedOutline, StatusPill } from '../../components/ui/atoms'
import { updateEventVisibility } from '../../lib/api'
import type { ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'
import FundraisingSection from '../fundraising/FundraisingSection'
import type { ActiveRoute, RouteMode } from '../map/directions'
import { formatPulseTiles, usePulse } from '../map/usePulse'
import { placeText, usePlaceName } from '../map/usePlaceName'
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
    <div className="relative rounded-tile bg-[#f4f5f7] p-3.5">
      <DashedOutline rx={13} />
      <p className="num flex flex-wrap items-baseline gap-x-1 text-[16px] leading-snug text-ink">
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-light text-ink-soft">{label}</p>
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
  const place = usePlaceName(event.lat, event.lng)
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
    <div className="@container flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-light text-ink-soft">
          <StatusPill status={event.status} />
          {score !== null && <span>AI {score}%</span>}
          {event.visibility === 'members_only' && <Lock className="size-3" aria-label="Khusus anggota" />}
        </div>
        <h2 className="mt-1 text-[20px] leading-snug font-semibold tracking-tight text-ink">
          {event.title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] font-light text-ink-soft">
          {event.organization && <span>{event.organization.name}</span>}
          {event.organization && <span aria-hidden="true">·</span>}
          <span>{event.category}</span>
          {event.ref_source && (
            <>
              <span aria-hidden="true">·</span>
              <span>{event.ref_source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'}</span>
            </>
          )}
        </p>
      </header>

      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {event.status !== 'resolved' && event.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busyJoin || joined}
            onClick={() => void handleJoin()}
            aria-pressed={joined}
            className={`h-9.5 shrink-0 px-4 text-[13px] ${joined ? 'btn-joined' : 'btn-primary'} disabled:opacity-80`}
          >
            {joined && <Check className="size-4" strokeWidth={2.5} />}
            {joined ? 'Tergabung' : membersOnlyLocked ? 'Khusus anggota' : 'Gabung'} · {quotaText}
          </button>
        )}
        {onStartRoute && (
          <button
            type="button"
            disabled={routeLoading}
            onClick={() => (routeForEvent ? onClearRoute?.() : void onStartRoute())}
            aria-pressed={Boolean(routeForEvent)}
            className={`inline-flex h-9.5 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-normal transition-colors disabled:opacity-60 ${
              routeForEvent
                ? 'bg-ink text-white'
                : 'bg-[#f4f5f7] text-ink hover:bg-[#eaecf0]'
            }`}
          >
            <Navigation className="size-3.5" />
            {routeLoading ? 'Rute…' : 'Rute'}
          </button>
        )}
        {canResolve && (
          <button
            type="button"
            onClick={() => setResolveOpen(true)}
            className="inline-flex h-9.5 shrink-0 items-center gap-1.5 rounded-xl bg-[#f4f5f7] px-3.5 text-[13px] font-normal text-ink transition-colors hover:bg-[#eaecf0]"
          >
            <Camera className="size-3.5" />
            Lapor Selesai
          </button>
        )}
        {canResolve && (
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="QR Gerakan"
            className="inline-flex h-9.5 shrink-0 items-center gap-1.5 rounded-xl bg-[#f4f5f7] px-3 text-[13px] font-normal text-ink transition-colors hover:bg-[#eaecf0]"
          >
            <QrCode className="size-3.5" />
            QR
          </button>
        )}
        <button
          type="button"
          onClick={() => void copyLink()}
          aria-label="Salin tautan gerakan"
          className="inline-flex h-9.5 shrink-0 items-center gap-1.5 rounded-xl bg-[#f4f5f7] px-3 text-[13px] font-normal text-ink transition-colors hover:bg-[#eaecf0]"
        >
          {copied ? <Check className="size-3.5 text-[#2563eb]" strokeWidth={2.5} /> : <Link2 className="size-3.5" />}
          {copied ? 'Tersalin' : 'Bagikan'}
        </button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl bg-critical/8 px-3.5 py-2.5 text-[12px] font-normal text-critical">
          {actionError}
        </p>
      )}

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
          <p className="text-[11.5px] font-normal text-ink-soft">{placeText(place)}</p>
        </div>
      )}

      {(routeLoading || routeError || routeForEvent) && (
        <section className="rounded-[14px] bg-[#f4f5f7] p-4">
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

      <div className="divide-y divide-line border-t border-line">
        <p className="py-3.5 text-[13.5px] leading-relaxed font-light text-ink">
          {event.description || event.report?.ai_site_brief || event.category}
        </p>

        <div className="flex items-start gap-3 py-3.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#2563eb]" />
          <div className="min-w-0 text-[13px]">
            <p className="font-normal text-ink">{event.location_name}</p>
            {placeText(place) !== event.location_name && (
              <p className="mt-0.5 text-[12px] font-light text-ink-soft">{placeText(place)}</p>
            )}
          </div>
        </div>

        {scheduleLabel && (
          <div className="flex items-center gap-3 py-3.5 text-[13px]">
            <Calendar className="size-4 shrink-0 text-ink-soft" />
            <span className="font-normal text-ink">{scheduleLabel}</span>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="py-3.5 text-[13px] font-light text-ink-soft">
            {recommendations.slice(0, 2).map((rec) => (
              <p key={rec} className="leading-relaxed not-first:mt-1.5">
                {rec}
              </p>
            ))}
          </div>
        )}

        {latestAction && (
          <div className="flex items-center justify-between gap-2 py-3.5 text-[13px]">
            <p className="text-ink-soft">
              <span className="font-normal text-ink">{Number(latestAction.waste_kg)} kg</span> sampah ·{' '}
              <span className="font-normal text-ink">{latestAction.trees_planted}</span> bibit
            </p>
            {latestAction.verified_by_agency && (
              <span className="inline-flex items-center gap-1 text-[12px] font-normal text-emerald">
                <ShieldCheck className="size-3.5" /> Sah
              </span>
            )}
          </div>
        )}
      </div>

      <FundraisingSection event={event} />

      {canManageVisibility && event.status !== 'resolved' && event.status !== 'cancelled' && (
        <button
          type="button"
          disabled={busyVis}
          onClick={() => void toggleVisibility()}
          className="h-9 w-full text-[12px] font-light text-ink-soft hover:text-ink disabled:opacity-50"
        >
          {event.visibility === 'public' ? 'Ubah ke khusus anggota' : 'Buka untuk umum'}
        </button>
      )}

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
