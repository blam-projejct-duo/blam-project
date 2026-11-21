import type { CSSProperties } from 'react'
import type { MapStyle } from '../../types'

const OPTIONS: { id: MapStyle; label: string; compactLabel: string }[] = [
  { id: 'terang', label: 'Terang', compactLabel: 'Terang' },
  { id: 'gelap', label: 'Gelap', compactLabel: 'Gelap' },
  { id: 'satelit', label: 'Satelit', compactLabel: 'Satelit' },
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
      className={`panel-tabs relative inline-flex ${compact ? 'p-0.5' : 'p-1'} ${className}`}
    >
      {OPTIONS.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`panel-tab relative z-10 transition-colors ${
              compact ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3.5 text-[12px]'
            } ${active ? 'is-active' : ''}`}
          >
            {compact ? o.compactLabel : o.label}
          </button>
        )
      })}
    </div>
  )
}
