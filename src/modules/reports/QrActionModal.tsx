import { Check, Copy, QrCode } from 'lucide-react'
import { useState } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import type { Report } from '../../types'

export default function QrActionModal({
  report,
  onClose,
}: {
  report: Report
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/?titik=${report.id}`
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <ModalShell title="Bagikan Aksi" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-[24px] border border-line bg-canvas p-4">
          <img src={qrImgUrl} alt="QR Aksi" className="size-48 rounded-[16px] bg-white p-2" />
        </div>
        <div>
          <p className="text-base font-extrabold text-ink">{report.title}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{report.location_name}</p>
        </div>
        <button type="button" onClick={() => void copy()} className="btn-primary h-12 w-full text-sm">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Tautan Tersalin' : 'Salin Tautan Aksi'}
        </button>
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <QrCode className="size-3.5" /> Pindai untuk membuka titik aksi langsung
        </p>
      </div>
    </ModalShell>
  )
}
