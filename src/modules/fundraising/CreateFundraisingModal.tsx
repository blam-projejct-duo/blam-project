import { HeartHandshake, Loader2, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createFundraising } from '../../lib/api'
import type { HazardKind, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { formatRupiah } from './useFundraisings'

const TARGET_PRESETS = [
  { value: 5_000_000, label: 'Rp 5 Jt' },
  { value: 10_000_000, label: 'Rp 10 Jt' },
  { value: 25_000_000, label: 'Rp 25 Jt' },
  { value: 50_000_000, label: 'Rp 50 Jt' },
]

const KIND_LABEL: Record<HazardKind, string> = {
  flood: 'Banjir',
  wildfire: 'Kebakaran Hutan / Lahan',
  volcano: 'Gunung Berapi Aktif',
  storm: 'Badai / Cuaca Ekstrem',
  suspected: 'Titik Panas Kritis',
  other: 'Bencana Darurat',
}

interface Props {
  signal: SatelliteSignal
  onClose: () => void
  onCreated: () => Promise<void>
}

export default function CreateFundraisingModal({ signal, onClose, onCreated }: Props) {
  const { memberships, profile } = useAuth()
  const activeOrgs = memberships.filter((m) => m.status === 'active' && m.organization)

  const kind = signal.kind ?? 'other'
  const defaultTitle = `Bantuan Darurat ${KIND_LABEL[kind]} — ${signal.title}`
  const defaultDesc = `Penggalangan dana darurat untuk membantu warga terdampak ${KIND_LABEL[kind].toLowerCase()} di sekitar ${signal.title} (${signal.lat.toFixed(4)}, ${signal.lng.toFixed(4)}).`

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDesc)
  const [targetAmount, setTargetAmount] = useState<number>(10_000_000)
  const [customTarget, setCustomTarget] = useState<string>('10000000')
  const [organizationId, setOrganizationId] = useState<string>(activeOrgs[0]?.organization_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPreset = (amount: number) => {
    setTargetAmount(amount)
    setCustomTarget(String(amount))
  }

  const handleCustomChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    setCustomTarget(digits)
    setTargetAmount(digits ? Number(digits) : 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 4) {
      setError('Judul penggalangan dana minimal 4 karakter')
      return
    }
    if (!Number.isFinite(targetAmount) || targetAmount < 10_000) {
      setError('Target dana minimal Rp 10.000')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createFundraising({
        refSource: signal.source,
        refExternalId: signal.externalId,
        hazardKind: kind,
        title: title.trim(),
        description: description.trim(),
        locationName: signal.title,
        lat: signal.lat,
        lng: signal.lng,
        targetAmount,
        organizationId: organizationId || undefined,
      })
      await onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat penggalangan dana')
    } finally {
      setSubmitting(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Buat Penggalangan Dana"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-2xl sm:rounded-[28px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas/55 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-critical/12 text-critical">
              <HeartHandshake className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink">Buka Penggalangan Dana</h2>
              <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-soft">
                <MapPin className="size-3 shrink-0 text-leaf" />
                <span className="truncate">{signal.title} · Langsung tayang</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:bg-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {profile?.role !== 'admin' && profile?.role !== 'agency' && activeOrgs.length > 1 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                Organisasi Penyelenggara
              </span>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="h-11 w-full rounded-2xl border border-line bg-canvas px-3.5 text-sm font-semibold text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
              >
                {activeOrgs.map((m) => (
                  <option key={m.organization_id} value={m.organization_id}>
                    {m.organization?.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
              Judul Penggalangan Dana
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              required
              className="h-11 w-full rounded-2xl border border-line bg-canvas px-3.5 text-sm font-semibold text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
              Deskripsi & Kebutuhan Warga
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1200}
              className="w-full resize-none rounded-2xl border border-line bg-canvas p-3.5 text-sm leading-relaxed font-medium text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Target Dana</span>
              {targetAmount > 0 && (
                <span className="num rounded-full bg-mint px-2.5 py-0.5 text-xs text-forest">
                  {formatRupiah(targetAmount)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TARGET_PRESETS.map((preset) => {
                const active = targetAmount === preset.value
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`h-10 rounded-2xl border px-3 text-xs font-extrabold whitespace-nowrap transition ${
                      active
                        ? 'border-leaf bg-mint text-forest shadow-xs'
                        : 'border-line bg-canvas text-ink hover:bg-muted'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-xs font-extrabold text-ink-soft">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={customTarget}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Atau ketik nominal target..."
                className="num h-11 w-full rounded-2xl border border-line bg-canvas pr-3.5 pl-10 text-sm text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-critical/30 bg-critical/8 px-3.5 py-2.5 text-xs font-bold text-critical"
            >
              {error}
            </p>
          )}

          <div className="mt-1 flex flex-col-reverse gap-2.5 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="h-12 w-full rounded-full border border-line bg-surface px-5 text-sm font-bold text-ink-soft transition hover:bg-canvas hover:text-ink sm:w-auto sm:min-w-28"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary h-12 w-full flex-1 px-6 text-sm whitespace-nowrap disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menerbitkan...
                </>
              ) : (
                'Terbitkan Penggalangan Dana'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
