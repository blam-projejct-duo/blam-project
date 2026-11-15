import { motion, useAnimationControls, useDragControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  Bell,
  Building2,
  Camera,
  ChevronDown,
  Compass,
  ListChecks,
  LocateFixed,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Orb } from '../../components/ui/atoms'
import { ECOSYSTEM_FILTERS } from '../../lib/constants'
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
import ReportListPanel from './ReportListPanel'
import type { Ecosystem } from '../../types'

type Snap = 'peek' | 'half' | 'full'
type Mode = 'detail' | 'list' | 'orgs' | 'profile' | 'agency' | 'admin' | null

const SPRING = { type: 'spring', stiffness: 350, damping: 30 } as const
const PEEK_PX = 214

function DockItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="glass rounded-full px-2 py-0.5 text-[11px] font-bold text-ink">{label}</span>
    </div>
  )
}

export default function MobileBumpShell({ radar }: { radar: Radar }) {
  const { profile, notifications, openAuthModal } = useAuth()
  const rootRef = useRef<HTMLDivElement>(null)
  const [H, setH] = useState(0)
  const [mode, setMode] = useState<Mode>(null)
  const [snap, setSnap] = useState<Snap>('half')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

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
      closed: sheetH + 24,
    }),
    [H, sheetH],
  )
  const targetKey = mode === null ? 'closed' : snap

  useEffect(() => {
    if (H === 0) return
    void anim.start({ y: snapY[targetKey] }, SPRING)
  }, [anim, snapY, targetKey, H])

  useEffect(() => {
    if (mode === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  const openDetail = (id: string) => {
    radar.setSelectedId(id)
    setMenuOpen(false)
    setMode('detail')
    setSnap('half')
  }

  const openSheet = (nextMode: Exclude<Mode, null>, full = false, search = false) => {
    setMenuOpen(false)
    setFocusSearch(search)
    setMode(nextMode)
    setSnap(full || search ? 'full' : 'half')
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const projected = snapY[snap] + info.offset.y + info.velocity.y * 0.2
    if (projected > snapY.peek + 70) {
      setMode(null)
      return
    }
    const next = (['full', 'half', 'peek'] as const).reduce((best, k) =>
      Math.abs(snapY[k] - projected) < Math.abs(snapY[best] - projected) ? k : best,
    )
    setSnap(next)
    void anim.start({ y: snapY[next] }, SPRING)
  }

  const cycleSnap = () => {
    setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'))
  }

  const sheetOpen = mode !== null
  const padBottom = !sheetOpen ? 0 : snap === 'peek' ? PEEK_PX : Math.round(H * 0.58)
  const openCount = radar.reports.filter((r) => r.status !== 'resolved').length
  const unreadCount = notifications.filter((n) => !n.is_read).length

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

  const selected = radar.selected
  const initials = profile?.full_name ? profile.full_name.slice(0, 1).toUpperCase() : '?'

  return (
    <div ref={rootRef} className="relative h-full w-full select-none overflow-hidden bg-canvas">
      <MapView
        reports={radar.reports}
        hotspots={radar.hotspots}
        speciesPoints={radar.speciesPoints}
        selectedId={radar.selectedId}
        onSelect={openDetail}
        style={radar.style}
        showHotspots={radar.showHotspots}
        showSpecies={radar.showSpecies}
        padding={{ bottom: padBottom, right: 0 }}
        fitAllSignal={radar.fitAllSignal}
        locateSignal={radar.locateSignal}
      />

      {/* Top status pill + filter menu */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+16px)] left-1/2 z-[500] -translate-x-1/2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="glass flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold whitespace-nowrap"
        >
          <span className="size-2 rounded-full bg-emerald" />
          {radar.reports.length} titik
          <ChevronDown
            className={`size-4 text-ink-soft transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
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
          <div className="glass absolute top-[calc(env(safe-area-inset-top)+76px)] left-1/2 z-[520] flex w-[min(340px,calc(100%-32px))] -translate-x-1/2 flex-col gap-4 rounded-card p-4">
            <div className="flex flex-wrap gap-2">
              {ECOSYSTEM_FILTERS.map((f) => {
                const active = radar.filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => radar.setFilter(f.id as Ecosystem | 'all')}
                    aria-pressed={active}
                    className={`h-10 rounded-full px-4 text-[13px] font-bold ${
                      active ? 'bg-ink text-white' : 'bg-muted text-ink'
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
                  ['hotspot', hotspotLabel, radar.showHotspots, radar.toggleHotspots],
                  ['species', speciesLabel, radar.showSpecies, radar.toggleSpecies],
                ] as const
              ).map(([key, label, on, toggle]) => (
                <button
                  key={key}
                  type="button"
                  onClick={toggle}
                  aria-pressed={on}
                  className={`h-10 flex-1 rounded-full text-[13px] font-bold ${
                    on ? 'bg-cobalt text-white' : 'bg-muted text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openSheet('orgs', true)}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-white text-[13px] font-bold text-ink"
            >
              <Building2 className="size-4 text-cobalt" /> Organisasi &amp; Komunitas
            </button>
            {profile?.role === 'agency' && (
              <button
                type="button"
                onClick={() => openSheet('agency', true)}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#FEE9E7] text-[13px] font-bold text-[#B91C1C]"
              >
                <Shield className="size-4" /> Inbox Eskalasi Instansi
              </button>
            )}
            {profile?.role === 'admin' && (
              <button
                type="button"
                onClick={() => openSheet('admin', true)}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-white"
              >
                <Shield className="size-4" /> Panel Super Admin
              </button>
            )}
          </div>
        </>
      )}

      {/* Top-right 2 orbs (Avatar + Bell) */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 z-[500] flex flex-col gap-2.5">
        <Orb
          size={48}
          label="Profil"
          onClick={() => (profile ? openSheet('profile', true) : openAuthModal())}
          className="text-sm font-extrabold ring-[3px] ring-emerald/45"
        >
          {initials}
        </Orb>
        <Orb
          size={48}
          label="Notifikasi"
          onClick={() => openSheet('profile', true)}
          className="relative !bg-cobalt !text-white"
        >
          <Bell className="size-5" strokeWidth={2.25} />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-cobalt bg-critical" />
          )}
        </Orb>
      </div>

      {/* Bottom Dock */}
      <motion.div
        initial={false}
        animate={{ y: sheetOpen ? 140 : 0, opacity: sheetOpen ? 0 : 1 }}
        transition={SPRING}
        inert={sheetOpen}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]"
      >
        <div className="pointer-events-auto flex justify-between px-5 pb-4">
          <Orb size={48} label="Cari lokasi" onClick={() => openSheet('list', false, true)}>
            <Search className="size-5 text-cobalt" strokeWidth={2.5} />
          </Orb>
          <Orb size={48} label="Lokasi saya" onClick={radar.locate}>
            <LocateFixed className="size-5 text-cobalt" strokeWidth={2.25} />
          </Orb>
        </div>
        <div className="pointer-events-auto flex items-end justify-center gap-7 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <DockItem label="Jelajah">
            <Orb size={56} label="Jelajah" onClick={radar.fitAll}>
              <Compass className="size-6 text-ink" strokeWidth={2} />
            </Orb>
          </DockItem>
          <DockItem label="Lapor">
            <button
              type="button"
              aria-label="Lapor"
              onClick={() => setReportOpen(true)}
              className="btn-primary orb !border-0 !bg-cobalt !text-white"
              style={{ width: 68, height: 68 }}
            >
              <Camera className="size-7" strokeWidth={2} />
            </button>
          </DockItem>
          <DockItem label="Aksi">
            <Orb size={56} label="Aksi" onClick={() => openSheet('list')} className="relative">
              <ListChecks className="size-6 text-ink" strokeWidth={2} />
              {openCount > 0 && (
                <span className="num absolute -top-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-critical text-[10px] text-white">
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
          initial={{ y: snapY.closed }}
          animate={anim}
          drag="y"
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: snapY.full, bottom: snapY.peek + 90 }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          inert={!sheetOpen}
          role="dialog"
          aria-label="Panel informasi"
          className="absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-sheet border-t border-line/80 bg-white"
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
              <SiteDetail
                key={selected.id}
                report={selected}
                joined={radar.joinedIds.has(selected.id)}
                onJoin={async () => {
                  await radar.joinAction(selected.id)
                }}
                onRefresh={radar.refresh}
              />
            )}

            {mode === 'list' && (
              <ReportListPanel
                reports={radar.reports}
                joinedIds={radar.joinedIds}
                query={query}
                onQueryChange={setQuery}
                autoFocus={focusSearch}
                onOpen={openDetail}
                onJoin={(id) => {
                  if (!profile) openAuthModal()
                  else void radar.joinAction(id)
                }}
              />
            )}

            {mode === 'orgs' && <OrgsPanel />}
            {mode === 'profile' && <ProfilePanel />}
            {mode === 'agency' && (
              <AgencyInboxPanel
                reports={radar.allReports}
                onSelectReport={openDetail}
                onRefresh={radar.refresh}
              />
            )}
            {mode === 'admin' && (
              <AdminPanel reports={radar.allReports} onRefreshReports={radar.refresh} />
            )}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={false}
        animate={{ y: sheetOpen ? 0 : 100, opacity: sheetOpen ? 1 : 0 }}
        transition={SPRING}
        inert={!sheetOpen}
        className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-[700] flex justify-center"
      >
        <Orb size={56} label="Tutup" onClick={() => setMode(null)}>
          <X className="size-6 text-ink-soft" strokeWidth={3} />
        </Orb>
      </motion.div>

      {reportOpen && (
        <div className="absolute inset-0 z-[800] bg-canvas">
          <QuickReportFlow
            onClose={() => setReportOpen(false)}
            onPublished={async (id) => {
              setReportOpen(false)
              radar.setFilter('all')
              await radar.refresh()
              radar.setSelectedId(id)
              setMode('detail')
            }}
          />
        </div>
      )}
    </div>
  )
}
