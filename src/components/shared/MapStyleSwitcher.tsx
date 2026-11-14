import type { MapStyle } from '../../types/conservation'

const OPTIONS: { id: MapStyle; label: string }[] = [
  { id: 'terang', label: 'TERANG' },
  { id: 'gelap', label: 'GELAP' },
  { id: 'satelit', label: 'SATELIT' },
]

export default function MapStyleSwitcher({
  value,
  onChange,
  className = '',
}: {
  value: MapStyle
  onChange: (s: MapStyle) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Gaya peta"
      className={`glass inline-flex rounded-full p-1 shadow-[0_6px_18px_rgba(17,24,39,0.12)] ${className}`}
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
            className={`h-9 rounded-full px-3.5 text-[11px] font-bold tracking-wider transition-colors ${
              active ? 'bg-white text-cobalt shadow-[0_1px_4px_rgba(17,24,39,0.14)]' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
