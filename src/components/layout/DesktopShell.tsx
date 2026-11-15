import {
  Bell,
  Building2,
  Camera,
  ChevronDown,
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
import { ECOSYSTEM_FILTERS, pinTone } from '../../lib/constants'
import AdminPanel from '../../modules/admin/AdminPanel'
import AgencyInboxPanel from '../../modules/agency/AgencyInboxPanel'
import { useAuth } from '../../modules/auth/AuthContext'
import MapStyleSwitcher from '../../modules/map/MapStyleSwitcher'
import MapView from '../../modules/map/MapView'
import type { Radar } from '../../modules/map/useRadar'
import OrgsPanel from '../../modules/organizations/OrgsPanel'
import ProfilePanel from '../../modules/profile/ProfilePanel'
import QuickReportFlow from '../../modules/reports/QuickReportFlow'
import SiteDetail from '../../modules/reports/SiteDetail'
import type { Ecosystem, PinTone } from '../../types'
import ReportListPanel from './ReportListPanel'

type NavTab = 'Radar' | 'Lapor' | 'Dampak' | 'Org' | 'Eskalasi' | 'Admin'
type Tab = NavTab | 'Profil'

const RAIL_W = 72
const DRAWER_W = 392

const TONE_CHIPS: { tone: PinTone; label: string; dot: string }[] = [
  { tone: 'critical', label: 'Kritis', dot: 'bg-critical' },
  { tone: 'progress', label: 'Ditangani', dot: 'bg-progress' },
  { tone: 'resolved', label: 'Pulih', dot: 'bg-resolved' },
]

const NAV_ICON: Record<NavTab, ReactNode> = {
  Radar: <RadarIcon className="size-5" strokeWidth={2.25} />,
  Lapor: <Camera className="size-5" strokeWidth={2.25} />,
  Dampak: <Sprout className="size-5" strokeWidth={2.25} />,
  Org: <Building2 className="size-5" strokeWidth={2.25} />,
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
      ? 'bg-canvas text-cobalt'
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

function Chip({
  active,
  onClick,
  tone = 'ink',
  children,
}: {
  active: boolean
  onClick: () => void
  tone?: 'ink' | 'cobalt'
  children: ReactNode
}) {
  const on = tone === 'cobalt' ? 'border-cobalt bg-cobalt text-white' : 'border-ink bg-ink text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors ${
        active ? on : 'border-line bg-white text-ink hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  )
}

export default function DesktopShell({ radar }: { radar: Radar }) {
  const { profile, notifications, openAuthModal } = useAuth()
  const [tab, setTab] = useState<Tab>('Radar')
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [tones, setTones] = useState<Set<PinTone>>(new Set())

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const initials = profile?.full_name ? profile.full_name.slice(0, 1).toUpperCase() : null
  const selected = radar.selected
  const edge = RAIL_W + (drawerOpen ? DRAWER_W : 0)

  const navTabs = useMemo<NavTab[]>(() => {
    const base: NavTab[] = ['Radar', 'Lapor', 'Dampak', 'Org']
    if (profile?.role === 'agency') base.push('Eskalasi')
    if (profile?.role === 'admin') base.push('Admin')
    return base
  }, [profile?.role])

  const visibleReports = useMemo(
    () => (tones.size === 0 ? radar.reports : radar.reports.filter((r) => tones.has(pinTone(r.status)))),
    [radar.reports, tones],
  )

  const impactStats = useMemo(() => {
    let wasteKg = 0
    let trees = 0
    let resolved = 0
    for (const r of radar.allReports) {
      if (r.status === 'resolved') resolved += 1
      for (const a of r.report_actions ?? []) {
        wasteKg += Number(a.waste_kg) || 0
        trees += a.trees_planted || 0
      }
    }
    return { total: radar.allReports.length, resolved, wasteKg, trees }
  }, [radar.allReports])

  const hotspotLabel = radar.showHotspots
    ? radar.layersLoading && radar.hotspots.length === 0
      ? 'Hotspot…'
      : `Hotspot · ${radar.hotspots.length}`
    : 'Hotspot'
  const speciesLabel = radar.showSpecies
    ? radar.layersLoading && radar.speciesPoints.length === 0
      ? 'Spesies…'
      : `Spesies · ${radar.speciesPoints.length}`
    : 'Spesies'

  const openTab = (next: Tab) => {
    if (next === tab && drawerOpen) {
      setDrawerOpen(false)
      return
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

  const toggleTone = (tone: PinTone) =>
    setTones((prev) => {
      const next = new Set(prev)
      if (next.has(tone)) next.delete(tone)
      else next.add(tone)
      return next
    })

  const onSearch = (value: string) => {
    setQuery(value)
    setTab('Radar')
    setView('list')
    setDrawerOpen(true)
  }

  const join = (id: string) => {
    if (!profile) openAuthModal()
    else void radar.joinAction(id)
  }

  const radarBody = () => {
    if (radar.state === 'error') {
      return (
        <div className="grid h-full place-items-center px-5 text-center">
          <div>
            <p className="text-base font-extrabold text-[#B91C1C]">Gagal memuat data</p>
            <p className="mt-1 text-xs text-ink-soft">{radar.errorMessage}</p>
            <button type="button" onClick={() => void radar.refresh()} className="btn-primary mt-4 h-10 px-5 text-xs">
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }

    if (view === 'detail' && selected) {
      return (
        <>
          <header className="flex h-16 shrink-0 items-center gap-3 px-5">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label="Kembali ke daftar"
              className="grid size-10 place-items-center rounded-full border border-line bg-canvas text-ink hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Detail</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            <SiteDetail
              key={selected.id}
              report={selected}
              joined={radar.joinedIds.has(selected.id)}
              onJoin={async () => {
                await radar.joinAction(selected.id)
              }}
              onRefresh={radar.refresh}
            />
          </div>
        </>
      )
    }

    return (
      <>
        <header className="flex h-16 shrink-0 items-center justify-between px-5">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Radar</h2>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft">
            <span className="size-2 rounded-full bg-emerald" />
            {radar.state === 'loading' ? 'Memuat…' : `${visibleReports.length} titik`}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
          <ReportListPanel
            reports={visibleReports}
            joinedIds={radar.joinedIds}
            query={query}
            onQueryChange={setQuery}
            showSearch={false}
            onOpen={openDetail}
            onJoin={join}
          />
        </div>
      </>
    )
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-canvas">
      <div className="absolute inset-0">
        <MapView
          reports={visibleReports}
          hotspots={radar.hotspots}
          speciesPoints={radar.speciesPoints}
          selectedId={radar.selectedId}
          onSelect={openDetail}
          style={radar.style}
          showHotspots={radar.showHotspots}
          showSpecies={radar.showSpecies}
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
            setTab('Radar')
            setView('list')
            setDrawerOpen(true)
            radar.fitAll()
          }}
          aria-label="Blam"
          className="mb-3 grid size-10 place-items-center rounded-full bg-emerald text-white"
        >
          <Leaf className="size-5" strokeWidth={2.5} />
        </button>

        <div className="flex w-full flex-1 flex-col">
          {navTabs.map((label) => (
            <RailItem
              key={label}
              label={label}
              active={tab === label && drawerOpen}
              primary={label === 'Lapor'}
              onClick={() => openTab(label)}
            >
              {NAV_ICON[label]}
            </RailItem>
          ))}
        </div>

        <RailItem label="Profil" active={tab === 'Profil' && drawerOpen} onClick={() => openTab('Profil')}>
          <User className="size-5" strokeWidth={2.25} />
        </RailItem>
      </nav>

      <aside
        aria-label="Panel"
        inert={!drawerOpen}
        style={{ left: RAIL_W, width: DRAWER_W }}
        className={`absolute inset-y-0 z-[600] flex flex-col border-r border-line transition-transform duration-300 ease-[var(--ease-spring)] ${
          tab === 'Radar' ? 'bg-white' : 'bg-canvas'
        } ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {tab === 'Radar' && radarBody()}

        {tab === 'Lapor' && (
          <QuickReportFlow
            onClose={() => setTab('Radar')}
            onPublished={async (id) => {
              radar.setFilter('all')
              await radar.refresh()
              openDetail(id)
            }}
          />
        )}

        {tab === 'Dampak' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <h2 className="mb-4 text-xl font-extrabold tracking-tight text-ink">Dampak</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Titik', impactStats.total],
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
            <AgencyInboxPanel reports={radar.allReports} onSelectReport={openDetail} onRefresh={radar.refresh} />
          </div>
        )}

        {tab === 'Admin' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <AdminPanel reports={radar.allReports} onRefreshReports={radar.refresh} />
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
          <Search className="size-4.5 shrink-0 text-cobalt" strokeWidth={2.5} />
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
          {TONE_CHIPS.map((c) => (
            <Chip key={c.tone} active={tones.has(c.tone)} onClick={() => toggleTone(c.tone)}>
              <span className={`size-2 rounded-full ${c.dot}`} />
              {c.label}
            </Chip>
          ))}
          <Chip tone="cobalt" active={radar.showHotspots} onClick={radar.toggleHotspots}>
            {hotspotLabel}
          </Chip>
          <Chip tone="cobalt" active={radar.showSpecies} onClick={radar.toggleSpecies}>
            {speciesLabel}
          </Chip>
          <label className="relative">
            <span className="sr-only">Ekosistem</span>
            <select
              value={radar.filter}
              onChange={(e) => radar.setFilter(e.target.value as Ecosystem | 'all')}
              className={`h-9 cursor-pointer appearance-none rounded-full border pr-8 pl-3.5 text-[13px] font-bold outline-none ${
                radar.filter === 'all'
                  ? 'border-line bg-white text-ink hover:bg-canvas'
                  : 'border-ink bg-ink text-white'
              }`}
            >
              {ECOSYSTEM_FILTERS.map((f) => (
                <option key={f.id} value={f.id} className="bg-white text-ink">
                  {f.id === 'all' ? 'Semua' : f.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 ${
                radar.filter === 'all' ? 'text-ink-soft' : 'text-white'
              }`}
            />
          </label>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2.5">
        <Orb
          size={48}
          label={profile ? 'Profil' : 'Masuk'}
          onClick={() => (profile ? openTab('Profil') : openAuthModal())}
          className="text-sm font-extrabold ring-[3px] ring-emerald/45"
        >
          {initials ?? <User className="size-5 text-ink-soft" />}
        </Orb>
        <Orb
          size={48}
          label="Notifikasi"
          onClick={() => (profile ? openTab('Profil') : openAuthModal())}
          className="relative !bg-cobalt !text-white"
        >
          <Bell className="size-5" strokeWidth={2.25} />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-cobalt bg-critical" />
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
        <Orb size={48} label="Perbesar" onClick={() => radar.zoom(1)}>
          <Plus className="size-5" strokeWidth={2.5} />
        </Orb>
        <Orb size={48} label="Perkecil" onClick={() => radar.zoom(-1)}>
          <Minus className="size-5" strokeWidth={2.5} />
        </Orb>
        <Orb size={48} label="Lokasi saya" onClick={radar.locate}>
          <LocateFixed className="size-5 text-cobalt" strokeWidth={2.25} />
        </Orb>
      </div>
    </div>
  )
}
