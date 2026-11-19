import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DashedOutline, DashedRow, Orb } from '../ui/atoms'
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
import ProfilePanel from '../../modules/profile/ProfilePanel'
import VerificationRadarPanel from '../../modules/reports/VerificationRadarPanel'
import type { CitizenReport, SatelliteSignal } from '../../types'
import EventListPanel from './EventListPanel'
import type { ListTab } from './EventListPanel'

type NavTab = 'Jelajah' | 'Aksi' | 'History' | 'Org' | 'Eskalasi' | 'Admin'
type Tab = NavTab | 'Profil'

const RAIL_GAP = 16
const RAIL_W = 72
const FLOAT_GAP = 12
const DRAWER_W = 392
const JELAJAH_TABS: readonly ListTab[] = ['Satelit', 'Utama']
const AKSI_TABS: readonly ListTab[] = ['Berjalan', 'Verifikasi', 'Selesai']

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
        className={`relative grid h-10 w-12 place-items-center rounded-full transition-colors ${
          active
            ? 'border-[1.5px] border-dashed border-leaf/35 bg-mint/75 text-forest'
            : 'text-ink-soft group-hover:bg-canvas group-hover:text-forest'
        }`}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="num absolute -top-1 -right-0.5 grid min-w-5 place-items-center rounded-full border-2 border-white bg-leaf px-1 text-[10px] leading-4 text-white">
            {badge}
          </span>
        )}
      </span>
      <span className={`font-display text-[11px] font-semibold ${active ? 'text-forest' : 'text-ink-soft'}`}>
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
      className={`font-display relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-leaf text-white shadow-[0_2px_8px_rgba(29,92,58,0.2)]'
          : 'bg-[#f7faf6] text-ink hover:bg-mint/40'
      }`}
    >
      {!active && <DashedOutline rx={17} />}
      {children}
    </button>
  )
}

