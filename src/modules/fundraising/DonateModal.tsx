import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  EyeOff,
  HeartHandshake,
  Loader2,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { donateToFundraising } from '../../lib/api'
import type { FundraisingCampaign, PaymentMethod } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { formatRupiah } from './useFundraisings'

const AMOUNT_PRESETS = [
  { value: 10_000, label: 'Rp 10 rb' },
  { value: 25_000, label: 'Rp 25 rb' },
  { value: 50_000, label: 'Rp 50 rb' },
  { value: 100_000, label: 'Rp 100 rb' },
  { value: 250_000, label: 'Rp 250 rb' },
]

const MBANKING_BANKS = [
  { id: 'BCA', label: 'BCA Mobile', vaPrefix: '3901' },
  { id: 'Mandiri', label: 'Livin’ Mandiri', vaPrefix: '8801' },
  { id: 'BNI', label: 'BNI Mobile', vaPrefix: '8241' },
  { id: 'BRI', label: 'BRImo', vaPrefix: '7701' },
]

function SimulatedQrSvg({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let hash = 2166136261
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    const grid: boolean[] = []
    for (let r = 0; r < 15; r += 1) {
      for (let c = 0; c < 15; c += 1) {
        const inTopLeft = r < 5 && c < 5
        const inTopRight = r < 5 && c >= 10
        const inBottomLeft = r >= 10 && c < 5
        if (inTopLeft || inTopRight || inBottomLeft) {
          const lr = r >= 10 ? r - 10 : r
          const lc = c >= 10 ? c - 10 : c
          const border = lr === 0 || lr === 4 || lc === 0 || lc === 4
          const center = lr === 2 && lc === 2
          grid.push(border || center)
        } else {
          hash ^= (r * 31 + c * 17) & 0xff
          hash = Math.imul(hash, 16777619)
          grid.push((hash >>> 0) % 2 === 0)
        }
      }
    }
    return grid
  }, [seed])

  return (
    <svg
      viewBox="0 0 150 150"
      className="size-40 rounded-2xl border border-line bg-surface p-2.5 shadow-sm sm:size-44"
      aria-label="QR Code QRIS Simulasi"
    >
      {cells.map((filled, idx) => {
        if (!filled) return null
        const r = Math.floor(idx / 15)
        const c = idx % 15
        return <rect key={idx} x={c * 10} y={r * 10} width={9.2} height={9.2} rx={1.5} fill="#111827" />
      })}
    </svg>
  )
}

interface Props {
  campaign: FundraisingCampaign
  onClose: () => void
  onDonated: () => Promise<void>
}

