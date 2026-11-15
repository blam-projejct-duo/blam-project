import { ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import { ROLE_LABEL } from '../../lib/constants'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from './AuthContext'

const field =
  'h-12 w-full rounded-full border border-line bg-canvas px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-cobalt focus:bg-white focus:outline-none'

export default function AuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    demoAccounts,
    loginDemo,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
  } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!authModalOpen) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password)
      } else {
        await registerWithEmail(email.trim(), password, fullName.trim() || 'Warga Blam')
      }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk akun demo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Masuk Blam" onClose={closeAuthModal}>
      <div className="flex flex-col gap-5">
        {/* 4 Tombol Demo Juri (diambil langsung dari tabel profiles di Supabase) */}
        <section className="rounded-[20px] border border-line bg-canvas p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
            <Sparkles className="size-3.5 text-cobalt" />
            Akun Demo Juri (Database Live)
          </div>
          {demoAccounts.length === 0 ? (
            <p className="mt-2 text-xs font-medium text-ink-soft">
              Akun demo belum tersedia (pastikan server & seed Supabase aktif).
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void pickDemo(acc.id)}
                  className="flex flex-col items-start rounded-[16px] border border-line bg-white p-3 text-left transition-colors hover:border-cobalt disabled:opacity-60"
                >
                  <span className="text-xs font-extrabold text-cobalt">{ROLE_LABEL[acc.role]}</span>
                  <span className="mt-0.5 truncate text-sm font-bold text-ink">{acc.full_name}</span>
                  <span className="num mt-0.5 text-[11px] text-ink-soft">{acc.points} poin</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="border-t-[1.5px] border-dashed border-dash" />

        {/* Form Email & Google Auth */}
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
                {m === 'login' ? 'Masuk Email' : 'Daftar Baru'}
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
            {mode === 'login' ? 'Masuk' : 'Buat Akun Warga'}
          </button>

          {isSupabaseConfigured && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void loginWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Gagal OAuth'))}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-bold text-ink hover:bg-canvas disabled:opacity-50"
            >
              <ShieldCheck className="size-4 text-cobalt" />
              Lanjut dengan Google
            </button>
          )}
        </form>

        {error && (
          <p role="alert" className="rounded-[16px] bg-[#FEE9E7] px-4 py-3 text-sm font-semibold text-[#B91C1C]">
            {error}
          </p>
        )}
      </div>
    </ModalShell>
  )
}
