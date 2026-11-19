import { AnimatePresence, motion, useAnimationControls, useDragControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  Building2,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Droplets,
  Flame,
  History,
  Mountain,
  Shield,
  Sprout,
  Sun,
  X,
} from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DashedOutline, MarkerTierLegend, Orb } from '../../components/ui/atoms'
import {
  AksiActionIcon,
  BellSolidIcon,
  BlamAiAvatarIcon,
  BlamNatureIcon,
  DonateHeartDuotoneIcon,
  GuestAvatarIcon,
  LocateDuotoneIcon,
  MapPillIcon,
  RadarCompassIcon,
  SearchDuotoneIcon,
  SnapCameraDuotoneIcon,
} from '../../components/ui/bumpIcons'
import type { BlamChatAction, BlamChatContext, BlamSnapPrefill } from '../../lib/api'
import { ROLE_LABEL } from '../../lib/constants'
import { useAuth } from '../../modules/auth/AuthContext'
import BlamChatModal from '../../modules/chat/BlamChatModal'
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
const HistoryPanel = lazy(() => import('../../modules/history/HistoryPanel'))
const OrgsPanel = lazy(() => import('../../modules/organizations/OrgsPanel'))
const ProfilePanel = lazy(() => import('../../modules/profile/ProfilePanel'))
const QuickReportFlow = lazy(() => import('../../modules/reports/QuickReportFlow'))
const VerificationRadarPanel = lazy(() => import('../../modules/reports/VerificationRadarPanel'))
const BlamDonasiModal = lazy(() => import('../../modules/fundraising/BlamDonasiModal'))

type Snap = 'peek' | 'half' | 'full'
type Mode = 'detail' | 'signal' | 'radar' | 'list' | 'history' | 'orgs' | 'profile' | 'verify' | 'agency' | 'admin' | null

const SPRING = { type: 'spring', stiffness: 290, damping: 32, mass: 0.9 } as const
const PEEK_PX = 214