export default function DesktopShell({ radar }: { radar: Radar }) {
  const { profile, notifications, openAuthModal, readNotification } = useAuth()
  const [tab, setTab] = useState<Tab>('Aksi')
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
  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )
  const openCount = radar.events.filter((ev) => ev.status !== 'resolved' && ev.status !== 'cancelled').length
  const isRadarMode = drawerOpen && ((tab === 'Jelajah' && view === 'list') || Boolean(radar.selectedSignal))

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
    const base: NavTab[] = ['Jelajah', 'Aksi', 'History', 'Org']
    if (profile?.role === 'agency') base.push('Eskalasi')
    if (profile?.role === 'admin') base.push('Admin')
    return base
  }, [profile?.role])

  const { visibleEvents, visibleHazards, visibleSignals } = useMemo(
    () => filterRadarItems(radar.events, radar.hazards, radar.satelliteSignals, layers),
    [radar.events, radar.hazards, radar.satelliteSignals, layers],
  )

  const resetToIndonesia = () => {
    clearSwitchTimer()
    setCreateOpen(false)
    setDraftReport(null)
    setDraftSignal(null)
    radar.setSelectedSignal(null)
    radar.setSelectedId(null)
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
    if (next === 'Aksi') {
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

  const openDetail = (id: string) => {
    clearSwitchTimer()
    setCreateOpen(false)
    radar.setSelectedId(id)
    setTab((prev) => (prev === 'Jelajah' ? 'Jelajah' : 'Aksi'))
    setView('detail')
    setDrawerOpen(true)
  }

  const openSignalDetail = (signal: SatelliteSignal) => {
    clearSwitchTimer()
    setCreateOpen(false)
    radar.setSelectedSignal(signal)
    setTab('Jelajah')
    setView('detail')
    setDrawerOpen(true)
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
    setTab((prev) => (prev === 'Jelajah' || prev === 'Aksi' ? prev : 'Aksi'))
    setView('list')
    setDrawerOpen(true)
  }

  const renderRailIcon = (label: NavTab) => {
    switch (label) {
      case 'Jelajah':
        return <RadarCompassIcon className="relative z-10 size-6" />
      case 'Aksi':
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

  const radarOrAksiBody = (mode: 'Jelajah' | 'Aksi') => {
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
        radar.allEvents.find((ev) => ev.ref_source === sig.source && ev.ref_external_id === sig.externalId) ?? null
      return (
        <>
          <header className="flex h-16 shrink-0 items-center gap-3 px-5">
            <button
              type="button"
              onClick={() => {
                radar.setSelectedSignal(null)
                setView('list')
              }}
              aria-label="Kembali ke daftar"
              className="grid size-10 place-items-center rounded-full border-[1.5px] border-dashed border-leaf/30 bg-canvas text-forest transition-colors hover:bg-mint/40"
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
              }}
              aria-label="Kembali ke daftar"
              className="grid size-10 place-items-center rounded-full border-[1.5px] border-dashed border-leaf/30 bg-canvas text-forest transition-colors hover:bg-mint/40"
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
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">{mode}</h2>
          <div className="flex items-center gap-2">
            <span className="font-display rounded-full bg-mint/55 px-2.5 py-1 text-xs font-semibold text-forest">
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
                        <div className="relative rounded-[20px] bg-[#f7faf6] p-5 text-center">
                          <DashedOutline rx={19} />
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
          onSelect={openDetail}
          onSelectSignal={openSignalDetail}
          style={radar.style}
          padding={{ bottom: 0, right: 0, left: edge }}
          fitAllSignal={radar.fitAllSignal}
          fitIndonesiaSignal={radar.fitIndonesiaSignal}
          locateSignal={radar.locateSignal}
          radarMode={isRadarMode}
          zoomCommand={radar.zoomCommand}
          focusTarget={radar.focusTarget}
        />
      </div>

      <nav
        aria-label="Utama"
        style={{ left: RAIL_GAP, width: RAIL_W }}
        className="absolute top-4 bottom-4 z-[700] flex flex-col items-center rounded-[28px] border border-white/80 bg-white/95 py-4 shadow-[0_14px_38px_-6px_rgba(19,36,26,0.22),0_4px_12px_rgba(19,36,26,0.08)] backdrop-blur-md"
      >
        <button
          type="button"
          onClick={resetToIndonesia}
          aria-label="Blam — Reset ke Indonesia"
          title="Reset ke tampilan Indonesia"
          className="mb-3 grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3fb473] to-[#1d5c3a] shadow-[0_3px_10px_rgba(29,92,58,0.22)] transition-transform duration-120 active:scale-95"
        >
          <BlamNatureIcon className="size-7" />
        </button>

        <div className="flex w-full flex-1 flex-col overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navTabs.map((label) => {
            const active = tab === label && drawerOpen
            return (
              <RailItem
                key={label}
                label={label}
                active={active}
                badge={label === 'Aksi' ? openCount : undefined}
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
          className={`absolute top-[70px] bottom-4 z-[600] flex flex-col overflow-hidden rounded-[28px] border border-white/80 shadow-[0_14px_38px_-6px_rgba(19,36,26,0.22),0_4px_12px_rgba(19,36,26,0.08)] backdrop-blur-md transition-colors duration-200 ${
            !createOpen && (tab === 'Jelajah' || tab === 'Aksi') ? 'bg-white/96' : 'bg-canvas/96'
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
                    {(tab === 'Jelajah' || tab === 'Aksi') && radarOrAksiBody(tab)}

                    {tab === 'History' && (
                  <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
                    <HistoryPanel
                      events={radar.allEvents}
                      onSelectEvent={openDetail}
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
              className="absolute top-0 right-14 flex w-[340px] flex-col rounded-[28px] bg-white p-5 shadow-[0_18px_42px_-6px_rgba(19,36,26,0.26)]"
            >
              <DashedOutline rx={27} />
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="font-display rounded-full bg-mint/70 px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                    {unreadCount} baru
                  </span>
                )}
              </div>

              {!profile ? (
                <div className="py-3 text-center">
                  <p className="text-xs font-semibold text-ink-soft">Masuk untuk melihat notifikasi aksi &amp; verifikasi.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false)
                      openAuthModal()
                    }}
                    className="btn-primary mt-3 h-9 px-4 text-xs"
                  >
                    Masuk
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <p className="py-6 text-center text-xs font-semibold text-ink-soft">Belum ada notifikasi</p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <DashedRow key={n.id} className="py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.is_read) void readNotification(n.id)
                          if (n.event_id) {
                            setNotifOpen(false)
                            openDetail(n.event_id)
                          }
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-mint/25"
                      >
                        <span
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? 'bg-line' : 'bg-critical'}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-display block text-[13px] font-semibold text-ink">{n.title}</span>
                          {n.detail && <span className="mt-0.5 block text-xs text-ink-soft">{n.detail}</span>}
                        </span>
                      </button>
                    </DashedRow>
                  ))}
                </div>
              )}
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
              className="absolute top-0 right-14 flex w-[356px] flex-col gap-3 rounded-[28px] bg-white p-5 shadow-[0_18px_42px_-6px_rgba(19,36,26,0.26)]"
            >
              <DashedOutline rx={27} />
              <div>
                <p className="font-display mb-2 text-xs font-semibold tracking-wider text-ink-soft uppercase">
                  Gaya Peta
                </p>
                <MapStyleSwitcher value={radar.style} onChange={radar.setStyle} className="w-full [&>button]:flex-1" />
              </div>

              <div className="border-t-[1.5px] border-dashed border-dash pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-xs font-semibold tracking-wider text-ink-soft uppercase">
                    Lapisan
                  </span>
                  {layers.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setLayers(new Set())}
                      className="font-display text-xs font-semibold text-leaf hover:underline"
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
    </div>
  )
}
