import { Camera, ChevronRight, FileText, LogOut, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { DashedRow, Pill } from '../../components/ui/atoms'
import { updateMyProfile } from '../../lib/api'
import { ROLE_LABEL } from '../../lib/constants'
import { compressImage } from '../../lib/imageCompress'
import { navigateApp } from '../../lib/route'
import { useAuth } from '../auth/AuthContext'
import { AuthPanel } from '../auth/AuthModal'

export default function ProfilePanel() {
  const { isDemo, profile, memberships, openAuthModal, logout, refreshMe } = useAuth()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const openLegal = (e: MouseEvent<HTMLAnchorElement>, path: '/privacy' | '/terms') => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigateApp(path)
  }

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError(null)
    setAvatarBusy(true)
    try {
      const compressed = await compressImage(file)
      await updateMyProfile({
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
      })
      await refreshMe()
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Gagal memperbarui foto profil')
    } finally {
      setAvatarBusy(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[20px] font-semibold text-ink">
          {isDemo ? 'Peran Demo' : 'Masuk'}
        </h2>
        <div className="card-quiet p-5">
          <AuthPanel />
        </div>
      </div>
    )
  }

  const initial = profile.full_name?.slice(0, 1).toUpperCase() || 'W'

  return (
    <div className="flex flex-col gap-4">
      <section className="card-quiet p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas text-[16px] font-semibold text-forest sm:size-14">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => fileRef.current?.click()}
                aria-label="Ubah foto profil"
                title="Ubah foto profil"
                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-white bg-leaf text-white shadow-sm transition-colors hover:bg-forest disabled:opacity-60"
              >
                <Camera className="size-3.5" strokeWidth={1.75} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void handleAvatarChange(e)}
                className="hidden"
              />
            </div>

            <div className="min-w-0">
              <Pill>{ROLE_LABEL[profile.role]}</Pill>
              <h2 className="mt-1 truncate text-[20px] font-semibold text-ink">{profile.full_name}</h2>
              {profile.email && <p className="truncate text-[12px] font-normal text-ink-soft">{profile.email}</p>}
            </div>
          </div>
          <div className="shrink-0 rounded-[12px] border border-line bg-canvas px-3 py-1.5 text-center">
            <p className="num text-[20px] leading-none font-semibold text-ink">{profile.points}</p>
            <p className="mt-0.5 text-[12px] font-normal text-ink-soft">Poin</p>
          </div>
        </div>

        {avatarError && (
          <p role="alert" className="mt-3 rounded-[10px] border border-line bg-canvas px-3 py-2 text-[12px] font-medium text-critical">
            {avatarError}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
            className="btn-soft h-10 px-3 text-[12px] whitespace-nowrap disabled:opacity-60"
          >
            <Camera className="size-4 shrink-0" strokeWidth={1.75} /> {avatarBusy ? 'Mengunggah…' : 'Edit Foto'}
          </button>
          {isDemo && (
            <button
              type="button"
              onClick={openAuthModal}
              className="btn-soft h-10 px-3 text-[12px] whitespace-nowrap"
            >
              Ganti Peran
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className={`btn-soft h-10 gap-1.5 px-4 text-[12px] whitespace-nowrap text-ink-soft hover:text-critical ${
              isDemo ? 'col-span-2' : ''
            }`}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} /> Keluar
          </button>
        </div>
      </section>

      <section className="card-quiet p-4">
        <p className="text-[12px] font-medium text-ink-soft">Organisasi ({memberships.length})</p>
        {memberships.length === 0 ? (
          <p className="mt-2 text-[12px] font-normal text-ink-soft">Belum tergabung organisasi</p>
        ) : (
          <div className="mt-1">
            {memberships.map((m) => (
              <DashedRow key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{m.organization?.name ?? 'Organisasi'}</p>
                  <p className="text-[12px] font-normal text-ink-soft">
                    {m.member_role === 'lead' ? 'Ketua' : 'Anggota'} · {m.status === 'active' ? 'Aktif' : 'Menunggu'} · {m.organization?.is_verified ? 'Terverifikasi' : 'Review'}
                  </p>
                </div>
              </DashedRow>
            ))}
          </div>
        )}
      </section>

      <section className="card-quiet p-4">
        <p className="text-[12px] font-medium text-ink-soft">Pengaturan, Privasi &amp; Kebijakan</p>
        <div className="mt-1">
          <DashedRow className="py-2">
            <a
              href="/privacy"
              onClick={(e) => openLegal(e, '/privacy')}
              className="flex items-center justify-between gap-2 rounded-[8px] py-1 text-[14px] font-medium text-ink transition-colors hover:text-leaf"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-leaf" strokeWidth={1.75} />
                Kebijakan Privasi
              </span>
              <ChevronRight className="size-4 text-ink-soft" strokeWidth={1.75} />
            </a>
          </DashedRow>
          <DashedRow className="py-2">
            <a
              href="/terms"
              onClick={(e) => openLegal(e, '/terms')}
              className="flex items-center justify-between gap-2 rounded-[8px] py-1 text-[14px] font-medium text-ink transition-colors hover:text-leaf"
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="size-4 text-leaf" strokeWidth={1.75} />
                Syarat &amp; Ketentuan
              </span>
              <ChevronRight className="size-4 text-ink-soft" strokeWidth={1.75} />
            </a>
          </DashedRow>
        </div>
        <p className="mt-2.5 text-[12px] font-normal text-ink-soft">
          Peran aktif: <span className="font-medium text-ink">{ROLE_LABEL[profile.role]}</span> · {isDemo ? 'Mode Demo Lokal' : 'Akun Terhubung'}
        </p>
      </section>
    </div>
  )
}
