import type { CSSProperties } from 'react'
import { DashedOutline } from '../../components/ui/atoms'
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
      className={`relative inline-flex rounded-full bg-[#f7faf6] p-1 ${className}`}
    >
      <DashedOutline rx={21} />
      {OPTIONS.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`font-display relative z-10 h-9 rounded-full px-3.5 text-[11px] font-semibold tracking-wider transition-colors ${
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
