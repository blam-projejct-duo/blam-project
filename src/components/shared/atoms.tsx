import { Droplets, TreePine, Waves } from 'lucide-react'
import { ECOSYSTEM_LABEL, STATUS_LABEL, pinTone } from '../../data/mockConservationData'
import type { Ecosystem, SiteStatus } from '../../types/conservation'

const TONE = {
  critical: { dot: 'bg-critical', text: 'text-[#B91C1C]', bg: 'bg-[#FEE9E7]' },
  progress: { dot: 'bg-progress', text: 'text-[#B45309]', bg: 'bg-[#FEF3D6]' },
  resolved: { dot: 'bg-emerald', text: 'text-[#047857]', bg: 'bg-emerald-soft' },
} as const

export function StatusPill({ status }: { status: SiteStatus }) {
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
