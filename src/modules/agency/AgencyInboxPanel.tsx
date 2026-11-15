import { AlertOctagon, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { StatusPill } from '../../components/ui/atoms'
import { verifyActionAgency } from '../../lib/api'
import type { Report } from '../../types'
import { useAuth } from '../auth/AuthContext'

export default function AgencyInboxPanel({
  reports,
  onSelectReport,
  onRefresh,
}: {
  reports: Report[]
  onSelectReport: (id: string) => void
  onRefresh: () => Promise<void>
}) {
  const { notifications } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const escalated = reports.filter((r) => r.status === 'escalated' || r.ai_severity === 'critical')
  const pendingStamp = reports.filter((r) =>
    r.report_actions?.some((a) => !a.verified_by_agency),
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
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">Inbox Eskalasi Instansi</h2>
        <p className="text-xs font-medium text-ink-soft">Laporan kritis &amp; pengesahan pemulihan</p>
      </div>

      {error && (
        <p role="alert" className="rounded-[16px] bg-[#FEE9E7] px-4 py-3 text-xs font-semibold text-[#B91C1C]">
          {error}
        </p>
      )}

      {agencyNotifs.length > 0 && (
        <section className="rounded-[20px] border border-line bg-white p-4">
          <p className="text-xs font-extrabold text-ink-soft uppercase">Notifikasi Eskalasi ({agencyNotifs.length})</p>
          <ul className="mt-2 space-y-2">
            {agencyNotifs.slice(0, 5).map((n) => (
              <li key={n.id} className="dashed-row pt-2 text-xs">
                <p className="font-bold text-ink">{n.title}</p>
                <p className="mt-0.5 text-ink-soft">{n.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft uppercase">
          <AlertOctagon className="size-3.5 text-critical" /> Prioritas Kritis ({escalated.length})
        </p>
        {escalated.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-white p-4 text-sm font-semibold text-ink-soft">
            Tidak ada eskalasi kritis aktif.
          </p>
        ) : (
          escalated.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectReport(r.id)}
              className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white p-4 text-left hover:border-cobalt"
            >
              <div className="min-w-0">
                <StatusPill status={r.status} />
                <p className="mt-2 truncate text-sm font-extrabold text-ink">{r.title}</p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">{r.location_name}</p>
              </div>
              <span className="num shrink-0 text-sm text-cobalt">AI {r.ai_confidence}%</span>
            </button>
          ))
        )}
      </section>

      {pendingStamp.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <p className="text-xs font-extrabold text-ink-soft uppercase">Menunggu Stempel Sah</p>
          {pendingStamp.map((r) => {
            const action = r.report_actions?.find((a) => !a.verified_by_agency)
            if (!action) return null
            return (
              <div key={action.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-ink">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">{action.notes}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === action.id}
                  onClick={() => void stamp(action.id)}
                  className="btn-primary h-9 shrink-0 px-3.5 text-xs disabled:opacity-50"
                >
                  <ShieldCheck className="size-3.5" /> Sahkan
                </button>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
