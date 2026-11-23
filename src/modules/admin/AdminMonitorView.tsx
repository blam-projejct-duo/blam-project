import { ArrowRight, BarChart3, ClipboardList, Crosshair, HeartHandshake, Leaf, Satellite, Trees } from 'lucide-react'
import type { CitizenReport, ConservationEvent, Ecosystem, FundraisingCampaign, Organization, SatelliteSignal } from '../../types'
import { ECOSYSTEM_LABEL, EVENT_STATUS_LABEL, shortLocation } from '../../lib/constants'
import type { AdminSection } from './AdminPanel'

export interface AdminAuditEntry {
  id: string
  label: string
  time: string
}

function buildLast7DaysBuckets(events: ConservationEvent[], reports: CitizenReport[]) {
  const now = new Date()
  const buckets: { key: string; label: string; events: number; reports: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label =
      i === 0 ? 'Hari ini' : d.toLocaleDateString('id-ID', { weekday: 'short' }).replace('.', '')
    buckets.push({ key, label, events: 0, reports: 0 })
  }
  const map = new Map(buckets.map((b) => [b.key, b]))
  for (const ev of events) {
    const bucket = map.get(ev.created_at?.slice(0, 10))
    if (bucket) bucket.events += 1
  }
  for (const r of reports) {
    const bucket = map.get(r.created_at?.slice(0, 10))
    if (bucket) bucket.reports += 1
  }
  return buckets
}

const ECOSYSTEM_META: { id: Ecosystem; label: string; color: string }[] = [
  { id: 'coastal_mangrove', label: 'Mangrove Pesisir', color: 'bg-sky-500' },
  { id: 'tropical_forest', label: 'Hutan Tropis', color: 'bg-leaf' },
  { id: 'watershed', label: 'DAS & Sungai', color: 'bg-cyan-600' },
]

