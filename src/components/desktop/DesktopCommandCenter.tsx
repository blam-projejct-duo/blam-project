import { ChevronDown, Leaf, Smartphone, X } from 'lucide-react'
import { useState } from 'react'
import { ECOSYSTEM_FILTERS, pinTone } from '../../data/mockConservationData'
import type { Radar } from '../../hooks/useRadar'
import type { Ecosystem } from '../../types/conservation'
import LeafletMap from '../map/LeafletMap'
import MapStyleSwitcher from '../shared/MapStyleSwitcher'
import QuickReportFlow from '../report/QuickReportFlow'
import SiteDetail from '../shared/SiteDetail'
import BumpMobileExperience from '../mobile/BumpMobileExperience'

const NAV = ['Radar', 'Lapor', 'Dampak'] as const
type Tab = (typeof NAV)[number]
const ENABLED: readonly Tab[] = ['Radar', 'Lapor']

const DOT = {
  critical: 'bg-critical',
  progress: 'bg-progress',
  resolved: 'bg-resolved',
} as const

function LayerToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 rounded-full border px-4 text-[13px] font-bold shadow-[0_6px_18px_rgba(17,24,39,0.12)] backdrop-blur transition-colors ${
        active
          ? 'border-cobalt bg-cobalt text-white'
          : 'border-white/90 bg-white/86 text-ink hover:bg-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function DesktopCommandCenter({ radar }: { radar: Radar }) {
  const [phoneMode, setPhoneMode] = useState(false)
  const [tab, setTab] = useState<Tab>('Radar')
  const { selected, sites } = radar

  return (
    <div className="flex h-dvh flex-col gap-5 p-6">
      <header className="relative flex h-14 shrink-0 items-center justify-between rounded-full border border-line bg-white pr-2 pl-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-cobalt text-white">
            <Leaf className="size-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Blam</span>
          <span className="relative ml-0.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald" />
          </span>
        </div>

        <nav className="absolute left-1/2 flex -translate-x-1/2 gap-1" aria-label="Utama">
          {NAV.map((label) => {
            const active = label === tab
            const enabled = ENABLED.includes(label)
            return (
              <button
                key={label}
                type="button"
                disabled={!enabled}
                onClick={() => setTab(label)}
                aria-current={active ? 'page' : undefined}
                className={`h-10 rounded-full px-5 text-sm font-bold transition-colors ${
                  active
                    ? 'bg-cobalt text-white'
                    : 'text-ink-soft hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Ekosistem</span>
            <select
              value={radar.filter}
              onChange={(e) => radar.setFilter(e.target.value as Ecosystem | 'all')}
              className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-white pr-9 pl-4 text-sm font-semibold text-ink hover:bg-canvas"
            >
              {ECOSYSTEM_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id === 'all' ? 'Semua Lokasi' : f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft" />
          </label>
          <button
            type="button"
            onClick={() => setPhoneMode((v) => !v)}
            aria-pressed={phoneMode}
            className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
              phoneMode
                ? 'border-ink bg-ink text-white'
                : 'border-line text-ink hover:bg-canvas'
            }`}
          >
            {phoneMode ? <X className="size-4" /> : <Smartphone className="size-4" />}
            Mode HP
          </button>
        </div>
      </header>

      {phoneMode ? (
        <main className="flex min-h-0 flex-1 items-center justify-center">
          <div className="relative h-full max-h-[844px] w-[390px] overflow-hidden rounded-[44px] border-[8px] border-ink bg-canvas">
            <BumpMobileExperience radar={radar} />
          </div>
        </main>
      ) : tab === 'Lapor' ? (
        <main className="flex min-h-0 flex-1 justify-center">
          <div className="h-full w-full max-w-[480px] overflow-hidden rounded-sheet border border-line">
            <QuickReportFlow
              onClose={() => setTab('Radar')}
              onPublished={async (id) => {
                setTab('Radar')
                radar.setFilter('all')
                await radar.refresh()
                radar.setSelectedId(id)
              }}
            />
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="relative overflow-hidden rounded-sheet border border-line bg-canvas">
            <LeafletMap
              sites={sites}
              selectedId={radar.selectedId}
              onSelect={radar.setSelectedId}
              style={radar.style}
              showHotspots={radar.showHotspots}
              showSpecies={radar.showSpecies}
              padding={{ bottom: 0, right: 0 }}
              fitAllSignal={radar.fitAllSignal}
              locateSignal={radar.locateSignal}
            />

            <button
              type="button"
              onClick={radar.fitAll}
              className="glass absolute top-4 left-4 z-[500] flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold shadow-[0_6px_18px_rgba(17,24,39,0.12)]"
            >
              <span className="size-2 rounded-full bg-emerald" />
              {sites.length} titik
            </button>

            <div className="absolute top-4 right-4 z-[500] flex gap-2">
              <LayerToggle active={radar.showHotspots} onClick={radar.toggleHotspots}>
                Hotspot
              </LayerToggle>
              <LayerToggle active={radar.showSpecies} onClick={radar.toggleSpecies}>
                Spesies
              </LayerToggle>
            </div>

            <MapStyleSwitcher
              value={radar.style}
              onChange={radar.setStyle}
              className="absolute bottom-4 left-4 z-[500]"
            />

            <ul className="glass absolute right-4 bottom-4 z-[500] flex items-center gap-4 rounded-full px-4 py-2.5 text-xs font-semibold shadow-[0_6px_18px_rgba(17,24,39,0.12)]">
              {(
                [
                  ['critical', 'Kritis'],
                  ['progress', 'Ditangani'],
                  ['resolved', 'Pulih'],
                ] as const
              ).map(([tone, label]) => (
                <li key={tone} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${DOT[tone]}`} />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <aside className="flex min-h-0 flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {sites.map((s) => {
                const active = s.id === radar.selectedId
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => radar.setSelectedId(s.id)}
                    aria-pressed={active}
                    className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors ${
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-white text-ink hover:bg-canvas'
                    }`}
                  >
                    <span className={`size-2 rounded-full ${DOT[pinTone(s.status)]}`} />
                    {s.shortName}
                    <span className={`num text-xs ${active ? 'text-white/70' : 'text-ink-soft'}`}>
                      {s.aiScore}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-sheet border border-line bg-white p-6">
              {selected ? (
                <SiteDetail
                  key={selected.id}
                  site={selected}
                  joined={radar.joined.has(selected.id)}
                  onToggleJoin={() => radar.toggleJoin(selected.id)}
                />
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <p className="text-lg font-extrabold">Pilih titik</p>
                    <p className="mt-1 text-sm text-ink-soft">Ketuk pin di peta</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  )
}