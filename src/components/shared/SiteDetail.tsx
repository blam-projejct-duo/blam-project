import { Bird, Check, Flame, Link2, MapPin, Waves, Wind } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ConservationSite } from '../../types/conservation'
import BeforeAfterSlider from './BeforeAfterSlider'
import { StatusPill } from './atoms'
import { usePulse } from '../../hooks/usePulse'

interface Props {
  site: ConservationSite
  joined: boolean
  onToggleJoin: () => void
}

function Tile({
  icon,
  value,
  unit,
  label,
}: {
  icon: ReactNode
  value: string
  unit?: string
  label: string
}) {
  return (
    <div className="rounded-tile bg-canvas p-3.5">
      <div className="flex items-center gap-1.5 text-ink-soft">{icon}</div>
      <p className="num mt-2 text-[22px] leading-none text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  )
}

export default function SiteDetail({ site, joined, onToggleJoin }: Props) {
  const [copied, setCopied] = useState(false)
  const { impact } = site
  const { pulse, status } = usePulse(site)
  const count = site.participants + (joined ? 1 : 0)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/titik/${site.id}`)
    } catch {
      /* clipboard tidak tersedia */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <StatusPill status={site.status} />
          <h2 className="mt-3 text-[22px] leading-tight font-extrabold tracking-tight text-ink">
            {site.title}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-ink-soft">
            <MapPin className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="truncate">{site.locationName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          aria-label="Salin tautan titik"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-canvas"
        >
          {copied ? (
            <Check className="size-5 text-emerald" strokeWidth={2.5} />
          ) : (
            <Link2 className="size-5" strokeWidth={2} />
          )}
        </button>
      </header>

      {site.afterImage ? (
        <BeforeAfterSlider
          before={site.beforeImage}
          after={site.afterImage}
          score={impact?.recoveryScore ?? site.aiScore}
        />
      ) : (
        <div className="relative aspect-[16/10] @md:aspect-[2/1] overflow-hidden rounded-card bg-muted">
          <img src={site.beforeImage} alt="Kondisi lapangan" className="size-full object-cover" />
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink">
            Sebelum
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-cobalt px-2.5 py-1 text-[11px] font-extrabold text-white">
            AI {site.aiScore}%
          </span>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2.5 @md:grid-cols-4 ${status === 'loading' ? 'animate-pulse' : ''}`}>
        <Tile icon={<Wind className="size-4" />} value={String(pulse.aqi)} label="Kualitas udara" />
        <Tile
          icon={<Waves className="size-4" />}
          value={pulse.waveM > 0 ? pulse.waveM.toFixed(1) : '—'}
          unit={pulse.waveM > 0 ? 'm' : undefined}
          label="Gelombang"
        />
        <Tile
          icon={<Flame className="size-4" />}
          value={String(pulse.hotspots)}
          label="Hotspot · 20 km"
        />
        <Tile icon={<Bird className="size-4" />} value={String(pulse.species)} label="Spesies" />
      </div>

      <p className="text-sm leading-relaxed text-ink/80">{site.brief}</p>

      {impact && (
        <p className="border-t-[1.5px] border-dashed border-dash pt-4 text-[13px] font-semibold text-ink-soft">
          <span className="text-ink">{impact.wasteKg} kg</span> sampah ·{' '}
          <span className="text-ink">{impact.trees}</span> bibit ·{' '}
          <span className="text-ink">{(impact.co2Kg / 1000).toFixed(2)} tCO₂e</span>
        </p>
      )}

      <button
        type="button"
        onClick={onToggleJoin}
        aria-pressed={joined}
        className={`h-13 w-full text-[15px] ${joined ? 'btn-joined' : 'btn-primary'}`}
      >
        {joined && <Check className="size-5" strokeWidth={2.75} />}
        {joined ? 'Tergabung' : 'Gabung Aksi'} · {count}
      </button>
    </div>
  )
}