function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
  if (amount >= 1_000) return `Rp ${Math.round(amount / 1_000)}rb`
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function MonitorDonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; count: number; color: string }[]
  centerValue: string | number
  centerLabel: string
}) {
  const r = 38
  const circ = 2 * Math.PI * r
  const total = Math.max(
    1,
    segments.reduce((s, x) => s + x.count, 0),
  )
  const arcs = segments.reduce<{ label: string; color: string; dash: number; offset: number }[]>(
    (acc, item) => {
      const prevLen = acc.reduce((sum, s) => sum + s.dash, 0)
      const dash = (item.count / total) * circ
      acc.push({ label: item.label, color: item.color, dash, offset: -prevLen })
      return acc
    },
    [],
  )

  return (
    <div className="relative grid size-26 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="12" />
        {arcs.map((seg) =>
          seg.dash > 0 ? (
            <circle
              key={seg.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
              strokeDashoffset={seg.offset}
            />
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="num text-[17px] leading-none font-semibold text-ink">{centerValue}</span>
        <span className="mt-0.5 text-[9px] font-medium text-ink-soft uppercase">{centerLabel}</span>
      </div>
    </div>
  )
}

export default function AdminMonitorView({
  events,
  reports = [],
  orgs = [],
  signals = [],
  campaigns,
  pendingOrgsCount,
  pendingReportsCount,
  signalsCount,
  auditLog = [],
  expanded = false,
  onNavigate,
  onFocusLocation,
}: {
  events: ConservationEvent[]
  reports?: CitizenReport[]
  orgs?: Organization[]
  signals?: SatelliteSignal[]
  campaigns: FundraisingCampaign[]
  pendingOrgsCount: number
  pendingReportsCount: number
  signalsCount: number
  auditLog?: AdminAuditEntry[]
  expanded?: boolean
  onNavigate?: (section: AdminSection) => void
  onFocusLocation?: (lat: number, lng: number) => void
}) {
  const nonCancelled = events.filter((e) => e.status !== 'cancelled')
  const openCount = nonCancelled.filter((e) => e.status === 'open').length
  const progressCount = nonCancelled.filter((e) => e.status === 'in_progress').length
  const resolvedCount = nonCancelled.filter((e) => e.status === 'resolved').length
  const totalRadar = Math.max(1, nonCancelled.length)

  const openPct = Math.round((openCount / totalRadar) * 100)
  const progressPct = Math.round((progressCount / totalRadar) * 100)
  const resolvedPct = Math.max(0, 100 - openPct - progressPct)
  const recoveryPct = nonCancelled.length > 0 ? Math.round((resolvedCount / nonCancelled.length) * 100) : 0

  const totalWasteKg = events.reduce(
    (sum, ev) => sum + (ev.event_actions?.reduce((s, a) => s + Number(a.waste_kg ?? 0), 0) ?? 0),
    0,
  )
  const totalTrees = events.reduce(
    (sum, ev) => sum + (ev.event_actions?.reduce((s, a) => s + (a.trees_planted ?? 0), 0) ?? 0),
    0,
  )

  const totalCollected = campaigns.reduce((sum, c) => sum + (c.collected_amount ?? 0), 0)
  const totalTarget = campaigns.reduce((sum, c) => sum + (c.target_amount ?? 0), 0)
  const donationPct = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0
  const activeCampaigns = campaigns.filter((c) => c.status === 'active')

  const maxEcoCount = Math.max(
    1,
    ...ECOSYSTEM_META.map((eco) => nonCancelled.filter((ev) => ev.ecosystem === eco.id).length),
  )

  const trendBuckets = buildLast7DaysBuckets(events, reports)
  const weeklyEvents = trendBuckets.reduce((s, b) => s + b.events, 0)
  const weeklyReports = trendBuckets.reduce((s, b) => s + b.reports, 0)
  const maxTrendVal = Math.max(1, ...trendBuckets.map((b) => Math.max(b.events, b.reports)))

  const verifiedOrgs = orgs.filter((o) => o.is_verified)
  const totalOrgMembers = verifiedOrgs.reduce((sum, o) => sum + (o.active_members_count ?? 0), 0)
  const topOrgs = [...verifiedOrgs]
    .sort((a, b) => (b.events_count ?? 0) - (a.events_count ?? 0) || (b.active_members_count ?? 0) - (a.active_members_count ?? 0))
    .slice(0, 4)
  const recentEvents = [...nonCancelled]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5)
  const signalBreakdown = [
    { label: 'Karhutla', count: signals.filter((s) => s.kind === 'wildfire' || s.kind === 'suspected').length, color: '#EA580C' },
    { label: 'Gunung', count: signals.filter((s) => s.kind === 'volcano').length, color: '#6D28D9' },
    { label: 'Banjir', count: signals.filter((s) => s.kind === 'flood').length, color: '#2563EB' },
    { label: 'Badai', count: signals.filter((s) => s.kind === 'storm').length, color: '#0E7490' },
  ].filter((x) => x.count > 0)

  if (expanded) {
    return (
      <div className="flex flex-col gap-3.5">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="atlas-group p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Pemulihan Bumi</p>
            <p className="num mt-1.5 text-[22px] leading-none font-semibold text-leaf">{recoveryPct}%</p>
            <p className="num mt-1.5 text-[11px] text-ink-soft">
              {resolvedCount} dari {nonCancelled.length} event selesai
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.(pendingOrgsCount > 0 ? 'approvals' : 'moderation')}
            className="atlas-group p-3.5 text-left transition-colors hover:bg-canvas/70"
          >
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Perlu Tindakan</p>
            <p className="num mt-1.5 flex items-center gap-1.5 text-[22px] leading-none font-semibold text-ink">
              {pendingOrgsCount + pendingReportsCount}
              {onNavigate && <ArrowRight className="size-4 text-ink-soft" />}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {pendingOrgsCount} org · {pendingReportsCount} laporan
            </p>
          </button>
          <div className="atlas-group p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Organisasi Aktif</p>
            <p className="num mt-1.5 text-[22px] leading-none font-semibold text-ink">{verifiedOrgs.length}</p>
            <p className="num mt-1.5 text-[11px] text-ink-soft">{totalOrgMembers} anggota tergabung</p>
          </div>
          <div className="atlas-group p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Total Donasi</p>
            <p className="num mt-1.5 text-[22px] leading-none font-semibold text-forest">{formatRupiahCompact(totalCollected)}</p>
            <p className="num mt-1.5 text-[11px] text-ink-soft">{donationPct}% dari target</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-3">
          <section className="card-quiet flex flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="size-4 text-forest" strokeWidth={1.75} />
                <h3 className="text-[13px] font-semibold text-ink">Tren 7 Hari Terakhir</h3>
              </div>
              <span className="num text-[11px] font-medium text-ink-soft">
                +{weeklyEvents} event · +{weeklyReports} laporan
              </span>
            </div>

            <div className="grid grid-cols-7 items-end gap-2 pt-2">
              {trendBuckets.map((b) => {
                const evH = Math.max(b.events > 0 ? 18 : 6, Math.round((b.events / maxTrendVal) * 88))
                const repH = Math.max(b.reports > 0 ? 18 : 6, Math.round((b.reports / maxTrendVal) * 88))
                return (
                  <div key={b.key} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-24 items-end gap-1">
                      <div className="flex flex-col items-center gap-0.5">
                        {b.events > 0 && <span className="num text-[9px] font-semibold text-leaf">{b.events}</span>}
                        <div
                          title={`${b.label}: ${b.events} event`}
                          className={`w-2.5 rounded-t-[4px] transition-all ${b.events > 0 ? 'bg-leaf' : 'bg-ink/10'}`}
                          style={{ height: `${evH}px` }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        {b.reports > 0 && <span className="num text-[9px] font-semibold text-amber-600">{b.reports}</span>}
                        <div
                          title={`${b.label}: ${b.reports} laporan`}
                          className={`w-2.5 rounded-t-[4px] transition-all ${b.reports > 0 ? 'bg-amber-400' : 'bg-ink/10'}`}
                          style={{ height: `${repH}px` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-ink-soft">{b.label}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-leaf" /> Event Baru
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-400" /> Laporan Warga
              </span>
            </div>
          </section>

          <section className="card-quiet flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Leaf className="size-4 text-leaf" strokeWidth={1.75} />
                <h3 className="text-[13px] font-semibold text-ink">Kondisi Radar &amp; Ekosistem</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                <Satellite className="size-3 text-amber-600" /> {signalsCount} sinyal
              </span>
            </div>

            <div className="flex items-center gap-4">
              <MonitorDonutChart
                segments={[
                  { label: 'Pulih', count: resolvedCount, color: '#15803D' },
                  { label: 'Berjalan', count: progressCount, color: '#FBBF24' },
                  { label: 'Terbuka', count: openCount, color: '#22C55E' },
                ]}
                centerValue={`${recoveryPct}%`}
                centerLabel="Pulih"
              />
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-[10px] bg-canvas px-2.5 py-2">
                  <p className="text-ink-soft">Pulih</p>
                  <p className="num mt-0.5 text-[15px] font-semibold text-resolved">{resolvedCount}</p>
                </div>
                <div className="rounded-[10px] bg-canvas px-2.5 py-2">
                  <p className="text-ink-soft">Berjalan</p>
                  <p className="num mt-0.5 text-[15px] font-semibold text-progress">{progressCount}</p>
                </div>
                <div className="rounded-[10px] bg-canvas px-2.5 py-2">
                  <p className="text-ink-soft">Terbuka</p>
                  <p className="num mt-0.5 text-[15px] font-semibold text-leaf">{openCount}</p>
                </div>
              </div>
            </div>

            {signalBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {signalBreakdown.map((sb) => (
                  <span
                    key={sb.label}
                    className="num inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-soft"
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: sb.color }} />
                    <span>{sb.label}</span>
                    <span className="font-semibold text-ink">{sb.count}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] bg-canvas px-3 py-2">
                <p className="text-[11px] text-ink-soft">Sampah Terangkut</p>
                <p className="num mt-0.5 text-[16px] font-semibold text-ink">{totalWasteKg.toLocaleString('id-ID')} kg</p>
              </div>
              <div className="rounded-[10px] bg-canvas px-3 py-2">
                <p className="flex items-center gap-1 text-[11px] text-ink-soft">
                  <Trees className="size-3 text-leaf" /> Pohon Tertanam
                </p>
                <p className="num mt-0.5 text-[16px] font-semibold text-ink">{totalTrees.toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {ECOSYSTEM_META.map((eco) => {
                const count = nonCancelled.filter((ev) => ev.ecosystem === eco.id).length
                const pct = Math.round((count / maxEcoCount) * 100)
                return (
                  <div key={eco.id} className="grid grid-cols-[112px_1fr_28px] items-center gap-2 text-[11px]">
                    <span className="text-ink-soft">{eco.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas">
                      <div className={`h-full rounded-full ${eco.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="num text-right font-semibold text-ink">{count}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Bottom Row: Donasi & Organisasi / Audit */}
        <div className="grid grid-cols-2 gap-3">
          <section className="card-quiet flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <HeartHandshake className="size-4 text-rose-600" strokeWidth={1.75} />
                <h3 className="text-[13px] font-semibold text-ink">Kampanye Donasi Aktif</h3>
              </div>
              <span className="num rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink">
                {activeCampaigns.length} aktif
              </span>
            </div>
            {activeCampaigns.length === 0 ? (
              <p className="text-[12px] text-ink-soft">Belum ada kampanye donasi aktif</p>
            ) : (
              <div className="flex flex-col gap-2">
                {activeCampaigns.slice(0, 4).map((c) => {
                  const pct = c.target_amount > 0 ? Math.min(100, Math.round((c.collected_amount / c.target_amount) * 100)) : 0
                  return (
                    <div key={c.id} className="rounded-[10px] bg-canvas p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-ink">{c.title}</p>
                          <p className="num text-[11px] text-ink-soft">
                            {formatRupiahCompact(c.collected_amount)} / {formatRupiahCompact(c.target_amount)} ({pct}%)
                          </p>
                        </div>
                        {onFocusLocation && (
                          <button
                            type="button"
                            onClick={() => onFocusLocation(c.lat, c.lng)}
                            aria-label={`Fokus peta ke ${c.title}`}
                            className="shrink-0 rounded-full p-1 text-forest hover:bg-forest/10"
                          >
                            <Crosshair className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="card-quiet flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ClipboardList className="size-4 text-ink-soft" strokeWidth={1.75} />
                <h3 className="text-[13px] font-semibold text-ink">
                  {auditLog.length > 0 ? 'Aktivitas Admin Sesi Ini' : 'Organisasi Paling Aktif'}
                </h3>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('orgs')}
                  className="text-[11px] font-medium text-leaf hover:underline"
                >
                  Kelola org
                </button>
              )}
            </div>
            {auditLog.length > 0 ? (
              <ul className="divide-y divide-ink/8">
                {auditLog.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-[12px]">
                    <span className="truncate text-ink">{item.label}</span>
                    <span className="num shrink-0 text-[11px] text-ink-soft">{item.time}</span>
                  </li>
                ))}
              </ul>
            ) : topOrgs.length === 0 ? (
              <p className="text-[12px] text-ink-soft">Belum ada organisasi terverifikasi</p>
            ) : (
              <ul className="divide-y divide-ink/8">
                {topOrgs.map((org) => (
                  <li key={org.id} className="flex items-center justify-between gap-2 py-2 text-[12px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{org.name}</p>
                      <p className="truncate text-[11px] text-ink-soft">{org.region}</p>
                    </div>
                    <span className="num shrink-0 text-[11px] font-medium text-ink-soft">
                      {org.events_count ?? 0} event · {org.active_members_count ?? 0} anggota
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Recent Events Table */}
        {recentEvents.length > 0 && (
          <section className="card-quiet overflow-hidden p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-ink">Event Konservasi Terbaru</h3>
              <span className="num text-[11px] text-ink-soft">{nonCancelled.length} total event</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-ink/8 text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                    <th className="pb-2 pr-3">Judul Event</th>
                    <th className="pb-2 pr-3">Lokasi</th>
                    <th className="pb-2 pr-3">Ekosistem</th>
                    <th className="pb-2 pr-3 text-right">Relawan</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/6">
                  {recentEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-canvas/50">
                      <td className="max-w-[220px] truncate py-2 pr-3 font-medium text-ink">{ev.title}</td>
                      <td className="max-w-[160px] truncate py-2 pr-3 text-ink-soft">{shortLocation(ev.location_name)}</td>
                      <td className="py-2 pr-3 text-ink-soft">{ECOSYSTEM_LABEL[ev.ecosystem]}</td>
                      <td className="num py-2 pr-3 text-right font-medium text-ink">
                        {ev.event_participants?.length ?? 0}
                      </td>
                      <td className="py-2 text-right font-medium text-leaf">
                        {EVENT_STATUS_LABEL[ev.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Top 2x2 Summary Strip */}
      <div className="atlas-group p-1">
        <div className="atlas-strip grid-cols-2 divide-x divide-ink/8 border-y-0">
          <div className="atlas-strip-cell">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Pemulihan Bumi</p>
            <p className="num mt-1 text-[20px] font-semibold text-leaf">{recoveryPct}%</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.(pendingOrgsCount > 0 ? 'approvals' : 'moderation')}
            className="atlas-strip-cell text-left transition-colors hover:bg-canvas"
          >
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Perlu Tindakan</p>
            <p className="num mt-1 flex items-center gap-1.5 text-[20px] font-semibold text-ink">
              {pendingOrgsCount + pendingReportsCount}
              {onNavigate && <ArrowRight className="size-3.5 text-ink-soft" />}
            </p>
          </button>
        </div>

        {onNavigate && (pendingOrgsCount > 0 || pendingReportsCount > 0) && (
          <div className="flex flex-wrap gap-1.5 border-t border-ink/8 px-2.5 py-2">
            {pendingOrgsCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('approvals')}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-500/20"
              >
                {pendingOrgsCount} org menunggu <ArrowRight className="size-3" />
              </button>
            )}
            {pendingReportsCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('moderation')}
                className="inline-flex items-center gap-1 rounded-full bg-leaf/12 px-2.5 py-1 text-[11px] font-medium text-forest hover:bg-leaf/20"
              >
                {pendingReportsCount} laporan perlu cek <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 0. Tren Aktivitas 7 Hari */}
      <section className="card-quiet flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="size-4 text-forest" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold text-ink">Tren 7 Hari Terakhir</h3>
          </div>
          <span className="num text-[11px] font-medium text-ink-soft">
            +{weeklyEvents} event · +{weeklyReports} laporan
          </span>
        </div>

        <div className="grid grid-cols-7 items-end gap-1.5 pt-1">
          {trendBuckets.map((b) => {
            const evH = Math.max(b.events > 0 ? 18 : 4, Math.round((b.events / maxTrendVal) * 48))
            const repH = Math.max(b.reports > 0 ? 18 : 4, Math.round((b.reports / maxTrendVal) * 48))
            return (
              <div key={b.key} className="flex flex-col items-center gap-1">
                <div className="flex h-12 items-end gap-0.5">
                  <div
                    title={`${b.label}: ${b.events} event`}
                    className={`w-2 rounded-t-[3px] transition-all ${b.events > 0 ? 'bg-leaf' : 'bg-ink/10'}`}
                    style={{ height: `${evH}px` }}
                  />
                  <div
                    title={`${b.label}: ${b.reports} laporan`}
                    className={`w-2 rounded-t-[3px] transition-all ${b.reports > 0 ? 'bg-amber-400' : 'bg-ink/10'}`}
                    style={{ height: `${repH}px` }}
                  />
                </div>
                <span className="text-[9px] text-ink-soft">{b.label}</span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-leaf" /> Event Baru
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400" /> Laporan Warga
          </span>
        </div>
      </section>

      {/* 1. Kondisi Bumi & Radar */}
      <section className="card-quiet flex flex-col gap-3 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Leaf className="size-4 text-leaf" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold text-ink">Kondisi Radar &amp; Bumi</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            <Satellite className="size-3 text-amber-600" /> {signalsCount} sinyal satelit
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-ink-soft">
            <span>{resolvedCount} pulih</span>
            <span>{progressCount} berjalan</span>
            <span>{openCount} terbuka</span>
          </div>
          <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-canvas">
            <div className="h-full bg-resolved transition-all" style={{ width: `${resolvedPct}%` }} />
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${progressPct}%` }} />
            <div className="h-full bg-leaf/70 transition-all" style={{ width: `${openPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div className="rounded-[10px] bg-canvas px-3 py-2">
            <p className="text-[11px] text-ink-soft">Sampah Terangkut</p>
            <p className="num mt-0.5 text-[15px] font-semibold text-ink">{totalWasteKg.toLocaleString('id-ID')} kg</p>
          </div>
          <div className="rounded-[10px] bg-canvas px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] text-ink-soft">
              <Trees className="size-3 text-leaf" /> Pohon Tertanam
            </p>
            <p className="num mt-0.5 text-[15px] font-semibold text-ink">{totalTrees.toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Ecosystem Mini Bars */}
        <div className="flex flex-col gap-1.5 pt-1">
          <p className="text-[11px] font-medium text-ink-soft">Sebaran Ekosistem</p>
          {ECOSYSTEM_META.map((eco) => {
            const count = nonCancelled.filter((ev) => ev.ecosystem === eco.id).length
            const pct = Math.round((count / maxEcoCount) * 100)
            return (
              <div key={eco.id} className="grid grid-cols-[106px_1fr_24px] items-center gap-2 text-[11px]">
                <span className="text-ink-soft">{eco.label}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div className={`h-full rounded-full ${eco.color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="num text-right font-medium text-ink">{count}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. Kelancaran Donasi */}
      <section className="card-quiet flex flex-col gap-3 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <HeartHandshake className="size-4 text-rose-600" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold text-ink">Kelancaran Donasi</h3>
          </div>
          <span className="num rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink">
            {donationPct}% target
          </span>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <p className="num text-[18px] font-semibold text-ink">{formatRupiahCompact(totalCollected)}</p>
            <p className="num text-[11px] text-ink-soft">dari {formatRupiahCompact(totalTarget)}</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${donationPct}%` }} />
          </div>
        </div>

        {activeCampaigns.length === 0 ? (
          <p className="text-[12px] text-ink-soft">Belum ada kampanye donasi aktif</p>
        ) : (
          <div className="flex flex-col gap-2 pt-0.5">
            {activeCampaigns.slice(0, 3).map((c) => {
              const pct = c.target_amount > 0 ? Math.min(100, Math.round((c.collected_amount / c.target_amount) * 100)) : 0
              return (
                <div key={c.id} className="rounded-[10px] bg-canvas p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{c.title}</p>
                      <p className="num text-[11px] text-ink-soft">
                        {formatRupiahCompact(c.collected_amount)} / {formatRupiahCompact(c.target_amount)} ({pct}%)
                      </p>
                    </div>
                    {onFocusLocation && (
                      <button
                        type="button"
                        onClick={() => onFocusLocation(c.lat, c.lng)}
                        aria-label={`Fokus peta ke ${c.title}`}
                        className="shrink-0 rounded-full p-1 text-forest hover:bg-forest/10"
                      >
                        <Crosshair className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. Audit Log Sesi */}
      {auditLog.length > 0 && (
        <section className="card-quiet flex flex-col gap-2 p-3.5">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="size-4 text-ink-soft" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold text-ink">Aktivitas Admin Sesi Ini</h3>
          </div>
          <ul className="divide-y divide-ink/8">
            {auditLog.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-[11px]">
                <span className="truncate text-ink">{item.label}</span>
                <span className="num shrink-0 text-ink-soft">{item.time}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
