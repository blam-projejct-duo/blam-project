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
        <div className="rounded-[20px] border border-line bg-[#f4f5f7] p-4">
          <img src={qrImgUrl} alt="QR Gerakan" className="size-48 rounded-[14px] bg-white p-2" />
        </div>
        <div>
          <p className="text-base font-extrabold text-ink">{event.title}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{event.location_name}</p>
        </div>
        <button type="button" onClick={() => void copy()} className="btn-primary h-12 w-full text-sm">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Tersalin' : 'Salin Tautan'}
        </button>
      </div>
    </ModalShell>
  )
}
