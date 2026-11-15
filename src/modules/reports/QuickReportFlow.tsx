import { motion } from 'framer-motion'
import { ArrowLeft, Camera, Check, ImagePlus, LocateFixed, ShieldCheck, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { verifyAndCreateReport } from '../../lib/api'
import type { VerifyReportResult } from '../../lib/api'
import { compressImage, haversineDistanceKm } from '../../lib/imageCompress'
import type { CompressedImage } from '../../lib/imageCompress'
import type { Ecosystem } from '../../types'
import { useAuth } from '../auth/AuthContext'

interface Props {
  onClose: () => void
  onPublished: (reportId: string) => void
}

const ECOS: { id: Ecosystem; label: string }[] = [
  { id: 'coastal_mangrove', label: 'Mangrove' },
  { id: 'tropical_forest', label: 'Hutan' },
  { id: 'watershed', label: 'Muara' },
]

const field =
  'h-12 w-full rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-ink focus:outline-none'

export default function QuickReportFlow({ onClose, onPublished }: Props) {
  const { profile, openAuthModal, refreshMe } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [eco, setEco] = useState<Ecosystem>('coastal_mangrove')
  const [place, setPlace] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [deviceGps, setDeviceGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [note, setNote] = useState('')
  const [anon, setAnon] = useState(false)
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [result, setResult] = useState<VerifyReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const latN = Number(lat)
  const lngN = Number(lng)
  const coordsOk = lat !== '' && lng !== '' && Number.isFinite(latN) && Number.isFinite(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180
  const step1Ok = place.trim().length > 2 && coordsOk

  const useGps = () => {
    if (!navigator.geolocation) return setError('GPS tidak tersedia di perangkat ini')
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const dLat = p.coords.latitude
        const dLng = p.coords.longitude
        setDeviceGps({ lat: dLat, lng: dLng })
        setLat(dLat.toFixed(5))
        setLng(dLng.toFixed(5))
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

  const pickFile = async (file?: File) => {
    if (!file) return
    setError(null)
    try {
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      setPhoto(await compressImage(file))
    } catch {
      setError('Foto tidak bisa dibaca. Coba foto lain.')
    }
  }

  const scan = async () => {
    if (!photo) return
    if (!profile) {
      openAuthModal()
      return
    }
    setStep(3)
    setResult(null)
    setError(null)
    const locationMismatch = deviceGps
      ? haversineDistanceKm(deviceGps.lat, deviceGps.lng, latN, lngN) > 5
      : false

    try {
      const r = await verifyAndCreateReport({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        ecosystem: eco,
        description: note.trim(),
        locationName: place.trim(),
        lat: latN,
        lng: lngN,
        locationMismatch,
        isAnonymous: anon,
      })
      setResult(r)
      if (r.isValid && r.saved) {
        await refreshMe()
        setStep(4)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memindai')
    }
  }

  const back = () => {
    setError(null)
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else onClose()
  }

  const scanning = step === 3 && !result && !error

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={step === 1 || step === 4 ? onClose : back}
          aria-label={step === 1 || step === 4 ? 'Tutup' : 'Kembali'}
          className="grid size-12 place-items-center rounded-full border border-line bg-white text-ink"
        >
          {step === 1 || step === 4 ? <X className="size-5" /> : <ArrowLeft className="size-5" />}
        </button>
        <div className="flex gap-1.5" aria-label={`Langkah ${step} dari 4`}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === step ? 'w-6 bg-ink' : n < step ? 'w-1.5 bg-ink' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <span className="size-12" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {step === 1 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight">Lokasi</h2>
            <div className="flex gap-2">
              {ECOS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={eco === e.id}
                  onClick={() => setEco(e.id)}
                  className={`h-12 flex-1 rounded-full border text-sm font-bold ${eco === e.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
            <input className={field} placeholder="Nama lokasi" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} />
            <div className="flex gap-2">
              <input className={field} inputMode="decimal" placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} />
              <input className={field} inputMode="decimal" placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <button type="button" onClick={useGps} disabled={gpsBusy} className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-bold text-ink disabled:opacity-60">
              <LocateFixed className="size-4" /> {gpsBusy ? 'Mencari…' : 'GPS saya'}
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight">Foto</h2>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pickFile(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-card border-[1.5px] border-dashed border-dash bg-white text-ink-soft">
              {photo ? (
                <img src={photo.previewUrl} alt="Foto laporan" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm font-bold">
                  <ImagePlus className="size-8" /> Ambil / pilih foto
                </span>
              )}
            </button>
            <input className={field} placeholder="Catatan kondisi atau aksi" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            <label className="flex h-12 items-center justify-between rounded-full border border-line bg-white px-4 text-sm font-bold">
              Lapor anonim
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="size-5 accent-ink" />
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col items-center gap-4 text-center">
            <h2 className="self-start text-2xl font-extrabold tracking-tight">AI Vision</h2>
            {photo && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-muted">
                <img src={photo.previewUrl} alt="" className="size-full object-cover" />
                {scanning && (
                  <motion.div className="absolute inset-x-0 top-0 h-1 bg-ink" animate={{ y: [0, 250, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
                )}
              </div>
            )}
            {scanning && <p className="text-sm font-bold text-ink-soft">Memindai…</p>}
            {result && !result.isValid && (
              <div className="w-full rounded-card border border-line bg-white p-5 text-left">
                <p className="text-base font-extrabold text-ink-soft">Ditolak</p>
                <p className="mt-1 text-sm text-ink/80">{result.reason}</p>
                <p className="num mt-2 text-xs text-ink-soft">Skor {result.confidence}%</p>
              </div>
            )}
          </section>
        )}

        {step === 4 && result && (
          <section className="relative flex flex-col items-center gap-4 pt-6 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-white text-emerald border border-line">
              <Check className="size-10" strokeWidth={3} />
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight">Merci!{result.pointsAwarded ? ` +${result.pointsAwarded}` : ''}</h2>
            <div className="w-full rounded-card border border-line bg-white p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink-soft"><ShieldCheck className="size-4" /> AI</span>
                <span className="num text-2xl text-ink">{result.confidence}%</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{result.threatCategory}</span>
              </div>
              {result.recommendations.length > 0 && (
                <div className="mt-3 border-t-[1.5px] border-dashed border-dash text-sm text-ink/80">
                  {result.recommendations.slice(0, 2).map((r) => (
                    <p key={r} className="dashed-row py-2.5">
                      {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {error && <p role="alert" className="mt-4 rounded-card border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">{error}</p>}
      </div>

      <footer className="shrink-0 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        {step === 1 && (
          <button type="button" disabled={!step1Ok} onClick={() => setStep(2)} className="btn-primary h-13 w-full text-[15px] disabled:opacity-40">Lanjutkan</button>
        )}
        {step === 2 && (
          <button type="button" disabled={!photo} onClick={() => void scan()} className="btn-primary h-13 w-full text-[15px] disabled:opacity-40">
            <Camera className="size-5" /> Pindai
          </button>
        )}
        {step === 3 && (result || error) && (
          <button type="button" onClick={() => (result && !result.isValid ? setStep(2) : void scan())} className="btn-primary h-13 w-full text-[15px]">
            {result && !result.isValid ? 'Ganti foto' : 'Coba lagi'}
          </button>
        )}
        {step === 4 && result?.reportId && (
          <button type="button" onClick={() => onPublished(result.reportId!)} className="btn-primary h-13 w-full text-[15px]">Lihat di peta</button>
        )}
      </footer>
    </div>
  )
}
