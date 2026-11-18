import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check } from 'lucide-react'
import { useState } from 'react'
import { DashedOutline, Pill, ReportStatusPill, StatusPill } from '../../components/ui/atoms'
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
  onRefreshEvents,
}: {
  events: ConservationEvent[]
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
      <h2 className="text-xl font-extrabold tracking-tight text-ink">Admin</h2>

      {error && (
        <p role="alert" className="relative rounded-[20px] bg-[#f7faf6] px-4 py-3 text-xs font-semibold text-ink">
          <DashedOutline rx={19} />
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <p className="font-display text-xs font-semibold text-ink-soft uppercase">Organisasi ({orgs.length})</p>
        {orgs.length === 0 ? (
          <p className="relative rounded-[20px] bg-[#f7faf6] p-4 text-sm font-semibold text-ink-soft">
            <DashedOutline rx={19} />
            Kosong
          </p>
        ) : (
          orgs.map((o) => (
            <div key={o.id} className="relative flex items-center justify-between gap-3 rounded-[20px] bg-[#f7faf6] p-4">
              <DashedOutline rx={19} />
              <div className="min-w-0">
                <Pill>{o.type === 'agency' ? 'Instansi' : 'Komunitas'}</Pill>
                <p className="mt-1.5 truncate text-sm font-extrabold text-ink">{o.name}</p>
                <p className="text-xs text-ink-soft">{o.region}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => void handleOrg(o.id, true)}
                  className="btn-primary h-9 px-3 text-xs"
                >
                  <Check className="size-3.5" /> Setujui
                </button>
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => void handleOrg(o.id, false)}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-canvas px-3 text-xs font-bold text-ink-soft"
                >
                  <Ban className="size-3.5" /> Tolak
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <p className="font-display text-xs font-semibold text-ink-soft uppercase">Laporan Warga ({reports.length})</p>
        {reports.length === 0 ? (
          <p className="relative rounded-[20px] bg-[#f7faf6] p-4 text-sm font-semibold text-ink-soft">
            <DashedOutline rx={19} />
            Kosong
          </p>
        ) : (
          reports.slice(0, 8).map((r) => (
            <div key={r.id} className="relative flex items-center justify-between gap-3 rounded-[20px] bg-[#f7faf6] p-3.5">
              <DashedOutline rx={19} />
              <div className="min-w-0">
                <ReportStatusPill status={r.status} />
                <p className="mt-1 truncate text-sm font-bold text-ink">{r.title}</p>
              </div>
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => void rejectReport(r.id)}
                className="h-8 shrink-0 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink-soft"
              >
                Tolak
              </button>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <p className="font-display text-xs font-semibold text-ink-soft uppercase">Event Radar ({events.length})</p>
        {events.slice(0, 8).map((ev) => (
          <div key={ev.id} className="relative flex items-center justify-between gap-3 rounded-[20px] bg-[#f7faf6] p-3.5">
            <DashedOutline rx={19} />
            <div className="min-w-0">
              <StatusPill status={ev.status} />
              <p className="mt-1 truncate text-sm font-bold text-ink">{ev.title}</p>
            </div>
            <button
              type="button"
              disabled={busyId === ev.id}
              onClick={() => void cancelEvent(ev.id)}
              className="h-8 shrink-0 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink-soft"
            >
              Batalkan
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
