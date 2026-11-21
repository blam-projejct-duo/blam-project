import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { ModalShell } from '../../components/ui/atoms'
import type { ConservationEvent } from '../../types'

export default function QrActionModal({
  event,
  onClose,
}: {
  event: ConservationEvent
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/?event=${event.id}`
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <ModalShell title="Bagikan Gerakan" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="card-quiet p-4">
          <img src={qrImgUrl} alt="QR Gerakan" className="size-48 rounded-[12px] bg-white p-1" />
        </div>
        <div>
          <p className="text-[16px] font-semibold text-ink">{event.title}</p>
          <p className="mt-1 text-[12px] font-normal text-ink-soft">{event.location_name}</p>
        </div>
        <button type="button" onClick={() => void copy()} className="btn-primary h-11 w-full text-[14px]">
          {copied ? <Check className="size-4" strokeWidth={1.75} /> : <Copy className="size-4" strokeWidth={1.75} />}
          {copied ? 'Tersalin' : 'Salin Tautan'}
        </button>
      </div>
    </ModalShell>
  )
}
