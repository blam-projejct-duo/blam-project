import type { CSSProperties } from 'react'
import { DashedOutline } from '../../components/ui/atoms'
import type { MapStyle } from '../../types'

const OPTIONS: { id: MapStyle; label: string; compactLabel: string }[] = [
  { id: 'terang', label: 'TERANG', compactLabel: 'Terang' },
  { id: 'gelap', label: 'GELAP', compactLabel: 'Gelap' },
  { id: 'satelit', label: 'SATELIT', compactLabel: 'Satelit' },
]

export default function MapStyleSwitcher({
  value,
  onChange,
  compact = false,
  className = '',
  style,
}: {
  value: MapStyle
  onChange: (s: MapStyle) => void
  compact?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Gaya peta"
      style={style}
      className={`relative inline-flex rounded-xl ${
        compact ? 'bg-[#f4f5f7] p-0.5' : 'bg-[#f4f5f7] p-1'
      } ${className}`}
    >
      {!compact && <DashedOutline rx={11} />}
      {OPTIONS.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`relative z-10 rounded-lg transition-colors ${
              compact
                ? `font-sans h-7.5 px-2.5 text-[11px] ${
                    active ? 'bg-white font-medium text-ink shadow-xs' : 'font-light text-ink-soft hover:text-ink'
                  }`
                : `font-sans h-9 px-3.5 text-[11px] tracking-wider ${
                    active ? 'bg-white font-medium text-ink shadow-xs' : 'font-light text-ink-soft hover:text-ink'
                  }`
            }`}
          >
            {compact ? o.compactLabel : o.label}
          </button>
        )
      })}
    </div>
  )
}
