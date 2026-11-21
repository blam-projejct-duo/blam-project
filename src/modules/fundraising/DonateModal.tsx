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
      <div className="atlas-sheet flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[24px] sm:rounded-[22px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink/8 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="row-icon text-forest">
              <HeartHandshake className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-ink">
                {step === 'done' ? 'Donasi Berhasil' : 'Donasi Bantuan'}
              </h2>
              <p className="truncate text-[12px] font-normal text-ink-soft">{campaign.title}</p>
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

        {step !== 'done' && (
          <div className="flex items-center gap-2 border-b border-line bg-canvas px-5 py-2.5 text-[12px] font-normal">
            <span className={step === 'form' ? 'font-medium text-ink' : 'text-ink-soft'}>1. Nominal</span>
            <span className="text-ink-soft">·</span>
            <span className={step === 'payment' ? 'font-medium text-ink' : 'text-ink-soft'}>2. Pembayaran</span>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={goToPayment} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ink-soft">
                  Pilih Nominal
                </span>
                {amount > 0 && (
                  <span className="num rounded-[8px] border border-line bg-canvas px-2 py-0.5 text-[12px] text-ink">
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
                      className={`h-10 min-w-[88px] flex-1 rounded-[10px] px-3 text-[12px] whitespace-nowrap transition-colors ${
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
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  placeholder="Nominal lain"
                  className="num h-11 w-full rounded-[10px] border border-line bg-canvas pr-3.5 pl-10 text-[14px] text-ink transition-colors focus:border-leaf focus:bg-white focus:outline-none placeholder:font-sans"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ink-soft">
                  Identitas
                </span>
                <button
                  type="button"
                  onClick={() => setIsAnonymous((v) => !v)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] whitespace-nowrap transition-colors ${
                    isAnonymous
                      ? 'bg-ink font-medium text-white'
                      : 'btn-soft font-normal text-ink-soft hover:text-ink'
                  }`}
                >
                  <EyeOff className="size-4" strokeWidth={1.75} />
                  {isAnonymous ? 'Anonim aktif' : 'Sembunyikan nama'}
                </button>
              </div>
              {isAnonymous ? (
                <p className="card-quiet px-3.5 py-2.5 text-[12px] font-normal text-ink">
                  Tampil sebagai <span className="font-medium">Anonim</span>
                </p>
              ) : (
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Nama"
                  maxLength={80}
                  className="h-11 w-full rounded-[10px] border border-line bg-canvas px-3.5 text-[14px] font-normal text-ink transition-colors focus:border-leaf focus:bg-white focus:outline-none"
                />
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-soft">
                Pesan
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="Pesan dukungan"
                className="w-full resize-none rounded-[10px] border border-line bg-canvas p-3.5 text-[14px] font-normal text-ink transition-colors focus:border-leaf focus:bg-white focus:outline-none"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="card-quiet px-3.5 py-2.5 text-[12px] font-medium text-critical"
              >
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary mt-1 h-12 w-full px-5 text-[14px] whitespace-nowrap">
              Lanjutkan · {formatRupiah(amount)}
            </button>
          </form>
        )}

        {step === 'payment' && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="card-quiet flex items-center justify-between px-4 py-3">
              <span className="text-[12px] font-normal text-ink-soft">Total Donasi</span>
              <span className="num text-[16px] text-ink">{formatRupiah(amount)}</span>
            </div>

            <div className="panel-tabs grid grid-cols-2 p-1">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('qris')
                  setBankConfirmedStep(false)
                }}
                className={`panel-tab flex h-10 items-center justify-center gap-2 whitespace-nowrap ${
                  paymentMethod === 'qris' ? 'is-active' : ''
                }`}
              >
                <QrCode className="size-4" strokeWidth={1.75} />
                QRIS
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('mbanking')
                  setBankConfirmedStep(false)
                }}
                className={`panel-tab flex h-10 items-center justify-center gap-2 whitespace-nowrap ${
                  paymentMethod === 'mbanking' ? 'is-active' : ''
                }`}
              >
                <Building2 className="size-4" strokeWidth={1.75} />
                m-Banking
              </button>
            </div>

            {paymentMethod === 'qris' ? (
              <div className="card-quiet flex flex-col items-center gap-3 p-5 text-center">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] border border-line bg-canvas px-2.5 py-1 text-[12px] font-medium text-ink">
                  <ShieldCheck className="size-4 shrink-0 text-leaf" strokeWidth={1.75} />
                  <span className="truncate">QRIS · {campaign.organizer_name}</span>
                </span>
                <SimulatedQrSvg seed={`${campaign.id}:${amount}`} />
                <p className="max-w-xs text-[12px] leading-relaxed font-normal text-ink-soft">
                  Pindai QR lalu tekan <span className="font-medium text-ink">Selesai</span>
                </p>
              </div>
            ) : !bankConfirmedStep ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-medium text-ink-soft">
                  Pilih Bank
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {MBANKING_BANKS.map((bank) => {
                    const active = selectedBank === bank.id
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank.id)}
                        className={`flex h-12 items-center justify-between gap-2 rounded-[10px] px-3.5 text-[12px] transition-colors ${
                          active
                            ? 'bg-ink font-medium text-white'
                            : 'btn-soft font-normal'
                        }`}
                      >
                        <span className="truncate">{bank.label}</span>
                        {active && <Check className="size-4 shrink-0" strokeWidth={1.75} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="card-quiet flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-normal text-ink-soft">Bank Tujuan</span>
                  <span className="text-[12px] font-medium text-ink">{selectedBank} Virtual Account</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-[10px] border border-line bg-canvas px-3.5 py-3">
                  <span className="font-mono text-[14px] font-medium text-ink">{vaNumber}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyVa()}
                    className="btn-soft h-8 shrink-0 gap-1 !rounded-[8px] px-2.5 text-[12px] text-ink-soft hover:text-ink"
                  >
                    {copiedVa ? <Check className="size-4 text-leaf" strokeWidth={1.75} /> : <Copy className="size-4" strokeWidth={1.75} />}
                    {copiedVa ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <p className="text-[12px] leading-relaxed font-normal text-ink-soft">
                  Transfer <span className="font-medium text-ink">{formatRupiah(amount)}</span> via {selectedBank}, lalu tekan selesai
                </p>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="card-quiet px-3.5 py-2.5 text-[12px] font-medium text-critical"
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
                className="btn-soft h-12 min-w-24 flex-1 px-4 text-[14px] text-ink-soft hover:text-ink"
              >
                Kembali
              </button>

              {paymentMethod === 'mbanking' && !bankConfirmedStep ? (
                <button
                  type="button"
                  onClick={() => setBankConfirmedStep(true)}
                  className="btn-primary h-12 flex-2 px-5 text-[14px] whitespace-nowrap"
                >
                  Lanjutkan
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleCompleteDonation()}
                  className="btn-primary h-12 flex-2 px-5 text-[14px] whitespace-nowrap disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Selesai Bayar'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-leaf text-white">
              <CheckCircle2 className="size-9" />
            </span>
            <div>
              <h3 className="text-xl font-semibold text-ink">Terima Kasih</h3>
              <p className="mt-1.5 text-sm leading-relaxed font-normal text-ink-soft">
                Donasi <span className="num text-ink">{formatRupiah(amount)}</span> tercatat untuk{' '}
                <span className="font-medium text-ink">{campaign.location_name}</span>.
              </p>
            </div>
            <div className="card-quiet w-full p-4 text-left text-xs">
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="font-normal text-ink-soft">Nama</span>
                <span className="font-medium text-ink">
                  {isAnonymous ? 'Anonim' : donorName.trim() || profile?.full_name || 'Warga Peduli'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-line py-1 pt-2">
                <span className="font-normal text-ink-soft">Metode</span>
                <span className="font-medium text-ink">
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
