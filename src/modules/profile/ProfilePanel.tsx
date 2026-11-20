import { Camera, ChevronRight, FileText, LogOut, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { DashedOutline, DashedRow, Pill } from '../../components/ui/atoms'
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
        <h2 className="text-[20px] font-semibold tracking-tight text-ink">
          {isDemo ? 'Peran Demo' : 'Masuk'}
        </h2>
        <div className="relative rounded-[14px] bg-[#f4f5f7] p-5">
          <DashedOutline rx={13} />
          <AuthPanel />
        </div>
      </div>
    )
  }

  const initial = profile.full_name?.slice(0, 1).toUpperCase() || 'W'

  return (
    <div className="flex flex-col gap-4">
      <section className="relative rounded-[14px] bg-[#f4f5f7] p-4 sm:p-5">
        <DashedOutline rx={13} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas text-base font-extrabold text-forest sm:size-14 sm:text-lg">
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
                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-white bg-forest text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
              >
                <Camera className="size-3.5" />
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
              <h2 className="mt-1 truncate text-[18px] font-semibold text-ink sm:text-[20px]">{profile.full_name}</h2>
              {profile.email && <p className="truncate text-[12px] font-light text-ink-soft">{profile.email}</p>}
            </div>
          </div>
          <div className="relative shrink-0 rounded-[10px] bg-white px-3 py-1.5 text-center">
            <DashedOutline rx={9} />
            <p className="num text-xl leading-none text-ink sm:text-2xl">{profile.points}</p>
            <p className="mt-0.5 text-[10px] font-light tracking-wide text-ink-soft uppercase">Poin</p>
          </div>
        </div>

        {avatarError && (
          <p role="alert" className="mt-3 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-critical">
            {avatarError}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-[12px] font-normal whitespace-nowrap text-ink shadow-[0_1px_2px_rgba(18,29,79,0.04)] transition hover:bg-[#eaecf0] disabled:opacity-60"
          >
            <Camera className="size-3.5 shrink-0" /> {avatarBusy ? 'Mengunggah…' : 'Edit Foto'}
          </button>
          {isDemo && (
            <button
              type="button"
              onClick={openAuthModal}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-[12px] font-normal whitespace-nowrap text-ink shadow-[0_1px_2px_rgba(18,29,79,0.04)] transition hover:bg-[#eaecf0]"
            >
              Ganti Peran
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[12px] font-normal whitespace-nowrap text-ink-soft shadow-[0_1px_2px_rgba(18,29,79,0.04)] transition hover:bg-critical/8 hover:text-critical ${
              isDemo ? 'col-span-2' : ''
            }`}
          >
            <LogOut className="size-3.5 shrink-0" /> Keluar
          </button>
        </div>
      </section>

      <section className="relative rounded-[14px] bg-[#f4f5f7] p-4">
        <DashedOutline rx={13} />
        <p className="font-sans text-[11px] font-light tracking-wider text-ink-soft uppercase">Organisasi ({memberships.length})</p>
        {memberships.length === 0 ? (
          <p className="mt-2 text-xs font-light text-ink-soft">Kosong</p>
        ) : (
          <div className="mt-1">
            {memberships.map((m) => (
              <DashedRow key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-normal text-ink">{m.organization?.name ?? 'Organisasi'}</p>
                  <p className="text-[11px] font-light text-ink-soft">
                    {m.member_role === 'lead' ? 'Ketua' : 'Anggota'} · {m.status === 'active' ? 'Aktif' : 'Menunggu'} · {m.organization?.is_verified ? 'Terverifikasi' : 'Review'}
                  </p>
                </div>
              </DashedRow>
            ))}
          </div>
        )}
      </section>

      <section className="relative rounded-[14px] bg-[#f4f5f7] p-4">
        <DashedOutline rx={13} />
        <p className="font-sans text-[11px] font-light tracking-wider text-ink-soft uppercase">Pengaturan, Privasi &amp; Kebijakan</p>
        <div className="mt-1">
          <DashedRow className="py-2">
            <a
              href="/privacy"
              onClick={(e) => openLegal(e, '/privacy')}
              className="flex items-center justify-between gap-2 rounded-lg py-1 text-[13px] font-normal text-ink transition-colors hover:text-forest"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-leaf" />
                Kebijakan Privasi
              </span>
              <ChevronRight className="size-4 text-ink-soft" />
            </a>
          </DashedRow>
          <DashedRow className="py-2">
            <a
              href="/terms"
              onClick={(e) => openLegal(e, '/terms')}
              className="flex items-center justify-between gap-2 rounded-lg py-1 text-[13px] font-normal text-ink transition-colors hover:text-forest"
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="size-4 text-leaf" />
                Syarat &amp; Ketentuan
              </span>
              <ChevronRight className="size-4 text-ink-soft" />
            </a>
          </DashedRow>
        </div>
        <p className="mt-2.5 text-[11px] font-light text-ink-soft">
          Peran aktif: <span className="font-normal text-ink">{ROLE_LABEL[profile.role]}</span> · {isDemo ? 'Mode Demo Lokal' : 'Akun Terhubung'}
        </p>
      </section>
    </div>
  )
}
