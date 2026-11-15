import { Droplets, TreePine, Waves, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { ECOSYSTEM_LABEL, STATUS_LABEL, pinTone } from '../../lib/constants'
import type { Ecosystem, ReportStatus } from '../../types'

const TONE = {
  critical: { dot: 'bg-critical', text: 'text-[#B91C1C]', bg: 'bg-[#FEE9E7]' },
  progress: { dot: 'bg-progress', text: 'text-[#B45309]', bg: 'bg-[#FEF3D6]' },
  resolved: { dot: 'bg-emerald', text: 'text-[#047857]', bg: 'bg-emerald-soft' },
} as const

export function StatusPill({ status }: { status: ReportStatus }) {
  const tone = TONE[pinTone(status)]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone.bg} ${tone.text}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}

const ECO_ICON = {
  coastal_mangrove: Waves,
  tropical_forest: TreePine,
  watershed: Droplets,
} as const

export function EcoIcon({
  ecosystem,
  className = 'size-5',
}: {
  ecosystem: Ecosystem
  className?: string
}) {
  const Icon = ECO_ICON[ecosystem]
  return <Icon className={className} strokeWidth={2} aria-label={ECOSYSTEM_LABEL[ecosystem]} />
}

export function EcoBadge({ ecosystem }: { ecosystem: Ecosystem }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-line bg-canvas text-cobalt">
      <EcoIcon ecosystem={ecosystem} />
    </span>
  )
}

export function Orb({
  size,
  label,
  onClick,
  className = '',
  children,
}: {
  size: number
  label: string
  onClick?: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`orb ${className}`}
      style={{ width: size, height: size }}
    >
      {children}
    </button>
  )
}

export function Pill({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-bold text-ink ${className}`}
    >
      {children}
    </span>
  )
}

export function DashedRow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`dashed-row py-3.5 ${className}`}>{children}</div>
}

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/35 p-0 backdrop-blur-[2px] md:items-center md:p-6"
    >
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-white md:max-w-[520px] md:rounded-[28px]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-10 place-items-center rounded-full border border-line bg-canvas text-ink hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
