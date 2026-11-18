import { Droplets, TreePine, Waves, X } from 'lucide-react'
import { useId } from 'react'
import type { ReactNode } from 'react'
import {
  ECOSYSTEM_LABEL,
  EVENT_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  eventPinTone,
  reportPinTone,
} from '../../lib/constants'
import type { Ecosystem, EventStatus, ReportStatus } from '../../types'

const DOT = {
  critical: 'bg-critical',
  progress: 'bg-progress',
  resolved: 'bg-resolved',
} as const

export function StatusPill({ status }: { status: EventStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
      <span className={`size-2 rounded-full ${DOT[eventPinTone(status)]}`} />
      {EVENT_STATUS_LABEL[status]}
    </span>
  )
}

export function ReportStatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
      <span className={`size-2 rounded-full ${DOT[reportPinTone(status)]}`} />
      {REPORT_STATUS_LABEL[status]}
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

export function DashedOutline({ rx = 19 }: { rx?: number }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      <rect
        x="0.75"
        y="0.75"
        rx={rx}
        ry={rx}
        fill="none"
        stroke="rgba(47, 138, 87, 0.24)"
        strokeWidth="1.5"
        strokeDasharray="10 7"
        strokeLinecap="round"
        style={{ width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)' }}
      />
    </svg>
  )
}

export function EcoBadge({ ecosystem }: { ecosystem: Ecosystem }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[14px] border-[1.5px] border-leaf/30 bg-white text-forest">
      <EcoIcon ecosystem={ecosystem} />
    </span>
  )
}

export function Orb({
  size,
  label,
  onClick,
  watermark,
  tone = 'default',
  className = '',
  children,
}: {
  size: number
  label: string
  onClick?: () => void
  watermark?: string
  tone?: 'default' | 'primary'
  className?: string
  children: ReactNode
}) {
  const arcId = useId()
  const markSize = watermark && watermark.length <= 4 ? 29 : 25

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`orb ${className}`}
      style={{ width: size, height: size }}
    >
      {watermark && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full">
          <svg viewBox="0 0 100 100" className="size-full select-none">
            <defs>
              <path id={arcId} d="M 5,62 A 45,35 0 0,0 95,62" />
            </defs>
            <text
              className={tone === 'primary' ? 'orb-mark-primary' : 'orb-mark'}
              fontSize={markSize}
              fontWeight="800"
              letterSpacing="-0.04em"
            >
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                {watermark}
              </textPath>
            </text>
          </svg>
        </span>
      )}
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
      className={`font-display inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-leaf/30 bg-mint/35 px-3 py-1 text-xs font-semibold text-forest ${className}`}
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
            className="grid size-10 place-items-center rounded-full border-[1.5px] border-dashed border-leaf/30 bg-canvas text-forest hover:bg-mint/40"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
