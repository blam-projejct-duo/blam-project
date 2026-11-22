import { ClipboardList, Crosshair, Flame, HeartHandshake, Leaf, Satellite, Trees, Users } from 'lucide-react'
import type { ConservationEvent, Ecosystem, FundraisingCampaign, Organization } from '../../types'

export interface AdminAuditEntry {
  id: string
  label: string
  time: string
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

export default function AdminMonitorView({
  events,
  orgs,
  campaigns,
  pendingOrgsCount,
  pendingReportsCount,
  signalsCount,
  auditLog = [],
  onFocusLocation,
}: {
  events: ConservationEvent[]
  orgs: Organization[]
  campaigns: FundraisingCampaign[]
  pendingOrgsCount: number
  pendingReportsCount: number
  signalsCount: number
  auditLog?: AdminAuditEntry[]
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
  const totalParticipants = events.reduce((sum, ev) => sum + (ev.event_participants?.length ?? 0), 0)

  const verifiedOrgs = orgs.filter((o) => o.is_verified)
  const communitiesCount = verifiedOrgs.filter((o) => o.type === 'community').length
  const agenciesCount = verifiedOrgs.filter((o) => o.type === 'agency').length
  const totalActiveMembers = verifiedOrgs.reduce((sum, o) => sum + (o.active_members_count ?? 0), 0)
  const totalOrgActions = verifiedOrgs.reduce((sum, o) => sum + (o.actions_count ?? 0), 0)

  const totalCollected = campaigns.reduce((sum, c) => sum + (c.collected_amount ?? 0), 0)
  const totalTarget = campaigns.reduce((sum, c) => sum + (c.target_amount ?? 0), 0)
  const donationPct = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0
  const activeCampaigns = campaigns.filter((c) => c.status === 'active')

  const maxEcoCount = Math.max(
    1,
    ...ECOSYSTEM_META.map((eco) => nonCancelled.filter((ev) => ev.ecosystem === eco.id).length),
  )

  return (
    <div className="flex flex-col gap-3.5">
      {/* Top 2x2 Summary Strip */}
      <div className="atlas-group p-1">
        <div className="atlas-strip grid-cols-2 divide-x divide-ink/8 border-y-0">
          <div className="atlas-strip-cell">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Pemulihan Bumi</p>
            <p className="num mt-1 text-[20px] font-semibold text-leaf">{recoveryPct}%</p>
          </div>
          <div className="atlas-strip-cell">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Perlu Tindakan</p>
            <p className="num mt-1 text-[20px] font-semibold text-ink">{pendingOrgsCount + pendingReportsCount}</p>
          </div>
        </div>
      </div>

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

      {/* 3. Keaktifan Relawan & Organisasi */}
      <section className="card-quiet flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-forest" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold text-ink">Keaktifan Relawan &amp; Org</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-leaf">
            <Flame className="size-3.5" /> {verifiedOrgs.length} org aktif
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[10px] bg-canvas px-2.5 py-2 text-center">
            <p className="num text-[16px] font-semibold text-ink">{totalActiveMembers}</p>
            <p className="text-[10px] text-ink-soft">Anggota Org</p>
          </div>
          <div className="rounded-[10px] bg-canvas px-2.5 py-2 text-center">
            <p className="num text-[16px] font-semibold text-ink">{totalParticipants}</p>
            <p className="text-[10px] text-ink-soft">Peserta Aksi</p>
          </div>
          <div className="rounded-[10px] bg-canvas px-2.5 py-2 text-center">
            <p className="num text-[16px] font-semibold text-ink">{totalOrgActions}</p>
            <p className="text-[10px] text-ink-soft">Aksi Selesai</p>
          </div>
        </div>

        <p className="text-[11px] text-ink-soft">
          Terdiri dari <strong className="font-semibold text-ink">{communitiesCount}</strong> komunitas dan{' '}
          <strong className="font-semibold text-ink">{agenciesCount}</strong> instansi terverifikasi.
        </p>
      </section>

      {/* 4. Audit Log Sesi */}
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
