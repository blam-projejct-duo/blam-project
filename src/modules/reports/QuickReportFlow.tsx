import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
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
  const [phase, setPhase] = useState<'form' | 'done'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [incident, setIncident] = useState<IncidentType>(() => initialPrefill?.incident ?? 'Sampah')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [region, setRegion] = useState<{ name: string; detail: string; fullAddress: string } | null>(null)
  const [gpsBusy, setGpsBusy] = useState(
    () => typeof navigator !== 'undefined' && Boolean(navigator.geolocation),
  )
  const [gpsFailed, setGpsFailed] = useState(false)
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

  const locationReady = Boolean(coords && region?.fullAddress)
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

  const locateUser = useCallback((fromRetry = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsBusy(false)
      setGpsFailed(true)
      return
    }
    if (fromRetry) {
      setGpsBusy(true)
      setGpsFailed(false)
      setError(null)
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const dLat = p.coords.latitude
        const dLng = p.coords.longitude
        setCoords({ lat: dLat, lng: dLng })
        setGpsFailed(false)
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
        setGpsFailed(true)
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

  const submitReport = async () => {
    if (!photo || !coords || !region || submitting) return
    if (recording) stopVoice()
    setSubmitting(true)
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
        setPhase('done')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim laporan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      <header className="flex h-15 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="grid size-10 place-items-center rounded-full bg-[#f4f5f7] text-ink transition-colors hover:bg-[#e8eaee]"
        >
          <X className="size-5" />
        </button>
        <span className="text-[12px] font-light text-ink-soft">Blam Snap</span>
        <span className="size-10" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {phase === 'form' && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-[21px] font-semibold tracking-tight text-ink">Lapor Kejadian</h2>

              {region ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f5f7] px-2.5 py-1 text-[12px] font-normal text-ink">
                  <MapPin className="size-3.5 text-[#0ea5e9]" />
                  <span>{region.name}</span>
                  {region.detail && <span className="font-light text-ink-soft">· {region.detail}</span>}
                </span>
              ) : gpsFailed ? (
                <button
                  type="button"
                  onClick={() => locateUser(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f5f7] px-2.5 py-1 text-[12px] font-normal text-ink transition-colors hover:bg-[#e8eaee]"
                >
                  <MapPin className="size-3.5 text-[#0ea5e9]" />
                  <span>Izinkan lokasi · Coba lagi</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f5f7] px-2.5 py-1 text-[12px] font-light text-ink-soft">
                  <MapPin className="size-3.5 animate-pulse text-[#0ea5e9]" />
                  Mencari lokasi…
                </span>
              )}
            </div>

            {initialPrefill && (
              <div className="rounded-xl bg-[#f4f5f7] px-3.5 py-2 text-[12px] font-light text-ink">
                Dari Blam Chat
                {initialPrefill.locationHint ? ` · ${initialPrefill.locationHint}` : ''}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                setResult(null)
                void pickFile(e.target.files?.[0])
              }}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => fileRef.current?.click()}
              className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#d4d8df] bg-[#f7f7f8] text-ink-soft transition-colors hover:bg-[#f1f2f4] disabled:opacity-90"
            >
              {photo ? (
                <>
                  <img src={photo.previewUrl} alt="Foto laporan" className="size-full object-cover" />
                  {submitting && (
                    <motion.div
                      className="blam-gradient absolute inset-x-0 top-0 h-1 shadow-[0_0_12px_rgba(14,165,233,0.5)]"
                      animate={{ y: [0, 240, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </>
              ) : (
                <span className="flex flex-col items-center gap-2 text-[13px] font-light">
                  <ImagePlus className="size-7 text-leaf" /> Ambil atau pilih foto
                </span>
              )}
            </button>

            {result && !result.isValid && (
              <div className="rounded-[14px] bg-critical/8 px-4 py-3 text-left">
                <p className="text-[13px] font-medium text-critical">Foto belum sesuai</p>
                <p className="mt-0.5 text-[12.5px] font-light text-ink/80">{result.reason}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-light tracking-wide text-ink-soft uppercase">Kejadian</p>
              <div className="grid grid-cols-2 gap-2">
                {INCIDENTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={submitting}
                    aria-pressed={incident === item}
                    onClick={() => setIncident(item)}
                    className={`h-10.5 rounded-xl text-[13px] transition-colors ${
                      incident === item
                        ? 'bg-ink font-medium text-white'
                        : 'bg-[#f4f5f7] font-normal text-ink hover:bg-[#eaecf0]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[14px] bg-[#f4f5f7]">
              <textarea
                rows={2}
                value={note}
                disabled={submitting}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="Tambah catatan (opsional)…"
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2.5 text-[13.5px] font-normal text-ink placeholder:font-light placeholder:text-ink-soft focus:outline-none"
              />

              {voice && (
                <div className="flex items-center gap-2 border-t border-black/[0.05] px-3.5 py-2">
                  <audio controls src={voice.previewUrl} className="h-8 min-w-0 flex-1" />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={removeVoice}
                    aria-label="Hapus rekaman suara"
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-ink-soft hover:text-critical"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-black/[0.05] px-3.5 py-2.5">
                {!voice ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => (recording ? stopVoice() : void startVoice())}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-normal transition-colors ${
                      recording
                        ? 'bg-critical text-white'
                        : 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#fafafa]'
                    }`}
                  >
                    {recording ? (
                      <>
                        <Square className="size-3 fill-current" />
                        <span className="num font-normal">{formatSeconds(recordSeconds)}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="size-3.5 text-leaf" /> Rekam suara
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11.5px] font-light text-ink-soft">Suara terlampir</span>
                )}

                <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-light text-ink">
                  <span>Anonim</span>
                  <input
                    type="checkbox"
                    checked={!profile || anon}
                    disabled={!profile || submitting}
                    onChange={(e) => setAnon(e.target.checked)}
                    className="size-4 accent-leaf disabled:opacity-60"
                  />
                </label>
              </div>
            </div>
          </section>
        )}

        {phase === 'done' && result && (
          <section className="relative flex flex-col items-center gap-4 pt-8 text-center">
            <span className="blam-gradient grid size-16 place-items-center rounded-2xl text-white shadow-[0_6px_18px_rgba(14,165,233,0.25)]">
              <Check className="size-8" strokeWidth={2.5} />
            </span>
            <h2 className="text-[22px] font-semibold tracking-tight text-ink">
              Laporan Terkirim!{result.pointsAwarded ? ` +${result.pointsAwarded}` : ''}
            </h2>
            <div className="w-full rounded-[14px] bg-[#f4f5f7] p-4.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <ReportStatusPill status={result.status ?? 'pending_verification'} />
                <span className="flex items-center gap-1.5 text-[12.5px] font-light text-ink-soft">
                  <ShieldCheck className="size-4 text-[#0ea5e9]" />
                  <span className="num text-[15px] font-semibold text-ink">{result.confidence}%</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-normal text-ink">{result.threatCategory}</span>
              </div>
              {result.recommendations.length > 0 && (
                <div className="mt-3 border-t border-black/[0.06] pt-2 text-[13px] font-light text-ink/80">
                  {result.recommendations.slice(0, 2).map((r) => (
                    <p key={r} className="py-1">
                      {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-card bg-critical/8 px-4 py-3 text-[13px] font-light text-critical">
            {error}
          </p>
        )}
      </div>

      <footer className="shrink-0 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        {phase === 'form' && (
          <button
            type="button"
            disabled={!photo || !locationReady || recording || submitting}
            onClick={() => void submitReport()}
            className="btn-primary h-12 w-full text-[14px] disabled:opacity-45"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4.5 animate-spin" /> Mengirim laporan…
              </>
            ) : !locationReady && gpsBusy ? (
              'Menunggu lokasi…'
            ) : (
              <>
                <Camera className="size-4.5" /> Kirim Laporan
              </>
            )}
          </button>
        )}
        {phase === 'done' && result?.reportId && (
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
