import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  EyeOff,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ReportStatusPill, StatusPill } from '../../components/ui/atoms'
import {
  fetchFundraisings,
  fetchOrgs,
  fetchReportsQueue,
  moderateEventAdmin,
  moderateFundraisingAdmin,
  moderateHotspotAdmin,
  moderateReportAdmin,
  revokeOrgAdmin,
  verifyOrgAdmin,
} from '../../lib/api'
import type { ConservationEvent, ReportStatus, SatelliteSignal } from '../../types'
import AdminMonitorView from './AdminMonitorView'
import type { AdminAuditEntry } from './AdminMonitorView'
import AdminOrgsMonitorView from './AdminOrgsMonitorView'

export type AdminSection = 'monitor' | 'approvals' | 'orgs' | 'moderation'
type ModerationTab = 'reports' | 'events' | 'hotspots' | 'donations'
type OrgFilter = 'all' | 'community' | 'agency'
type ReportFilter = 'all' | 'mismatch' | 'critical'
type EventFilter = 'active' | 'all' | 'closed'

const SECTION_TITLES: Record<AdminSection, string> = {
  monitor: 'Monitor Radar',
  approvals: 'Persetujuan Org',
  orgs: 'Pantau Organisasi',
  moderation: 'Moderasi Konten',
}

