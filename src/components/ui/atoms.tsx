import { motion } from 'framer-motion'
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
    <span className="inline-flex items-center gap-1.5 text-xs font-normal text-ink">
      <span className={`size-2 rounded-full ${DOT[eventPinTone(status)]}`} />
      {EVENT_STATUS_LABEL[status]}
    </span>
  )
}

export function ReportStatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-normal text-ink">
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

export function DashedOutline(_props: { rx?: number }) {
  return null
}

export function EcoBadge({ ecosystem }: { ecosystem: Ecosystem }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white text-forest shadow-[0_1px_2px_rgba(18,29,79,0.04)]">
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
      className={`inline-flex items-center gap-1.5 rounded-full bg-mint/55 px-3 py-1 text-[11.5px] font-normal text-forest ${className}`}
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
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/35 p-0 backdrop-blur-[2px] md:items-center md:p-6"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 28, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-white md:max-w-[520px] md:rounded-[28px]"
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-10 place-items-center rounded-full bg-canvas text-forest hover:bg-mint/40"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}

export function MarkerTierLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${
        compact ? 'text-[10.5px]' : 'text-[11px]'
      } font-normal text-ink-soft`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 shrink-0 rounded-full border-[1.6px] border-dashed border-progress bg-amber-50" />
        Belum Verifikasi
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 shrink-0 rounded-full border-[1.5px] border-white bg-critical shadow-xs" />
        Terverifikasi
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg viewBox="0 0 16 18" className="h-4 w-3.5 shrink-0" aria-hidden="true">
          <path
            d="M7.5 1C4.2 1 1.5 3.7 1.5 7C1.5 11.1 6.1 15.6 7.1 16.5C7.3 16.7 7.7 16.7 7.9 16.5C8.9 15.6 13.5 11.1 13.5 7C13.5 3.7 10.8 1 7.5 1Z"
            fill="#15803D"
            stroke="#FFFFFF"
            strokeWidth="1.3"
          />
          <circle cx="7.5" cy="6.8" r="3.4" fill="#FFFFFF" />
          <circle cx="12.5" cy="3.5" r="2.7" fill="#22C55E" stroke="#FFFFFF" strokeWidth="0.9" />
        </svg>
        Sudah Ada Aksi
      </span>
    </div>
  )
}
