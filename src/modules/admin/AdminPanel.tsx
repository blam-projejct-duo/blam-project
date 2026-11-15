import { Ban, Check, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Pill, StatusPill } from '../../components/ui/atoms'
import { fetchOrgs, moderateReportAdmin, verifyOrgAdmin } from '../../lib/api'
import type { Organization, Report } from '../../types'

export default function AdminPanel({
  reports,
  onRefreshReports,
}: {
  reports: Report[]
  onRefreshReports: () => Promise<void>
}) {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOrgs = useCallback(async () => {
    try {
      const all = await fetchOrgs(true)
      setOrgs(all.filter((o) => !o.is_verified))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat antrean organisasi')
    }
  }, [])

  useEffect(() => {
    void loadOrgs()
  }, [loadOrgs])

  const handleOrg = async (orgId: string, approve: boolean) => {
    setBusyId(orgId)
    setError(null)
    try {
      await verifyOrgAdmin(orgId, approve)
      await loadOrgs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal verifikasi organisasi')
    } finally {
      setBusyId(null)
    }
  }

  const rejectReport = async (reportId: string) => {
    setBusyId(reportId)
    setError(null)
    try {
      await moderateReportAdmin(reportId, 'rejected')
      await onRefreshReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal moderasi laporan')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">Panel Super Admin</h2>
        <p className="text-xs font-medium text-ink-soft">Verifikasi organisasi baru &amp; moderasi laporan</p>
      </div>

      {error && (
        <p role="alert" className="rounded-[16px] bg-[#FEE9E7] px-4 py-3 text-xs font-semibold text-[#B91C1C]">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <p className="text-xs font-extrabold text-ink-soft uppercase">Antrean Verifikasi Organisasi ({orgs.length})</p>
        {orgs.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-white p-4 text-sm font-semibold text-ink-soft">
            Tidak ada pengajuan organisasi baru.
          </p>
        ) : (
          orgs.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white p-4">
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
                  className="inline-flex h-9 items-center gap-1 rounded-full bg-emerald px-3 text-xs font-bold text-white"
                >
                  <Check className="size-3.5" /> Setujui
                </button>
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => void handleOrg(o.id, false)}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-canvas px-3 text-xs font-bold text-[#B91C1C]"
                >
                  <Ban className="size-3.5" /> Tolak
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft uppercase">
          <ShieldAlert className="size-3.5" /> Moderasi Laporan ({reports.length})
        </p>
        {reports.slice(0, 8).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white p-3.5">
            <div className="min-w-0">
              <StatusPill status={r.status} />
              <p className="mt-1 truncate text-sm font-bold text-ink">{r.title}</p>
            </div>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => void rejectReport(r.id)}
              className="h-8 shrink-0 rounded-full border border-line bg-canvas px-3 text-xs font-bold text-[#B91C1C]"
            >
              Sembunyikan
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
