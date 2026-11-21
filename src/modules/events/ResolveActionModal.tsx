import { ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import { resolveEvent } from '../../lib/api'
import { compressImage } from '../../lib/imageCompress'
import type { CompressedImage } from '../../lib/imageCompress'
import type { ConservationEvent } from '../../types'
import { useAuth } from '../auth/AuthContext'

const field =
  'h-12 w-full rounded-full border border-line bg-canvas px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-leaf focus:bg-white focus:outline-none'

export default function ResolveActionModal({
  event,
  onClose,
  onResolved,
}: {
  event: ConservationEvent
  onClose: () => void
  onResolved: () => Promise<void>
}) {
  const { memberships, refreshMe } = useAuth()
  const activeOrgs = memberships.filter((m) => m.status === 'active' && m.organization?.is_verified)
  const [orgId, setOrgId] = useState(
    activeOrgs.find((m) => m.organization_id === event.organization_id)?.organization_id ??
      activeOrgs[0]?.organization_id ??
      '',
  )
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
    if (!photo) return setError('Pilih foto sesudah terlebih dahulu')
    if (notes.trim().length < 5) return setError('Isi catatan lapangan (minimal 5 karakter)')
    setBusy(true)
    setError(null)
    try {
      await resolveEvent(event.id, {
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
      setError(err instanceof Error ? err.message : 'Gagal mengirim bukti sesudah')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Foto After" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[14px] font-semibold text-ink">{event.title}</p>

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
          className="relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-[12px] border-[1.5px] border-dashed border-dash bg-canvas text-ink-soft hover:bg-muted"
        >
          {photo ? (
            <img src={photo.previewUrl} alt="Foto After" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm font-normal">
              <ImagePlus className="size-7 text-ink-soft" /> Foto sesudah
            </span>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Sampah (kg)</label>
            <input type="number" min="0" step="0.5" className={field} value={wasteKg} onChange={(e) => setWasteKg(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Bibit</label>
            <input type="number" min="0" step="1" className={field} value={treesPlanted} onChange={(e) => setTreesPlanted(e.target.value)} />
          </div>
        </div>

        <input
          className={field}
          placeholder="Catatan lapangan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={400}
        />

        {error && (
          <p role="alert" className="card-quiet px-4 py-3 text-sm font-medium text-critical">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy || !photo}
          onClick={() => void submit()}
          className="btn-primary h-12 w-full text-sm disabled:opacity-50"
        >
          {busy ? 'Memverifikasi…' : 'Pulihkan'}
        </button>
      </div>
    </ModalShell>
  )
}
