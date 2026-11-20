import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { ROLE_LABEL } from '../../lib/constants'
import type { BlamChatAction, BlamChatContext, BlamSelectedPointContext, BlamSnapPrefill } from '../../lib/api'
import BlamChatModal from '../../modules/chat/BlamChatModal'
import type { BlamPointPromptSuggestion } from '../../modules/chat/BlamChatModal'
import BlamCompanion from '../../modules/chat/BlamCompanion'
import { DashedOutline, MarkerTierLegend, Orb } from '../ui/atoms'
import {
  AdminDuotoneIcon,
  AksiActionIcon,
  BellSolidIcon,
  BlamNatureIcon,
  EscalateDuotoneIcon,
  FilterDuotoneIcon,
  GuestAvatarIcon,
  HistoryDuotoneIcon,
  LocateDuotoneIcon,
  OrgDuotoneIcon,
  RadarCompassIcon,
  SearchDuotoneIcon,
} from '../ui/bumpIcons'
import AdminPanel from '../../modules/admin/AdminPanel'
import AgencyInboxPanel from '../../modules/agency/AgencyInboxPanel'
import { useAuth } from '../../modules/auth/AuthContext'
import CreateEventForm from '../../modules/events/CreateEventForm'
import EventDetail from '../../modules/events/EventDetail'
import SatelliteSignalDetail from '../../modules/events/SatelliteSignalDetail'
import HistoryPanel from '../../modules/history/HistoryPanel'
import MapStyleSwitcher from '../../modules/map/MapStyleSwitcher'
import MapView from '../../modules/map/MapView'
import { filterRadarItems, LAYER_CHIPS } from '../../modules/map/radarFilters'
import type { RadarLayer } from '../../modules/map/radarFilters'
import type { Radar } from '../../modules/map/useRadar'
import OrgsPanel from '../../modules/organizations/OrgsPanel'
import NotificationsPanel from '../../modules/notifications/NotificationsPanel'
import ProfilePanel from '../../modules/profile/ProfilePanel'
import VerificationRadarPanel from '../../modules/reports/VerificationRadarPanel'
import type { CitizenReport, ConservationEvent, SatelliteSignal } from '../../types'
import EventListPanel from './EventListPanel'
import type { ListTab } from './EventListPanel'

type NavTab = 'Jelajah' | 'Gerakan' | 'History' | 'Org' | 'Eskalasi' | 'Admin'
type Tab = NavTab | 'Profil'

const RAIL_GAP = 16
const RAIL_W = 72
const FLOAT_GAP = 12
const DRAWER_W = 392
const JELAJAH_TABS: readonly ListTab[] = ['Satelit', 'Utama']
const AKSI_TABS: readonly ListTab[] = ['Berjalan', 'Verifikasi', 'Selesai']
const QuickReportFlow = lazy(() => import('../../modules/reports/QuickReportFlow'))
const COMPANION_SEEN_KEY = 'blam:companion:seen'
const COMPANION_BOTTOM = 112

function buildSelectedPointContext(
  ev: ConservationEvent | null,
  signal: SatelliteSignal | null,
): BlamSelectedPointContext | undefined {
  if (signal) {
    return {
      kind: 'signal',
      id: signal.id,
      title: signal.title,
      ecosystem: signal.ecosystem,
      category: signal.categoryLabel,
      severity: signal.severity,
      source: signal.source,
      signalKind: signal.kind ?? 'suspected',
      reason: signal.reason,
      date: signal.date,
      pointCount: signal.pointCount,
      totalFrp: signal.totalFrp,
      radiusKm: signal.radiusKm,
      confidence: signal.confidence,
      dischargeM3s: signal.dischargeM3s,
      dischargeRatio: signal.dischargeRatio,
      rainMm: signal.rainMm,
      verificationState: signal.verificationState,
      verifiedBy: signal.verifiedInfo?.verified_by_name,
      verifiedOrg: signal.verifiedInfo?.verified_org_name ?? undefined,
      linkedEventId: signal.linkedEventId,
    }
  }
  if (ev) {
    return {
      kind: 'event',
      id: ev.id,
      title: ev.title,
      locationName: ev.location_name,
      ecosystem: ev.ecosystem,
      category: ev.category,
      status: ev.status,
      severity: ev.report?.ai_severity,
      description: ev.description,
      organizationName: ev.organization?.name,
      participantsCount: ev.event_participants?.length ?? 0,
      maxParticipants: ev.max_participants,
      actionsCount: ev.event_actions?.length ?? 0,
      reportSummary: ev.report?.ai_site_brief ?? undefined,
    }
  }
  return undefined
}

function readFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function writeFlag(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, '1')
    else window.localStorage.removeItem(key)
  } catch {
    // abaikan
  }
}

function RailItem({
  label,
  active,
  badge,
  onClick,
  children,
}: {
  label: string
  active: boolean
  badge?: number
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="group flex w-full flex-col items-center gap-1 py-1.5"
    >
      <span
        className={`relative grid h-10 w-12 place-items-center rounded-xl transition-colors ${
          active
            ? 'bg-[#f4f5f7] text-ink'
            : 'text-ink-soft group-hover:bg-[#f4f5f7] group-hover:text-ink'
        }`}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="num absolute -top-1 -right-0.5 grid min-w-5 place-items-center rounded-full border-2 border-white bg-[#2563eb] px-1 text-[10px] leading-4 text-white">
            {badge}
          </span>
        )}
      </span>
      <span className={`text-[11px] ${active ? 'font-medium text-ink' : 'font-light text-ink-soft'}`}>
        {label}
      </span>
    </button>
  )
}

function LayerChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`font-display relative flex h-9 items-center gap-2 rounded-xl px-3.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-ink text-white shadow-xs'
          : 'bg-[#f4f5f7] text-ink hover:bg-[#eaecf0]'
      }`}
    >
      {!active && <DashedOutline rx={11} />}
      {children}
    </button>
  )
}

