import { motion, useAnimationControls, useDragControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  Building2,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Shield,
} from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DashedOutline, Orb } from '../../components/ui/atoms'
import {
  AksiActionIcon,
  BellSolidIcon,
  BlamNatureIcon,
  GuestAvatarIcon,
  LocateDuotoneIcon,
  MapPillIcon,
  RadarCompassIcon,
  SearchDuotoneIcon,
} from '../../components/ui/bumpIcons'
import { useAuth } from '../../modules/auth/AuthContext'
import MapStyleSwitcher from '../../modules/map/MapStyleSwitcher'
import MapView from '../../modules/map/MapView'
import { filterRadarItems, LAYER_CHIPS } from '../../modules/map/radarFilters'
import type { RadarLayer } from '../../modules/map/radarFilters'
import type { Radar } from '../../modules/map/useRadar'
import EventListPanel from './EventListPanel'
import type { CitizenReport, SatelliteSignal } from '../../types'

const AdminPanel = lazy(() => import('../../modules/admin/AdminPanel'))
const AgencyInboxPanel = lazy(() => import('../../modules/agency/AgencyInboxPanel'))
const CreateEventForm = lazy(() => import('../../modules/events/CreateEventForm'))
const EventDetail = lazy(() => import('../../modules/events/EventDetail'))
const SatelliteSignalDetail = lazy(() => import('../../modules/events/SatelliteSignalDetail'))
const OrgsPanel = lazy(() => import('../../modules/organizations/OrgsPanel'))
const ProfilePanel = lazy(() => import('../../modules/profile/ProfilePanel'))
const QuickReportFlow = lazy(() => import('../../modules/reports/QuickReportFlow'))
const VerificationRadarPanel = lazy(() => import('../../modules/reports/VerificationRadarPanel'))

type Snap = 'peek' | 'half' | 'full'
type Mode = 'detail' | 'signal' | 'radar' | 'list' | 'orgs' | 'profile' | 'verify' | 'agency' | 'admin' | null

const SPRING = { type: 'spring', stiffness: 350, damping: 30 } as const
const PEEK_PX = 214

function DockItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="map-label">{label}</span>
    </div>
  )
}

