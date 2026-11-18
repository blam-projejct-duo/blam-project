import {
  Bell,
  Building2,
  CalendarPlus,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Leaf,
  LocateFixed,
  Minus,
  Plus,
  Radar as RadarIcon,
  Search,
  Shield,
  ShieldCheck,
  Sprout,
  User,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Orb } from '../ui/atoms'
import AdminPanel from '../../modules/admin/AdminPanel'
import AgencyInboxPanel from '../../modules/agency/AgencyInboxPanel'
import { useAuth } from '../../modules/auth/AuthContext'
import CreateEventForm from '../../modules/events/CreateEventForm'
import EventDetail from '../../modules/events/EventDetail'
import SatelliteSignalDetail from '../../modules/events/SatelliteSignalDetail'
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

type NavTab = 'Radar' | 'Dampak' | 'Org' | 'Verifikasi' | 'Event' | 'Eskalasi' | 'Admin'
type Tab = NavTab | 'Profil'

const RAIL_W = 72
const DRAWER_W = 392

const NAV_ICON: Record<NavTab, ReactNode> = {
  Radar: <RadarIcon className="size-5" strokeWidth={2.25} />,
  Dampak: <Sprout className="size-5" strokeWidth={2.25} />,
  Org: <Building2 className="size-5" strokeWidth={2.25} />,
  Verifikasi: <CheckSquare className="size-5" strokeWidth={2.25} />,
  Event: <CalendarPlus className="size-5" strokeWidth={2.25} />,
  Eskalasi: <Shield className="size-5" strokeWidth={2.25} />,
  Admin: <ShieldCheck className="size-5" strokeWidth={2.25} />,
}

