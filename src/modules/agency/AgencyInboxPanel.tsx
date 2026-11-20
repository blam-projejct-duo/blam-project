import { useQuery } from '@tanstack/react-query'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { DashedOutline, ReportStatusPill } from '../../components/ui/atoms'
import { fetchReportsQueue, verifyActionAgency } from '../../lib/api'
import type { CitizenReport, ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'

export default function AgencyInboxPanel({
  events,
  onSelectEvent,
  onCreateEventFromReport,
  onRefresh,
}: {
  events: ConservationEvent[]
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
      <h2 className="text-xl font-semibold tracking-tight text-ink">Eskalasi</h2>

      {error && (
        <p role="alert" className="relative rounded-[14px] bg-[#f4f5f7] px-4 py-3 text-xs font-light text-ink">
          <DashedOutline rx={13} />
          {error}
        </p>
      )}

      {agencyNotifs.length > 0 && (
        <section className="relative rounded-[14px] bg-[#f4f5f7] p-4">
          <DashedOutline rx={13} />
          <p className="font-sans text-[11px] font-light tracking-wider text-ink-soft uppercase">Notifikasi ({agencyNotifs.length})</p>
          <ul className="mt-2 space-y-2">
            {agencyNotifs.slice(0, 5).map((n) => (
              <li key={n.id} className="dashed-row pt-2 text-xs">
                <p className="font-normal text-ink">{n.title}</p>
                <p className="mt-0.5 font-light text-ink-soft">{n.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <p className="font-sans text-[11px] font-light tracking-wider text-ink-soft uppercase">Kritis ({escalated.length})</p>
        {escalated.length === 0 ? (
          <p className="relative rounded-[14px] bg-[#f4f5f7] p-4 text-sm font-light text-ink-soft">
            <DashedOutline rx={13} />
            Kosong
          </p>
        ) : (
          escalated.map((r) => (
            <div key={r.id} className="relative flex items-center justify-between gap-3 rounded-[14px] bg-[#f4f5f7] p-4">
              <DashedOutline rx={13} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ReportStatusPill status={r.status} />
                  <span className="num text-xs font-normal text-ink-soft">AI {r.ai_confidence}%</span>
                </div>
                <p className="mt-1.5 truncate text-[13.5px] font-normal text-ink">{r.title}</p>
                <p className="mt-0.5 truncate text-xs font-light text-ink-soft">{r.location_name}</p>
              </div>
              <button
                type="button"
                onClick={() => onCreateEventFromReport(r)}
                className="btn-primary h-9 shrink-0 px-3.5 text-xs"
              >
                <CalendarPlus className="size-3.5" /> Event
              </button>
            </div>
          ))
        )}
      </section>

      {pendingStamp.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <p className="font-sans text-[11px] font-light tracking-wider text-ink-soft uppercase">Menunggu Sah</p>
          {pendingStamp.map((ev) => {
            const action = ev.event_actions?.find((a) => !a.verified_by_agency)
            if (!action) return null
            return (
              <div key={action.id} className="relative flex items-center justify-between gap-3 rounded-[14px] bg-[#f4f5f7] p-4">
                <DashedOutline rx={13} />
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[13.5px] font-normal text-ink">{ev.title}</p>
                  <p className="mt-0.5 truncate text-xs font-light text-ink-soft">{action.notes}</p>
                </button>
                <button
                  type="button"
                  disabled={busyId === action.id}
                  onClick={() => void stamp(action.id)}
                  className="btn-primary h-9 shrink-0 px-3.5 text-xs disabled:opacity-50"
                >
                  Sahkan
                </button>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