export default function DonateModal({ campaign, onClose, onDonated }: Props) {
  const { profile } = useAuth()

  const [step, setStep] = useState<'form' | 'payment' | 'done'>('form')
  const [amount, setAmount] = useState<number>(50_000)
  const [customAmount, setCustomAmount] = useState<string>('50000')
  const [donorName, setDonorName] = useState<string>(profile?.full_name ?? '')
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')
  const [selectedBank, setSelectedBank] = useState<string>('BCA')
  const [bankConfirmedStep, setBankConfirmedStep] = useState<boolean>(false)
  const [copiedVa, setCopiedVa] = useState<boolean>(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vaNumber = useMemo(() => {
    const bank = MBANKING_BANKS.find((b) => b.id === selectedBank) ?? MBANKING_BANKS[0]
    const suffix = campaign.id.replace(/\D/g, '').slice(0, 8).padEnd(8, '4')
    return `${bank.vaPrefix}${suffix}`
  }, [selectedBank, campaign.id])

  const handleSelectPreset = (val: number) => {
    setAmount(val)
    setCustomAmount(String(val))
  }

  const handleCustomAmount = (val: string) => {
    const digits = val.replace(/\D/g, '')
    setCustomAmount(digits)
    setAmount(digits ? Number(digits) : 0)
  }

  const goToPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number.isFinite(amount) || amount < 1000) {
      setError('Nominal donasi minimal Rp 1.000')
      return
    }
    setError(null)
    setBankConfirmedStep(false)
    setStep('payment')
  }

  const handleCopyVa = async () => {
    try {
      await navigator.clipboard.writeText(vaNumber)
      setCopiedVa(true)
      setTimeout(() => setCopiedVa(false), 1800)
    } catch {
      // ignore clipboard errors
    }
  }

  const handleCompleteDonation = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await donateToFundraising(campaign.id, {
        amount,
        paymentMethod,
        bankName: paymentMethod === 'mbanking' ? selectedBank : undefined,
        isAnonymous,
        donorName: isAnonymous ? undefined : donorName.trim() || undefined,
        message: message.trim() || undefined,
      })
      await onDonated()
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses donasi')
    } finally {
      setSubmitting(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Donasi Penggalangan Dana"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-2xl sm:rounded-[28px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas/55 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-mint text-forest">
              <HeartHandshake className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink">
                {step === 'done' ? 'Donasi Berhasil' : 'Donasi Bantuan Darurat'}
              </h2>
              <p className="truncate text-xs font-medium text-ink-soft">{campaign.title}</p>
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

        {step !== 'done' && (
          <div className="flex items-center gap-2 border-b border-line/70 bg-surface px-5 py-2.5 text-[11px] font-extrabold">
            <span className={step === 'form' ? 'text-forest' : 'text-ink-soft'}>1. Nominal & Identitas</span>
            <span className="text-line">•</span>
            <span className={step === 'payment' ? 'text-forest' : 'text-ink-soft'}>2. Pembayaran</span>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={goToPayment} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                  Pilih Nominal Donasi
                </span>
                {amount > 0 && (
                  <span className="num rounded-full bg-mint px-2.5 py-0.5 text-xs text-forest">
                    {formatRupiah(amount)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {AMOUNT_PRESETS.map((preset) => {
                  const active = amount === preset.value
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleSelectPreset(preset.value)}
                      className={`h-10 min-w-[88px] flex-1 rounded-2xl border px-3 text-xs font-extrabold whitespace-nowrap transition ${
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
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  placeholder="Atau ketik nominal donasi..."
                  className="num h-11 w-full rounded-2xl border border-line bg-canvas pr-3.5 pl-10 text-sm text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                  Identitas Pemberi
                </span>
                <button
                  type="button"
                  onClick={() => setIsAnonymous((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                    isAnonymous
                      ? 'border-leaf bg-mint text-forest'
                      : 'border-line bg-canvas text-ink-soft hover:text-ink'
                  }`}
                >
                  <EyeOff className="size-3.5" />
                  {isAnonymous ? 'Identitas Disembunyikan' : 'Sembunyikan Identitas'}
                </button>
              </div>
              {isAnonymous ? (
                <p className="capsule-dashed rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-forest">
                  Di bagian catatan pemberi, nama Anda akan ditampilkan sebagai <strong>Anonim</strong>.
                </p>
              ) : (
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Nama Anda (opsional)"
                  maxLength={80}
                  className="h-11 w-full rounded-2xl border border-line bg-canvas px-3.5 text-sm font-semibold text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
                />
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                Pesan / Doa untuk Warga Terdampak (Opsional)
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="Semoga lekas pulih dan selalu dalam lindungan..."
                className="w-full resize-none rounded-2xl border border-line bg-canvas p-3.5 text-sm font-medium text-ink transition focus:border-leaf focus:bg-surface focus:outline-none"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-critical/30 bg-critical/8 px-3.5 py-2.5 text-xs font-bold text-critical"
              >
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary mt-1 h-12 w-full px-5 text-sm whitespace-nowrap">
              Lanjutkan · {formatRupiah(amount)}
            </button>
          </form>
        )}

        {step === 'payment' && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
              <span className="text-xs font-bold text-ink-soft">Total Donasi</span>
              <span className="num text-base text-forest">{formatRupiah(amount)}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-canvas p-1">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('qris')
                  setBankConfirmedStep(false)
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                  paymentMethod === 'qris'
                    ? 'bg-surface text-forest shadow-xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <QrCode className="size-4" />
                QRIS
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('mbanking')
                  setBankConfirmedStep(false)
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                  paymentMethod === 'mbanking'
                    ? 'bg-surface text-forest shadow-xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Building2 className="size-4" />
                m-Banking
              </button>
            </div>

            {paymentMethod === 'qris' ? (
              <div className="capsule-dashed flex flex-col items-center gap-3 rounded-3xl p-5 text-center">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-extrabold text-ink shadow-xs">
                  <ShieldCheck className="size-3.5 shrink-0 text-leaf" />
                  <span className="truncate">QRIS · {campaign.organizer_name}</span>
                </span>
                <SimulatedQrSvg seed={`${campaign.id}:${amount}`} />
                <p className="max-w-xs text-xs leading-relaxed font-medium text-ink-soft">
                  Scan QR di atas melalui e-wallet atau mobile banking Anda, lalu klik <strong className="text-ink">Done</strong>.
                </p>
              </div>
            ) : !bankConfirmedStep ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                  Pilih Bank m-Banking
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {MBANKING_BANKS.map((bank) => {
                    const active = selectedBank === bank.id
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank.id)}
                        className={`flex h-12 items-center justify-between gap-2 rounded-2xl border px-3.5 text-xs font-extrabold transition ${
                          active
                            ? 'border-leaf bg-mint text-forest shadow-xs'
                            : 'border-line bg-canvas text-ink hover:bg-muted'
                        }`}
                      >
                        <span className="truncate">{bank.label}</span>
                        {active && <Check className="size-4 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="capsule-dashed flex flex-col gap-3 rounded-3xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink-soft">Bank Tujuan</span>
                  <span className="text-xs font-extrabold text-ink">{selectedBank} Virtual Account</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3">
                  <span className="font-mono text-sm font-extrabold tracking-wider text-ink">{vaNumber}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyVa()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-ink-soft transition hover:text-ink"
                  >
                    {copiedVa ? <Check className="size-3.5 text-leaf" /> : <Copy className="size-3.5" />}
                    {copiedVa ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <p className="text-xs leading-relaxed font-medium text-ink-soft">
                  Selesaikan transfer sebesar <strong className="text-ink">{formatRupiah(amount)}</strong> melalui aplikasi {selectedBank} Anda, lalu tekan tombol selesai.
                </p>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-critical/30 bg-critical/8 px-3.5 py-2.5 text-xs font-bold text-critical"
              >
                {error}
              </p>
            )}

            <div className="mt-1 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (paymentMethod === 'mbanking' && bankConfirmedStep) {
                    setBankConfirmedStep(false)
                  } else {
                    setStep('form')
                  }
                }}
                className="h-12 min-w-24 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink-soft transition hover:bg-canvas hover:text-ink"
              >
                Kembali
              </button>

              {paymentMethod === 'mbanking' && !bankConfirmedStep ? (
                <button
                  type="button"
                  onClick={() => setBankConfirmedStep(true)}
                  className="btn-primary h-12 flex-2 px-5 text-sm whitespace-nowrap"
                >
                  Lanjutkan
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleCompleteDonation()}
                  className="btn-primary h-12 flex-2 px-5 text-sm whitespace-nowrap disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Done · Selesai Bayar'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-mint text-forest">
              <CheckCircle2 className="size-9" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-ink">Terima Kasih atas Donasi Anda!</h3>
              <p className="mt-1.5 text-sm leading-relaxed font-medium text-ink-soft">
                Bantuan sebesar <strong className="num text-ink">{formatRupiah(amount)}</strong> telah tercatat untuk{' '}
                <strong className="text-ink">{campaign.location_name}</strong>.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-line bg-canvas p-4 text-left text-xs">
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="font-medium text-ink-soft">Nama di Catatan Pemberi</span>
                <span className="font-extrabold text-ink">
                  {isAnonymous ? 'Anonim' : donorName.trim() || profile?.full_name || 'Warga Peduli'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line/70 py-1 pt-2 mt-1">
                <span className="font-medium text-ink-soft">Metode Pembayaran</span>
                <span className="font-extrabold text-ink">
                  {paymentMethod === 'qris' ? 'QRIS' : `m-Banking (${selectedBank})`}
                </span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="btn-primary h-12 w-full text-sm">
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
