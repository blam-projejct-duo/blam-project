import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sprout,
  User,
} from 'lucide-react'
import { useState } from 'react'
import BlamLoader from '../../components/ui/BlamLoader'
import { BlamNatureIcon } from '../../components/ui/bumpIcons'
import { ROLE_LABEL } from '../../lib/constants'
import type { UserRole } from '../../types'
import { useAuth } from '../auth/AuthContext'

const BG_IMAGE_URL =
  'https://i.pinimg.com/1200x/d1/35/f0/d135f01b6f9d8baa6d18b57c510732dc.jpg'

const ROLE_META: Record<
  UserRole,
  { Icon: typeof User; badgeCls: string; iconBg: string; summary: string }
> = {
  admin: {
    Icon: ShieldCheck,
    badgeCls: 'bg-amber-500/15 text-amber-800',
    iconBg: 'bg-amber-500/15 text-amber-700',
    summary: 'Dashboard Monitor, Tinjau Org & Moderasi',
  },
  volunteer: {
    Icon: Sprout,
    badgeCls: 'bg-leaf/12 text-forest',
    iconBg: 'bg-mint text-leaf',
    summary: 'Verifikasi Titik, Buat Event & Aksi Lapangan',
  },
  agency: {
    Icon: Landmark,
    badgeCls: 'bg-sky-500/12 text-sky-700',
    iconBg: 'bg-sky-500/12 text-sky-700',
    summary: 'Tindak Lanjut Eskalasi & Pengesahan Aksi',
  },
  citizen: {
    Icon: User,
    badgeCls: 'bg-ink/8 text-ink-soft',
    iconBg: 'bg-canvas text-ink-soft',
    summary: 'Lapor via Blam Snap, Gabung Event & Donasi',
  },
}

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
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:px-6">
      {/* Full-bleed background image + atmospheric overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('${BG_IMAGE_URL}')` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-slate-950/75 via-slate-900/55 to-blue-950/70 backdrop-blur-[2px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-2xl flex-col gap-4"
      >
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 rounded-[18px] border border-white/25 bg-white/85 px-4 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-white shadow-xs">
              <BlamNatureIcon className="size-6" />
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tight text-ink">Blam</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-semibold text-forest">
              <Sparkles className="size-3" /> Mode Demo
            </span>
          </div>

          <button
            type="button"
            onClick={onGoLive}
            className="btn-soft h-9 gap-1.5 !rounded-full px-3.5 text-[12px]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.9} /> Website Asli
          </button>
        </header>

        {/* Main Glass Portal Card */}
        <section className="atlas-sheet rounded-[24px] border border-white/40 p-5 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.4)] sm:p-7">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-ink-soft shadow-2xs">
              <span className="size-2 animate-pulse rounded-full bg-resolved" />
              Radar Konservasi Indonesia · Simulasi Interaktif
            </span>
            <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[28px]">
              Pilih Peran Demo
            </h1>
          </div>

          {loading ? (
            <div className="mt-4">
              <BlamLoader label="Menyiapkan akun demo…" />
            </div>
          ) : demoAccounts.length === 0 ? (
            <div className="atlas-group mt-5 flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-[14px] font-normal text-ink-soft">{demoError ?? 'Akun demo belum tersedia'}</p>
              <button
                type="button"
                onClick={() => void refreshDemoAccounts()}
                className="btn-soft h-10 gap-2 px-5 text-[12px]"
              >
                <RefreshCw className="size-4" strokeWidth={1.75} /> Muat Ulang
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {demoAccounts.map((acc, idx) => {
                const isBusy = busyId === acc.id
                const meta = ROLE_META[acc.role]
                const RoleIcon = meta.Icon
                return (
                  <motion.button
                    key={acc.id}
                    type="button"
                    disabled={busyId !== null}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.05 * idx, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void selectRole(acc.id)}
                    className="group atlas-group flex flex-col justify-between gap-3 p-4 text-left transition-shadow hover:shadow-[0_10px_24px_-6px_rgba(37,99,235,0.2)] disabled:opacity-60"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeCls}`}>
                        <RoleIcon className="size-3.5" strokeWidth={2} />
                        {ROLE_LABEL[acc.role]}
                      </span>
                      <span className="num text-[11px] font-medium text-ink-soft">{acc.points} poin</span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold text-ink">
                          {isBusy ? 'Masuk ke sesi…' : acc.full_name}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-soft">{meta.summary}</p>
                      </div>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-canvas text-ink-soft transition-colors group-hover:bg-leaf group-hover:text-white">
                        <ArrowRight className="size-4" strokeWidth={2} />
                      </span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}

          {error && (
            <p role="alert" className="atlas-group mt-4 px-4 py-3 text-xs font-medium text-critical">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 border-t border-ink/8 pt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onEnterGuest}
              className="btn-primary flex h-11 w-full items-center justify-center gap-2 text-[13px]"
            >
              <Compass className="size-4" strokeWidth={1.9} />
              Masuk Peta sebagai Tamu
            </button>
          </div>
        </section>
      </motion.div>
    </main>
  )
}
