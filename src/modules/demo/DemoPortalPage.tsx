import { ArrowLeft, Compass, Leaf, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { ROLE_LABEL } from '../../lib/constants'
import { useAuth } from '../auth/AuthContext'

export default function DemoPortalPage({
  onEnterGuest,
  onGoLive,
}: {
  onEnterGuest: () => void
  onGoLive: () => void
}) {
  const { demoAccounts, demoError, loading, loginDemo, refreshDemoAccounts } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectRole = async (id: string) => {
    setError(null)
    setBusyId(id)
    try {
      await loginDemo(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk peran demo')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <div className="flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full border border-line bg-white text-forest">
              <Leaf className="size-5" strokeWidth={1.75} />
            </span>
            <span className="text-[16px] font-semibold text-ink">Blam</span>
            <span className="rounded-[8px] border border-line bg-mint px-2.5 py-1 text-[12px] font-medium text-forest">Demo</span>
          </div>

          <button
            type="button"
            onClick={onGoLive}
            className="btn-soft h-10 gap-2 !rounded-full px-4 text-[12px]"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} /> Website Asli
          </button>
        </div>

        <section className="rounded-[16px] border border-line bg-white p-6 sm:p-7">
          <h1 className="text-[24px] font-semibold text-ink">Pilih Peran</h1>

          {loading ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="h-[104px] rounded-[12px] border border-line bg-canvas" />
              ))}
            </div>
          ) : demoAccounts.length === 0 ? (
            <div className="card-quiet mt-5 flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-[14px] font-normal text-ink-soft">{demoError ?? 'Akun demo kosong'}</p>
              <button
                type="button"
                onClick={() => void refreshDemoAccounts()}
                className="btn-soft h-11 gap-2 px-5 text-[12px]"
              >
                <RefreshCw className="size-4" strokeWidth={1.75} /> Muat Ulang
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {demoAccounts.map((acc) => {
                const isBusy = busyId === acc.id
                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void selectRole(acc.id)}
                    className="flex min-h-[104px] flex-col items-start justify-between rounded-[12px] border border-line bg-canvas p-4 text-left transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    <span className="rounded-[8px] border border-line bg-white px-2 py-0.5 text-[12px] font-medium text-ink-soft">
                      {ROLE_LABEL[acc.role]}
                    </span>
                    <div className="mt-2 w-full">
                      <p className="truncate text-[16px] font-medium text-ink">
                        {isBusy ? 'Memuat…' : acc.full_name}
                      </p>
                      <p className="num mt-0.5 text-[12px] font-normal text-ink-soft">{acc.points} poin</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {error && (
            <p role="alert" className="card-quiet mt-4 px-4 py-3 text-xs font-medium text-critical">
              {error}
            </p>
          )}

          <div className="mt-6 pt-2">
            <button
              type="button"
              onClick={onEnterGuest}
              className="btn-primary flex h-12 w-full items-center justify-center gap-2 text-sm"
            >
              <Compass className="size-4" /> Buka Peta
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