export default function AdminPanel({
  section,
  events,
  signals = [],
  signalsCount,
  headerAction,
  onFocusLocation,
  onRefreshEvents,
  onRefreshLayers,
}: {
  section?: AdminSection
  events: ConservationEvent[]
  signals?: SatelliteSignal[]
  signalsCount?: number
  headerAction?: ReactNode
  onFocusLocation?: (lat: number, lng: number) => void
  onRefreshEvents: () => Promise<void>
  onRefreshLayers?: () => Promise<void>
}) {
  const queryClient = useQueryClient()
  const [mobileSection, setMobileSection] = useState<AdminSection>('monitor')
  const activeSection = section ?? mobileSection

  const [modTab, setModTab] = useState<ModerationTab>('reports')
  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState<OrgFilter>('all')
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')
  const [eventFilter, setEventFilter] = useState<EventFilter>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>([])

  const logAction = (label: string) => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    setAuditLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, label, time }, ...prev].slice(0, 12))
  }

  const orgsQuery = useQuery({
    queryKey: ['admin-all-orgs'],
    queryFn: () => fetchOrgs(true),
    staleTime: 0,
  })

  const reportsQuery = useQuery({
    queryKey: ['reports-queue', 'admin'],
    queryFn: () => fetchReportsQueue(false),
    staleTime: 0,
  })

  const fundraisingsQuery = useQuery({
    queryKey: ['admin-fundraisings'],
    queryFn: fetchFundraisings,
    staleTime: 30_000,
  })

  const allOrgs = orgsQuery.data ?? []
  const pendingOrgs = useMemo(() => allOrgs.filter((o) => !o.is_verified), [allOrgs])
  const reports = reportsQuery.data ?? []
  const campaigns = fundraisingsQuery.data ?? []

  const q = search.trim().toLowerCase()

  const filteredPendingOrgs = useMemo(
    () =>
      pendingOrgs.filter((o) => {
        if (orgFilter !== 'all' && o.type !== orgFilter) return false
        if (!q) return true
        return o.name.toLowerCase().includes(q) || o.region.toLowerCase().includes(q)
      }),
    [pendingOrgs, orgFilter, q],
  )

  const filteredReports = useMemo(
    () =>
      reports.filter((r) => {
        if (reportFilter === 'mismatch' && !r.location_mismatch) return false
        if (reportFilter === 'critical' && r.ai_severity !== 'critical' && r.status !== 'escalated') return false
        if (!q) return true
        return (
          r.title.toLowerCase().includes(q) ||
          r.location_name.toLowerCase().includes(q) ||
          r.threat_category.toLowerCase().includes(q)
        )
      }),
    [reports, reportFilter, q],
  )

  const filteredEvents = useMemo(
    () =>
      events.filter((ev) => {
        const isClosed = ev.status === 'resolved' || ev.status === 'cancelled'
        if (eventFilter === 'active' && isClosed) return false
        if (eventFilter === 'closed' && !isClosed) return false
        if (!q) return true
        return ev.title.toLowerCase().includes(q) || ev.location_name.toLowerCase().includes(q)
      }),
    [events, eventFilter, q],
  )

  const filteredSignals = useMemo(
    () =>
      signals.filter((s) => {
        if (!q) return true
        return s.title.toLowerCase().includes(q) || s.categoryLabel.toLowerCase().includes(q)
      }),
    [signals, q],
  )

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((c) => {
        if (!q) return true
        return (
          c.title.toLowerCase().includes(q) ||
          c.location_name.toLowerCase().includes(q) ||
          c.organizer_name.toLowerCase().includes(q)
        )
      }),
    [campaigns, q],
  )

  const error =
    actionError ??
    (orgsQuery.isError
      ? orgsQuery.error instanceof Error
        ? orgsQuery.error.message
        : 'Gagal memuat data organisasi'
      : reportsQuery.isError
        ? reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : 'Gagal memuat antrean laporan'
        : null)

  const toggleExpand = (id: string, coords?: { lat: number; lng: number }) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id
      if (next && coords) onFocusLocation?.(coords.lat, coords.lng)
      return next
    })
  }

  const handleOrg = async (orgId: string, orgName: string, approve: boolean) => {
    setBusyId(orgId)
    setActionError(null)
    try {
      await verifyOrgAdmin(orgId, approve)
      if (expandedId === orgId) setExpandedId(null)
      logAction(`${approve ? 'Menyetujui' : 'Menolak'} org ${orgName}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-all-orgs'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
        queryClient.invalidateQueries({ queryKey: ['orgs'] }),
      ])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal verifikasi organisasi')
    } finally {
      setBusyId(null)
    }
  }

  const handleRevokeOrg = async (orgId: string, orgName: string) => {
    setBusyId(orgId)
    setActionError(null)
    try {
      await revokeOrgAdmin(orgId)
      logAction(`Membekukan org ${orgName}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-all-orgs'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
        queryClient.invalidateQueries({ queryKey: ['orgs'] }),
      ])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal membekukan organisasi')
    } finally {
      setBusyId(null)
    }
  }

  const moderateReport = async (reportId: string, title: string, status: ReportStatus) => {
    setBusyId(reportId)
    setActionError(null)
    try {
      await moderateReportAdmin(reportId, status)
      if (expandedId === reportId) setExpandedId(null)
      logAction(`${status === 'verified' ? 'Verifikasi' : 'Tolak'} laporan "${title}"`)
      await queryClient.invalidateQueries({ queryKey: ['reports-queue'] })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal moderasi laporan')
    } finally {
      setBusyId(null)
    }
  }

  const moderateEvent = async (eventId: string, title: string, status: 'cancelled' | 'open') => {
    setBusyId(eventId)
    setActionError(null)
    try {
      await moderateEventAdmin(eventId, status)
      if (expandedId === eventId) setExpandedId(null)
      logAction(`${status === 'cancelled' ? 'Batalkan' : 'Aktifkan'} event "${title}"`)
      await onRefreshEvents()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal moderasi event')
    } finally {
      setBusyId(null)
    }
  }

  const markFalseHotspot = async (hotspotId: string, title: string) => {
    setBusyId(hotspotId)
    setActionError(null)
    try {
      await moderateHotspotAdmin(hotspotId)
      if (expandedId === hotspotId) setExpandedId(null)
      logAction(`Tandai false hotspot "${title}"`)
      await onRefreshLayers?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal moderasi hotspot')
    } finally {
      setBusyId(null)
    }
  }

  const moderateDonation = async (campaignId: string, title: string, status: 'active' | 'closed') => {
    setBusyId(campaignId)
    setActionError(null)
    try {
      await moderateFundraisingAdmin(campaignId, status)
      logAction(`${status === 'closed' ? 'Tutup' : 'Aktifkan'} donasi "${title}"`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-fundraisings'] }),
        queryClient.invalidateQueries({ queryKey: ['fundraisings'] }),
      ])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal moderasi kampanye donasi')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-semibold text-ink">{SECTION_TITLES[activeSection]}</h2>
        {headerAction}
      </div>

      {/* Mobile section switcher when rendered inside mobile sheet */}
      {!section && (
        <div className="grid grid-cols-4 gap-1 rounded-[12px] bg-canvas p-1 ring-1 ring-ink/8">
          {(
            [
              { id: 'monitor', label: 'Monitor' },
              { id: 'approvals', label: `Setujui (${pendingOrgs.length})` },
              { id: 'orgs', label: 'Org' },
              { id: 'moderation', label: 'Moderasi' },
            ] as const
          ).map((item) => {
            const active = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileSection(item.id)
                  setExpandedId(null)
                  setSearch('')
                }}
                className={`truncate rounded-[9px] px-1.5 py-2 text-[11px] font-medium transition ${
                  active ? 'bg-white text-ink shadow-xs ring-1 ring-ink/6' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="card-quiet px-4 py-3 text-[12px] font-medium text-critical">
          {error}
        </p>
      )}

      {activeSection === 'monitor' && (
        <AdminMonitorView
          events={events}
          orgs={allOrgs}
          campaigns={campaigns}
          pendingOrgsCount={pendingOrgs.length}
          pendingReportsCount={reports.length}
          signalsCount={signalsCount ?? signals.length}
          auditLog={auditLog}
          onFocusLocation={onFocusLocation}
        />
      )}

      {activeSection === 'orgs' && (
        <AdminOrgsMonitorView
          orgs={allOrgs}
          events={events}
          isLoading={orgsQuery.isLoading}
          busyId={busyId}
          onRevokeOrg={handleRevokeOrg}
          onFocusLocation={onFocusLocation}
        />
      )}

      {activeSection === 'approvals' && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama organisasi atau wilayah…"
              className="h-9 w-full rounded-[10px] bg-white pr-8 pl-8 text-[13px] text-ink ring-1 ring-ink/10 placeholder:text-ink-soft/70 focus:ring-2 focus:ring-forest/40 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: `Semua (${pendingOrgs.length})` },
                { id: 'community', label: 'Komunitas' },
                { id: 'agency', label: 'Instansi' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setOrgFilter(chip.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  orgFilter === chip.id
                    ? 'bg-ink text-white'
                    : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:text-ink'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {orgsQuery.isLoading ? (
            <div className="card-quiet flex items-center justify-center gap-2 p-6 text-[13px] text-ink-soft">
              <Loader2 className="size-4 animate-spin" /> Memuat pengajuan organisasi…
            </div>
          ) : filteredPendingOrgs.length === 0 ? (
            <div className="card-quiet flex flex-col items-center gap-1.5 p-6 text-center">
              <CheckCircle2 className="size-6 text-leaf" strokeWidth={1.75} />
              <p className="text-[13px] font-medium text-ink">
                {pendingOrgs.length === 0
                  ? 'Semua pengajuan organisasi sudah ditinjau'
                  : 'Tidak ada pengajuan yang cocok'}
              </p>
              {pendingOrgs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setOrgFilter('all')
                  }}
                  className="mt-1 text-[12px] font-medium text-forest hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredPendingOrgs.map((o) => {
                const open = expandedId === o.id
                const isBusy = busyId === o.id
                return (
                  <article
                    key={o.id}
                    className={`card-quiet overflow-hidden rounded-[12px] transition ${
                      open ? 'bg-white ring-2 ring-forest/30' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(o.id)}
                      className="flex w-full items-center justify-between gap-2 p-3.5 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-ink-soft">
                          {o.type === 'agency' ? 'Instansi' : 'Komunitas'} · {o.region}
                        </p>
                        <p className="mt-0.5 truncate text-[14px] font-medium text-ink">{o.name}</p>
                      </div>
                      <ChevronDown
                        className={`size-4 shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {open && (
                      <div className="flex flex-col gap-3 border-t border-ink/8 px-3.5 pt-3 pb-3.5">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
                          <span>Slug: @{o.slug}</span>
                          {o.creator?.full_name && <span>Pengaju: {o.creator.full_name}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleOrg(o.id, o.name, true)}
                            className="btn-primary h-8 flex-1 !rounded-[8px] px-2.5 text-[12px]"
                          >
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4" strokeWidth={1.75} />
                            )}
                            Setujui
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleOrg(o.id, o.name, false)}
                            className="btn-soft h-8 flex-1 !rounded-[8px] px-2.5 text-[12px] text-ink-soft"
                          >
                            <Ban className="size-4" strokeWidth={1.75} /> Tolak
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeSection === 'moderation' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-1 rounded-[12px] bg-canvas p-1 ring-1 ring-ink/8">
            {(
              [
                { id: 'reports', label: 'Laporan', count: reports.length },
                { id: 'events', label: 'Event', count: events.length },
                { id: 'hotspots', label: 'Hotspot', count: signals.length },
                { id: 'donations', label: 'Donasi', count: campaigns.length },
              ] as const
            ).map((item) => {
              const active = modTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setModTab(item.id)
                    setExpandedId(null)
                    setSearch('')
                  }}
                  className={`flex items-center justify-center gap-1 rounded-[9px] px-1.5 py-2 text-[11px] font-medium transition ${
                    active ? 'bg-white text-ink shadow-xs ring-1 ring-ink/6' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span
                    className={`num rounded-full px-1 py-0.5 text-[9px] font-semibold ${
                      active ? 'bg-ink text-white' : 'bg-ink/8 text-ink-soft'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                modTab === 'reports'
                  ? 'Cari laporan atau lokasi…'
                  : modTab === 'events'
                    ? 'Cari event atau lokasi…'
                    : modTab === 'hotspots'
                      ? 'Cari sinyal satelit / hotspot…'
                      : 'Cari kampanye donasi atau penyelenggara…'
              }
              className="h-9 w-full rounded-[10px] bg-white pr-8 pl-8 text-[13px] text-ink ring-1 ring-ink/10 placeholder:text-ink-soft/70 focus:ring-2 focus:ring-forest/40 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-soft hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {(modTab === 'reports' || modTab === 'events') && (
            <div className="flex flex-wrap gap-1.5">
              {modTab === 'reports' &&
                (
                  [
                    { id: 'all', label: 'Semua' },
                    { id: 'mismatch', label: 'Mismatch > 5km' },
                    { id: 'critical', label: 'Kritis / Eskalasi' },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setReportFilter(chip.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      reportFilter === chip.id
                        ? 'bg-ink text-white'
                        : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:text-ink'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}

              {modTab === 'events' &&
                (
                  [
                    { id: 'active', label: 'Aktif' },
                    { id: 'all', label: 'Semua' },
                    { id: 'closed', label: 'Selesai / Batal' },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setEventFilter(chip.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      eventFilter === chip.id
                        ? 'bg-ink text-white'
                        : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:text-ink'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
            </div>
          )}

          {modTab === 'reports' &&
            (reportsQuery.isLoading ? (
              <div className="card-quiet flex items-center justify-center gap-2 p-6 text-[13px] text-ink-soft">
                <Loader2 className="size-4 animate-spin" /> Memuat antrean laporan…
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="card-quiet flex flex-col items-center gap-1.5 p-6 text-center">
                <CheckCircle2 className="size-6 text-leaf" strokeWidth={1.75} />
                <p className="text-[13px] font-medium text-ink">
                  {reports.length === 0 ? 'Semua antrean laporan beres' : 'Tidak ada laporan yang cocok'}
                </p>
                {reports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setReportFilter('all')
                    }}
                    className="mt-1 text-[12px] font-medium text-forest hover:underline"
                  >
                    Reset filter
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredReports.map((r) => {
                  const open = expandedId === r.id
                  const isBusy = busyId === r.id
                  return (
                    <article
                      key={r.id}
                      className={`card-quiet overflow-hidden rounded-[12px] transition ${
                        open ? 'bg-white ring-2 ring-forest/30' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.id, { lat: r.lat, lng: r.lng })}
                        className="flex w-full items-start justify-between gap-2 p-3.5 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ReportStatusPill status={r.status} />
                            {r.location_mismatch && (
                              <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Mismatch &gt;5km
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-[14px] font-medium text-ink">{r.title}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-soft">
                            <MapPin className="size-3 shrink-0" /> {r.location_name}
                          </p>
                        </div>
                        <ChevronDown
                          className={`mt-1 size-4 shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {open && (
                        <div className="flex flex-col gap-3 border-t border-ink/8 px-3.5 pt-3 pb-3.5">
                          {r.before_image_url && (
                            <img
                              src={r.before_image_url}
                              alt={r.title}
                              className="aspect-[16/10] w-full rounded-[10px] bg-canvas object-cover"
                            />
                          )}

                          {r.description && <p className="text-[12px] leading-relaxed text-ink">{r.description}</p>}

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 font-medium text-ink">
                              <Sparkles className="size-3 text-leaf" />
                              AI {Math.round(r.ai_confidence * 100)}% · {r.ai_severity}
                            </span>
                            <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-soft">{r.threat_category}</span>
                            {onFocusLocation && (
                              <button
                                type="button"
                                onClick={() => onFocusLocation(r.lat, r.lng)}
                                className="ml-auto inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 font-medium text-forest hover:bg-forest/10"
                              >
                                <Crosshair className="size-3" /> Fokus Peta
                              </button>
                            )}
                          </div>

                          {r.ai_recommendations?.length > 0 && (
                            <p className="rounded-[9px] bg-canvas px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                              {r.ai_recommendations.slice(0, 2).join(' · ')}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void moderateReport(r.id, r.title, 'verified')}
                              className="btn-primary h-8 flex-1 !rounded-[8px] px-2.5 text-[12px]"
                            >
                              {isBusy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Check className="size-4" strokeWidth={1.75} />
                              )}
                              Verifikasi
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void moderateReport(r.id, r.title, 'rejected')}
                              className="btn-soft h-8 flex-1 !rounded-[8px] px-2.5 text-[12px] text-ink-soft"
                            >
                              <Ban className="size-4" strokeWidth={1.75} /> Tolak Spam
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ))}

          {modTab === 'events' &&
            (filteredEvents.length === 0 ? (
              <div className="card-quiet flex flex-col items-center gap-1.5 p-6 text-center">
                <CheckCircle2 className="size-6 text-leaf" strokeWidth={1.75} />
                <p className="text-[13px] font-medium text-ink">Tidak ada event yang cocok</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setEventFilter('all')
                  }}
                  className="mt-1 text-[12px] font-medium text-forest hover:underline"
                >
                  Tampilkan semua event
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredEvents.map((ev) => {
                  const open = expandedId === ev.id
                  const isClosed = ev.status === 'resolved' || ev.status === 'cancelled'
                  const isBusy = busyId === ev.id
                  return (
                    <article
                      key={ev.id}
                      className={`card-quiet overflow-hidden rounded-[12px] transition ${
                        open ? 'bg-white ring-2 ring-forest/30' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(ev.id, { lat: ev.lat, lng: ev.lng })}
                        className="flex w-full items-start justify-between gap-2 p-3.5 text-left"
                      >
                        <div className="min-w-0">
                          <StatusPill status={ev.status} />
                          <p className="mt-1 truncate text-[14px] font-medium text-ink">{ev.title}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-soft">
                            <MapPin className="size-3 shrink-0" /> {ev.location_name}
                          </p>
                        </div>
                        <ChevronDown
                          className={`mt-1 size-4 shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {open && (
                        <div className="flex flex-col gap-3 border-t border-ink/8 px-3.5 pt-3 pb-3.5">
                          {ev.cover_image_url && (
                            <img
                              src={ev.cover_image_url}
                              alt={ev.title}
                              className="aspect-[16/10] w-full rounded-[10px] bg-canvas object-cover"
                            />
                          )}

                          {ev.description && <p className="text-[12px] leading-relaxed text-ink">{ev.description}</p>}

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-soft">{ev.ecosystem}</span>
                            <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-soft">
                              {ev.visibility === 'members_only' ? 'Khusus Anggota' : 'Publik'}
                            </span>
                            {onFocusLocation && (
                              <button
                                type="button"
                                onClick={() => onFocusLocation(ev.lat, ev.lng)}
                                className="ml-auto inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 font-medium text-forest hover:bg-forest/10"
                              >
                                <Crosshair className="size-3" /> Fokus Peta
                              </button>
                            )}
                          </div>

                          {!isClosed && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void moderateEvent(ev.id, ev.title, 'cancelled')}
                              className="btn-soft h-8 w-full !rounded-[8px] px-2.5 text-[12px] text-critical"
                            >
                              {isBusy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Ban className="size-4" strokeWidth={1.75} />
                              )}
                              Batalkan Event
                            </button>
                          )}

                          {ev.status === 'cancelled' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void moderateEvent(ev.id, ev.title, 'open')}
                              className="btn-soft h-8 w-full !rounded-[8px] px-2.5 text-[12px] text-ink"
                            >
                              {isBusy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <RotateCcw className="size-4" strokeWidth={1.75} />
                              )}
                              Aktifkan Kembali
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ))}

          {modTab === 'hotspots' &&
            (filteredSignals.length === 0 ? (
              <div className="card-quiet flex flex-col items-center gap-1.5 p-6 text-center">
                <CheckCircle2 className="size-6 text-leaf" strokeWidth={1.75} />
                <p className="text-[13px] font-medium text-ink">Tidak ada sinyal satelit yang cocok</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredSignals.slice(0, 20).map((sig) => {
                  const open = expandedId === sig.id
                  const isBusy = busyId === sig.id
                  return (
                    <article
                      key={sig.id}
                      className={`card-quiet overflow-hidden rounded-[12px] transition ${
                        open ? 'bg-white ring-2 ring-forest/30' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(sig.id, { lat: sig.lat, lng: sig.lng })}
                        className="flex w-full items-start justify-between gap-2 p-3.5 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              {sig.source.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-ink-soft">{sig.categoryLabel}</span>
                          </div>
                          <p className="mt-1 truncate text-[14px] font-medium text-ink">{sig.title}</p>
                        </div>
                        <ChevronDown
                          className={`mt-1 size-4 shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {open && (
                        <div className="flex flex-col gap-3 border-t border-ink/8 px-3.5 pt-3 pb-3.5">
                          <p className="text-[12px] text-ink-soft">{sig.reason}</p>
                          <div className="flex items-center gap-2">
                            {onFocusLocation && (
                              <button
                                type="button"
                                onClick={() => onFocusLocation(sig.lat, sig.lng)}
                                className="btn-soft h-8 !rounded-[8px] px-2.5 text-[12px] text-forest"
                              >
                                <Crosshair className="size-3.5" /> Fokus Peta
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void markFalseHotspot(sig.id, sig.title)}
                              className="btn-soft h-8 flex-1 !rounded-[8px] px-2.5 text-[12px] text-critical"
                            >
                              {isBusy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <EyeOff className="size-4" strokeWidth={1.75} />
                              )}
                              Tandai False Hotspot
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ))}

          {modTab === 'donations' &&
            (fundraisingsQuery.isLoading ? (
              <div className="card-quiet flex items-center justify-center gap-2 p-6 text-[13px] text-ink-soft">
                <Loader2 className="size-4 animate-spin" /> Memuat kampanye donasi…
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="card-quiet flex flex-col items-center gap-1.5 p-6 text-center">
                <CheckCircle2 className="size-6 text-leaf" strokeWidth={1.75} />
                <p className="text-[13px] font-medium text-ink">Tidak ada kampanye donasi yang cocok</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCampaigns.map((c) => {
                  const open = expandedId === c.id
                  const isBusy = busyId === c.id
                  const pct =
                    c.target_amount > 0 ? Math.min(100, Math.round((c.collected_amount / c.target_amount) * 100)) : 0
                  return (
                    <article
                      key={c.id}
                      className={`card-quiet overflow-hidden rounded-[12px] transition ${
                        open ? 'bg-white ring-2 ring-forest/30' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(c.id, { lat: c.lat, lng: c.lng })}
                        className="flex w-full items-start justify-between gap-2 p-3.5 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                c.status === 'active'
                                  ? 'bg-leaf/12 text-forest'
                                  : 'bg-ink/8 text-ink-soft'
                              }`}
                            >
                              {c.status === 'active' ? 'Aktif' : c.status === 'completed' ? 'Tercapai' : 'Ditutup'}
                            </span>
                            <span className="num text-[11px] font-medium text-ink-soft">{pct}%</span>
                          </div>
                          <p className="mt-1 truncate text-[14px] font-medium text-ink">{c.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                            {c.organizer_name} · {c.location_name}
                          </p>
                        </div>
                        <ChevronDown
                          className={`mt-1 size-4 shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {open && (
                        <div className="flex flex-col gap-3 border-t border-ink/8 px-3.5 pt-3 pb-3.5">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-ink-soft">Terkumpul</span>
                            <span className="num font-semibold text-ink">
                              Rp {c.collected_amount.toLocaleString('id-ID')} / Rp{' '}
                              {c.target_amount.toLocaleString('id-ID')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {onFocusLocation && (
                              <button
                                type="button"
                                onClick={() => onFocusLocation(c.lat, c.lng)}
                                className="btn-soft h-8 !rounded-[8px] px-2.5 text-[12px] text-forest"
                              >
                                <Crosshair className="size-3.5" /> Fokus Peta
                              </button>
                            )}
                            {c.status === 'active' ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void moderateDonation(c.id, c.title, 'closed')}
                                className="btn-soft h-8 flex-1 !rounded-[8px] px-2.5 text-[12px] text-critical"
                              >
                                {isBusy ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Ban className="size-4" strokeWidth={1.75} />
                                )}
                                Tutup Kampanye
                              </button>
                            ) : c.status === 'closed' ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void moderateDonation(c.id, c.title, 'active')}
                                className="btn-soft h-8 flex-1 !rounded-[8px] px-2.5 text-[12px] text-ink"
                              >
                                {isBusy ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-4" strokeWidth={1.75} />
                                )}
                                Aktifkan Lagi
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
