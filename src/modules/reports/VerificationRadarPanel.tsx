import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Ban, CalendarPlus, Check, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ReportStatusPill } from '../../components/ui/atoms'
import { fetchReportsQueue, verifyCitizenReport } from '../../lib/api'
import { ECOSYSTEM_LABEL } from '../../lib/constants'
import type { CitizenReport, ReportStatus } from '../../types'
import { useAuth } from '../auth/AuthContext'

type FilterTab = 'all' | 'pending_verification' | 'escalated' | 'verified'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'pending_verification', label: 'Antrean' },
  { id: 'escalated', label: 'Eskalasi' },
  { id: 'verified', label: 'Terverifikasi' },
]

export default function VerificationRadarPanel({
  embedded = false,
  query = '',
  onCreateEvent,
  onCreateStandaloneEvent,
}: {
  embedded?: boolean
  query?: string
  onCreateEvent: (report: CitizenReport) => void
  onCreateStandaloneEvent: () => void
}) {
  const queryClient = useQueryClient()
  const { profile, memberships } = useAuth()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canAccess = Boolean(
    profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin'),
  )
  const activeOrgId = memberships.find((m) => m.status === 'active' && m.organization?.is_verified)?.organization_id

  const queueQuery = useQuery({
    queryKey: ['reports-queue', profile?.id],
    queryFn: () => fetchReportsQueue(false),
    enabled: canAccess,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const reports = useMemo(() => {
    const rows = queueQuery.data ?? []
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.location_name.toLowerCase().includes(q) ||
        r.threat_category.toLowerCase().includes(q)
      )
    })
  }, [queueQuery.data, filter, query])

  const decide = async (reportId: string, status: Extract<ReportStatus, 'verified' | 'rejected'>) => {
    setBusyId(reportId)
    setError(null)
    try {
      await verifyCitizenReport(reportId, status, activeOrgId)
      await queryClient.invalidateQueries({ queryKey: ['reports-queue'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memverifikasi laporan')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold text-ink">Verifikasi</h2>
          <button
            type="button"
            onClick={onCreateStandaloneEvent}
            className="btn-primary h-9 !rounded-[10px] px-3 text-[12px]"
          >
            <Plus className="size-4" strokeWidth={1.75} />
            Event
          </button>
        </div>
      )}

      <div className="panel-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`panel-tab flex-1 whitespace-nowrap ${filter === t.id ? 'is-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="card-quiet px-4 py-3 text-[12px] font-medium text-critical">
          {error}
        </p>
      )}

      {queueQuery.isPending && !queueQuery.data ? (
        <p className="py-8 text-center text-[14px] font-normal text-ink-soft">Memuat antrean</p>
      ) : queueQuery.isError && !queueQuery.data ? (
        <div className="card-quiet p-4 text-center">
          <p className="text-[12px] font-normal text-ink-soft">
            {queueQuery.error instanceof Error ? queueQuery.error.message : 'Gagal memuat antrean'}
          </p>
          <button
            type="button"
            onClick={() => void queueQuery.refetch()}
            className="btn-soft mt-3 h-9 !rounded-[10px] px-4 text-[12px]"
          >
            Muat Ulang
          </button>
        </div>
      ) : reports.length === 0 ? (
        <p className="card-quiet p-6 text-center text-[13px] font-normal text-ink-soft">
          Belum ada laporan dalam antrean ini
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => {
            const hasLinkedEvent = (r.linked_events?.length ?? 0) > 0
            const canCreateEvent = r.status === 'verified' || r.status === 'escalated'
            const isPending = r.status === 'pending_verification' || r.status === 'escalated'
            const reporterName = r.is_anonymous ? 'Anonim' : (r.reporter?.full_name ?? 'Warga')
            return (
              <article key={r.id} className="card-quiet overflow-hidden rounded-[12px]">
                {r.before_image_url && (
                  <div className="aspect-[16/9] w-full overflow-hidden border-b border-line bg-canvas">
                    <img src={r.before_image_url} alt={r.title} className="size-full object-cover" />
                  </div>
                )}

                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <ReportStatusPill status={r.status} />
                    <span className="num text-[12px] font-normal text-ink-soft">
                      {ECOSYSTEM_LABEL[r.ecosystem]} · {r.ai_confidence}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[14px] leading-snug font-medium text-ink">{r.title}</h3>
                    <p className="mt-1 truncate text-[12px] font-normal text-ink-soft">
                      {r.location_name} · {r.threat_category} · {reporterName}
                    </p>
                  </div>

                  {r.location_mismatch && (
                    <p className="flex items-center gap-2 text-[12px] font-medium text-progress">
                      <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} />
                      <span>Jarak GPS melebihi 5 km</span>
                    </p>
                  )}

                  {hasLinkedEvent && (
                    <p className="rounded-[8px] border border-line bg-canvas px-3 py-2 text-[12px] font-medium text-ink">
                      Event aktif: {r.linked_events?.[0]?.title}
                    </p>
                  )}

                  {(isPending || canCreateEvent) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void decide(r.id, 'verified')}
                            className="btn-primary h-9 flex-1 !rounded-[10px] px-3 text-[12px] disabled:opacity-50"
                          >
                            <Check className="size-4" strokeWidth={1.75} /> Setujui
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void decide(r.id, 'rejected')}
                            className="btn-soft h-9 !rounded-[10px] px-3 text-[12px] text-ink-soft hover:text-ink disabled:opacity-50"
                          >
                            <Ban className="size-4" strokeWidth={1.75} /> Tolak
                          </button>
                        </>
                      )}

                      {canCreateEvent && (
                        <button
                          type="button"
                          onClick={() => onCreateEvent(r)}
                          className="btn-primary h-9 flex-1 !rounded-[10px] px-3 text-[12px]"
                        >
                          <CalendarPlus className="size-4" strokeWidth={1.75} /> Buat Event
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
