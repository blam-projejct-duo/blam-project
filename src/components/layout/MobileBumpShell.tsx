import { motion, useAnimationControls, useDragControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  Building2,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Leaf,
  Shield,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Orb } from '../../components/ui/atoms'
import { ECOSYSTEM_FILTERS, mapEventTone } from '../../lib/constants'
import AdminPanel from '../../modules/admin/AdminPanel'
import AgencyInboxPanel from '../../modules/agency/AgencyInboxPanel'
import { useAuth } from '../../modules/auth/AuthContext'
import CreateEventForm from '../../modules/events/CreateEventForm'
import EventDetail from '../../modules/events/EventDetail'
import SatelliteSignalDetail from '../../modules/events/SatelliteSignalDetail'
import MapStyleSwitcher from '../../modules/map/MapStyleSwitcher'
import MapView from '../../modules/map/MapView'
import type { Radar } from '../../modules/map/useRadar'
import OrgsPanel from '../../modules/organizations/OrgsPanel'
import ProfilePanel from '../../modules/profile/ProfilePanel'
import QuickReportFlow from '../../modules/reports/QuickReportFlow'
import VerificationRadarPanel from '../../modules/reports/VerificationRadarPanel'
import EventListPanel from './EventListPanel'
import type { CitizenReport, Ecosystem, PinTone, SatelliteSignal } from '../../types'

type Snap = 'peek' | 'half' | 'full'
type Mode = 'detail' | 'signal' | 'list' | 'orgs' | 'profile' | 'verify' | 'agency' | 'admin' | null

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

function RadarCompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[21px] -translate-y-0.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="var(--color-mint)" stroke="var(--color-leaf)" strokeWidth="1.9" />
      <polygon points="15.8,8.2 13.6,13.6 10.4,10.4" fill="var(--color-leaf)" />
      <polygon points="8.2,15.8 10.4,10.4 13.6,13.6" fill="var(--color-forest)" />
      <circle cx="12" cy="12" r="1.4" fill="#fff" />
    </svg>
  )
}

function BlamCameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[25px] -translate-y-0.5" aria-hidden="true">
      <path
        d="M9.1 4.5h5.8c.7 0 1.3.4 1.6 1l.7 1.3h1.8A2.8 2.8 0 0 1 21.8 9.6v7.9a2.8 2.8 0 0 1-2.8 2.8H5a2.8 2.8 0 0 1-2.8-2.8V9.6A2.8 2.8 0 0 1 5 6.8h1.8l.7-1.3c.3-.6.9-1 1.6-1Z"
        fill="#fff"
      />
      <circle cx="12" cy="13.4" r="4.1" fill="var(--color-forest)" fillOpacity="0.22" stroke="var(--color-forest)" strokeWidth="1.7" />
      <circle cx="12" cy="13.4" r="1.8" fill="var(--color-leaf)" />
    </svg>
  )
}

function AksiActionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[20px] -translate-y-0.5" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="4.5" fill="var(--color-leaf)" />
      <rect x="8" y="3" width="8" height="4" rx="2" fill="var(--color-mint)" stroke="var(--color-leaf)" strokeWidth="1.6" />
      <path d="M8.5 13.2l2.3 2.3 4.7-4.7" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BellSolidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[18px]" aria-hidden="true">
      <path
        d="M12 3.2a5.5 5.5 0 0 0-5.5 5.5v3.1c0 1-.4 2-1.1 2.7l-.8.9c-.5.5-.1 1.4.6 1.4h13.6c.7 0 1.1-.9.6-1.4l-.8-.9a3.9 3.9 0 0 1-1.1-2.7V8.7A5.5 5.5 0 0 0 12 3.2Z"
        fill="var(--color-leaf)"
      />
      <path d="M9.8 18.2a2.2 2.2 0 0 0 4.4 0" fill="var(--color-forest)" />
    </svg>
  )
}

function GuestAvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[19px]" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" fill="var(--color-leaf)" />
      <path d="M5.5 19.2c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5" fill="var(--color-mint)" stroke="var(--color-leaf)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SearchDuotoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[18px]" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.4" fill="var(--color-mint)" stroke="var(--color-leaf)" strokeWidth="2.3" />
      <path d="M15.6 15.6l4.2 4.2" stroke="var(--color-leaf)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function LocateDuotoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[18px]" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" fill="var(--color-mint)" stroke="var(--color-leaf)" strokeWidth="2.1" />
      <circle cx="12" cy="12" r="2.4" fill="var(--color-leaf)" />
      <path d="M12 2.6v2.7M12 18.7v2.7M2.6 12h2.7M18.7 12h2.7" stroke="var(--color-leaf)" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
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
  const [tones, setTones] = useState<Set<PinTone>>(() => new Set(['critical']))
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

  const sheetH = Math.round(H * 0.9)
  const snapY = useMemo(
    () => ({
      full: 0,
      half: sheetH - Math.round(H * 0.58),
      peek: sheetH - PEEK_PX,
      closed: H + 48,
    }),
    [H, sheetH],
  )
  const targetKey = mode === null ? 'closed' : snap

  useEffect(() => {
    if (H === 0) return
    void anim.start({ y: snapY[targetKey], opacity: targetKey === 'closed' ? 0 : 1 }, SPRING)
  }, [anim, snapY, targetKey, H])

  const closeSheet = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setFocusSearch(false)
    setMode(null)
    if (rootRef.current) rootRef.current.scrollTop = 0
    window.scrollTo(0, 0)
  }, [])

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

  const startCreateEvent = (report: CitizenReport | null = null, signal: SatelliteSignal | null = null) => {
    setMenuOpen(false)
    setDraftReport(report)
    setDraftSignal(signal)
    setEventOpen(true)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = snapY[snap] + info.offset.y + info.velocity.y * 0.2
    if (projected > snapY.peek + 70) {
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
  const padBottom = !sheetOpen ? 0 : snap === 'peek' ? PEEK_PX : Math.round(H * 0.58)
  const openCount = radar.events.filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled').length
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )

  const toggleTone = (tone: PinTone) =>
    setTones((prev) => {
      const next = new Set(prev)
      if (next.has(tone)) next.delete(tone)
      else next.add(tone)
      return next
    })

  const visibleEvents = useMemo(
    () =>
      radar.events.filter(
        (ev) =>
          ev.status !== 'resolved' &&
          ev.status !== 'cancelled' &&
          (tones.size === 0 || tones.has(mapEventTone(ev))),
      ),
    [radar.events, tones],
  )

  const visibleHazards = useMemo(
    () =>
      tones.size === 0
        ? radar.hazards
        : radar.hazards.filter((h) => tones.has(h.severity === 'high' ? 'critical' : 'progress')),
    [radar.hazards, tones],
  )

  const visibleSignals = useMemo(
    () =>
      tones.size === 0
        ? radar.satelliteSignals
        : radar.satelliteSignals.filter((s) =>
            tones.has(s.kind === 'wildfire' || s.kind === 'volcano' || s.kind === 'flood' ? 'critical' : 'progress'),
          ),
    [radar.satelliteSignals, tones],
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
        onSelect={openDetail}
        onSelectSignal={openSignalDetail}
        style={radar.style}
        padding={{ bottom: padBottom, right: 0 }}
        fitAllSignal={radar.fitAllSignal}
        locateSignal={radar.locateSignal}
      />

      <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] left-1/2 z-[500] -translate-x-1/2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="pill-top flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium whitespace-nowrap transition-transform duration-120 active:scale-95"
        >
          <Leaf className="pill-top-icon size-3.5 text-leaf" strokeWidth={2.4} />
          {visibleEvents.length + visibleHazards.length} tampilan peta
          <ChevronDown
            className={`size-3 opacity-60 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
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
          <div className="glass absolute top-[calc(env(safe-area-inset-top)+54px)] left-1/2 z-[520] flex w-[min(340px,calc(100%-32px))] -translate-x-1/2 flex-col gap-3 rounded-card bg-white/90 p-4 backdrop-blur-xl">
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEM_FILTERS.map((f) => {
                const active = radar.filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => radar.setFilter(f.id as Ecosystem | 'all')}
                    aria-pressed={active}
                    className={`h-10 rounded-full px-4 text-[13px] font-bold ${active ? 'bg-ink text-white' : 'bg-muted text-ink'
                      }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
            <MapStyleSwitcher value={radar.style} onChange={radar.setStyle} className="!bg-muted/70 w-full [&>button]:flex-1" />
            <div className="flex gap-2">
              {(
                [
                  ['critical', 'Kritis', 'bg-critical'],
                  ['progress', 'Titik Panas', 'bg-progress'],
                ] as const
              ).map(([tone, label, dot]) => {
                const on = tones.has(tone)
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => toggleTone(tone)}
                    aria-pressed={on}
                    className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-bold ${on ? 'bg-ink text-white' : 'bg-muted text-ink'}`}
                  >
                    <span className={`size-2 rounded-full ${dot}`} />
                    {label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => openSheet('orgs', true)}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-white text-[13px] font-bold text-ink"
            >
              <Building2 className="size-4" /> Organisasi
            </button>
            {canOrganize && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openSheet('verify', true)}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-bold text-ink"
                >
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
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-white text-[13px] font-bold text-ink"
              >
                <Shield className="size-4" /> Eskalasi
              </button>
            )}
            {profile?.role === 'admin' && (
              <button
                type="button"
                onClick={() => openSheet('admin', true)}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-white"
              >
                <Shield className="size-4" /> Admin
              </button>
            )}
          </div>
        </>
      )}

      <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-3.5 z-[500] flex flex-col gap-2.5">
        <Orb
          size={42}
          label={profile ? 'Profil' : 'Masuk'}
          onClick={() => openSheet('profile', true)}
          className="orb-avatar text-xs font-extrabold"
        >
          {initials ?? <GuestAvatarIcon />}
        </Orb>
        <Orb
          size={42}
          label="Notifikasi"
          onClick={() => openSheet('profile', true)}
          className="relative"
        >
          <BellSolidIcon />
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
        <div className={`${sheetOpen ? 'pointer-events-none' : 'pointer-events-auto'} flex justify-between px-3.5 pb-3`}>
          <Orb size={42} label="Cari lokasi" onClick={() => openSheet('list', false, true)}>
            <SearchDuotoneIcon />
          </Orb>
          <Orb size={42} label="Lokasi saya" onClick={radar.locate}>
            <LocateDuotoneIcon />
          </Orb>
        </div>
        <div className={`${sheetOpen ? 'pointer-events-none' : 'pointer-events-auto'} flex items-end justify-center gap-6 pb-[calc(env(safe-area-inset-bottom)+14px)]`}>
          <DockItem label="Jelajah">
            <Orb size={48} label="Jelajah" watermark="RADAR" onClick={radar.fitAll}>
              <RadarCompassIcon />
            </Orb>
          </DockItem>
          <DockItem label="Lapor">
            <Orb
              size={58}
              label="Lapor"
              watermark="BLAM"
              tone="primary"
              onClick={() => setReportOpen(true)}
              className="orb-primary"
            >
              <BlamCameraIcon />
            </Orb>
          </DockItem>
          <DockItem label="Aksi">
            <Orb size={48} label="Aksi" watermark="AKSI" onClick={() => openSheet('list')} className="relative">
              <AksiActionIcon />
              {openCount > 0 && (
                <span className="num absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full border-2 border-white bg-ink text-[9px] text-white">
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
            className={`min-h-0 flex-1 px-5 pb-32 ${snap === 'full' ? 'overflow-y-auto' : 'overflow-hidden'}`}
          >
            {mode === 'detail' && selected && (
              <EventDetail
                key={selected.id}
                event={selected}
                joined={radar.joinedIds.has(selected.id)}
                onJoin={async () => {
                  await radar.joinAction(selected.id)
                }}
                onRefresh={radar.refresh}
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
                  setMode('list')
                  await radar.refreshLayers()
                }}
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
          </div>
        </motion.div>
      )}

      <motion.div
        initial={false}
        animate={{ y: sheetOpen ? 0 : 100, opacity: sheetOpen ? 1 : 0 }}
        transition={SPRING}
        inert={!sheetOpen}
        className={`absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-[700] flex justify-center ${sheetOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <Orb size={56} label="Tutup" onClick={closeSheet}>
          <X className="size-6 text-ink-soft" strokeWidth={3} />
        </Orb>
      </motion.div>

      {reportOpen && (
        <div className="absolute inset-0 z-[800] bg-canvas">
          <QuickReportFlow
            onClose={() => setReportOpen(false)}
            onOpenVerification={() => {
              setReportOpen(false)
              openSheet('verify', true)
            }}
          />
        </div>
      )}

      {eventOpen && (
        <div className="absolute inset-0 z-[800] bg-canvas">
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
        </div>
      )}
    </div>
  )
}