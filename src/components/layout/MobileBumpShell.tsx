import { motion, useAnimationControls, useDragControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  Building2,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Shield,
  X,
} from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Orb } from '../../components/ui/atoms'
import { ECOSYSTEM_FILTERS } from '../../lib/constants'
import { useAuth } from '../../modules/auth/AuthContext'
import MapStyleSwitcher from '../../modules/map/MapStyleSwitcher'
import MapView from '../../modules/map/MapView'
import { filterRadarItems, LAYER_CHIPS } from '../../modules/map/radarFilters'
import type { RadarLayer } from '../../modules/map/radarFilters'
import type { Radar } from '../../modules/map/useRadar'
import EventListPanel from './EventListPanel'
import type { CitizenReport, Ecosystem, SatelliteSignal } from '../../types'

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

function MapPillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pill-top-icon size-2.5 shrink-0 text-leaf" aria-hidden="true">
      <path
        d="M12 2.4c-3.9 0-7 3-7 6.8 0 4.6 5 10.1 6.3 11.5.4.4 1 .4 1.4 0C14 19.3 19 13.8 19 9.2c0-3.8-3.1-6.8-7-6.8Z"
        fill="currentColor"
      />
      <circle cx="12" cy="9.2" r="2.7" fill="#fff" fillOpacity="0.92" />
    </svg>
  )
}

function RadarCompassIcon({ light = false }: { light?: boolean }) {
  const gradId = useId()
  const ring = light ? '#FFFFFF' : 'var(--color-leaf)'
  const tipMain = light ? '#FFFFFF' : 'var(--color-forest)'
  const tipSub = light ? '#A7F3D0' : '#34D399'
  const dot = light ? 'var(--color-forest)' : '#FFFFFF'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[25px] -translate-y-0.5" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? 'rgba(255,255,255,0.34)' : '#ECFDF5'} />
          <stop offset="100%" stopColor={light ? 'rgba(167,243,208,0.16)' : '#C6F0D3'} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.3" fill={`url(#${gradId})`} stroke={ring} strokeWidth="2" />
      <circle cx="12" cy="5.2" r="0.9" fill={ring} opacity="0.7" />
      <circle cx="12" cy="18.8" r="0.9" fill={ring} opacity="0.7" />
      <circle cx="5.2" cy="12" r="0.9" fill={ring} opacity="0.7" />
      <circle cx="18.8" cy="12" r="0.9" fill={ring} opacity="0.7" />
      <path
        d="M16.1 7.9c.3.2.4.5.2.9l-2.1 4.4c-.1.2-.3.4-.5.5l-4.4 2.1c-.4.2-.8 0-1-.3-.2-.3-.1-.6 0-.9l2.1-4.4c.1-.2.3-.4.5-.5l4.4-2.1c.3-.1.6 0 .8.3Z"
        fill={tipSub}
      />
      <path
        d="M16.1 7.9c.3.2.4.5.2.9l-2.1 4.4c-.1.2-.3.4-.5.5l-3.3-3.3 4.9-2.4c.3-.2.6-.2.8-.1Z"
        fill={tipMain}
      />
      <circle cx="12" cy="12" r="1.9" fill={dot} stroke={ring} strokeWidth="1.2" />
    </svg>
  )
}

function BlamNatureIcon() {
  const gradId = useId()
  return (
    <svg
      viewBox="0 0 24 24"
      className="relative z-10 size-[28px] drop-shadow-[0_2px_3px_rgba(10,42,24,0.26)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E4F5E8" />
        </linearGradient>
      </defs>
      <path
        d="M19.8 4.4c-5.4-.3-10.3 2.5-11.9 7.8-.6 2-.1 4.1 1.3 5.4 4.7.8 9.2-2 10.6-7 .5-2 .6-4.2 0-6.2Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M4.2 9.4c2.8-.6 5.8.7 7.1 3.3.7 1.4.8 3 .3 4.5-2.7.2-5.4-1.2-6.6-3.7-.6-1.3-.9-2.7-.8-4.1Z"
        fill="var(--color-mint)"
      />
      <path
        d="M9.8 17.3c1.9-3.6 4.4-6.5 7.4-8.8M11.6 17.6V20.5"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M11.6 17.8V20.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="7.4" cy="6.2" r="1.15" fill="#FFFFFF" opacity="0.88" />
    </svg>
  )
}

function AksiActionIcon({ light = false }: { light?: boolean }) {
  const gradId = useId()
  const stroke = light ? 'var(--color-forest)' : '#FFFFFF'
  const clip = light ? 'var(--color-mint)' : '#D1FAE5'
  const clipBorder = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[24px] -translate-y-0.5" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? '#FFFFFF' : '#34A867'} />
          <stop offset="100%" stopColor={light ? '#ECFDF5' : 'var(--color-forest)'} />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 12 12.5)">
        <rect x="4.5" y="5" width="15" height="15.2" rx="4.5" fill={`url(#${gradId})`} />
        <rect x="8.3" y="2.8" width="7.4" height="3.8" rx="1.9" fill={clip} stroke={clipBorder} strokeWidth="1.3" />
        <path
          d="M8.7 13.1l2.2 2.2 4.5-4.6"
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="8.5" y="16.9" width="7" height="1.5" rx="0.75" fill={stroke} fillOpacity="0.45" />
      </g>
      <circle cx="19.5" cy="5.5" r="1.4" fill="var(--color-leaf)" />
    </svg>
  )
}

