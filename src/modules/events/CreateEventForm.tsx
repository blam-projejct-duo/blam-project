import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ImagePlus, LocateFixed, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { createEvent, fetchOrgs } from '../../lib/api'
import { compressImage } from '../../lib/imageCompress'
import type { CompressedImage } from '../../lib/imageCompress'
import type { CitizenReport, Ecosystem, EventVisibility, SatelliteSignal } from '../../types'
import { useAuth } from '../auth/AuthContext'

interface Props {
  initialReport?: CitizenReport | null
  initialSignal?: SatelliteSignal | null
  onClose: () => void
  onCreated: (eventId: string) => Promise<void> | void
}

const ECOS: { id: Ecosystem; label: string }[] = [
  { id: 'coastal_mangrove', label: 'Mangrove' },
  { id: 'tropical_forest', label: 'Hutan' },
  { id: 'watershed', label: 'Muara' },
]

const CATEGORIES = ['Pemulihan', 'Bersih Sampah', 'Tanam Bibit', 'Pantau Satelit']

const field =
  'h-11 w-full rounded-xl bg-[#f4f5f7] px-3.5 text-sm font-normal text-ink placeholder:font-light placeholder:text-ink-soft focus:bg-[#eaecf0] focus:outline-none'

export default function CreateEventForm({ initialReport, initialSignal, onClose, onCreated }: Props) {
  const queryClient = useQueryClient()
  const { profile, memberships, isLeadOf } = useAuth()
  const activeOrgs = memberships.filter((m) => m.status === 'active' && m.organization?.is_verified)

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: () => fetchOrgs(false),
    enabled: profile?.role === 'admin' && activeOrgs.length === 0,
  })

  const selectableOrgs =
    activeOrgs.length > 0
      ? activeOrgs.map((m) => ({
          id: m.organization_id,
          name: m.organization?.name ?? 'Organisasi',
          isLead: m.member_role === 'lead',
        }))
      : (orgsQuery.data ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          isLead: profile?.role === 'admin',
        }))

  const [orgId, setOrgId] = useState(selectableOrgs[0]?.id ?? '')
  const [title, setTitle] = useState(
    initialReport?.title ??
      (initialSignal ? `Respon ${initialSignal.title}` : ''),
  )
  const [ecosystem, setEcosystem] = useState<Ecosystem>(
    initialReport?.ecosystem ?? initialSignal?.ecosystem ?? 'coastal_mangrove',
  )
  const [category, setCategory] = useState(
    initialReport?.threat_category ?? (initialSignal ? 'Pantau Satelit' : 'Pemulihan'),
  )
  const [locationName, setLocationName] = useState(
    initialReport?.location_name ?? initialSignal?.title ?? '',
  )
  const [lat, setLat] = useState(
    initialReport
      ? initialReport.lat.toFixed(5)
      : initialSignal
        ? initialSignal.lat.toFixed(5)
        : '',
  )
  const [lng, setLng] = useState(
    initialReport
      ? initialReport.lng.toFixed(5)
      : initialSignal
        ? initialSignal.lng.toFixed(5)
        : '',
  )
  const [description, setDescription] = useState(
    initialReport?.ai_site_brief ??
      initialReport?.description ??
      (initialSignal
        ? `Tindak lanjut ${initialSignal.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'} (${initialSignal.categoryLabel})`
        : ''),
  )
  const [startAt, setStartAt] = useState('')
  const [visibility, setVisibility] = useState<EventVisibility>('public')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const effectiveOrgId = orgId || selectableOrgs[0]?.id || ''
  const canSetMembersOnly = profile?.role === 'admin' || isLeadOf(effectiveOrgId)

  const useGps = () => {
    if (!navigator.geolocation) return setError('GPS tidak tersedia di perangkat ini')
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(5))
        setLng(p.coords.longitude.toFixed(5))
        setGpsBusy(false)
        setError(null)
      },
      () => {
        setGpsBusy(false)
        setError('Izin lokasi ditolak. Isi koordinat manual.')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const pickFile = async (f?: File) => {
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
    const latN = Number(lat)
    const lngN = Number(lng)
    if (title.trim().length < 3) return setError('Judul minimal 3 karakter')
    if (!locationName.trim()) return setError('Nama lokasi wajib diisi')
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180) {
      return setError('Koordinat lat/lng tidak valid')
    }

    setBusy(true)
    setError(null)
    try {
      const canAttachRef = Boolean(initialSignal?.source && initialSignal?.externalId)
      const res = await createEvent({
        organizationId: effectiveOrgId || undefined,
        reportId: initialReport?.id,
        refSource: canAttachRef ? initialSignal?.source : undefined,
        refExternalId: canAttachRef ? initialSignal?.externalId : undefined,
        visibility: canSetMembersOnly ? visibility : 'public',
        title: title.trim(),
        description: description.trim() || undefined,
        ecosystem,
        category: category.trim() || 'Gerakan Konservasi',
        lat: latN,
        lng: lngN,
        locationName: locationName.trim(),
        coverImageBase64: photo?.base64,
        coverMimeType: photo?.mimeType,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        maxParticipants: maxParticipants ? Math.max(1, Math.round(Number(maxParticipants))) : undefined,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['reports-queue'] }),
      ])
      await onCreated(res.event.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat event')
    } finally {
      setBusy(false)
    }
  }

  const previewUrl = photo?.previewUrl ?? initialReport?.before_image_url ?? null

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 shrink-0 items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Buat Event</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="grid size-10 place-items-center rounded-xl bg-[#f4f5f7] text-ink hover:bg-[#eaecf0]"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex flex-col gap-3">
          {initialReport && (
            <div className="rounded-[14px] bg-[#f4f5f7] px-4 py-2.5 text-xs font-normal text-ink">
              Tautan laporan: {initialReport.threat_category}
            </div>
          )}

          {initialSignal && (
            <div className="rounded-[14px] bg-[#f4f5f7] px-4 py-2.5 text-xs font-normal text-ink">
              Rujukan satelit: {initialSignal.source === 'nasa_firms' ? 'NASA FIRMS' : 'NASA EONET'}
            </div>
          )}

          {selectableOrgs.length > 0 && (
            <select
              value={effectiveOrgId}
              onChange={(e) => setOrgId(e.target.value)}
              className={field}
              aria-label="Organisasi penyelenggara"
            >
              {selectableOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            {ECOS.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={ecosystem === e.id}
                onClick={() => setEcosystem(e.id)}
                className={`h-10 flex-1 rounded-xl text-xs transition-colors ${
                  ecosystem === e.id
                    ? 'bg-ink font-medium text-white'
                    : 'bg-[#f4f5f7] font-normal text-ink hover:bg-[#eaecf0]'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>

          <input
            className={field}
            placeholder="Judul event"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`h-8 rounded-lg px-3 text-xs transition-colors ${
                  category === c
                    ? 'bg-ink font-medium text-white'
                    : 'bg-[#f4f5f7] font-light text-ink-soft hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <input
            className={field}
            placeholder="Nama lokasi"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            maxLength={160}
          />

          <div className="flex gap-2">
            <input
              className={field}
              inputMode="decimal"
              placeholder="Lat"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <input
              className={field}
              inputMode="decimal"
              placeholder="Lng"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
            <button
              type="button"
              onClick={useGps}
              disabled={gpsBusy}
              aria-label="GPS saya"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f4f5f7] text-ink hover:bg-[#eaecf0] disabled:opacity-50"
            >
              <LocateFixed className="size-4" />
            </button>
          </div>

          <input
            className={field}
            placeholder="Deskripsi gerakan"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={600}
          />

          <input
            type="datetime-local"
            className={field}
            aria-label="Jadwal mulai"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              className={field}
              placeholder="Kuota (opsional)"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
            />
            <select
              value={canSetMembersOnly ? visibility : 'public'}
              onChange={(e) => setVisibility(e.target.value as EventVisibility)}
              disabled={!canSetMembersOnly}
              className={field}
              aria-label="Keterbukaan event"
            >
              <option value="public">Publik</option>
              {canSetMembersOnly && <option value="members_only">Anggota</option>}
            </select>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickFile(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-ink-soft/30 bg-[#f4f5f7] text-ink-soft"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Sampul event" className="size-full object-cover" />
            ) : (
              <span className="flex items-center gap-2 text-xs font-light">
                <ImagePlus className="size-5 text-ink-soft" /> Foto sampul
              </span>
            )}
          </button>

          {error && (
            <p role="alert" className="rounded-[14px] bg-[#f4f5f7] px-4 py-3 text-xs font-light text-ink">
              {error}
            </p>
          )}
        </div>
      </div>

      <footer className="shrink-0 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="btn-primary h-12 w-full text-sm disabled:opacity-50"
        >
          <CalendarPlus className="size-4" />
          {busy ? 'Menyimpan…' : 'Terbitkan Event'}
        </button>
      </footer>
    </div>
  )
}
