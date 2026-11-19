import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  LocateFixed,
  MapPin,
  Mic,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ReportStatusPill } from '../../components/ui/atoms'
import { reverseGeocode, verifyAndCreateReport } from '../../lib/api'
import type { BlamSnapPrefill, VerifyReportResult } from '../../lib/api'
import { compressImage } from '../../lib/imageCompress'
import type { CompressedImage } from '../../lib/imageCompress'
import type { Ecosystem } from '../../types'
import { useAuth } from '../auth/AuthContext'

interface Props {
  onClose: () => void
  onSubmitted?: () => void
  onOpenVerification?: () => void
  initialPrefill?: BlamSnapPrefill
}

const INCIDENTS = ['Sampah', 'Banjir', 'Kebakaran', 'Lainnya'] as const
type IncidentType = (typeof INCIDENTS)[number]

const INCIDENT_ECOSYSTEM: Record<IncidentType, Ecosystem> = {
  Sampah: 'coastal_mangrove',
  Banjir: 'watershed',
  Kebakaran: 'tropical_forest',
  Lainnya: 'coastal_mangrove',
}

interface VoiceNote {
  base64: string
  mimeType: string
  previewUrl: string
  seconds: number
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : ''
      const comma = res.indexOf(',')
      resolve(comma >= 0 ? res.slice(comma + 1) : res)
    }
    reader.onerror = () => reject(new Error('Gagal membaca rekaman suara'))
    reader.readAsDataURL(blob)
  })
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function QuickReportFlow({ onClose, onSubmitted, onOpenVerification, initialPrefill }: Props) {
  const queryClient = useQueryClient()
  const { profile, refreshMe } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [incident, setIncident] = useState<IncidentType>(() => initialPrefill?.incident ?? 'Sampah')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [region, setRegion] = useState<{ name: string; detail: string; fullAddress: string } | null>(null)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [note, setNote] = useState(() => initialPrefill?.description ?? '')
  const [anon, setAnon] = useState(() => Boolean(initialPrefill?.isAnonymous))
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [voice, setVoice] = useState<VoiceNote | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [result, setResult] = useState<VerifyReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const step1Ok = Boolean(coords && region?.fullAddress)
  const canVerify = profile && (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin')

  const stopRecordingStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop()
    }
    streamRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      stopRecordingStream()
    }
  }, [stopRecordingStream])

  const locateUser = useCallback((showBusy = true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('GPS tidak tersedia di perangkat ini.')
      return
    }
    if (showBusy) setGpsBusy(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const dLat = p.coords.latitude
        const dLng = p.coords.longitude
        setCoords({ lat: dLat, lng: dLng })
        void reverseGeocode(dLat, dLng)
          .then((geo) => {
            setRegion({ name: geo.name, detail: geo.detail, fullAddress: geo.fullAddress })
          })
          .catch(() => {
            const fallback = `Lokasi (${dLat.toFixed(4)}, ${dLng.toFixed(4)})`
            setRegion({ name: 'Lokasi GPS', detail: `${dLat.toFixed(4)}, ${dLng.toFixed(4)}`, fullAddress: fallback })
          })
          .finally(() => {
            setGpsBusy(false)
          })
      },
      () => {
        setGpsBusy(false)
        setError('Aktifkan izin lokasi di browser dulu ya.')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => {
    locateUser(false)
  }, [locateUser])

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

  const startVoice = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Perekam suara tidak didukung di browser ini.')
      return
    }
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      const chunks: BlobPart[] = []
      let elapsed = 0

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data)
      }
      recorder.onstop = async () => {
        stopRecordingStream()
        setRecording(false)
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size === 0) return
        if (blob.size > 1.45 * 1024 * 1024) {
          setError('Rekaman suara terlalu panjang (maks 1,5 MB). Rekam lebih singkat.')
          return
        }
        try {
          const base64 = await blobToBase64(blob)
          const previewUrl = URL.createObjectURL(blob)
          setVoice((prev) => {
            if (prev) URL.revokeObjectURL(prev.previewUrl)
            return {
              base64,
              mimeType: (recorder.mimeType || 'audio/webm').split(';')[0],
              previewUrl,
              seconds: Math.max(1, elapsed),
            }
          })
        } catch {
          setError('Gagal memproses rekaman suara.')
        }
      }

      setRecordSeconds(0)
      setRecording(true)
      recorder.start()
      timerRef.current = setInterval(() => {
        elapsed += 1
        setRecordSeconds(elapsed)
        if (elapsed >= 45 && recorder.state === 'recording') {
          recorder.stop()
        }
      }, 1000)
    } catch {
      stopRecordingStream()
      setRecording(false)
      setError('Izin mikrofon ditolak. Aktifkan izin mikrofon atau lewati laporan suara.')
    }
  }

  const stopVoice = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  const removeVoice = () => {
    setVoice((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
  }

  const scan = async () => {
    if (!photo || !coords || !region) return
    if (recording) stopVoice()
    setStep(3)
    setResult(null)
    setError(null)

    try {
      const r = await verifyAndCreateReport({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        ecosystem: INCIDENT_ECOSYSTEM[incident],
        incidentType: incident,
        description: note.trim(),
        audioBase64: voice?.base64,
        audioMimeType: voice?.mimeType,
        locationName: region.fullAddress,
        lat: coords.lat,
        lng: coords.lng,
        locationMismatch: false,
        isAnonymous: profile ? anon : true,
      })
      setResult(r)
      if (r.isValid && r.saved) {
        await Promise.all([
          profile ? refreshMe() : Promise.resolve(),
          queryClient.invalidateQueries({ queryKey: ['reports-queue'] }),
        ])
        onSubmitted?.()
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
    <div className="relative flex h-full flex-col bg-white">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={step === 1 || step === 4 ? onClose : back}
          aria-label={step === 1 || step === 4 ? 'Tutup' : 'Kembali'}
          className="grid size-11 place-items-center rounded-full bg-[#f5f7ff] text-forest transition-colors hover:bg-mint/60"
        >
          {step === 1 || step === 4 ? <X className="size-5" /> : <ArrowLeft className="size-5" />}
        </button>
        <div className="flex gap-1.5" aria-label={`Langkah ${step} dari 4`}>
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${n === step ? 'w-6 bg-ink' : n < step ? 'w-1.5 bg-ink' : 'w-1.5 bg-line'}`}
            />
          ))}
        </div>
        <span className="size-12" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {step === 1 && (
          <section className="flex flex-col gap-3.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Di mana ini?</h2>

            {initialPrefill && (
              <div className="rounded-card bg-mint/45 px-3.5 py-2 text-[12px] font-light text-forest">
                Terisi dari Blam AI
                {initialPrefill.locationHint ? ` · ${initialPrefill.locationHint}` : ''}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-light tracking-wide text-ink-soft uppercase">Kejadian</p>
              <div className="grid grid-cols-2 gap-2">
                {INCIDENTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={incident === item}
                    onClick={() => setIncident(item)}
                    className={`h-10.5 rounded-full text-[13px] transition-colors ${
                      incident === item
                        ? 'bg-ink font-medium text-white'
                        : 'bg-[#f5f7ff] font-normal text-ink hover:bg-mint/45'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-card bg-[#f5f7ff] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-light tracking-wide text-ink-soft uppercase">
                    <MapPin className="size-3.5 text-emerald" /> Lokasi
                  </p>
                  {region ? (
                    <>
                      <p className="mt-1.5 text-[14px] font-normal text-ink">{region.name}</p>
                      <p className="text-[12px] font-light text-ink-soft">{region.detail}</p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[12px] font-light text-ink-soft">
                      {gpsBusy ? 'Mencari lokasi…' : 'GPS belum aktif'}
                    </p>
                  )}
                </div>
                {coords && (
                  <span className="num shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-normal text-ink-soft">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => locateUser(true)}
                disabled={gpsBusy}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-[12px] font-normal text-ink shadow-[0_1px_2px_rgba(18,29,79,0.04)] hover:bg-mint/35 disabled:opacity-60"
              >
                <LocateFixed className="size-4 text-leaf" />
                {gpsBusy ? 'Mencari lokasi…' : coords ? 'Perbarui GPS' : 'Aktifkan GPS'}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-3.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Foto &amp; suara</h2>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => void pickFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-card border-[1.5px] border-dashed border-leaf/25 bg-[#f5f7ff]/70 text-ink-soft"
            >
              {photo ? (
                <img src={photo.previewUrl} alt="Foto laporan" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-[13px] font-light">
                  <ImagePlus className="size-7 text-leaf" /> Ambil foto
                </span>
              )}
            </button>

            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="Catatan singkat (opsional)"
              className="w-full resize-none rounded-card bg-[#f5f7ff] px-4 py-3 text-[13.5px] font-normal text-ink placeholder:font-light placeholder:text-ink-soft focus:bg-mint/35 focus:outline-none"
            />

            <div className="rounded-card bg-[#f5f7ff] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-light tracking-wide text-ink-soft uppercase">
                  Suara (opsional)
                </span>
                {recording && (
                  <span className="num text-[12px] font-normal text-critical">Merekam · {formatSeconds(recordSeconds)}</span>
                )}
              </div>

              {!voice ? (
                <button
                  type="button"
                  onClick={() => (recording ? stopVoice() : void startVoice())}
                  className={`mt-2.5 flex h-10.5 w-full items-center justify-center gap-2 rounded-full text-[13px] font-normal transition-colors ${
                    recording
                      ? 'bg-critical text-white'
                      : 'bg-white text-ink shadow-[0_1px_2px_rgba(18,29,79,0.04)] hover:bg-mint/35'
                  }`}
                >
                  {recording ? (
                    <>
                      <Square className="size-4 fill-current" /> Berhenti
                    </>
                  ) : (
                    <>
                      <Mic className="size-4 text-leaf" /> Rekam suara
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-2.5 flex items-center gap-2">
                  <audio controls src={voice.previewUrl} className="h-9 min-w-0 flex-1" />
                  <button
                    type="button"
                    onClick={removeVoice}
                    aria-label="Hapus rekaman suara"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink-soft hover:text-critical"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>

            <label className="flex h-11.5 items-center justify-between rounded-full bg-[#f5f7ff] px-4 text-[13.5px] font-normal">
              Lapor anonim
              <input
                type="checkbox"
                checked={!profile || anon}
                disabled={!profile}
                onChange={(e) => setAnon(e.target.checked)}
                className="size-4.5 accent-leaf disabled:opacity-60"
              />
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col items-center gap-4 text-center">
            <h2 className="self-start text-[20px] font-semibold tracking-tight">Cek AI</h2>
            {photo && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-muted">
                <img src={photo.previewUrl} alt="" className="size-full object-cover" />
                {scanning && (
                  <motion.div
                    className="absolute inset-x-0 top-0 h-1 bg-ink"
                    animate={{ y: [0, 250, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>
            )}
            {scanning && <p className="text-[13px] font-light text-ink-soft">Mengecek foto…</p>}
            {result && !result.isValid && (
              <div className="w-full rounded-card border border-line bg-white p-4.5 text-left">
                <p className="text-[14px] font-medium text-ink-soft">Belum cocok</p>
                <p className="mt-1 text-[13px] font-light text-ink/80">{result.reason}</p>
                <p className="num mt-2 text-[11.5px] font-normal text-ink-soft">Skor {result.confidence}%</p>
              </div>
            )}
          </section>
        )}

        {step === 4 && result && (
          <section className="relative flex flex-col items-center gap-4 pt-6 text-center">
            <span className="grid size-18 place-items-center rounded-full border border-line bg-white text-emerald">
              <Check className="size-9" strokeWidth={2.75} />
            </span>
            <h2 className="text-[22px] font-semibold tracking-tight">
              Terkirim!{result.pointsAwarded ? ` +${result.pointsAwarded}` : ''}
            </h2>
            <div className="w-full rounded-card border border-line bg-white p-4.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <ReportStatusPill status={result.status ?? 'pending_verification'} />
                <span className="flex items-center gap-1.5 text-[12.5px] font-light text-ink-soft">
                  <ShieldCheck className="size-4" />
                  <span className="num text-[15px] font-semibold text-ink">{result.confidence}%</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-normal">{result.threatCategory}</span>
              </div>
              {result.recommendations.length > 0 && (
                <div className="mt-3 border-t border-leaf/10 text-[13px] text-ink/80">
                  {result.recommendations.slice(0, 2).map((r) => (
                    <p key={r} className="dashed-row py-2">
                      {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-card border border-line bg-white px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </p>
        )}
      </div>

      <footer className="shrink-0 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        {step === 1 && (
          <button
            type="button"
            disabled={!step1Ok}
            onClick={() => setStep(2)}
            className="btn-primary h-12 w-full text-[14px] disabled:opacity-40"
          >
            Lanjut
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            disabled={!photo || recording}
            onClick={() => void scan()}
            className="btn-primary h-12 w-full text-[14px] disabled:opacity-40"
          >
            <Camera className="size-4.5" /> Cek &amp; kirim
          </button>
        )}
        {step === 3 && (result || error) && (
          <button
            type="button"
            onClick={() => (result && !result.isValid ? setStep(2) : void scan())}
            className="btn-primary h-12 w-full text-[14px]"
          >
            {result && !result.isValid ? 'Ganti foto' : 'Coba lagi'}
          </button>
        )}
        {step === 4 && result?.reportId && (
          <button
            type="button"
            onClick={() => (canVerify && onOpenVerification ? onOpenVerification() : onClose())}
            className="btn-primary h-12 w-full text-[14px]"
          >
            {canVerify && onOpenVerification ? 'Buka verifikasi' : 'Selesai'}
          </button>
        )}
      </footer>
    </div>
  )
}
