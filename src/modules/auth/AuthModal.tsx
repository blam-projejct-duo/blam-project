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
  'h-11 w-full rounded-xl border border-line bg-canvas px-4 text-sm font-normal text-ink placeholder:text-ink-soft focus:border-leaf focus:bg-white focus:outline-none'

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
          <div className="card-quiet flex flex-col items-center gap-3 p-5 text-center">
            <p className="text-xs font-normal text-ink-soft">{demoError ?? 'Kosong'}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshDemoAccounts()}
              className="btn-soft h-10 px-5 text-xs"
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
                  className={`flex flex-col items-start rounded-[12px] p-3.5 text-left transition-colors disabled:opacity-60 ${
                    active ? 'bg-ink text-white' : 'card-quiet text-ink hover:bg-canvas'
                  }`}
                >
                  <span className={`text-[12px] font-normal ${active ? 'text-white/75' : 'text-ink-soft'}`}>
                    {ROLE_LABEL[acc.role]}
                  </span>
                  <span className="mt-1 truncate text-[14px] font-medium">{acc.full_name}</span>
                  <span className={`num mt-0.5 text-[12px] font-normal ${active ? 'text-white/80' : 'text-ink-soft'}`}>
                    {acc.points} poin
                  </span>
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
                className="btn-soft h-11 flex-1 gap-1.5 px-4 text-[12px]"
              >
                <LogOut className="size-4" strokeWidth={1.75} /> Keluar Demo
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
                className="btn-soft h-11 flex-1 gap-1.5 px-4 text-[12px]"
              >
                <ArrowLeft className="size-4" strokeWidth={1.75} /> Website Asli
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="card-quiet px-4 py-3 text-sm font-medium text-critical">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <div className="panel-tabs grid grid-cols-2 p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={`panel-tab h-10 text-[14px] ${mode === m ? 'is-active' : ''}`}
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
              className="btn-soft h-12 gap-2.5 px-4 text-sm disabled:opacity-50"
            >
              <GoogleIcon className="size-[18px] shrink-0" />
              <span>Masuk dengan Google</span>
            </button>
          )
        ) : (
          <div className="flex flex-col items-center gap-2.5 rounded-[12px] border border-line bg-canvas p-3.5 text-center">
            <p className="text-[12px] font-normal text-ink-soft">
              Auth server belum dikonfigurasi di <code className="font-mono text-[11px]">.env</code>. Gunakan Mode Demo lokal untuk mencoba semua peran.
            </p>
            <button
              type="button"
              onClick={() => {
                onDone?.()
                navigateApp('/demo')
              }}
              className="btn-soft h-10 w-full text-[13px] font-medium text-forest"
            >
              Buka Mode Demo (Data Lokal)
            </button>
          </div>
        )}

        <p className="pt-1 text-center text-[12px] font-normal leading-relaxed text-ink-soft">
          Setuju dengan{' '}
          <a
            href="/terms"
            onClick={(e) => openLegal(e, '/terms')}
            className="font-medium text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
          >
            Ketentuan Layanan
          </a>{' '}
          &amp;{' '}
          <a
            href="/privacy"
            onClick={(e) => openLegal(e, '/privacy')}
            className="font-medium text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
          >
            Kebijakan Privasi
          </a>
        </p>
      </form>

      {error && (
        <p role="alert" className="card-quiet px-4 py-3 text-sm font-medium text-critical">
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