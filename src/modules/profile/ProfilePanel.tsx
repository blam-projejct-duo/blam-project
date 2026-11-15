import { Bell, LogOut, ShieldCheck, UserCheck } from 'lucide-react'
import { DashedRow, Pill } from '../../components/ui/atoms'
import { ROLE_LABEL } from '../../lib/constants'
import { useAuth } from '../auth/AuthContext'

export default function ProfilePanel() {
  const { profile, memberships, notifications, openAuthModal, logout, readNotification } = useAuth()

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[20px] border border-line bg-white p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-canvas text-cobalt">
          <UserCheck className="size-6" />
        </span>
        <div>
          <h3 className="text-lg font-extrabold text-ink">Mode Pengunjung</h3>
          <p className="mt-1 text-xs font-medium text-ink-soft">
            Masuk untuk melapor, gabung aksi, atau kelola organisasi.
          </p>
        </div>
        <button type="button" onClick={openAuthModal} className="btn-primary h-11 w-full text-sm">
          Masuk / Akun Demo
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[20px] border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Pill>{ROLE_LABEL[profile.role]}</Pill>
            <h2 className="mt-2 truncate text-xl font-extrabold text-ink">{profile.full_name}</h2>
            {profile.email && <p className="truncate text-xs text-ink-soft">{profile.email}</p>}
          </div>
          <div className="text-right">
            <p className="num text-2xl text-cobalt">{profile.points}</p>
            <p className="text-[11px] font-bold text-ink-soft">Poin</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={openAuthModal}
            className="h-10 flex-1 rounded-full border border-line bg-canvas text-xs font-bold text-ink"
          >
            Ganti Akun
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 text-xs font-bold text-[#B91C1C]"
          >
            <LogOut className="size-3.5" /> Keluar
          </button>
        </div>
      </section>

      <section className="rounded-[20px] border border-line bg-white p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft uppercase">
          <ShieldCheck className="size-3.5 text-emerald" /> Organisasi Saya ({memberships.length})
        </p>
        {memberships.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-ink-soft">Belum tergabung di organisasi.</p>
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

      <section className="rounded-[20px] border border-line bg-white p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft uppercase">
          <Bell className="size-3.5 text-cobalt" /> Notifikasi ({notifications.length})
        </p>
        {notifications.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-ink-soft">Belum ada notifikasi.</p>
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
                    className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-bold text-cobalt"
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
