import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ReportStatusPill, StatusPill } from '../../components/ui/atoms'
import {
  fetchOrgs,
  fetchReportsQueue,
  moderateEventAdmin,
  moderateReportAdmin,
  verifyOrgAdmin,
} from '../../lib/api'
import type { ConservationEvent } from '../../types'

export default function AdminPanel({
  events,
  headerAction,
  onRefreshEvents,
}: {
  events: ConservationEvent[]
  headerAction?: ReactNode
  onRefreshEvents: () => Promise<void>
}) {
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const orgsQuery = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: async () => (await fetchOrgs(true)).filter((o) => !o.is_verified),
    staleTime: 0,
  })

  const reportsQuery = useQuery({
    queryKey: ['reports-queue', 'admin'],
    queryFn: () => fetchReportsQueue(false),
    staleTime: 0,
  })

  const orgs = orgsQuery.data ?? []
  const reports = reportsQuery.data ?? []
  const activeCount = events.filter((e) => e.status !== 'resolved' && e.status !== 'cancelled').length
  const resolvedCount = events.filter((e) => e.status === 'resolved').length
  const totalEvents = Math.max(1, events.length)
  const activePct = Math.round((activeCount / totalEvents) * 100)
  const resolvedPct = Math.round((resolvedCount / totalEvents) * 100)

  const error =
    actionError ??
    (orgsQuery.isError
      ? orgsQuery.error instanceof Error
        ? orgsQuery.error.message
        : 'Gagal memuat antrean organisasi'
      : reportsQuery.isError
        ? reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : 'Gagal memuat antrean laporan'
        : null)

  const handleOrg = async (orgId: string, approve: boolean) => {
    setBusyId(orgId)
    setActionError(null)
    try {
      await verifyOrgAdmin(orgId, approve)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
        queryClient.invalidateQueries({ queryKey: ['orgs'] }),
      ])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal verifikasi organisasi')
    } finally {
      setBusyId(null)
    }
  }

  const rejectReport = async (reportId: string) => {
    setBusyId(reportId)
    setActionError(null)
    try {
      await moderateReportAdmin(reportId, 'rejected')
      await queryClient.invalidateQueries({ queryKey: ['reports-queue'] })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal moderasi laporan')
    } finally {
      setBusyId(null)
    }
  }

  const cancelEvent = async (eventId: string) => {
    setBusyId(eventId)
    setActionError(null)
    try {
      await moderateEventAdmin(eventId, 'cancelled')
      await onRefreshEvents()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal moderasi event')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-semibold text-ink">Admin</h2>
        {headerAction}
      </div>

      {error && (
        <p role="alert" className="card-quiet px-4 py-3 text-[12px] font-medium text-critical">
          {error}
        </p>
      )}

      <div className="atlas-group p-1">
        <div className="atlas-strip grid-cols-2 divide-x divide-ink/8 border-y-0">
          <div className="atlas-strip-cell">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Antrean</p>
            <p className="num mt-1 text-[20px] font-semibold text-ink">{orgs.length + reports.length}</p>
          </div>
          <div className="atlas-strip-cell">
            <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">Gerakan Aktif</p>
            <p className="num mt-1 text-[20px] font-semibold text-leaf">{activeCount}</p>
          </div>
        </div>
      </div>

      {events.length > 0 && (
        <div className="card-quiet p-3.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-ink">Progres Penanganan</span>
            <span className="num text-ink-soft">
              {resolvedCount} selesai · {activeCount} aktif
            </span>
          </div>
          <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div className="h-full bg-leaf" style={{ width: `${activePct}%` }} />
            <div className="h-full bg-resolved" style={{ width: `${resolvedPct}%` }} />
          </div>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-medium text-ink-soft">Organisasi ({orgs.length})</p>
        {orgs.length === 0 ? (
          <p className="card-quiet p-4 text-[14px] font-normal text-ink-soft">Belum ada antrean organisasi</p>
        ) : (
          <div className="list-group">
            {orgs.map((o) => (
              <div key={o.id} className="list-row justify-between">
                <div className="min-w-0">
                  <p className="text-[12px] font-normal text-ink-soft">
                    {o.type === 'agency' ? 'Instansi' : 'Komunitas'} · {o.region}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] font-medium text-ink">{o.name}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => void handleOrg(o.id, true)}
                    className="btn-primary h-8 !rounded-[8px] px-2.5 text-[12px]"
                  >
                    <Check className="size-4" strokeWidth={1.75} /> Setujui
                  </button>
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => void handleOrg(o.id, false)}
                    className="btn-soft h-8 !rounded-[8px] px-2.5 text-[12px] text-ink-soft"
                  >
                    <Ban className="size-4" strokeWidth={1.75} /> Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-medium text-ink-soft">Laporan Warga ({reports.length})</p>
        {reports.length === 0 ? (
          <p className="card-quiet p-4 text-[14px] font-normal text-ink-soft">Belum ada antrean laporan</p>
        ) : (
          <div className="list-group">
            {reports.slice(0, 8).map((r) => (
              <div key={r.id} className="list-row justify-between">
                <div className="min-w-0">
                  <ReportStatusPill status={r.status} />
                  <p className="mt-0.5 truncate text-[14px] font-medium text-ink">{r.title}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void rejectReport(r.id)}
                  className="btn-soft h-8 shrink-0 !rounded-[8px] px-2.5 text-[12px] text-ink-soft"
                >
                  Tolak
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-medium text-ink-soft">Event Radar ({events.length})</p>
        <div className="list-group">
          {events.slice(0, 8).map((ev) => (
            <div key={ev.id} className="list-row justify-between">
              <div className="min-w-0">
                <StatusPill status={ev.status} />
                <p className="mt-0.5 truncate text-[14px] font-medium text-ink">{ev.title}</p>
              </div>
              <button
                type="button"
                disabled={busyId === ev.id}
                onClick={() => void cancelEvent(ev.id)}
                className="btn-soft h-8 shrink-0 !rounded-[8px] px-2.5 text-[12px] text-ink-soft"
              >
                Batalkan
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
