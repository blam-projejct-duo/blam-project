import {
  Bell,
  Camera,
  ChevronDown,
  Compass,
  ListChecks,
  LocateFixed,
  Search,
  X,
} from 'lucide-react'
import { motion, useAnimationControls, useDragControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ECOSYSTEM_FILTERS } from '../../data/mockConservationData'
import type { Radar } from '../../hooks/useRadar'
import type { ConservationSite, Ecosystem } from '../../types/conservation'
import LeafletMap from '../map/LeafletMap'
import MapStyleSwitcher from '../shared/MapStyleSwitcher'
import SiteDetail from '../shared/SiteDetail'
import { EcoBadge } from '../shared/atoms'

type Snap = 'peek' | 'half' | 'full'
type Mode = 'detail' | 'list' | null
type Tab = 'Disarankan' | 'Terbaru' | 'Dampak'

const TABS: Tab[] = ['Disarankan', 'Terbaru', 'Dampak']
const SPRING = { type: 'spring', stiffness: 350, damping: 30 } as const
const PEEK_PX = 214

function Orb({
  size,
  label,
  onClick,
  className = '',
  children,
}: {
  size: number
  label: string
  onClick?: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`orb ${className}`}
      style={{ width: size, height: size }}
    >
      {children}
    </button>
  )
}

function DockItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="glass rounded-full px-2 py-0.5 text-[11px] font-bold text-ink">{label}</span>
    </div>
  )
}

function SiteRow({
  site,
  tab,
  joined,
  onOpen,
  onJoin,
}: {
  site: ConservationSite
  tab: Tab
  joined: boolean
  onOpen: () => void
  onJoin: () => void
}) {
  const meta =
    tab === 'Dampak' && site.impact
      ? `${(site.impact.co2Kg / 1000).toFixed(2)} tCO₂e • ${site.impact.trees} bibit`
      : `${site.participants + (joined ? 1 : 0)} relawan • ${site.province}`

  return (
    <li className="dashed-row flex items-center gap-3 py-3.5">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <EcoBadge ecosystem={site.ecosystem} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-ink">{site.title}</span>
          <span className="block truncate text-[13px] text-ink-soft">{meta}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onJoin}
        aria-pressed={joined}
        className={`h-10 shrink-0 rounded-full px-4 text-[13px] ${joined ? 'btn-joined' : 'btn-primary'}`}
      >
        {joined ? 'Tergabung' : 'Gabung'}
      </button>
    </li>
  )
}