export default function MobileBumpShell({ radar }: { radar: Radar }) {
  const { profile, notifications } = useAuth()
  const rootRef = useRef<HTMLDivElement>(null)
  const [H, setH] = useState(0)
  const [mode, setMode] = useState<Mode>(() => (radar.deepLinkedId ? 'detail' : null))
  const [snap, setSnap] = useState<Snap>('half')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [layers, setLayers] = useState<Set<RadarLayer>>(() => new Set())
  const [focusSearch, setFocusSearch] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [draftReport, setDraftReport] = useState<CitizenReport | null>(null)
  const [draftSignal, setDraftSignal] = useState<SatelliteSignal | null>(null)

  const controls = useDragControls()
  const anim = useAnimationControls()

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const update = () => setH(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const peekPx = mode === 'radar' ? 248 : PEEK_PX
  const halfPx = Math.round(H * (mode === 'radar' ? 0.5 : 0.58))
  const sheetH = Math.round(H * 0.9)
  const snapY = useMemo(
    () => ({
      full: 0,
      half: sheetH - halfPx,
      peek: sheetH - peekPx,
      closed: H + 48,
    }),
    [H, sheetH, halfPx, peekPx],
  )
  const targetKey = mode === null ? 'closed' : snap

  useEffect(() => {
    if (H === 0) return
    void anim.start({ y: snapY[targetKey], opacity: targetKey === 'closed' ? 0 : 1 }, SPRING)
  }, [anim, snapY, targetKey, H])

  const { setSelectedId, setSelectedSignal, fitIndonesia } = radar

  const closeSheet = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    if (mode === 'detail' || mode === 'signal') {
      setSelectedId(null)
      setSelectedSignal(null)
    }
    setFocusSearch(false)
    setMode(null)
    if (rootRef.current) rootRef.current.scrollTop = 0
    window.scrollTo(0, 0)
  }, [mode, setSelectedId, setSelectedSignal])

  useEffect(() => {
    if (mode === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, closeSheet])

  const openDetail = (id: string) => {
    radar.setSelectedId(id)
    setMenuOpen(false)
    setMode('detail')
    setSnap('half')
  }

  const openSignalDetail = (signal: SatelliteSignal) => {
    radar.setSelectedSignal(signal)
    setMenuOpen(false)
    setMode('signal')
    setSnap('half')
  }

  const openSheet = (nextMode: Exclude<Mode, null>, full = false, search = false) => {
    setMenuOpen(false)
    setFocusSearch(search)
    setMode(nextMode)
    setSnap(full || search ? 'full' : 'half')
  }

  const openRadar = () => {
    setSelectedId(null)
    setSelectedSignal(null)
    setMenuOpen(false)
    setFocusSearch(false)
    setMode('radar')
    setSnap('half')
    fitIndonesia()
  }

  const startCreateEvent = (report: CitizenReport | null = null, signal: SatelliteSignal | null = null) => {
    setMenuOpen(false)
    setDraftReport(report)
    setDraftSignal(signal)
    setEventOpen(true)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = snapY[snap] + info.offset.y + info.velocity.y * 0.2
    if (projected > snapY.peek + 48) {
      closeSheet()
      return
    }
    const next = (['full', 'half', 'peek'] as const).reduce((best, k) =>
      Math.abs(snapY[k] - projected) < Math.abs(snapY[best] - projected) ? k : best,
    )
    setSnap(next)
    void anim.start({ y: snapY[next], opacity: 1 }, SPRING)
  }

  const cycleSnap = () => {
    setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'))
  }

  const sheetOpen = mode !== null
  const padBottom = !sheetOpen ? 0 : snap === 'peek' ? peekPx : halfPx
  const openCount = radar.events.filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled').length
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )

  const toggleLayer = (layer: RadarLayer) =>
    setLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })

  const { visibleEvents, visibleHazards, visibleSignals } = useMemo(
    () => filterRadarItems(radar.events, radar.hazards, radar.satelliteSignals, layers),
    [radar.events, radar.hazards, radar.satelliteSignals, layers],
  )

  const selected = radar.selected
  const initials = profile?.full_name ? profile.full_name.slice(0, 1).toUpperCase() : null

  return (
    <div
      ref={rootRef}
      data-map-style={radar.style}
      className="blam-mobile relative h-full w-full select-none overflow-clip bg-canvas"
    >
      <MapView
        events={visibleEvents}
        hazards={visibleHazards}
        selectedId={radar.selectedId}
        selectedSignal={radar.selectedSignal}
        activeRoute={radar.activeRoute}
        onSelect={openDetail}
        onSelectSignal={openSignalDetail}
        style={radar.style}
        padding={{ bottom: padBottom, right: 0 }}
        fitAllSignal={radar.fitAllSignal}
        fitIndonesiaSignal={radar.fitIndonesiaSignal}
        locateSignal={radar.locateSignal}
        radarMode={mode === 'radar' || mode === 'signal'}
      />

      <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] left-1/2 z-[500] -translate-x-1/2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="pill-top flex h-[40px] items-center gap-0 rounded-full px-2 text-[6px] font-normal tracking-normal whitespace-nowrap transition-transform duration-120 active:scale-95"
        >
          <MapPillIcon />
          <span className="-mx-1.5 inline-block scale-80">tampilan peta</span>
          <ChevronDown
            className={`size-3 opacity-65 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 z-[510] cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-[calc(env(safe-area-inset-top)+48px)] left-1/2 z-[520] flex w-[min(340px,calc(100%-32px))] -translate-x-1/2 flex-col gap-3 rounded-[24px] bg-white/95 p-4 shadow-[0_8px_24px_rgba(19,36,26,0.12)] backdrop-blur-md">
            <DashedOutline rx={23} />
            <MapStyleSwitcher value={radar.style} onChange={radar.setStyle} className="w-full [&>button]:flex-1" />
            <div className="flex flex-wrap gap-2">
              {LAYER_CHIPS.map((c) => {
                const on = layers.has(c.layer)
                return (
                  <button
                    key={c.layer}
                    type="button"
                    onClick={() => toggleLayer(c.layer)}
                    aria-pressed={on}
                    className={`font-display relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                      on ? 'bg-leaf text-white' : 'bg-[#f7faf6] text-ink hover:bg-mint/35'
                    }`}
                  >
                    {!on && <DashedOutline rx={17} />}
                    <span className={`size-2 rounded-full ${c.dot} ${on ? 'ring-1 ring-white/80' : ''}`} />
                    {c.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => openSheet('orgs', true)}
              className="font-display relative flex h-10 items-center justify-center gap-2 rounded-full bg-[#f7faf6] text-[13px] font-semibold text-forest transition-colors hover:bg-mint/30"
            >
              <DashedOutline rx={19} />
              <Building2 className="size-4" /> Organisasi
            </button>
            {canOrganize && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openSheet('verify', true)}
                  className="font-display relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f7faf6] text-[13px] font-semibold text-forest transition-colors hover:bg-mint/30"
                >
                  <DashedOutline rx={19} />
                  <CheckSquare className="size-4" /> Verifikasi
                </button>
                <button
                  type="button"
                  onClick={() => startCreateEvent(null)}
                  className="btn-primary h-10 flex-1 text-[13px]"
                >
                  <CalendarPlus className="size-4" /> Buat Event
                </button>
              </div>
            )}
            {profile?.role === 'agency' && (
              <button
                type="button"
                onClick={() => openSheet('agency', true)}
                className="font-display relative flex h-10 items-center justify-center gap-2 rounded-full bg-[#f7faf6] text-[13px] font-semibold text-forest transition-colors hover:bg-mint/30"
              >
                <DashedOutline rx={19} />
                <Shield className="size-4" /> Eskalasi
              </button>
            )}
            {profile?.role === 'admin' && (
              <button
                type="button"
                onClick={() => openSheet('admin', true)}
                className="font-display flex h-10 items-center justify-center gap-2 rounded-full bg-forest text-[13px] font-semibold text-white"
              >
                <Shield className="size-4" /> Admin
              </button>
            )}
          </div>
        </>
      )}

      <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] right-3.5 z-[500] flex flex-col gap-2.5">
        <Orb
          size={38}
          label={profile ? 'Profil' : 'Masuk'}
          onClick={() => openSheet('profile', true)}
          className="orb-avatar overflow-hidden text-xs font-extrabold"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              referrerPolicy="no-referrer"
              className="size-full rounded-full object-cover"
            />
          ) : (
            initials ?? <GuestAvatarIcon />
          )}
        </Orb>
        <Orb
          size={38}
          label="Notifikasi"
          onClick={() => openSheet('profile', true)}
          className="orb-primary relative"
        >
          <BellSolidIcon light />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-critical" />
          )}
        </Orb>
      </div>

      <motion.div
        initial={false}
        animate={{ y: sheetOpen ? 140 : 0, opacity: sheetOpen ? 0 : 1 }}
        transition={SPRING}
        inert={sheetOpen}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]"
      >
        <div className={`${sheetOpen ? 'pointer-events-none' : 'pointer-events-auto'} flex justify-between px-4 pb-6`}>
          <Orb size={36} label="Cari lokasi" onClick={() => openSheet('list', false, true)}>
            <SearchDuotoneIcon />
          </Orb>
          <Orb size={36} label="Lokasi saya" onClick={radar.locate}>
            <LocateDuotoneIcon />
          </Orb>
        </div>
        <div className={`${sheetOpen ? 'pointer-events-none' : 'pointer-events-auto'} flex items-end justify-center gap-6 pb-[calc(env(safe-area-inset-bottom)+14px)]`}>
          <DockItem label="Jelajah">
            <Orb size={56} label="Jelajah" watermark="RADAR" onClick={openRadar}>
              <RadarCompassIcon />
            </Orb>
          </DockItem>
          <DockItem label="Blam!">
            <Orb
              size={60}
              label="Blam!"
              onClick={() => setReportOpen(true)}
              className="orb-primary"
            >
              <span aria-hidden="true" className="orb-sheen" />
              <BlamNatureIcon />
            </Orb>
          </DockItem>
          <DockItem label="Aksi">
            <Orb size={56} label="Aksi" watermark="AKSI" onClick={() => openSheet('list')} className="relative">
              <AksiActionIcon />
              {openCount > 0 && (
                <span className="num absolute -top-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-ink text-[10px] text-white">
                  {openCount}
                </span>
              )}
            </Orb>
          </DockItem>
        </div>
      </motion.div>

      {/* Bottom Sheet */}
      {H > 0 && (
        <motion.div
          initial={{ y: snapY.closed, opacity: 0 }}
          animate={anim}
          drag="y"
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: snapY.full, bottom: snapY.peek + 90 }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          inert={!sheetOpen}
          aria-hidden={!sheetOpen}
          role="dialog"
          aria-label="Panel informasi"
          className={`absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-sheet border-t border-line/80 bg-white ${sheetOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ height: sheetH }}
        >
          <div
            onPointerDown={(e) => controls.start(e)}
            onClick={cycleSnap}
            className="flex h-9 shrink-0 cursor-grab touch-none items-center justify-center"
          >
            <span className="h-1.5 w-10 rounded-full bg-line" />
          </div>

          <div
            className={`min-h-0 flex-1 px-5 pb-8 ${snap === 'full' ? 'overflow-y-auto' : 'overflow-hidden'}`}
          >
            <Suspense fallback={<div className="py-6 text-xs font-bold text-ink-soft">Memuat…</div>}>
              {mode === 'detail' && selected && (
                <EventDetail
                  key={selected.id}
                  event={selected}
                  joined={radar.joinedIds.has(selected.id)}
                  onJoin={async () => {
                    await radar.joinAction(selected.id)
                  }}
                  onRefresh={radar.refresh}
                  activeRoute={radar.activeRoute}
                  routeLoading={radar.routeLoading}
                  routeError={radar.routeError}
                  onStartRoute={() => radar.startDirections(selected)}
                  onSwitchRouteMode={radar.switchRouteMode}
                  onClearRoute={radar.clearRoute}
                />
              )}

              {mode === 'signal' && radar.selectedSignal && (
                <SatelliteSignalDetail
                  key={radar.selectedSignal.id}
                  signal={radar.selectedSignal}
                  linkedEvent={
                    radar.allEvents.find(
                      (ev) =>
                        ev.ref_source === radar.selectedSignal?.source &&
                        ev.ref_external_id === radar.selectedSignal?.externalId,
                    ) ?? null
                  }
                  onOpenEvent={openDetail}
                  onCreateEvent={(s) => startCreateEvent(null, s)}
                  onModerated={async () => {
                    radar.setSelectedSignal(null)
                    setMode('radar')
                    await radar.refreshLayers()
                  }}
                />
              )}

              {mode === 'radar' && (
                <EventListPanel
                  events={visibleEvents}
                  impactEvents={radar.events}
                  signals={visibleSignals}
                  query={query}
                  onQueryChange={setQuery}
                  autoFocus={focusSearch}
                  title="Jelajah"
                  onExpand={() => setSnap('full')}
                  onOpen={openDetail}
                  onOpenSignal={openSignalDetail}
                />
              )}

              {mode === 'list' && (
                <EventListPanel
                  events={visibleEvents}
                  impactEvents={radar.events}
                  signals={visibleSignals}
                  query={query}
                  onQueryChange={setQuery}
                  autoFocus={focusSearch}
                  title="Aksi"
                  onExpand={() => setSnap('full')}
                  onOpen={openDetail}
                  onOpenSignal={openSignalDetail}
                />
              )}

              {mode === 'orgs' && <OrgsPanel />}
              {mode === 'profile' && <ProfilePanel />}
              {mode === 'verify' && (
                <VerificationRadarPanel
                  onCreateEvent={(report) => startCreateEvent(report)}
                  onCreateStandaloneEvent={() => startCreateEvent(null)}
                />
              )}
              {mode === 'agency' && (
                <AgencyInboxPanel
                  events={radar.allEvents}
                  onSelectEvent={openDetail}
                  onCreateEventFromReport={(report) => startCreateEvent(report)}
                  onRefresh={radar.refresh}
                />
              )}
              {mode === 'admin' && (
                <AdminPanel events={radar.allEvents} onRefreshEvents={radar.refresh} />
              )}
            </Suspense>
          </div>
        </motion.div>
      )}

      {reportOpen && (
        <div className="absolute inset-0 z-[800] bg-canvas">
          <Suspense fallback={<div className="grid h-full place-items-center text-xs font-bold text-ink-soft">Memuat…</div>}>
            <QuickReportFlow
              onClose={() => setReportOpen(false)}
              onOpenVerification={() => {
                setReportOpen(false)
                openSheet('verify', true)
              }}
            />
          </Suspense>
        </div>
      )}

      {eventOpen && (
        <div className="absolute inset-0 z-[800] bg-canvas">
          <Suspense fallback={<div className="grid h-full place-items-center text-xs font-bold text-ink-soft">Memuat…</div>}>
            <CreateEventForm
              key={draftReport?.id ?? draftSignal?.id ?? 'standalone'}
              initialReport={draftReport}
              initialSignal={draftSignal}
              onClose={() => {
                setDraftReport(null)
                setDraftSignal(null)
                setEventOpen(false)
              }}
              onCreated={async (id) => {
                setDraftReport(null)
                setDraftSignal(null)
                setEventOpen(false)
                radar.setFilter('all')
                await radar.refresh()
                openDetail(id)
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}