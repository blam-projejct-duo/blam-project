import { useQuery } from '@tanstack/react-query'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ReportStatusPill } from '../../components/ui/atoms'
import { fetchReportsQueue, verifyActionAgency } from '../../lib/api'
import type { CitizenReport, ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'

export default function AgencyInboxPanel({
  events,
  headerAction,
  onSelectEvent,
  onCreateEventFromReport,
  onRefresh,
}: {
  events: ConservationEvent[]
  headerAction?: ReactNode
  onSelectEvent: (id: string) => void
  onCreateEventFromReport: (report: CitizenReport) => void
  onRefresh: () => Promise<void>
}) {
  const { profile, notifications } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canReadQueue = profile?.role === 'agency' || profile?.role === 'admin'
  const queueQuery = useQuery({
    queryKey: ['reports-queue', profile?.id],
    queryFn: () => fetchReportsQueue(false),
    enabled: canReadQueue,
    staleTime: 0,
  })

  const escalated = (queueQuery.data ?? []).filter(
    (r) => r.status === 'escalated' || r.ai_severity === 'critical',
  )
  const pendingStamp = events.filter((ev) =>
    ev.event_actions?.some((a) => !a.verified_by_agency),
  )
  const agencyNotifs = notifications.filter((n) => n.target_role === 'agency')

  const stamp = async (actionId: string) => {
    setBusyId(actionId)
    setError(null)
    try {
      await verifyActionAgency(actionId)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memberi stempel instansi')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-semibold text-ink">Eskalasi</h2>
        {headerAction}
      </div>

      {error && (
        <p role="alert" className="card-quiet px-4 py-3 text-[12px] font-medium text-critical">
          {error}
        </p>
      )}

      {agencyNotifs.length > 0 && (
        <section className="card-quiet p-4">
          <p className="text-[12px] font-medium text-ink-soft">Notifikasi ({agencyNotifs.length})</p>
          <ul className="mt-2 divide-y divide-line">
            {agencyNotifs.slice(0, 5).map((n) => (
              <li key={n.id} className="py-2 text-[12px]">
                <p className="font-medium text-ink">{n.title}</p>
                <p className="mt-0.5 font-normal text-ink-soft">{n.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-medium text-ink-soft">Kritis ({escalated.length})</p>
        {escalated.length === 0 ? (
          <p className="card-quiet p-4 text-[14px] font-normal text-ink-soft">
            Belum ada eskalasi kritis
          </p>
        ) : (
          <div className="list-group">
            {escalated.map((r) => (
              <div key={r.id} className="list-row justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ReportStatusPill status={r.status} />
                    <span className="num text-[12px] font-normal text-ink-soft">Skor {r.ai_confidence}%</span>
                  </div>
                  <p className="mt-1 truncate text-[14px] font-medium text-ink">{r.title}</p>
                  <p className="mt-0.5 truncate text-[12px] font-normal text-ink-soft">{r.location_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateEventFromReport(r)}
                  className="btn-primary h-8 shrink-0 !rounded-[8px] px-3 text-[12px]"
                >
                  <CalendarPlus className="size-4" strokeWidth={1.75} /> Event
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {pendingStamp.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[12px] font-medium text-ink-soft">Menunggu Sah ({pendingStamp.length})</p>
          <div className="list-group">
            {pendingStamp.map((ev) => {
              const action = ev.event_actions?.find((a) => !a.verified_by_agency)
              if (!action) return null
              return (
                <div key={action.id} className="list-row justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[14px] font-medium text-ink">{ev.title}</p>
                    <p className="mt-0.5 truncate text-[12px] font-normal text-ink-soft">{action.notes}</p>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === action.id}
                    onClick={() => void stamp(action.id)}
                    className="btn-primary h-8 shrink-0 !rounded-[8px] px-3 text-[12px] disabled:opacity-50"
                  >
                    Sahkan
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