export default function BumpMobileExperience({ radar }: { radar: Radar }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [H, setH] = useState(0)
  const [mode, setMode] = useState<Mode>(null)
  const [snap, setSnap] = useState<Snap>('half')
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('Disarankan')
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)

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
  const openList = (search = false) => {
    setMenuOpen(false)
    setFocusSearch(search)
    setMode('list')
    setSnap(search ? 'full' : 'half')
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

  const openCount = radar.sites.filter((s) => s.status !== 'resolved').length

  const listSites = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = radar.sites.filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.locationName.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q),
    )
    if (tab === 'Terbaru') return [...base].sort((a, b) => a.updatedMinutes - b.updatedMinutes)
    if (tab === 'Dampak')
      return base
        .filter((s) => s.impact)
        .sort((a, b) => (b.impact?.co2Kg ?? 0) - (a.impact?.co2Kg ?? 0))
    const rank = { ai_verified: 0, in_progress: 1, resolved: 2 } as const
    return [...base].sort((a, b) => rank[a.status] - rank[b.status] || b.aiScore - a.aiScore)
  }, [radar.sites, tab, query])

  const selected = radar.selected

  return (
    <div ref={rootRef} className="relative h-full w-full select-none overflow-hidden bg-canvas">
      <LeafletMap
        sites={radar.sites}
        selectedId={radar.selectedId}
        onSelect={openDetail}
        style={radar.style}
        showHotspots={radar.showHotspots}
        showSpecies={radar.showSpecies}
        padding={{ bottom: padBottom, right: 0 }}
        fitAllSignal={radar.fitAllSignal}
        locateSignal={radar.locateSignal}
      />

      {/* Top pill + menu */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+16px)] left-1/2 z-[500] -translate-x-1/2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="glass flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold whitespace-nowrap shadow-[0_6px_18px_rgba(17,24,39,0.12)]"
        >
          <span className="size-2 rounded-full bg-emerald" />
          {radar.sites.length} titik
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
          <div className="glass absolute top-[calc(env(safe-area-inset-top)+76px)] left-1/2 z-[520] flex w-[min(340px,calc(100%-32px))] -translate-x-1/2 flex-col gap-4 rounded-card p-4 shadow-[0_12px_32px_rgba(17,24,39,0.16)]">
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
                  ['Hotspot', radar.showHotspots, radar.toggleHotspots],
                  ['Spesies', radar.showSpecies, radar.toggleSpecies],
                ] as const
              ).map(([label, on, toggle]) => (
                <button
                  key={label}
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
          </div>
        </>
      )}

      {/* Top-right orbs */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 z-[500] flex flex-col gap-2.5">
        <Orb
          size={48}
          label="Profil"
          className="text-sm font-extrabold ring-[3px] ring-emerald/45"
        >
          R
        </Orb>
        <Orb size={48} label="Notifikasi" className="relative !bg-cobalt !text-white">
          <Bell className="size-5" strokeWidth={2.25} />
          <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-cobalt bg-critical" />
        </Orb>
      </div>

      {/* Dock */}
      <motion.div
        initial={false}
        animate={{ y: sheetOpen ? 140 : 0, opacity: sheetOpen ? 0 : 1 }}
        transition={SPRING}
        inert={sheetOpen}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]"
      >
        <div className="pointer-events-auto flex justify-between px-5 pb-4">
          <Orb size={48} label="Cari lokasi" onClick={() => openList(true)}>
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
              className="btn-primary orb !border-0 !bg-[linear-gradient(180deg,#2563EB,#4338CA)] !text-white"
              style={{ width: 68, height: 68 }}
            >
              <Camera className="size-7" strokeWidth={2} />
            </button>
          </DockItem>
          <DockItem label="Aksi">
            <Orb size={56} label="Aksi" onClick={() => openList()} className="relative">
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

      {/* Bottom sheet */}
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
          aria-label={mode === 'list' ? 'Daftar titik' : 'Detail titik'}
          className="absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-sheet border-t border-line/80 bg-white shadow-[0_-8px_24px_rgba(17,24,39,0.08)]"
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
                site={selected}
                joined={radar.joined.has(selected.id)}
                onToggleJoin={() => radar.toggleJoin(selected.id)}
              />
            )}

            {mode === 'list' && (
              <div>
                <label className="flex h-12 items-center gap-2.5 rounded-full bg-canvas px-4">
                  <Search className="size-4.5 shrink-0 text-ink-soft" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus={focusSearch}
                    placeholder="Cari lokasi"
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
                  />
                  {query && (
                    <button type="button" aria-label="Hapus" onClick={() => setQuery('')}>
                      <X className="size-4 text-ink-soft" />
                    </button>
                  )}
                </label>

                <div role="tablist" className="mt-4 flex gap-1">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}
                      className={`h-11 rounded-full px-4 text-[15px] font-bold transition-colors ${
                        tab === t ? 'bg-canvas text-cobalt' : 'text-ink-soft'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <ul className="mt-2">
                  {listSites.map((s) => (
                    <SiteRow
                      key={s.id}
                      site={s}
                      tab={tab}
                      joined={radar.joined.has(s.id)}
                      onOpen={() => openDetail(s.id)}
                      onJoin={() => radar.toggleJoin(s.id)}
                    />
                  ))}
                </ul>
                {listSites.length === 0 && (
                  <p className="py-10 text-center text-sm font-semibold text-ink-soft">Tidak ada titik</p>
                )}
              </div>
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
    </div>
  )
}
