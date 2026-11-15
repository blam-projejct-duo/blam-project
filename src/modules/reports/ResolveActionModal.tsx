import { ImagePlus, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import { resolveReport } from '../../lib/api'
import { compressImage } from '../../lib/imageCompress'
import type { CompressedImage } from '../../lib/imageCompress'
import type { Report } from '../../types'
import { useAuth } from '../auth/AuthContext'

const field =
  'h-12 w-full rounded-full border border-line bg-canvas px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-cobalt focus:bg-white focus:outline-none'

export default function ResolveActionModal({
  report,
  onClose,
  onResolved,
}: {
  report: Report
  onClose: () => void
  onResolved: () => Promise<void>
}) {
  const { memberships, refreshMe } = useAuth()
  const activeOrgs = memberships.filter((m) => m.status === 'active' && m.organization?.is_verified)
  const [orgId, setOrgId] = useState(activeOrgs[0]?.organization_id ?? '')
  const [wasteKg, setWasteKg] = useState('0')
  const [treesPlanted, setTreesPlanted] = useState('0')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (f?: File) => {
    if (!f) return
    setError(null)
    try {
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      setPhoto(await compressImage(f))
    } catch {
      setError('Foto gagal dibaca')
    }
  }

  const submit = async () => {
    if (!photo) return setError('Pilih foto After terlebih dahulu')
    if (notes.trim().length < 5) return setError('Isi catatan aksi lapangan (minimal 5 karakter)')
    setBusy(true)
    setError(null)
    try {
      await resolveReport(report.id, {
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        notes: notes.trim(),
        wasteKg: Number(wasteKg) || 0,
        treesPlanted: Number(treesPlanted) || 0,
        organizationId: orgId || undefined,
      })
      await Promise.all([refreshMe(), onResolved()])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim bukti After')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Unggah Foto After" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-ink">{report.title}</p>

        {activeOrgs.length > 0 && (
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className={field}
            aria-label="Organisasi pelaksana"
          >
            {activeOrgs.map((m) => (
              <option key={m.organization_id} value={m.organization_id}>
                {m.organization?.name}
              </option>
            ))}
          </select>
        )}

        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-card border-[1.5px] border-dashed border-dash bg-canvas text-ink-soft"
        >
          {photo ? (
            <img src={photo.previewUrl} alt="Foto After" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm font-bold">
              <ImagePlus className="size-7" /> Pilih foto kondisi sesudah
            </span>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-soft">Sampah (kg)</label>
            <input type="number" min="0" step="0.5" className={field} value={wasteKg} onChange={(e) => setWasteKg(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-soft">Bibit ditanam</label>
            <input type="number" min="0" step="1" className={field} value={treesPlanted} onChange={(e) => setTreesPlanted(e.target.value)} />
          </div>
        </div>

        <input
          className={field}
          placeholder="Catatan aksi lapangan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={400}
        />

        {error && (
          <p role="alert" className="rounded-[16px] bg-[#FEE9E7] px-4 py-3 text-sm font-semibold text-[#B91C1C]">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy || !photo}
          onClick={() => void submit()}
          className="btn-primary h-12 w-full text-sm disabled:opacity-50"
        >
          <ShieldCheck className="size-4" />
          {busy ? 'Memverifikasi AI…' : 'Audit Before–After & Pulihkan'}
        </button>
      </div>
    </ModalShell>
  )
}
