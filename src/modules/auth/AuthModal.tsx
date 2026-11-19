import { ArrowLeft, LogOut } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import { ROLE_LABEL } from '../../lib/constants'
import { navigateApp } from '../../lib/route'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import GoogleSignInButton, { isGoogleClientConfigured } from './GoogleSignInButton'

const field =
  'h-12 w-full rounded-full border border-line bg-canvas px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-leaf focus:bg-white focus:outline-none'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

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
    loginWithGoogleIdToken,
    logout,
    closeAuthModal,
  } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openLegal = (e: MouseEvent<HTMLAnchorElement>, path: '/privacy' | '/terms') => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    closeAuthModal()
    navigateApp(path)
  }

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
          <div className="flex flex-col items-center gap-3 rounded-[20px] bg-[#f5f7ff] p-5 text-center">
            <p className="text-xs font-light text-ink-soft">{demoError ?? 'Kosong'}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshDemoAccounts()}
              className="h-10 rounded-full bg-white px-5 text-xs font-normal text-ink"
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
                  className={`flex flex-col items-start rounded-[20px] p-3.5 text-left transition-colors disabled:opacity-60 ${active ? 'bg-mint/65' : 'bg-[#f5f7ff] hover:bg-mint/35'
                    }`}
                >
                  <span className="text-xs font-light text-ink-soft">{ROLE_LABEL[acc.role]}</span>
                  <span className="mt-1 truncate text-sm font-normal text-ink">{acc.full_name}</span>
                  <span className="num mt-0.5 text-[11px] font-normal text-ink-soft">{acc.points} poin</span>
                </button>
              )
            })}
          </div>
        )}

        {(onExitDemo || onGoLive) && (
          <div className="flex gap-2 pt-2">
            {onExitDemo && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void leaveDemo()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f5f7ff] px-4 text-xs font-normal text-ink hover:bg-mint/40"
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
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f5f7ff] px-4 text-xs font-normal text-ink hover:bg-mint/40"
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
        <div className="flex gap-1 rounded-full bg-[#f5f7ff] p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={`h-10 flex-1 rounded-full text-sm transition-colors ${mode === m ? 'bg-white font-medium text-ink shadow-xs' : 'font-light text-ink-soft'
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
          isGoogleClientConfigured ? (
            <GoogleSignInButton
              disabled={busy}
              onCredential={async (idToken) => {
                setError(null)
                setBusy(true)
                try {
                  await loginWithGoogleIdToken(idToken)
                  onDone?.()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Gagal masuk dengan Google')
                } finally {
                  setBusy(false)
                }
              }}
              onError={(msg) => setError(msg)}
            />
          ) : (
            // Fallback: OAuth redirect lewat Supabase (muncul domain supabase.co)
            <button
              type="button"
              disabled={busy}
              onClick={() => void loginWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Gagal OAuth'))}
              className="flex h-12 items-center justify-center gap-2.5 rounded-full bg-[#f5f7ff] px-4 text-sm font-normal text-ink transition-colors hover:bg-mint/45 disabled:opacity-50"
            >
              <GoogleIcon className="size-[18px] shrink-0" />
              <span>Masuk dengan Google</span>
            </button>
          )
        ) : (
          <p className="text-center text-xs font-light text-ink-soft">
            Konfigurasi Supabase Auth di .env belum tersedia.
          </p>
        )}

        <p className="pt-1 text-center text-[11px] font-medium leading-relaxed text-ink-soft">
          Dengan masuk, kamu menyetujui{' '}
          <a
            href="/terms"
            onClick={(e) => openLegal(e, '/terms')}
            className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
          >
            Ketentuan Layanan
          </a>{' '}
          dan{' '}
          <a
            href="/privacy"
            onClick={(e) => openLegal(e, '/privacy')}
            className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
          >
            Kebijakan Privasi
          </a>{' '}
          Blam.
        </p>
      </form>

      {error && (
        <p role="alert" className="rounded-card bg-[#f5f7ff] px-4 py-3 text-sm font-light text-ink">
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