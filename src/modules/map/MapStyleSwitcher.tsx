import type { CSSProperties } from 'react'
import type { MapStyle } from '../../types'

const OPTIONS: { id: MapStyle; label: string }[] = [
  { id: 'terang', label: 'TERANG' },
  { id: 'gelap', label: 'GELAP' },
  { id: 'satelit', label: 'SATELIT' },
]

export default function MapStyleSwitcher({
  value,
  onChange,
  className = '',
  style,
}: {
  value: MapStyle
  onChange: (s: MapStyle) => void
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Gaya peta"
      style={style}
      className={`capsule-dashed inline-flex rounded-full p-1 ${className}`}
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
            className={`font-display h-9 rounded-full px-3.5 text-[11px] font-semibold tracking-wider transition-colors ${
              active ? 'bg-leaf text-white' : 'text-ink-soft hover:text-forest'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