export default function DesktopShell({ radar }: { radar: Radar }) {
  const { profile, notifications, openAuthModal } = useAuth()
  const [tab, setTab] = useState<Tab>('Gerakan')
  const [view, setView] = useState<'list' | 'detail'>(() => (radar.deepLinkedId ? 'detail' : 'list'))
  const [drawerOpen, setDrawerOpen] = useState(() => Boolean(radar.deepLinkedId))
  const [filterOpen, setFilterOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [layers, setLayers] = useState<Set<RadarLayer>>(() => new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [draftReport, setDraftReport] = useState<CitizenReport | null>(null)
  const [draftSignal, setDraftSignal] = useState<SatelliteSignal | null>(null)
  const rightMenuRef = useRef<HTMLDivElement>(null)
  const switchTimerRef = useRef<number | null>(null)
  const logoRef = useRef<HTMLButtonElement>(null)
  const companionBoundsRef = useRef<HTMLDivElement>(null)
  const [companionOut, setCompanionOut] = useState(false)
  const [companionSeen, setCompanionSeen] = useState(() => readFlag(COMPANION_SEEN_KEY))
  const [chatOpen, setChatOpen] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [replyPulse, setReplyPulse] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportPrefill, setReportPrefill] = useState<BlamSnapPrefill | undefined>(undefined)
  const [pointSuggestion, setPointSuggestion] = useState<BlamPointPromptSuggestion | null>(null)
  const pointSuggestionSeqRef = useRef(0)
  const [greetHour] = useState(() => new Date().getHours())
  const [viewportW, setViewportW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440))

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggleCompanion = () => {
    const next = !companionOut
    setCompanionOut(next)
    if (!next) setChatOpen(false)
    if (!companionSeen) {
      setCompanionSeen(true)
      writeFlag(COMPANION_SEEN_KEY, true)
    }
  }

  const clearSwitchTimer = () => {
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current)
      switchTimerRef.current = null
    }
  }

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      clearSwitchTimer()
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const initials = profile?.full_name ? profile.full_name.slice(0, 1).toUpperCase() : null
  const selected = radar.selected
  const edge = RAIL_GAP + RAIL_W + (drawerOpen ? FLOAT_GAP + DRAWER_W : 0)
  const chatLeft = drawerOpen
    ? RAIL_GAP + RAIL_W + FLOAT_GAP + DRAWER_W + FLOAT_GAP
    : RAIL_GAP + RAIL_W + FLOAT_GAP
  const rawCompanionLeft = (chatOpen ? chatLeft + DRAWER_W : edge) - 4
  const companionLeft = Math.min(rawCompanionLeft, Math.max(RAIL_GAP + RAIL_W - 4, viewportW - 152))
  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )
  const openCount = radar.events.filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled').length
  const isRadarMode = drawerOpen && tab === 'Jelajah' && view === 'list' && !radar.selectedId && !radar.selectedSignal

  useEffect(() => {
    if (!filterOpen && !notifOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!rightMenuRef.current?.contains(target)) {
        setFilterOpen(false)
        setNotifOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFilterOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [filterOpen, notifOpen])

  const navTabs = useMemo<NavTab[]>(() => {
    const base: NavTab[] = ['Jelajah', 'Gerakan', 'History', 'Org']
    if (profile?.role === 'agency') base.push('Eskalasi')
    if (profile?.role === 'admin') base.push('Admin')
    return base
  }, [profile?.role])

  const { visibleEvents, visibleHazards, visibleSignals } = useMemo(
    () => filterRadarItems(radar.events, radar.hazards, radar.satelliteSignals, layers),
    [radar.events, radar.hazards, radar.satelliteSignals, layers],
  )

  const blamChatContext = useMemo<BlamChatContext>(
    () => ({
      userName: profile?.full_name,
      userRole: profile ? ROLE_LABEL[profile.role] : 'Warga',
      mapStyle: radar.style,
      selectedTitle: selected?.title ?? radar.selectedSignal?.title,
      selectedLocation: selected?.location_name,
      selectedPoint: buildSelectedPointContext(selected, radar.selectedSignal),
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

  const companionTips = useMemo(() => {
    const firstName = profile?.full_name?.split(' ')[0]
    const hour = greetHour
    const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'
    const tips = [`${greet}${firstName ? `, ${firstName}` : ''}! Aku Gajah Blam 🐘`]
    if (openCount > 0) tips.push(`Ada ${openCount} aksi berjalan. Mau aku rangkumin? 🌱`)
    if (radar.satelliteSignals.length > 0) tips.push(`${radar.satelliteSignals.length} sinyal satelit terpantau. Tanya aku detailnya!`)
    tips.push('Klik aku buat ngobrol, seret aku buat pindah! ✨')
    tips.push('Nemu sampah atau kerusakan alam? Bilang aku, nanti kubantu lapor 📸')
    return tips
  }, [profile?.full_name, openCount, radar.satelliteSignals.length, greetHour])

  const handleChatAction = (action: BlamChatAction) => {
    if (action.type === 'open_blam_snap') {
      setReportPrefill(action.prefill)
      setChatOpen(false)
      setReportOpen(true)
      return
    }
    if (action.type === 'focus_map_point') {
      const { lat, lng, eventId } = action.target
      setChatOpen(false)
      if (eventId && radar.allEvents.some((ev) => ev.id === eventId)) {
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
      radar.focusLocation(lat, lng, 9.5)
    }
  }

  const resetToIndonesia = () => {
    clearSwitchTimer()
    setCreateOpen(false)
    setDraftReport(null)
    setDraftSignal(null)
    radar.setSelectedSignal(null)
    radar.setSelectedId(null)
    setPointSuggestion(null)
    radar.setFilter('all')
    setLayers(new Set())
    setQuery('')
    setTab('Jelajah')
    setView('list')
    setDrawerOpen(true)
    radar.fitIndonesia()
  }

  const applyTab = (next: Tab) => {
    setCreateOpen(false)
    setDraftReport(null)
    setDraftSignal(null)
    if (next === 'Jelajah') {
      radar.setSelectedSignal(null)
      radar.setSelectedId(null)
      setView('list')
      setTab('Jelajah')
      setDrawerOpen(true)
      radar.fitIndonesia()
      return
    }
    if (next === 'Gerakan') {
      radar.setSelectedSignal(null)
      setView('list')
    }
    setTab(next)
    setDrawerOpen(true)
  }

  const openTab = (next: Tab) => {
    clearSwitchTimer()
    if (next === tab && drawerOpen && createOpen) {
      setCreateOpen(false)
      setDraftReport(null)
      setDraftSignal(null)
      return
    }
    if (next === tab && drawerOpen && !(next === 'Jelajah' && view === 'detail')) {
      setDrawerOpen(false)
      return
    }
    if (!drawerOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyTab(next)
      return
    }
    setDrawerOpen(false)
    switchTimerRef.current = window.setTimeout(() => {
      switchTimerRef.current = null
      applyTab(next)
    }, 250)
  }

  const openDetail = (id: string, fromMap = false) => {
    clearSwitchTimer()
    setCreateOpen(false)
    radar.setSelectedId(id)
    setTab((prev) => (prev === 'Jelajah' ? 'Jelajah' : 'Gerakan'))
    setView('detail')
    setDrawerOpen(true)

    if (fromMap && chatOpen) {
      const ev = radar.allEvents.find((item) => item.id === id) ?? null
      if (ev) {
        const pointCtx = buildSelectedPointContext(ev, null)
        setPointSuggestion({
          key: ++pointSuggestionSeqRef.current,
          title: ev.title,
          prompts: [
            `Jelaskan detail "${ev.title}"`,
            'Apa tindak lanjut & cara gabungnya?',
          ],
          context: {
            ...blamChatContext,
            selectedTitle: ev.title,
            selectedLocation: ev.location_name,
            selectedPoint: pointCtx,
          },
        })
      }
    }
  }

  const openSignalDetail = (signal: SatelliteSignal, fromMap = false) => {
    clearSwitchTimer()
    setCreateOpen(false)
    radar.setSelectedSignal(signal)
    setTab('Jelajah')
    setView('detail')
    setDrawerOpen(true)

    if (fromMap && chatOpen) {
      const pointCtx = buildSelectedPointContext(null, signal)
      setPointSuggestion({
        key: ++pointSuggestionSeqRef.current,
        title: signal.title,
        prompts: [
          `Jelaskan sinyal "${signal.title}"`,
          'Seberapa serius & apa tindak lanjutnya?',
        ],
        context: {
          ...blamChatContext,
          selectedTitle: signal.title,
          selectedLocation: undefined,
          selectedPoint: pointCtx,
        },
      })
    }
  }

  const startCreateEvent = (report: CitizenReport | null = null, signal: SatelliteSignal | null = null) => {
    clearSwitchTimer()
    setDraftReport(report)
    setDraftSignal(signal)
    setCreateOpen(true)
    setDrawerOpen(true)
  }

  const toggleLayer = (layer: RadarLayer) =>
    setLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })

  const onSearch = (value: string) => {
    clearSwitchTimer()
    setCreateOpen(false)
    setQuery(value)
    setTab((prev) => (prev === 'Jelajah' || prev === 'Gerakan' ? prev : 'Gerakan'))
    setView('list')
    setDrawerOpen(true)
  }

  const renderRailIcon = (label: NavTab) => {
    switch (label) {
      case 'Jelajah':
        return <RadarCompassIcon className="relative z-10 size-6" />
      case 'Gerakan':
        return <AksiActionIcon className="relative z-10 size-6" />
      case 'History':
        return <HistoryDuotoneIcon className="relative z-10 size-6" />
      case 'Org':
        return <OrgDuotoneIcon className="relative z-10 size-6" />
      case 'Eskalasi':
        return <EscalateDuotoneIcon className="relative z-10 size-6" />
      case 'Admin':
        return <AdminDuotoneIcon className="relative z-10 size-6" />
    }
  }

  const radarOrAksiBody = (mode: 'Jelajah' | 'Gerakan') => {
    if (radar.state === 'error') {
      return (
        <div className="grid h-full place-items-center px-5 text-center">
          <div>
            <p className="font-display text-base font-bold text-ink-soft">Gagal memuat data</p>
            <p className="mt-1 text-xs text-ink-soft">{radar.errorMessage}</p>
            <button type="button" onClick={() => void radar.refresh()} className="btn-primary mt-4 h-10 px-5 text-xs">
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }

    if (view === 'detail' && radar.selectedSignal) {
      const sig = radar.selectedSignal
      const linkedEvent =
        radar.allEvents.find(
          (ev) =>
            ev.id === sig.linkedEventId ||
            (ev.ref_source === sig.source &&
              Boolean(
                ev.ref_external_id &&
                  (ev.ref_external_id === sig.externalId || sig.memberIds?.includes(ev.ref_external_id)),
              )),
        ) ?? null
      return (
        <>
          <header className="flex h-16 shrink-0 items-center gap-3 px-5">
            <button
              type="button"
              onClick={() => {
                radar.setSelectedSignal(null)
                setView('list')
                if (mode === 'Jelajah') radar.fitIndonesia()
              }}
              aria-label="Kembali ke daftar"
              className="grid size-10 place-items-center rounded-full border border-leaf/15 bg-canvas text-forest transition-colors hover:bg-mint/40"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="font-display text-sm font-semibold text-ink-soft">Kembali ke {mode}</span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            <SatelliteSignalDetail
              key={sig.id}
              signal={sig}
              linkedEvent={linkedEvent}
              onOpenEvent={openDetail}
              onCreateEvent={(s) => startCreateEvent(null, s)}
              onModerated={async () => {
                radar.setSelectedSignal(null)
                setView('list')
                if (mode === 'Jelajah') radar.fitIndonesia()
                await radar.refreshLayers()
              }}
            />
          </div>
        </>
      )
    }

    if (view === 'detail' && selected) {
      return (
        <>
          <header className="flex h-16 shrink-0 items-center gap-3 px-5">
            <button
              type="button"
              onClick={() => {
                radar.setSelectedId(null)
                setView('list')
                if (mode === 'Jelajah') radar.fitIndonesia()
              }}
              aria-label="Kembali ke daftar"
              className="grid size-10 place-items-center rounded-full border border-leaf/15 bg-canvas text-forest transition-colors hover:bg-mint/40"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="font-display text-sm font-semibold text-ink-soft">Kembali ke {mode}</span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
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
          </div>
        </>
      )
    }

    const isJelajah = mode === 'Jelajah'
    const countText = isJelajah
      ? radar.layersLoading && visibleHazards.length === 0
        ? 'Memuat sinyal…'
        : `${visibleHazards.length} sinyal`
      : radar.state === 'loading'
        ? 'Memuat…'
        : `${visibleEvents.length} event`

    return (
      <>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{mode}</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mint/55 px-2.5 py-1 text-xs font-normal text-forest">
              {countText}
            </span>
            {canOrganize && (
              <button
                type="button"
                onClick={() => startCreateEvent(null)}
                className="btn-primary h-8 px-3 text-xs"
              >
                <Plus className="size-3.5" /> Event
              </button>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
          <EventListPanel
            key={mode}
            events={visibleEvents}
            impactEvents={radar.events}
            signals={isJelajah ? visibleSignals : []}
            query={query}
            onQueryChange={setQuery}
            showSearch={false}
            showTitle={false}
            tabs={isJelajah ? JELAJAH_TABS : AKSI_TABS}
            initialTab={isJelajah ? 'Satelit' : 'Berjalan'}
            title={mode}
            onOpen={openDetail}
            onOpenSignal={isJelajah ? openSignalDetail : undefined}
            renderTabContent={
              !isJelajah
                ? (subTab) => {
                    if (subTab !== 'Verifikasi') return null
                    if (!canOrganize) {
                      return (
                        <div className="relative rounded-[14px] bg-[#f4f5f7] p-5 text-center">
                          <DashedOutline rx={13} />
                          <p className="font-display text-sm font-bold text-ink">Khusus Verifikator Terdaftar</p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                            {!profile
                              ? 'Masuk sebagai relawan, instansi, atau admin terverifikasi untuk mengecek dan memverifikasi status titik laporan.'
                              : 'Status titik laporan hanya dapat diverifikasi oleh relawan, instansi, atau admin terverifikasi.'}
                          </p>
                          {!profile && (
                            <button
                              type="button"
                              onClick={openAuthModal}
                              className="btn-primary mt-3 h-9 px-4 text-xs"
                            >
                              Masuk
                            </button>
                          )}
                        </div>
                      )
                    }
                    return (
                      <VerificationRadarPanel
                        embedded
                        query={query}
                        onCreateEvent={(report) => startCreateEvent(report)}
                        onCreateStandaloneEvent={() => startCreateEvent(null)}
                      />
                    )
                  }
                : undefined
            }
          />
        </div>
      </>
    )
  }

  const isDarkMap = radar.style === 'satelit' || radar.style === 'gelap'

  return (
    <div data-map-style={radar.style} className="relative h-full w-full overflow-clip bg-canvas">
      <div className="absolute inset-0">
        <MapView
          events={visibleEvents}
          hazards={visibleHazards}
          selectedId={radar.selectedId}
          selectedSignal={radar.selectedSignal}
          activeRoute={radar.activeRoute}
          onSelect={(id) => openDetail(id, true)}
          onSelectSignal={(sig) => openSignalDetail(sig, true)}
          style={radar.style}
          padding={{ bottom: 0, right: 0, left: edge }}
          fitAllSignal={radar.fitAllSignal}
          fitIndonesiaSignal={radar.fitIndonesiaSignal}
          locateSignal={radar.locateSignal}
          radarMode={isRadarMode}
          zoomCommand={radar.zoomCommand}
          focusTarget={radar.focusTarget}
          globeInsetLeft={drawerOpen ? edge : 0}
        />
      </div>

      <nav
        aria-label="Utama"
        style={{ left: RAIL_GAP, width: RAIL_W }}
        className="absolute top-4 bottom-4 z-[700] flex flex-col items-center rounded-[20px] border border-white/80 bg-white/95 py-4 shadow-[0_14px_38px_-6px_rgba(19,36,26,0.22),0_4px_12px_rgba(19,36,26,0.08)] backdrop-blur-md"
      >
        <button
          ref={logoRef}
          type="button"
          onClick={toggleCompanion}
          aria-label={companionOut ? 'Pulangkan Gajah Blam ke logo' : 'Panggil Gajah Blam (asisten AI)'}
          aria-pressed={companionOut}
          title={companionOut ? 'Pulangkan Gajah Blam' : 'Panggil Gajah Blam — asisten AI'}
          className="group relative mb-3 grid size-13 shrink-0 place-items-center rounded-full transition-transform duration-120 hover:scale-105 active:scale-95"
        >
          <span aria-hidden="true" className="orb-sheen z-20 scale-110" />
          <BlamNatureIcon
            elephantAway={companionOut}
            interactive={!companionOut}
            className="relative z-10 size-full scale-115 drop-shadow-[0_2px_6px_rgba(11,27,77,0.22)] transition-transform duration-300 group-hover:-rotate-6"
          />
          {!companionSeen && !companionOut && (
            <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 z-30 flex size-3.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf/60" />
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-white bg-leaf" />
            </span>
          )}
        </button>

        <div className="flex w-full flex-1 flex-col overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navTabs.map((label) => {
            const active = tab === label && drawerOpen
            return (
              <RailItem
                key={label}
                label={label}
                active={active}
                badge={label === 'Gerakan' ? openCount : undefined}
                onClick={() => openTab(label)}
              >
                {renderRailIcon(label)}
              </RailItem>
            )
          })}
        </div>

        <div className="w-full px-1 pt-2">
          <RailItem
            label={profile ? 'Profil' : 'Masuk'}
            active={tab === 'Profil' && drawerOpen}
            onClick={() => openTab('Profil')}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                referrerPolicy="no-referrer"
                className="size-6 rounded-full object-cover"
              />
            ) : initials ? (
              <span className="font-display text-sm font-bold text-forest">{initials}</span>
            ) : (
              <GuestAvatarIcon />
            )}
          </RailItem>
        </div>
      </nav>

      <MotionConfig reducedMotion="user">
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={
            drawerOpen
              ? { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 34px)' }
              : { opacity: 0, clipPath: 'inset(0% 84% 0% 0% round 34px)' }
          }
          transition={
            drawerOpen
              ? { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.24, ease: [0.4, 0, 0.2, 1] }
          }
          style={{
            left: RAIL_GAP - 6,
            width: RAIL_W + FLOAT_GAP + DRAWER_W + 12,
          }}
          className={`pointer-events-none absolute top-[10px] bottom-[10px] z-[590] rounded-[34px] backdrop-blur-xl ${
            isDarkMap
              ? 'border border-white/40 bg-gradient-to-br from-[#dff6e6]/34 via-[#c9ead3]/24 to-[#b4dec1]/20 shadow-[0_22px_50px_-10px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.48)]'
              : 'border border-leaf/25 bg-gradient-to-br from-[#e2f5e7]/84 via-[#d4eedb]/76 to-[#c4e6ce]/70 shadow-[0_22px_50px_-10px_rgba(19,36,26,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)]'
          }`}
        />

        <motion.aside
          aria-label="Panel"
          inert={!drawerOpen}
          aria-hidden={!drawerOpen}
          initial={false}
          animate={
            drawerOpen
              ? { opacity: 1, x: 0, scale: 1 }
              : { opacity: 0, x: -28, scale: 0.97 }
          }
          transition={
            drawerOpen
              ? { delay: 0.04, duration: 0.36, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
          }
          style={{ left: RAIL_GAP + RAIL_W + FLOAT_GAP, width: DRAWER_W, transformOrigin: 'left center' }}
          className={`absolute top-[70px] bottom-4 z-[600] flex flex-col overflow-hidden rounded-[20px] border border-white/80 shadow-[0_14px_38px_-6px_rgba(19,36,26,0.22),0_4px_12px_rgba(19,36,26,0.08)] backdrop-blur-md transition-colors duration-200 ${
            !createOpen && (tab === 'Jelajah' || tab === 'Gerakan') ? 'bg-white/96' : 'bg-canvas/96'
          } ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={createOpen ? 'create-event' : tab}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {createOpen ? (
                  <CreateEventForm
                    key={draftReport?.id ?? draftSignal?.id ?? 'standalone'}
                    initialReport={draftReport}
                    initialSignal={draftSignal}
                    onClose={() => {
                      setCreateOpen(false)
                      setDraftReport(null)
                      setDraftSignal(null)
                    }}
                    onCreated={async (id) => {
                      setCreateOpen(false)
                      setDraftReport(null)
                      setDraftSignal(null)
                      radar.setFilter('all')
                      await radar.refresh()
                      openDetail(id)
                    }}
                  />
                ) : (
                  <>
                    {(tab === 'Jelajah' || tab === 'Gerakan') && radarOrAksiBody(tab)}

                    {tab === 'History' && (
                  <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
                    <HistoryPanel
                      events={radar.allEvents}
                      signals={radar.satelliteSignals}
                      onSelectEvent={openDetail}
                      onOpenSignal={openSignalDetail}
                      onFocusLocation={(lat, lng) => radar.focusLocation(lat, lng)}
                    />
                  </div>
                )}

                {tab === 'Org' && (
                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <OrgsPanel />
                  </div>
                )}

                {tab === 'Eskalasi' && (
                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <AgencyInboxPanel
                      events={radar.allEvents}
                      onSelectEvent={openDetail}
                      onCreateEventFromReport={(report) => startCreateEvent(report)}
                      onRefresh={radar.refresh}
                    />
                  </div>
                )}

                {tab === 'Admin' && (
                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <AdminPanel events={radar.allEvents} onRefreshEvents={radar.refresh} />
                  </div>
                )}

                    {tab === 'Profil' && (
                      <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        <ProfilePanel />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      </MotionConfig>

      <button
        type="button"
        onClick={() => {
          clearSwitchTimer()
          const next = !drawerOpen
          setDrawerOpen(next)
          if (next && tab === 'Jelajah' && view === 'list') {
            radar.fitIndonesia()
          }
        }}
        aria-label={drawerOpen ? 'Sembunyikan panel' : 'Tampilkan panel'}
        style={{ left: edge + 14 }}
        className="orb-surface orb-surface-btn absolute top-1/2 z-[650] grid size-9 -translate-y-1/2 place-items-center text-forest transition-[left,transform] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        {drawerOpen ? <ChevronLeft className="size-4" strokeWidth={2.5} /> : <ChevronRight className="size-4" strokeWidth={2.5} />}
      </button>

      <div
        style={{ left: RAIL_GAP + RAIL_W + FLOAT_GAP, width: DRAWER_W }}
        className="pointer-events-none absolute top-4 z-[660]"
      >
        <label className="pointer-events-auto orb-surface flex h-11 w-full items-center gap-2.5 px-4">
          <SearchDuotoneIcon />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari lokasi"
            className="font-display min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-soft"
          />
          {query && (
            <button type="button" aria-label="Hapus" onClick={() => setQuery('')}>
              <X className="size-4 text-ink-soft hover:text-forest" />
            </button>
          )}
        </label>
      </div>

      <div ref={rightMenuRef} className="absolute top-4 right-4 z-[670] flex flex-col items-end gap-2.5">
        <Orb
          size={44}
          label={profile ? 'Profil' : 'Masuk'}
          onClick={() => {
            setNotifOpen(false)
            setFilterOpen(false)
            openTab('Profil')
          }}
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
          size={44}
          label="Notifikasi"
          onClick={() => {
            setFilterOpen(false)
            setNotifOpen((v) => !v)
          }}
          className="orb-primary relative"
        >
          <BellSolidIcon light />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-critical" />
          )}
        </Orb>
        <Orb
          size={44}
          label="Filter peta"
          onClick={() => {
            setNotifOpen(false)
            setFilterOpen((v) => !v)
          }}
          className={layers.size > 0 ? 'orb-primary relative' : 'relative'}
        >
          <FilterDuotoneIcon light={layers.size > 0} />
          {layers.size > 0 && (
            <span className="num absolute -top-1 -right-1 grid size-4.5 place-items-center rounded-full border-2 border-white bg-forest text-[10px] font-bold text-white">
              {layers.size}
            </span>
          )}
        </Orb>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              key="desktop-notif-popover"
              role="dialog"
              aria-label="Notifikasi"
              initial={{ opacity: 0, x: 10, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'top right' }}
              className="absolute top-0 right-14 flex w-[340px] flex-col rounded-[20px] bg-white p-5 shadow-[0_18px_42px_-6px_rgba(19,36,26,0.26)]"
            >
              <DashedOutline rx={19} />
              <NotificationsPanel
                compact
                onOpenEvent={openDetail}
                onAfterAction={() => setNotifOpen(false)}
              />
            </motion.div>
          )}

          {filterOpen && (
            <motion.div
              key="desktop-filter-popover"
              role="dialog"
              aria-label="Tampilan dan filter peta"
              initial={{ opacity: 0, x: 10, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'top right' }}
              className="absolute top-0 right-14 flex w-[356px] flex-col gap-3 rounded-[20px] bg-white p-5 shadow-[0_18px_42px_-6px_rgba(19,36,26,0.26)]"
            >
              <DashedOutline rx={19} />
              <div>
                <p className="mb-2 text-[11px] font-light tracking-wider text-ink-soft uppercase">
                  Gaya Peta
                </p>
                <MapStyleSwitcher value={radar.style} onChange={radar.setStyle} className="w-full [&>button]:flex-1" />
              </div>

              <div className="pt-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-light tracking-wider text-ink-soft uppercase">
                    Lapisan
                  </span>
                  {layers.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setLayers(new Set())}
                      className="text-xs font-normal text-leaf hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {LAYER_CHIPS.map((c) => {
                    const active = layers.has(c.layer)
                    return (
                      <LayerChip key={c.layer} active={active} onClick={() => toggleLayer(c.layer)}>
                        <span className={`size-2 rounded-full ${c.dot} ${active ? 'ring-1 ring-white/80' : ''}`} />
                        {c.label}
                      </LayerChip>
                    )
                  })}
                </div>
                <div className="mt-3 border-t border-dashed border-dash pt-2.5">
                  <MarkerTierLegend compact />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute right-4 bottom-10 z-[500] flex flex-col items-center gap-2.5">
        <div className="orb-surface overflow-hidden">
          <button
            type="button"
            aria-label="Perbesar"
            onClick={() => radar.zoom(1)}
            className="grid size-11 place-items-center text-forest transition-transform duration-120 hover:bg-mint/30 active:scale-95"
          >
            <Plus className="size-4.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Perkecil"
            onClick={() => radar.zoom(-1)}
            className="grid size-11 place-items-center border-t border-black/8 text-forest transition-transform duration-120 hover:bg-mint/30 active:scale-95"
          >
            <Minus className="size-4.5" strokeWidth={2.5} />
          </button>
        </div>
        <Orb size={48} label="Lokasi saya" onClick={radar.locate}>
          <LocateDuotoneIcon />
        </Orb>
      </div>

      {/* area batas seret Gajah Blam (sepanjang tepi kanan panel/chat/navbar) */}
      <div
        ref={companionBoundsRef}
        aria-hidden="true"
        style={{ left: companionLeft, width: 140, top: 96, bottom: 24 }}
        className="pointer-events-none absolute"
      />

      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {companionOut && (
            <BlamCompanion
              key="blam-companion"
              logoRef={logoRef}
              boundsRef={companionBoundsRef}
              left={companionLeft}
              bottom={COMPANION_BOTTOM}
              chatOpen={chatOpen}
              chatBusy={chatOpen && chatBusy}
              replyPulse={replyPulse}
              tips={companionTips}
              onOpenChat={() => setChatOpen(true)}
              onResetMap={resetToIndonesia}
              onDismiss={toggleCompanion}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {chatOpen && (
            <BlamChatModal
              key="blam-chat-companion"
              placement="companion"
              companionLeft={chatLeft}
              context={blamChatContext}
              pointSuggestion={pointSuggestion}
              onClose={() => setChatOpen(false)}
              onBusyChange={setChatBusy}
              onReply={() => setReplyPulse((n) => n + 1)}
              onAction={handleChatAction}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reportOpen && (
            <motion.div
              key="desktop-quick-report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] grid place-items-center bg-ink/35 p-6 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ y: 32, scale: 0.97, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 24, scale: 0.97, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative h-[min(780px,calc(100dvh-48px))] w-[440px] overflow-hidden rounded-[28px] border border-line bg-canvas shadow-[0_24px_60px_-12px_rgba(19,36,26,0.35)]"
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
                      openTab('Gerakan')
                    }}
                  />
                </Suspense>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  )
}
