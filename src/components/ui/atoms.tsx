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
import type { Ecosystem, EventStatus, ReportStatus, SignalVerificationState } from '../../types'

const TONE_TEXT = {
  critical: 'text-critical',
  progress: 'text-progress',
  resolved: 'text-resolved',
} as const

export function StatusPill({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center text-[12px] font-medium ${TONE_TEXT[eventPinTone(status)]}`}>
      {EVENT_STATUS_LABEL[status]}
    </span>
  )
}

export function ReportStatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center text-[12px] font-medium ${TONE_TEXT[reportPinTone(status)]}`}>
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
  return <Icon className={className} strokeWidth={1.75} aria-label={ECOSYSTEM_LABEL[ecosystem]} />
}

export function DashedOutline(_props: { rx?: number }) {
  return null
}

export function EcoBadge({ ecosystem }: { ecosystem: Ecosystem }) {
  return (
    <span className="row-icon text-leaf">
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
              <path id={arcId} d="M 10,75 A 42,42 0 0,0 90,75" />
            </defs>
            <text
              className={tone === 'primary' ? 'orb-mark-primary' : 'orb-mark'}
              fontSize="11.5"
              fontWeight="700"
              letterSpacing="0.14em"
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
      className={`inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-canvas px-2 py-0.5 text-[12px] font-medium text-ink-soft ${className}`}
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
  panelClassName = 'max-h-[90dvh] md:max-w-[520px]',
  bodyClassName = 'p-5',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  panelClassName?: string
  bodyClassName?: string
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
        className={`flex w-full flex-col overflow-hidden rounded-t-[16px] border border-line bg-white md:rounded-[16px] ${panelClassName}`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4 sm:px-5">
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="btn-soft grid size-9 place-items-center !rounded-[10px] text-ink-soft hover:text-ink"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </header>
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
      </motion.div>
    </motion.div>
  )
}

const TIER_ITEMS: ReadonlyArray<{ id: SignalVerificationState; label: string; shortLabel: string }> = [
  { id: 'unverified', label: 'Belum Verifikasi', shortLabel: 'Belum Cek' },
  { id: 'verified', label: 'Terverifikasi', shortLabel: 'Terverifikasi' },
  { id: 'has_action', label: 'Ada Gerakan', shortLabel: 'Ada Aksi' },
]

export function MarkerTierLegend({
  compact = false,
  activeTiers,
  onToggleTier,
}: {
  compact?: boolean
  activeTiers?: Set<SignalVerificationState>
  onToggleTier?: (tier: SignalVerificationState) => void
}) {
  const renderGlyph = (id: SignalVerificationState) => {
    const dotSize = compact ? 'size-2' : 'size-2.5'
    if (id === 'unverified') {
      return <span className={`${dotSize} shrink-0 rounded-full border border-dashed border-progress bg-progress/15`} />
    }
    if (id === 'verified') {
      return <span className={`${dotSize} shrink-0 rounded-full bg-leaf`} />
    }
    return <span className={`${dotSize} shrink-0 rounded-full bg-resolved`} />
  }

  return (
    <div
      className={`flex items-center text-[12px] font-normal text-ink-soft ${compact ? 'flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none]' : 'flex-wrap gap-1.5'
        }`}
    >
      {TIER_ITEMS.map((item) => {
        const active = Boolean(activeTiers?.has(item.id))
        const label = compact ? item.shortLabel : item.label
        if (!onToggleTier) {
          return (
            <span
              key={item.id}
              className={`inline-flex shrink-0 items-center whitespace-nowrap ${compact ? 'gap-1 px-1 py-0.5' : 'gap-1.5 px-1.5 py-0.5'
                }`}
            >
              {renderGlyph(item.id)}
              {label}
            </span>
          )
        }
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggleTier(item.id)}
            className={`inline-flex shrink-0 items-center rounded-[8px] border whitespace-nowrap transition-colors ${compact ? 'gap-1 px-1.5 py-1 tracking-[-0.01em]' : 'gap-1.5 px-2.5 py-1'
              } ${active
                ? 'border-leaf/35 bg-mint font-medium text-forest'
                : 'border-line bg-white hover:bg-canvas hover:text-ink'
              }`}
          >
            {renderGlyph(item.id)}
            {label}
          </button>
        )
      })}
    </div>
  )
}
