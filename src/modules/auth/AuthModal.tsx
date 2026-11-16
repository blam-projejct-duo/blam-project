import { ArrowLeft, LogOut } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import { ROLE_LABEL } from '../../lib/constants'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from './AuthContext'

const field =
  'h-12 w-full rounded-full border border-line bg-canvas px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-cobalt focus:bg-white focus:outline-none'

export function AuthPanel({
  onExitDemo,
  onGoLive,
  onDone,
}: {
  onExitDemo?: () => void
  onGoLive?: () => void
  onDone?: () => void
}) {
  const {
    isDemo,
    profile,
    demoAccounts,
    demoError,
    refreshDemoAccounts,
    loginDemo,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()
    if (mode === 'register' && cleanName.length < 2) {
      setError('Nama lengkap minimal 2 karakter')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(cleanEmail, password)
      } else {
        await registerWithEmail(cleanEmail, password, cleanName)
      }
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentikasi gagal')
    } finally {
      setBusy(false)
    }
  }

  const pickDemo = async (id: string) => {
    setError(null)
    setBusy(true)
    try {
      await loginDemo(id)
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk akun demo')
    } finally {
      setBusy(false)
    }
  }

  const leaveDemo = async () => {
    setBusy(true)
    try {
      await logout()
      onDone?.()
      onExitDemo?.()
    } finally {
      setBusy(false)
    }
  }

  if (isDemo) {
    return (
      <div className="flex flex-col gap-4">
        {demoAccounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-line bg-canvas p-5 text-center">
            <p className="text-xs font-medium text-ink-soft">{demoError ?? 'Kosong'}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshDemoAccounts()}
              className="h-10 rounded-full border border-line bg-white px-5 text-xs font-bold text-ink"
            >
              Muat Ulang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {demoAccounts.map((acc) => {
              const active = profile?.id === acc.id
              return (
                <button
                  key={acc.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void pickDemo(acc.id)}
                  className={`flex flex-col items-start rounded-[20px] border p-3.5 text-left transition-colors disabled:opacity-60 ${
                    active ? 'border-ink bg-white' : 'border-line bg-canvas hover:bg-white'
                  }`}
                >
                  <span className="text-xs font-extrabold text-ink-soft">{ROLE_LABEL[acc.role]}</span>
                  <span className="mt-1 truncate text-sm font-bold text-ink">{acc.full_name}</span>
                  <span className="num mt-0.5 text-[11px] text-ink-soft">{acc.points} poin</span>
                </button>
              )
            })}
          </div>
        )}

        {(onExitDemo || onGoLive) && (
          <div className="flex gap-2 border-t-[1.5px] border-dashed border-dash pt-4">
            {onExitDemo && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void leaveDemo()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 text-xs font-bold text-ink hover:bg-canvas"
              >
                <LogOut className="size-3.5" /> Keluar Demo
              </button>
            )}
            {onGoLive && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onDone?.()
                  onGoLive()
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-canvas px-4 text-xs font-bold text-ink hover:bg-muted"
              >
                <ArrowLeft className="size-3.5" /> Website Asli
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-card border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <div className="flex gap-1 rounded-full bg-canvas p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={`h-10 flex-1 rounded-full text-sm font-bold transition-colors ${
                mode === m ? 'bg-white text-ink' : 'text-ink-soft'
              }`}
            >
              {m === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <input
            className={field}
            placeholder="Nama lengkap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          className={field}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className={field}
          placeholder="Kata sandi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={busy || !isSupabaseConfigured}
          className="btn-primary h-12 w-full text-sm disabled:opacity-50"
        >
          {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>

        {isSupabaseConfigured ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void loginWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Gagal OAuth'))}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-bold text-ink hover:bg-canvas disabled:opacity-50"
          >
            Masuk dengan Google
          </button>
        ) : (
          <p className="text-center text-xs font-medium text-ink-soft">
            Konfigurasi Supabase Auth di .env belum tersedia.
          </p>
        )}
      </form>

      {error && (
        <p role="alert" className="rounded-card border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
          {error}
        </p>
      )}
    </div>
  )
}

export default function AuthModal({
  onExitDemo,
  onGoLive,
}: {
  onExitDemo?: () => void
  onGoLive?: () => void
}) {
  const { isDemo, authModalOpen, closeAuthModal } = useAuth()

  if (!authModalOpen) return null

  return (
    <ModalShell title={isDemo ? 'Peran Demo' : 'Masuk Blam'} onClose={closeAuthModal}>
      <AuthPanel onExitDemo={onExitDemo} onGoLive={onGoLive} onDone={closeAuthModal} />
    </ModalShell>
  )
}
