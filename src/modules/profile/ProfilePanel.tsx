import { Camera, LogOut } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DashedRow, Pill } from '../../components/ui/atoms'
import { updateMyProfile } from '../../lib/api'
import { ROLE_LABEL } from '../../lib/constants'
import { compressImage } from '../../lib/imageCompress'
import { useAuth } from '../auth/AuthContext'
import { AuthPanel } from '../auth/AuthModal'

export default function ProfilePanel() {
  const { isDemo, profile, memberships, notifications, openAuthModal, logout, readNotification, refreshMe } = useAuth()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

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
        <h2 className="text-[22px] font-bold tracking-tight text-ink">
          {isDemo ? 'Peran Demo' : 'Masuk'}
        </h2>
        <div className="capsule-dashed rounded-[20px] p-5">
          <AuthPanel />
        </div>
      </div>
    )
  }

  const initial = profile.full_name?.slice(0, 1).toUpperCase() || 'W'

  return (
    <div className="flex flex-col gap-4">
      <section className="capsule-dashed rounded-[20px] p-4 sm:p-5">
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
              <h2 className="mt-1 truncate text-[18px] font-bold text-ink sm:text-[20px]">{profile.full_name}</h2>
              {profile.email && <p className="truncate text-xs text-ink-soft">{profile.email}</p>}
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-line/80 bg-white/80 px-3 py-1.5 text-center">
            <p className="num text-xl leading-none text-forest sm:text-2xl">{profile.points}</p>
            <p className="mt-0.5 text-[10px] font-bold tracking-wide text-ink-soft uppercase">Poin</p>
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
            className="font-display inline-flex h-10 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-dashed border-leaf/35 bg-white px-3 text-xs font-semibold whitespace-nowrap text-forest transition hover:bg-mint/40 disabled:opacity-60"
          >
            <Camera className="size-3.5 shrink-0" /> {avatarBusy ? 'Mengunggah…' : 'Edit Foto'}
          </button>
          {isDemo && (
            <button
              type="button"
              onClick={openAuthModal}
              className="font-display inline-flex h-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-leaf/35 bg-white px-3 text-xs font-semibold whitespace-nowrap text-forest transition hover:bg-mint/40"
            >
              Ganti Peran
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className={`font-display inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-white/80 px-4 text-xs font-semibold whitespace-nowrap text-ink-soft transition hover:border-critical/30 hover:bg-critical/5 hover:text-critical ${
              isDemo ? 'col-span-2' : ''
            }`}
          >
            <LogOut className="size-3.5 shrink-0" /> Keluar
          </button>
        </div>
      </section>

      <section className="capsule-dashed rounded-[20px] p-4">
        <p className="font-display text-xs font-semibold text-ink-soft uppercase">Organisasi ({memberships.length})</p>
        {memberships.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-ink-soft">Kosong</p>
        ) : (
          <div className="mt-1">
            {memberships.map((m) => (
              <DashedRow key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{m.organization?.name ?? 'Organisasi'}</p>
                  <p className="text-[11px] font-semibold text-ink-soft">
                    {m.member_role === 'lead' ? 'Ketua' : 'Anggota'} · {m.status === 'active' ? 'Aktif' : 'Menunggu'}
                  </p>
                </div>
                <Pill>{m.organization?.is_verified ? 'Terverifikasi' : 'Review'}</Pill>
              </DashedRow>
            ))}
          </div>
        )}
      </section>

      <section className="capsule-dashed rounded-[20px] p-4">
        <p className="font-display text-xs font-semibold text-ink-soft uppercase">Notifikasi ({notifications.length})</p>
        {notifications.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-ink-soft">Kosong</p>
        ) : (
          <div className="mt-1">
            {notifications.map((n) => (
              <DashedRow key={n.id} className="flex items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${n.is_read ? 'text-ink-soft' : 'text-ink'}`}>{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{n.detail}</p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => void readNotification(n.id)}
                    className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-bold text-ink-soft"
                  >
                    Tandai
                  </button>
                )}
              </DashedRow>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
