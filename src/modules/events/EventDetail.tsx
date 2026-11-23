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
import { StatusPill } from '../../components/ui/atoms'
import { AtlasCoordinateHero } from '../../components/ui/MapMarkers'
import { updateEventVisibility } from '../../lib/api'
import { shortLocation } from '../../lib/constants'
import type { ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'
import FundraisingSection from '../fundraising/FundraisingSection'
import type { ActiveRoute, RouteMode } from '../map/directions'
import { formatPulseTiles, usePulse } from '../map/usePulse'
import type { PulseTileData } from '../map/usePulse'
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
  hideRouteQrButtons?: boolean
  qrOpen?: boolean
  onQrOpenChange?: (open: boolean) => void
}

const STATUS_TONE = {
  good: 'text-resolved',
  warn: 'text-progress',
  bad: 'text-critical',
  neutral: 'text-ink-soft',
} as const

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
  hideRouteQrButtons = false,
  qrOpen: qrOpenProp,
  onQrOpenChange,
}: Props) {
  const { profile, openAuthModal, isLeadOf, isActiveMemberOf } = useAuth()
  const [copied, setCopied] = useState(false)
  const [busyJoin, setBusyJoin] = useState(false)
  const [busyVis, setBusyVis] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [internalQrOpen, setInternalQrOpen] = useState(false)
  const qrOpen = qrOpenProp ?? internalQrOpen
  const setQrOpen = onQrOpenChange ?? setInternalQrOpen

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
    ? (() => {
        const d = new Date(event.start_at)
        const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        return `${datePart} · ${timePart}`
      })()
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
  const photoClass = 'relative aspect-[4/3] overflow-hidden rounded-[16px] bg-muted shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
  const labelClass = 'absolute top-3 rounded-[8px] bg-white/88 px-2.5 py-1 text-[12px] font-medium text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm'
  const quotaText = event.max_participants ? `${participantsCount}/${event.max_participants}` : `${participantsCount}`
  const quotaPct = event.max_participants
    ? Math.min(100, Math.round((participantsCount / Math.max(1, event.max_participants)) * 100))
    : null
  const routeForEvent = activeRoute?.eventId === event.id ? activeRoute : null
  const googleMapsUrl = routeForEvent
    ? `https://www.google.com/maps/dir/?api=1&origin=${routeForEvent.origin.lat},${routeForEvent.origin.lng}&destination=${event.lat},${event.lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}&travelmode=driving`
  const distanceLabel = routeForEvent
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(routeForEvent.distanceKm)
    : null

  return (
    <div className="@container flex flex-col gap-4">
      {resolved && latestAction && beforeImage ? (
        <div className="overflow-hidden rounded-[16px] shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <BeforeAfterSlider before={beforeImage} after={latestAction.after_image_url} />
        </div>
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
        <div className="overflow-hidden rounded-[16px] shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <AtlasCoordinateHero
            lat={event.lat}
            lng={event.lng}
            kind="event"
            tier="has_action"
            badge={event.category}
            subtitle={shortLocation(placeText(place))}
          />
        </div>
      )}

      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-normal text-ink-soft">
          <StatusPill status={event.status} />
          {score !== null && <span className="num">Skor {score}%</span>}
          {event.visibility === 'members_only' && <Lock className="size-3.5" strokeWidth={1.75} aria-label="Khusus anggota" />}
        </div>
        <h2 className="text-[20px] leading-snug font-semibold text-ink">
          {event.title}
        </h2>
        <p className="flex items-start gap-1.5 text-[12px] font-normal text-ink-soft">
          <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={1.75} />
          <span>{event.location_name}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] font-normal text-ink-soft">
          {event.organization && <span className="font-medium text-ink">{event.organization.name}</span>}
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

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
          <p className="num font-semibold text-leaf">
            {participantsCount} relawan
            {event.max_participants && (
              <span className="font-normal text-ink-soft"> dari {event.max_participants} kuota</span>
            )}
          </p>
          {scheduleLabel && <span className="text-[12px] font-normal text-ink-soft">{scheduleLabel}</span>}
        </div>
        {quotaPct !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-leaf transition-[width] duration-300" style={{ width: `${quotaPct}%` }} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {event.status !== 'resolved' && event.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busyJoin || joined}
            onClick={() => void handleJoin()}
            aria-pressed={joined}
            className={`h-11 w-full text-[14px] ${joined ? 'btn-joined' : 'btn-primary'} disabled:opacity-80`}
          >
            {joined && <Check className="size-4" strokeWidth={1.75} />}
            {joined ? 'Tergabung' : membersOnlyLocked ? 'Khusus anggota' : 'Gabung Gerakan'}
            {event.max_participants ? ` · ${quotaText}` : ''}
          </button>
        )}

        <div
          className={
            canResolve && !hideRouteQrButtons
              ? 'grid grid-cols-2 gap-2'
              : 'flex items-center gap-2'
          }
        >
          {!hideRouteQrButtons && onStartRoute && (
            <button
              type="button"
              disabled={routeLoading}
              onClick={() => (routeForEvent ? onClearRoute?.() : void onStartRoute())}
              aria-pressed={Boolean(routeForEvent)}
              className={`h-9 gap-1.5 whitespace-nowrap !rounded-[10px] px-3 text-[12px] disabled:opacity-60 ${
                !canResolve ? 'flex-1' : ''
              } ${
                routeForEvent ? 'inline-flex items-center justify-center bg-ink font-medium text-white' : 'btn-soft'
              }`}
            >
              <Navigation className="size-4 shrink-0" strokeWidth={1.75} />
              {routeLoading ? 'Rute…' : 'Rute'}
            </button>
          )}
          {canResolve && (
            <button
              type="button"
              onClick={() => setResolveOpen(true)}
              className={`btn-soft h-9 gap-1.5 whitespace-nowrap !rounded-[10px] px-3 text-[12px] ${
                hideRouteQrButtons ? 'flex-1' : ''
              }`}
            >
              <Camera className="size-4 shrink-0" strokeWidth={1.75} />
              Lapor Selesai
            </button>
          )}
          {!hideRouteQrButtons && canResolve && (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="QR Gerakan"
              className="btn-soft h-9 gap-1.5 whitespace-nowrap !rounded-[10px] px-3 text-[12px]"
            >
              <QrCode className="size-4 shrink-0" strokeWidth={1.75} />
              QR
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label="Salin tautan gerakan"
            className={`btn-soft h-9 gap-1.5 whitespace-nowrap !rounded-[10px] px-3 text-[12px] ${
              !canResolve || hideRouteQrButtons ? 'flex-1' : ''
            }`}
          >
            {copied ? <Check className="size-4 shrink-0 text-leaf" strokeWidth={1.75} /> : <Link2 className="size-4 shrink-0" strokeWidth={1.75} />}
            {copied ? 'Tersalin' : 'Bagikan'}
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="card-quiet px-3.5 py-2.5 text-[12px] font-medium text-critical">
          {actionError}
        </p>
      )}

      {(routeLoading || routeError || routeForEvent) && (
        <section className="card-quiet p-4">
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
                  className="btn-soft h-9 !rounded-full px-3.5 text-[12px]"
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
                        : 'border border-line bg-white text-ink hover:bg-canvas'
                    } disabled:opacity-45`}
                  >
                    <Route className="size-4" strokeWidth={1.75} /> Darat
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchRouteMode?.('air')}
                    aria-pressed={routeForEvent.mode === 'air'}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${
                      routeForEvent.mode === 'air'
                        ? 'bg-leaf text-white'
                        : 'border border-line bg-white text-ink hover:bg-canvas'
                    }`}
                  >
                    <Plane className="size-4" strokeWidth={1.75} /> Udara
                  </button>
                </div>
                {onClearRoute && (
                  <button
                    type="button"
                    onClick={onClearRoute}
                    aria-label="Tutup rute"
                    className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-canvas hover:text-ink"
                  >
                    <X className="size-4" strokeWidth={1.75} />
                  </button>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="num text-[20px] font-semibold text-ink">{distanceLabel} km</p>
                  <p className="text-[12px] font-normal text-ink-soft">
                    {routeForEvent.mode === 'land' ? 'Jalur darat tercepat' : 'Jalur udara'}
                  </p>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-soft h-8 shrink-0 !rounded-full px-3 text-[12px]"
                >
                  <ExternalLink className="size-4" strokeWidth={1.75} /> Google Maps
                </a>
              </div>

              {!routeForEvent.landAvailable && (
                <p className="text-[12px] font-normal text-ink-soft">
                  {routeForEvent.landError ?? 'Jalur darat tidak terjangkau, menampilkan jalur udara'}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className={`atlas-group grid grid-cols-2 divide-x divide-y divide-ink/6 overflow-hidden ${pulseStatus === 'loading' ? 'opacity-60' : ''}`}>
        {pulseTiles.map((tile) => (
          <StripMetric key={tile.label} {...tile} spacious />
        ))}
      </div>

      <div className="atlas-group divide-y divide-ink/6 px-4">
        <p className="py-3.5 text-[14px] leading-relaxed font-normal text-ink">
          {event.description || event.report?.ai_site_brief || event.category}
        </p>

        {scheduleLabel && (
          <div className="flex items-center gap-3 py-3.5 text-[14px]">
            <Calendar className="size-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
            <span className="font-normal text-ink">{scheduleLabel}</span>
          </div>
        )}

        {latestAction && (
          <div className="flex items-center justify-between gap-2 py-3.5 text-[14px]">
            <p className="text-ink-soft">
              <span className="font-medium text-ink">{Number(latestAction.waste_kg)} kg</span> sampah ·{' '}
              <span className="font-medium text-ink">{latestAction.trees_planted}</span> bibit
            </p>
            {latestAction.verified_by_agency && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-resolved">
                <ShieldCheck className="size-4" strokeWidth={1.75} /> Sah
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
          className="h-9 w-full text-[12px] font-medium text-ink-soft hover:text-ink disabled:opacity-50"
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
