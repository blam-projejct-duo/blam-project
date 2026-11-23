import { HeartHandshake, ImagePlus, Loader2, MapPin, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { createFundraising } from '../../lib/api'
import { compressImage } from '../../lib/imageCompress'
import type { CompressedImage } from '../../lib/imageCompress'
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
  inline?: boolean
  onClose: () => void
  onCreated: () => Promise<void>
}

export default function CreateFundraisingModal({ signal, inline = false, onClose, onCreated }: Props) {
  const { memberships, profile } = useAuth()
  const activeOrgs = memberships.filter((m) => m.status === 'active' && m.organization)

  const kind = signal.kind ?? 'other'
  const defaultTitle = `Bantuan Darurat ${KIND_LABEL[kind]} - ${signal.title}`
  const defaultDesc = `Penggalangan dana darurat untuk membantu warga terdampak ${KIND_LABEL[kind].toLowerCase()} di sekitar ${signal.title}.`

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDesc)
  const [targetAmount, setTargetAmount] = useState<number>(10_000_000)
  const [customTarget, setCustomTarget] = useState<string>('10000000')
  const [organizationId, setOrganizationId] = useState<string>(activeOrgs[0]?.organization_id ?? '')
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      setPhoto(await compressImage(file))
    } catch {
      setError('Foto gagal dibaca')
    }
  }

  const removePhoto = () => {
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    setPhoto(null)
  }

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
        coverImageBase64: photo?.base64,
        coverMimeType: photo?.mimeType,
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

  const panelContent = (
    <div
      className={
        inline
          ? 'flex h-full min-h-0 w-full flex-col overflow-hidden'
          : 'flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-[0_24px_48px_-12px_rgba(15,29,50,0.22)] sm:rounded-[16px]'
      }
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink/8 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="row-icon text-critical">
              <HeartHandshake className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-ink">Buka Galang Dana</h2>
              <p className="flex items-center gap-1 truncate text-[12px] font-normal text-ink-soft">
                <MapPin className="size-3.5 shrink-0 text-leaf" strokeWidth={1.75} />
                <span className="truncate">{signal.title}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="btn-soft size-9 shrink-0 !rounded-[10px] p-0 text-ink-soft hover:text-ink"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {profile?.role !== 'admin' && profile?.role !== 'agency' && activeOrgs.length > 1 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-soft">
                Organisasi Penyelenggara
              </span>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-line bg-canvas px-3.5 text-[14px] font-normal text-ink transition-colors focus:border-leaf focus:bg-white focus:outline-none"
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
            <span className="text-[12px] font-medium text-ink-soft">
              Judul Galang Dana
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              required
              className="h-11 w-full rounded-[10px] border border-line bg-canvas px-3.5 text-[14px] font-normal text-ink transition-colors focus:border-leaf focus:bg-white focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-soft">
              Deskripsi
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1200}
              className="w-full resize-none rounded-[10px] border border-line bg-canvas p-3.5 text-[14px] leading-relaxed font-normal text-ink transition-colors focus:border-leaf focus:bg-white focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-soft">
              Foto Sampul
            </span>
            {photo ? (
              <div className="relative h-36 w-full overflow-hidden rounded-[12px] border border-line bg-canvas">
                <img src={photo.previewUrl} alt="Pratinjau sampul" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Hapus foto"
                  className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-dash bg-canvas text-[12px] font-normal text-ink-soft transition-colors hover:bg-muted">
                <ImagePlus className="size-5 text-leaf" strokeWidth={1.75} />
                <span>Pilih foto lokasi</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void handlePhotoChange(e)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-ink-soft">Target Dana</span>
              {targetAmount > 0 && (
                <span className="num rounded-[8px] border border-line bg-canvas px-2 py-0.5 text-[12px] text-ink">
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
                    className={`h-10 rounded-[10px] px-3 text-[12px] whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-ink font-medium text-white'
                        : 'btn-soft font-normal'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[12px] font-normal text-ink-soft">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={customTarget}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Target lain"
                className="num h-11 w-full rounded-[10px] border border-line bg-canvas pr-3.5 pl-10 text-[14px] text-ink placeholder:font-sans transition-colors focus:border-leaf focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="card-quiet px-3.5 py-2.5 text-[12px] font-medium text-critical"
            >
              {error}
            </p>
          )}

          <div className="mt-1 flex flex-col-reverse gap-2.5 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="btn-soft h-12 w-full px-5 text-sm text-ink-soft hover:text-ink sm:w-auto sm:min-w-28"
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
  )

  if (inline) return panelContent

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
      {panelContent}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