function RailItem({
  label,
  active,
  primary = false,
  onClick,
  children,
}: {
  label: string
  active: boolean
  primary?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const tone = primary
    ? 'bg-cobalt text-white'
    : active
      ? 'bg-canvas text-ink'
      : 'text-ink-soft group-hover:bg-canvas'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="group flex w-full flex-col items-center gap-1 py-1.5"
    >
      <span className={`grid h-9 w-12 place-items-center rounded-full transition-colors ${tone}`}>{children}</span>
      <span className={`text-[11px] font-bold ${active ? 'text-ink' : 'text-ink-soft'}`}>{label}</span>
    </button>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-canvas'
        }`}
    >
      {children}
    </button>
  )
}

export default function DesktopShell({ radar }: { radar: Radar }) {
  const { profile, notifications } = useAuth()
  const [tab, setTab] = useState<Tab>('Radar')
  const [view, setView] = useState<'list' | 'detail'>(() => (radar.deepLinkedId ? 'detail' : 'list'))
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [layers, setLayers] = useState<Set<RadarLayer>>(() => new Set())
  const [draftReport, setDraftReport] = useState<CitizenReport | null>(null)
  const [draftSignal, setDraftSignal] = useState<SatelliteSignal | null>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const initials = profile?.full_name ? profile.full_name.slice(0, 1).toUpperCase() : null
  const selected = radar.selected
  const edge = RAIL_W + (drawerOpen ? DRAWER_W : 0)
  const canOrganize = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )

  const navTabs = useMemo<NavTab[]>(() => {
    const base: NavTab[] = ['Radar', 'Dampak', 'Org']
    if (canOrganize) base.push('Verifikasi', 'Event')
    if (profile?.role === 'agency') base.push('Eskalasi')
    if (profile?.role === 'admin') base.push('Admin')
    return base
  }, [canOrganize, profile?.role])

  const { visibleEvents, visibleHazards, visibleSignals } = useMemo(
    () => filterRadarItems(radar.events, radar.hazards, radar.satelliteSignals, layers),
    [radar.events, radar.hazards, radar.satelliteSignals, layers],
  )

  const impactStats = useMemo(() => {
    let wasteKg = 0
    let trees = 0
    let resolved = 0
    for (const ev of radar.allEvents) {
      if (ev.status === 'resolved') resolved += 1
      for (const a of ev.event_actions ?? []) {
        wasteKg += Number(a.waste_kg) || 0
        trees += a.trees_planted || 0
      }
    }
    return { total: radar.allEvents.length, resolved, wasteKg, trees }
  }, [radar.allEvents])

  const openTab = (next: Tab) => {
    if (next === tab && drawerOpen) {
      setDrawerOpen(false)
      return
    }
    if (next === 'Event') {
      setDraftReport(null)
      setDraftSignal(null)
    }
    setTab(next)
    setDrawerOpen(true)
  }

  const openDetail = (id: string) => {
    radar.setSelectedId(id)
    setTab('Radar')
    setView('detail')
    setDrawerOpen(true)
  }

  const openSignalDetail = (signal: SatelliteSignal) => {
    radar.setSelectedSignal(signal)
    setTab('Radar')
    setView('detail')
    setDrawerOpen(true)
  }

  const startCreateEvent = (report: CitizenReport | null = null, signal: SatelliteSignal | null = null) => {
    setDraftReport(report)
    setDraftSignal(signal)
    setTab('Event')
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
    setQuery(value)
    setTab('Radar')
    setView('list')
    setDrawerOpen(true)
  }

  const radarBody = () => {
    if (radar.state === 'error') {
      return (
        <div className="grid h-full place-items-center px-5 text-center">
          <div>
            <p className="text-base font-extrabold text-ink-soft">Gagal memuat data</p>
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
              className="grid size-10 place-items-center rounded-full border border-line bg-canvas text-ink hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
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
              className="grid size-10 place-items-center rounded-full border border-line bg-canvas text-ink hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
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

    return (
      <>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Radar</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink-soft">
              {radar.state === 'loading' ? 'Memuat…' : `${visibleEvents.length + visibleHazards.length} titik`}
            </span>
            {canOrganize && (
              <button
                type="button"
                onClick={() => startCreateEvent(null)}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-cobalt px-3 text-xs font-bold text-white"
              >
                <Plus className="size-3.5" /> Event
              </button>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
          <EventListPanel
            events={visibleEvents}
            impactEvents={radar.events}
            signals={visibleSignals}
            query={query}
            onQueryChange={setQuery}
            ecosystemFilter={radar.filter}
            onEcosystemChange={radar.setFilter}
            showSearch={false}
            onOpen={openDetail}
            onOpenSignal={openSignalDetail}
          />
        </div>
      </>
    )
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-canvas">
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
          locateSignal={radar.locateSignal}
          zoomCommand={radar.zoomCommand}
        />
      </div>

      <nav
        aria-label="Utama"
        style={{ width: RAIL_W }}
        className="absolute inset-y-0 left-0 z-[700] flex flex-col items-center border-r border-line bg-white py-4"
      >
        <button
          type="button"
          onClick={() => {
            radar.setSelectedSignal(null)
            radar.setSelectedId(null)
            setTab('Radar')
            setView('list')
            setDrawerOpen(true)
            radar.fitAll()
          }}
          aria-label="Blam"
          className="mb-3 grid size-10 place-items-center text-emerald"
        >
          <Leaf className="size-6" strokeWidth={2.25} />
        </button>

        <div className="flex w-full flex-1 flex-col overflow-y-auto">
          {navTabs.map((label) => (
            <RailItem
              key={label}
              label={label}
              active={tab === label && drawerOpen}
              onClick={() => openTab(label)}
            >
              {NAV_ICON[label]}
            </RailItem>
          ))}
        </div>

        <RailItem
          label={profile ? 'Profil' : 'Masuk'}
          active={tab === 'Profil' && drawerOpen}
          onClick={() => openTab('Profil')}
        >
          <User className="size-5" strokeWidth={2.25} />
        </RailItem>
      </nav>

      <aside
        aria-label="Panel"
        inert={!drawerOpen}
        style={{ left: RAIL_W, width: DRAWER_W }}
        className={`absolute inset-y-0 z-[600] flex flex-col border-r border-line transition-transform duration-300 ease-[var(--ease-spring)] ${tab === 'Radar' ? 'bg-white' : 'bg-canvas'
          } ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {tab === 'Radar' && radarBody()}

        {tab === 'Event' && (
          <CreateEventForm
            key={draftReport?.id ?? draftSignal?.id ?? 'standalone'}
            initialReport={draftReport}
            initialSignal={draftSignal}
            onClose={() => {
              setDraftReport(null)
              setDraftSignal(null)
              setTab('Radar')
            }}
            onCreated={async (id) => {
              setDraftReport(null)
              setDraftSignal(null)
              radar.setFilter('all')
              await radar.refresh()
              openDetail(id)
            }}
          />
        )}

        {tab === 'Verifikasi' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <VerificationRadarPanel
              onCreateEvent={(report) => startCreateEvent(report)}
              onCreateStandaloneEvent={() => startCreateEvent(null)}
            />
          </div>
        )}

        {tab === 'Dampak' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <h2 className="mb-4 text-xl font-extrabold tracking-tight text-ink">Dampak</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Event', impactStats.total],
                ['Pulih', impactStats.resolved],
                ['Sampah (kg)', impactStats.wasteKg],
                ['Bibit', impactStats.trees],
              ].map(([label, val]) => (
                <div key={label} className="rounded-card border border-line bg-white p-5">
                  <p className="num text-3xl text-ink">{val}</p>
                  <p className="mt-1 text-xs font-bold text-ink-soft">{label}</p>
                </div>
              ))}
            </div>
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
      </aside>

      <button
        type="button"
        onClick={() => setDrawerOpen((v) => !v)}
        aria-label={drawerOpen ? 'Sembunyikan panel' : 'Tampilkan panel'}
        style={{ left: edge }}
        className="absolute top-1/2 z-[650] grid h-14 w-6 -translate-y-1/2 place-items-center rounded-r-2xl border border-l-0 border-line bg-white text-ink-soft hover:text-ink"
      >
        {drawerOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      <div
        style={{ left: edge + 16, right: 96 }}
        className="pointer-events-none absolute top-4 z-[500] flex flex-col gap-3"
      >
        <label className="pointer-events-auto flex h-12 w-[360px] max-w-full items-center gap-2.5 rounded-full border border-line bg-white px-4">
          <Search className="size-4.5 shrink-0 text-ink-soft" strokeWidth={2.5} />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari lokasi"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
          />
          {query && (
            <button type="button" aria-label="Hapus" onClick={() => setQuery('')}>
              <X className="size-4 text-ink-soft" />
            </button>
          )}
        </label>

        <div className="pointer-events-auto flex flex-wrap gap-2">
          {LAYER_CHIPS.map((c) => (
            <Chip key={c.layer} active={layers.has(c.layer)} onClick={() => toggleLayer(c.layer)}>
              <span className={`size-2 rounded-full ${c.dot}`} />
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2.5">
        <Orb
          size={48}
          label={profile ? 'Profil' : 'Masuk'}
          onClick={() => openTab('Profil')}
          className="text-sm font-extrabold"
        >
          {initials ?? <User className="size-5 text-ink-soft" />}
        </Orb>
        <Orb
          size={48}
          label="Notifikasi"
          onClick={() => openTab('Profil')}
          className="relative"
        >
          <Bell className="size-5 text-ink" strokeWidth={2.25} />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-white bg-cobalt" />
          )}
        </Orb>
      </div>

      <MapStyleSwitcher
        value={radar.style}
        onChange={radar.setStyle}
        className="absolute bottom-4 z-[500]"
        style={{ left: edge + 16 }}
      />

      <div className="absolute right-4 bottom-10 z-[500] flex flex-col gap-2.5">
        <div className="overflow-hidden rounded-full border border-line bg-white">
          <button
            type="button"
            aria-label="Perbesar"
            onClick={() => radar.zoom(1)}
            className="grid size-12 place-items-center text-ink hover:bg-canvas"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Perkecil"
            onClick={() => radar.zoom(-1)}
            className="grid size-12 place-items-center border-t border-line text-ink hover:bg-canvas"
          >
            <Minus className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        <Orb size={48} label="Lokasi saya" onClick={radar.locate}>
          <LocateFixed className="size-5 text-ink" strokeWidth={2.25} />
        </Orb>
      </div>
    </div>
  )
}