function BellSolidIcon({ light = false }: { light?: boolean }) {
  const main = light ? '#FFFFFF' : 'var(--color-leaf)'
  const accent = light ? 'var(--color-mint)' : 'var(--color-forest)'
  return (
    <svg
      viewBox="0 0 24 24"
      className={`relative z-10 size-[19px] ${light ? 'drop-shadow-[0_1.5px_2px_rgba(10,42,24,0.22)]' : ''}`}
      aria-hidden="true"
    >
      <g transform="rotate(-8 12 12)">
        <circle cx="12" cy="3.6" r="1.3" fill={accent} />
        <path
          d="M12 4.4a5.2 5.2 0 0 0-5.2 5.2v2.9c0 1-.4 2-1.1 2.7l-.7.8c-.6.6-.1 1.6.7 1.6h12.6c.8 0 1.3-1 .7-1.6l-.7-.8a3.8 3.8 0 0 1-1.1-2.7V9.6A5.2 5.2 0 0 0 12 4.4Z"
          fill={main}
        />
        <path d="M9.6 18.2a2.5 2.5 0 0 0 4.8 0" fill={accent} />
      </g>
      <path
        d="M18.6 6.8c.9.9 1.3 2 1.2 3.2"
        fill="none"
        stroke={accent}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GuestAvatarIcon({ light = false }: { light?: boolean }) {
  const head = light ? '#FFFFFF' : 'var(--color-leaf)'
  const bodyFill = light ? 'rgba(255,255,255,0.34)' : 'var(--color-mint)'
  const bodyStroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[19px]" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.9" fill={head} />
      <circle cx="10.7" cy="7.2" r="0.9" fill={light ? 'var(--color-leaf)' : '#FFFFFF'} fillOpacity="0.65" />
      <path
        d="M5.2 19.3c.7-3.4 3.4-5.2 6.8-5.2s6.1 1.8 6.8 5.2c.2.8-.4 1.5-1.2 1.5H6.4c-.8 0-1.4-.7-1.2-1.5Z"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SearchDuotoneIcon({ light = false }: { light?: boolean }) {
  const stroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  const lens = light ? 'rgba(255,255,255,0.26)' : 'var(--color-mint)'
  const accent = light ? '#A7F3D0' : 'var(--color-forest)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[17px]" aria-hidden="true">
      <circle cx="10.6" cy="10.6" r="6.3" fill={lens} stroke={stroke} strokeWidth="2.3" />
      <path d="M8.3 8.2a3.3 3.3 0 0 1 3.6-.8" fill="none" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
      <path d="M15.4 15.4l4.3 4.3" stroke={accent} strokeWidth="3.1" strokeLinecap="round" />
      <path d="M15.4 15.4l2.1 2.1" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  )
}

function LocateDuotoneIcon({ light = false }: { light?: boolean }) {
  const stroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  const core = light ? '#A7F3D0' : 'var(--color-forest)'
  const inner = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[17px]" aria-hidden="true">
      <circle cx="12" cy="12" r="6.4" fill="none" stroke={stroke} strokeWidth="2.1" />
      <circle cx="12" cy="12" r="2.7" fill={inner} />
      <circle cx="11.3" cy="11.3" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <path
        d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4"
        fill="none"
        stroke={core}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
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
        locateSignal={radar.locateSignal}
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
          <div className="glass absolute top-[calc(env(safe-area-inset-top)+48px)] left-1/2 z-[520] flex w-[min(340px,calc(100%-32px))] -translate-x-1/2 flex-col gap-3 rounded-card bg-white/90 p-4 backdrop-blur-xl">
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
            <div className="flex flex-wrap gap-2">
              {LAYER_CHIPS.map((c) => {
                const on = layers.has(c.layer)
                return (
                  <button
                    key={c.layer}
                    type="button"
                    onClick={() => toggleLayer(c.layer)}
                    aria-pressed={on}
                    className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-bold ${on ? 'bg-ink text-white' : 'bg-muted text-ink'}`}
                  >
                    <span className={`size-2 rounded-full ${c.dot}`} />
                    {c.label}
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

      <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] right-3.5 z-[500] flex flex-col gap-2.5">
        <Orb
          size={38}
          label={profile ? 'Profil' : 'Masuk'}
          onClick={() => openSheet('profile', true)}
          className="orb-avatar text-xs font-extrabold"
        >
          {initials ?? <GuestAvatarIcon />}
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
            <Orb size={56} label="Jelajah" watermark="RADAR" onClick={radar.fitAll}>
              <RadarCompassIcon />
            </Orb>
          </DockItem>
          <DockItem label="Jaga Alam">
            <Orb
              size={60}
              label="Bantu alam"
              onClick={() => setReportOpen(true)}
              className="orb-primary"
            >
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
            className={`min-h-0 flex-1 px-5 pb-32 ${snap === 'full' ? 'overflow-y-auto' : 'overflow-hidden'}`}
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
            </Suspense>
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