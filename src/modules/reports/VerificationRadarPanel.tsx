import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Ban, CalendarPlus, Check, MapPin, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DashedOutline, Pill, ReportStatusPill } from '../../components/ui/atoms'
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
          <h2 className="text-[21px] font-semibold tracking-tight text-ink">Verifikasi</h2>
          <button
            type="button"
            onClick={onCreateStandaloneEvent}
            className="btn-primary h-9 px-3.5 text-xs"
          >
            <Plus className="size-3.5" />
            Event
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`h-8 rounded-full px-3 text-[11.5px] transition-colors ${
              filter === t.id
                ? 'bg-leaf font-medium text-white'
                : 'bg-[#f5f7ff] font-light text-ink-soft hover:text-forest'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-card bg-[#f5f7ff] px-4 py-3 text-xs font-light text-ink">
          {error}
        </p>
      )}

      {queueQuery.isPending && !queueQuery.data ? (
        <p className="py-8 text-center text-sm font-light text-ink-soft">Memuat antrean…</p>
      ) : queueQuery.isError && !queueQuery.data ? (
        <div className="relative rounded-[20px] bg-[#f5f7ff] p-5 text-center">
          <DashedOutline rx={19} />
          <p className="text-xs font-light text-ink-soft">
            {queueQuery.error instanceof Error ? queueQuery.error.message : 'Gagal memuat antrean'}
          </p>
          <button
            type="button"
            onClick={() => void queueQuery.refetch()}
            className="mt-3 h-9 rounded-full bg-white px-4 text-xs font-normal text-ink shadow-[0_1px_2px_rgba(18,29,79,0.04)]"
          >
            Muat Ulang
          </button>
        </div>
      ) : reports.length === 0 ? (
        <p className="relative rounded-[20px] bg-[#f5f7ff] p-6 text-center text-sm font-semibold text-ink-soft">
          <DashedOutline rx={19} />
          Kosong
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => {
            const hasLinkedEvent = (r.linked_events?.length ?? 0) > 0
            const canCreateEvent = r.status === 'verified' || r.status === 'escalated'
            const isPending = r.status === 'pending_verification' || r.status === 'escalated'
            return (
              <article key={r.id} className="relative overflow-hidden rounded-[20px] bg-[#f5f7ff]">
                <DashedOutline rx={19} />
                {r.before_image_url && (
                  <div className="relative aspect-[16/9] w-full bg-muted">
                    <img src={r.before_image_url} alt={r.title} className="size-full object-cover" />
                    <span className="num absolute top-2.5 right-2.5 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-extrabold text-ink">
                      AI {r.ai_confidence}%
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ReportStatusPill status={r.status} />
                    <Pill>{ECOSYSTEM_LABEL[r.ecosystem]}</Pill>
                  </div>

                  <div>
                    <h3 className="font-sans text-[14.5px] leading-snug font-medium text-ink">{r.title}</h3>
                    <p className="mt-1 flex items-center gap-1 text-[12px] font-normal text-ink-soft">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{r.location_name}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-normal text-ink-soft">
                      {r.is_anonymous ? 'Anonim' : r.reporter?.full_name ?? 'Warga'} · {r.threat_category}
                    </p>
                  </div>

                  {r.location_mismatch && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-ink-soft">
                      <AlertTriangle className="size-3.5" /> Jarak GPS &gt;5 km
                    </p>
                  )}

                  {hasLinkedEvent && (
                    <p className="rounded-[12px] bg-canvas px-3 py-2 text-xs font-bold text-ink">
                      Event aktif: {r.linked_events?.[0]?.title}
                    </p>
                  )}

                  <div className="mt-1 flex flex-wrap gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, 'verified')}
                          className="btn-primary h-10 flex-1 px-3.5 text-xs disabled:opacity-50"
                        >
                          <Check className="size-3.5" /> Setujui
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, 'rejected')}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 text-xs font-bold text-ink-soft disabled:opacity-50"
                        >
                          <Ban className="size-3.5" /> Tolak
                        </button>
                      </>
                    )}

                    {canCreateEvent && (
                      <button
                        type="button"
                        onClick={() => onCreateEvent(r)}
                        className="btn-primary h-10 flex-1 px-4 text-xs"
                      >
                        <CalendarPlus className="size-3.5" /> Buat Event
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