const LAYER_CHIP_ICON: Record<RadarLayer, { icon: ReactNode; offCls: string; onCls: string }> = {
  wildfire: {
    icon: <Flame className="size-4" strokeWidth={2.2} />,
    offCls: 'bg-critical/8 text-critical hover:bg-critical/14',
    onCls: 'bg-critical text-white shadow-xs',
  },
  suspected: {
    icon: <Sun className="size-4" strokeWidth={2.2} />,
    offCls: 'bg-progress/10 text-progress hover:bg-progress/18',
    onCls: 'bg-progress text-white shadow-xs',
  },
  flood: {
    icon: <Droplets className="size-4" strokeWidth={2.2} />,
    offCls: 'bg-cobalt/8 text-cobalt hover:bg-cobalt/14',
    onCls: 'bg-cobalt text-white shadow-xs',
  },
  volcano: {
    icon: <Mountain className="size-4" strokeWidth={2.2} />,
    offCls: 'bg-purple-600/8 text-purple-600 hover:bg-purple-600/14',
    onCls: 'bg-purple-600 text-white shadow-xs',
  },
  event: {
    icon: <Sprout className="size-4" strokeWidth={2.2} />,
    offCls: 'bg-emerald/10 text-emerald hover:bg-emerald/16',
    onCls: 'bg-emerald text-white shadow-xs',
  },
}

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
  const [blamMenuOpen, setBlamMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [donasiOpen, setDonasiOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportPrefill, setReportPrefill] = useState<BlamSnapPrefill | undefined>(undefined)
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
    if (mode === null && !blamMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (blamMenuOpen) setBlamMenuOpen(false)
      else closeSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, blamMenuOpen, closeSheet])

  const openDetail = (id: string) => {
    radar.setSelectedId(id)
    setMenuOpen(false)
    setBlamMenuOpen(false)
    setMode('detail')
    setSnap('half')
  }

  const openSignalDetail = (signal: SatelliteSignal) => {
    radar.setSelectedSignal(signal)
    setMenuOpen(false)
    setBlamMenuOpen(false)
    setMode('signal')
    setSnap('half')
  }

  const openSheet = (nextMode: Exclude<Mode, null>, full = false, search = false) => {
    setMenuOpen(false)
    setBlamMenuOpen(false)
    setFocusSearch(search)
    setMode(nextMode)
    setSnap(full || search ? 'full' : 'half')
  }

  const openRadar = () => {
    setSelectedId(null)
    setSelectedSignal(null)
    setMenuOpen(false)
    setBlamMenuOpen(false)
    setFocusSearch(false)
    setMode('radar')
    setSnap('half')
    fitIndonesia()
  }

  const startCreateEvent = (report: CitizenReport | null = null, signal: SatelliteSignal | null = null) => {
    setMenuOpen(false)
    setBlamMenuOpen(false)
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

  const blamChatContext = useMemo<BlamChatContext>(
    () => ({
      userName: profile?.full_name,
      userRole: profile ? ROLE_LABEL[profile.role] : 'Warga',
      mapStyle: radar.style,
      selectedTitle: selected?.title ?? radar.selectedSignal?.title,
      selectedLocation: selected?.location_name,
      activeEvents: visibleEvents
        .filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled')
        .slice(0, 6)
        .map((ev) => ({
          title: ev.title,
          ecosystem: ev.ecosystem,
          status: ev.status,
          locationName: ev.location_name,
        })),
      signals: visibleSignals.slice(0, 5).map((s) => ({
        title: s.title,
        kindLabel: s.kind ?? 'suspected',
        source: s.source,
        categoryLabel: s.categoryLabel,
      })),
    }),
    [profile, radar.style, radar.selectedSignal, selected, visibleEvents, visibleSignals],
  )

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
        radarMode={mode === 'radar' && !radar.selectedId && !radar.selectedSignal}
        focusTarget={radar.focusTarget}
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

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Tutup menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-[510] cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'top center' }}
              className="font-sans absolute top-[calc(env(safe-area-inset-top)+60px)] left-1/2 z-[520] flex w-[min(296px,calc(100%-32px))] -translate-x-1/2 flex-col gap-2.5 rounded-[22px] bg-white/95 p-3 shadow-[0_10px_28px_rgba(18,29,79,0.16)] backdrop-blur-md"
            >
              <DashedOutline rx={21} />
              <MapStyleSwitcher compact value={radar.style} onChange={radar.setStyle} className="w-full [&>button]:flex-1" />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-0.5 text-[10px] font-light text-ink-soft">
                  <span className="truncate">
                    Layer:{' '}
                    {layers.size === 0
                      ? 'Semua'
                      : LAYER_CHIPS.filter((c) => layers.has(c.layer))
                          .map((c) => c.label)
                          .join(', ')}
                  </span>
                  {layers.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setLayers(new Set())}
                      className="shrink-0 pl-2 font-normal text-leaf hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {LAYER_CHIPS.map((c) => {
                    const on = layers.has(c.layer)
                    const ui = LAYER_CHIP_ICON[c.layer]
                    return (
                      <button
                        key={c.layer}
                        type="button"
                        onClick={() => toggleLayer(c.layer)}
                        aria-pressed={on}
                        aria-label={c.label}
                        title={c.label}
                        className={`grid h-9 place-items-center rounded-full transition-all active:scale-95 ${
                          on ? ui.onCls : ui.offCls
                        }`}
                      >
                        {ui.icon}
                      </button>
                    )
                  })}
                </div>
                <div className="pt-1">
                  <MarkerTierLegend compact />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 border-t border-leaf/12 pt-2.5">
                <button
                  type="button"
                  onClick={() => openSheet('history', true)}
                  className="flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-[#eff3ff] px-3 text-[11.5px] font-normal text-forest transition-colors hover:bg-mint/35"
                >
                  <History className="size-3.5 shrink-0" /> History
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('orgs', true)}
                  className="flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-[#eff3ff] px-3 text-[11.5px] font-normal text-forest transition-colors hover:bg-mint/35"
                >
                  <Building2 className="size-3.5 shrink-0" /> Organisasi
                </button>
                {canOrganize && (
                  <>
                    <button
                      type="button"
                      onClick={() => openSheet('verify', true)}
                      className="flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-[#eff3ff] px-3 text-[11.5px] font-normal text-forest transition-colors hover:bg-mint/35"
                    >
                      <CheckSquare className="size-3.5 shrink-0" /> Verifikasi
                    </button>
                    <button
                      type="button"
                      onClick={() => startCreateEvent(null)}
                      className="btn-primary !font-sans h-8.5 px-3 text-[11.5px] font-medium"
                    >
                      <CalendarPlus className="size-3.5 shrink-0" /> Buat Event
                    </button>
                  </>
                )}
                {profile?.role === 'agency' && (
                  <button
                    type="button"
                    onClick={() => openSheet('agency', true)}
                    className="flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-[#eff3ff] px-3 text-[11.5px] font-normal text-forest transition-colors hover:bg-mint/35"
                  >
                    <Shield className="size-3.5 shrink-0" /> Eskalasi
                  </button>
                )}
                {profile?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => openSheet('admin', true)}
                    className="flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-forest px-3 text-[11.5px] font-normal text-white"
                  >
                    <Shield className="size-3.5 shrink-0" /> Admin
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {blamMenuOpen && !sheetOpen && (
          <motion.button
            type="button"
            aria-label="Tutup menu Blam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setBlamMenuOpen(false)}
            className="absolute inset-0 z-[490] bg-ink/24 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ y: sheetOpen ? 140 : 0, opacity: sheetOpen ? 0 : 1 }}
        transition={SPRING}
        inert={sheetOpen}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]"
      >
        <motion.div
          initial={false}
          animate={{
            opacity: blamMenuOpen ? 0 : 1,
            y: blamMenuOpen ? 14 : 0,
            scale: blamMenuOpen ? 0.88 : 1,
          }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          inert={blamMenuOpen}
          className={`${sheetOpen || blamMenuOpen ? 'pointer-events-none' : 'pointer-events-auto'} flex justify-between px-4 pb-6`}
        >
          <Orb size={36} label="Cari lokasi" onClick={() => openSheet('list', false, true)}>
            <SearchDuotoneIcon />
          </Orb>
          <Orb size={36} label="Lokasi saya" onClick={radar.locate}>
            <LocateDuotoneIcon />
          </Orb>
        </motion.div>
        <div
          className={`${sheetOpen ? 'pointer-events-none' : 'pointer-events-auto'} flex items-end justify-center gap-6 pb-[calc(env(safe-area-inset-bottom)+14px)]`}
        >
          <motion.div
            initial={false}
            animate={{
              x: blamMenuOpen ? 82 : 0,
              scale: blamMenuOpen ? 0.3 : 1,
              opacity: blamMenuOpen ? 0 : 1,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            inert={blamMenuOpen}
            className={blamMenuOpen ? 'pointer-events-none' : ''}
          >
            <DockItem label="Jelajah">
              <Orb size={56} label="Jelajah" watermark="RADAR" onClick={openRadar}>
                <RadarCompassIcon />
              </Orb>
            </DockItem>
          </motion.div>

          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <AnimatePresence>
              {blamMenuOpen &&
                [
                  {
                    id: 'chat',
                    label: 'Blam Chat',
                    x: -78,
                    y: -74,
                    size: 52,
                    primary: false,
                    delay: 0.04,
                    icon: <BlamAiAvatarIcon withBadge={false} className="relative z-10 size-10" />,
                    onSelect: () => setChatOpen(true),
                  },
                  {
                    id: 'snap',
                    label: 'Blam Snap',
                    x: 0,
                    y: -108,
                    size: 56,
                    primary: true,
                    delay: 0.08,
                    icon: <SnapCameraDuotoneIcon light />,
                    onSelect: () => {
                      setReportPrefill(undefined)
                      setReportOpen(true)
                    },
                  },
                  {
                    id: 'donasi',
                    label: 'Blam Donasi',
                    x: 78,
                    y: -74,
                    size: 52,
                    primary: false,
                    delay: 0.12,
                    icon: <DonateHeartDuotoneIcon />,
                    onSelect: () => setDonasiOpen(true),
                  },
                ].map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ x: 0, y: 0, scale: 0.25, opacity: 0 }}
                    animate={{
                      x: item.x,
                      y: item.y,
                      scale: 1,
                      opacity: 1,
                      transition: { type: 'spring', stiffness: 420, damping: 25, delay: item.delay },
                    }}
                    exit={{
                      x: 0,
                      y: 0,
                      scale: 0.25,
                      opacity: 0,
                      transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
                    }}
                    style={{
                      left: '50%',
                      top: 30,
                      width: item.size,
                      height: item.size,
                      marginLeft: -item.size / 2,
                      marginTop: -item.size / 2,
                    }}
                    className="pointer-events-auto absolute"
                  >
                    <Orb
                      size={item.size}
                      label={item.label}
                      onClick={() => {
                        setBlamMenuOpen(false)
                        item.onSelect()
                      }}
                      className={item.primary ? 'orb-primary' : ''}
                    >
                      {item.primary && <span aria-hidden="true" className="orb-sheen" />}
                      {item.icon}
                    </Orb>
                    <span className="font-sans pointer-events-none absolute top-[calc(100%+5px)] left-1/2 -translate-x-1/2 text-[10.5px] font-normal whitespace-nowrap text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]">
                      {item.label}
                    </span>
                  </motion.div>
                ))}
            </AnimatePresence>

            <Orb
              size={64}
              label={blamMenuOpen ? 'Tutup menu Blam' : 'Buka menu Blam'}
              onClick={() => setBlamMenuOpen((v) => !v)}
              className={blamMenuOpen ? 'relative z-10' : 'relative z-10 !bg-none !shadow-none'}
            >
              {!blamMenuOpen && <span aria-hidden="true" className="orb-sheen z-20 scale-115" />}
              <motion.span
                initial={false}
                animate={{
                  rotate: blamMenuOpen ? 90 : 0,
                  scale: blamMenuOpen ? 0 : 1,
                  opacity: blamMenuOpen ? 0 : 1,
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 grid size-full place-items-center"
              >
                <BlamNatureIcon className="size-full scale-120 drop-shadow-[0_4px_10px_rgba(11,27,77,0.32)]" />
              </motion.span>
              <motion.span
                initial={false}
                animate={{
                  rotate: blamMenuOpen ? 0 : -90,
                  scale: blamMenuOpen ? 1 : 0,
                  opacity: blamMenuOpen ? 1 : 0,
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-10 grid place-items-center"
              >
                <X className="size-6 text-forest" strokeWidth={2.6} />
              </motion.span>
            </Orb>
            <span
              className={
                blamMenuOpen
                  ? 'font-sans text-[10.5px] font-normal text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]'
                  : 'map-label'
              }
            >
              {blamMenuOpen ? 'Tutup' : 'Blam!'}
            </span>
          </div>

          <motion.div
            initial={false}
            animate={{
              x: blamMenuOpen ? -82 : 0,
              scale: blamMenuOpen ? 0.3 : 1,
              opacity: blamMenuOpen ? 0 : 1,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            inert={blamMenuOpen}
            className={blamMenuOpen ? 'pointer-events-none' : ''}
          >
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
          </motion.div>
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
                        ev.id === radar.selectedSignal?.linkedEventId ||
                        (ev.ref_source === radar.selectedSignal?.source &&
                          Boolean(
                            ev.ref_external_id &&
                              (ev.ref_external_id === radar.selectedSignal?.externalId ||
                                radar.selectedSignal?.memberIds?.includes(ev.ref_external_id)),
                          )),
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

              {mode === 'history' && (
                <HistoryPanel
                  events={radar.allEvents}
                  signals={radar.satelliteSignals}
                  onSelectEvent={openDetail}
                  onOpenSignal={openSignalDetail}
                  onFocusLocation={(lat, lng) => {
                    radar.focusLocation(lat, lng)
                    setSnap('half')
                  }}
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

      <AnimatePresence>
        {reportOpen && (
          <motion.div
            key="quick-report-panel"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[800] bg-canvas"
          >
            <Suspense fallback={<div className="grid h-full place-items-center text-xs font-bold text-ink-soft">Memuat…</div>}>
              <QuickReportFlow
                initialPrefill={reportPrefill}
                onClose={() => {
                  setReportOpen(false)
                  setReportPrefill(undefined)
                }}
                onOpenVerification={() => {
                  setReportOpen(false)
                  setReportPrefill(undefined)
                  openSheet('verify', true)
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {eventOpen && (
          <motion.div
            key="create-event-panel"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[800] bg-canvas"
          >
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
          </motion.div>
        )}

        {chatOpen && (
          <BlamChatModal
            key="blam-chat-modal"
            context={blamChatContext}
            onClose={() => setChatOpen(false)}
            onAction={(action: BlamChatAction) => {
              if (action.type === 'open_blam_snap') {
                setReportPrefill(action.prefill)
                setChatOpen(false)
                setReportOpen(true)
                return
              }
              if (action.type === 'focus_map_point') {
                const { lat, lng, eventId } = action.target
                setChatOpen(false)
                if (eventId && radar.events.some((ev) => ev.id === eventId)) {
                  openDetail(eventId)
                  return
                }
                const nearestSignal = radar.satelliteSignals.find(
                  (s) => Math.abs(s.lat - lat) < 0.2 && Math.abs(s.lng - lng) < 0.2,
                )
                if (nearestSignal) {
                  openSignalDetail(nearestSignal)
                  return
                }
                setMode(null)
                radar.focusLocation(lat, lng, 9.5)
              }
            }}
          />
        )}

        {donasiOpen && (
          <Suspense fallback={null}>
            <BlamDonasiModal
              key="blam-donasi-modal"
              signals={radar.satelliteSignals}
              onClose={() => setDonasiOpen(false)}
              onOpenSignal={(sig) => openSignalDetail(sig)}
              onFocusLocation={(lat, lng) => {
                setMode(null)
                radar.focusLocation(lat, lng, 10)
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  )
}