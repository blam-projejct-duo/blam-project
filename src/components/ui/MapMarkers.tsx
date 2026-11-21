import type { HazardKind, SignalVerificationState } from '../../types'

const HAZARD_HEX: Record<HazardKind | 'event', string> = {
  wildfire: '#EA580C',
  suspected: '#D97706',
  volcano: '#6D28D9',
  flood: '#2563EB',
  storm: '#0E7490',
  other: '#D97706',
  event: '#15803D',
}

function InnerGlyph({ kind, color }: { kind: HazardKind | 'event'; color: string }) {
  if (kind === 'volcano') {
    return (
      <path
        d="M12.5 16.8 15.8 11.2 18.8 16 21.8 13 24.5 19.5H11.5L12.5 16.8Z"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (kind === 'flood') {
    return (
      <path
        d="M18 9.8c1.7 2.1 3.8 4.4 3.8 6.4a3.8 3.8 0 1 1-7.6 0c0-2 2.1-4.3 3.8-6.4Z"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (kind === 'storm') {
    return (
      <path
        d="M13.2 13h7.4a1.8 1.8 0 1 0-1.4-2.8M13.2 16.2h8.6a1.8 1.8 0 1 1-1.4 2.9M13.2 19h4.6"
        fill="none"
        stroke={color}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (kind === 'event') {
    return (
      <path
        d="M18 20v-4.8m0 0c0-2.6 2-4.2 4.2-4.2 0 2.3-1.6 4.2-4.2 4.2Zm0 0c0-2.2-1.7-3.6-3.7-3.6 0 2 1.3 3.6 3.7 3.6Z"
        fill="none"
        stroke={color}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  return (
    <path
      d="M18.2 9.6c.5 1.8 2.1 2.9 3 4.6a4.1 4.1 0 1 1-6.9 2.8c0-1.2.5-2.3 1.3-3.2.2 1 .8 1.4 1.4 1.4.8 0 1.2-.7 1-1.7-.2-1.2-.4-2.4.2-3.9Z"
      fill="none"
      stroke={color}
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/**
 * Bahasa marker pinpoint Blam yang seragam di peta, daftar, dan header detail,
 * dibedakan lewat warna, simbol dalam, serta garis putus-putus vs solid.
 */
export function MapMarkerGlyph({
  kind,
  tier = 'verified',
  size = 'md',
  className = '',
}: {
  kind: HazardKind | 'event'
  tier?: SignalVerificationState
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const effectiveKind: HazardKind | 'event' = tier === 'has_action' ? 'event' : kind
  const hex = HAZARD_HEX[effectiveKind]
  const isUnverified = tier === 'unverified' && effectiveKind !== 'event'
  const px = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-11' : 'size-9'
  const strokeColor = isUnverified ? '#475569' : '#FFFFFF'
  const fillColor = isUnverified ? '#FFFFFF' : hex

  return (
    <svg viewBox="0 0 36 36" className={`${px} shrink-0 ${className}`} aria-hidden="true">
      <path
        d="M18 3.5 C24.8 3.5 30 8.7 30 15.3 C30 23 21.4 30.5 18 33.2 C14.6 30.5 6 23 6 15.3 C6 8.7 11.2 3.5 18 3.5 Z"
        fill={fillColor}
        stroke={isUnverified ? '#94A3B8' : '#FFFFFF'}
        strokeWidth={isUnverified ? 2 : 2}
        strokeDasharray={isUnverified ? '4.2 3' : undefined}
        strokeLinejoin="round"
      />
      <InnerGlyph kind={effectiveKind} color={strokeColor} />
    </svg>
  )
}

function formatCoord(lat: number, lng: number): string {
  const ns = lat < 0 ? 'LS' : 'LU'
  const ew = lng < 0 ? 'BB' : 'BT'
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lng).toFixed(2)}°${ew}`
}

/**
 * Mini-atlas koordinat lapangan untuk sinyal satelit & gerakan tanpa foto lapangan.
 */
export function AtlasCoordinateHero({
  lat,
  lng,
  kind,
  tier = 'verified',
  subtitle,
  badge,
  compact = false,
  className = '',
}: {
  lat: number
  lng: number
  kind: HazardKind | 'event'
  tier?: SignalVerificationState
  subtitle?: string | null
  badge?: string | null
  compact?: boolean
  className?: string
}) {
  const effectiveKind: HazardKind | 'event' = tier === 'has_action' ? 'event' : kind
  const hex = HAZARD_HEX[effectiveKind]
  const coordText = formatCoord(lat, lng)

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#edf3fa] via-[#f4f7fb] to-[#e7eff7] ${compact ? 'h-32' : 'h-40'} ${className}`}
    >
      {/* Garis graticule & kontur atlas */}
      <svg
        viewBox="0 0 400 160"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <g stroke="#cbd5e1" strokeWidth="0.75" strokeOpacity="0.65">
          <line x1="0" y1="40" x2="400" y2="40" />
          <line x1="0" y1="80" x2="400" y2="80" />
          <line x1="0" y1="120" x2="400" y2="120" />
          <line x1="80" y1="0" x2="80" y2="160" />
          <line x1="160" y1="0" x2="160" y2="160" />
          <line x1="240" y1="0" x2="240" y2="160" />
          <line x1="320" y1="0" x2="320" y2="160" />
        </g>
        {/* Kontur topografi */}
        <g fill="none" stroke="#94a3b8" strokeOpacity="0.3" strokeWidth="1">
          <path d="M-20 135 C45 105, 95 145, 165 118 C235 90, 290 138, 420 108" />
          <path d="M-10 30 C60 55, 110 15, 195 36 C260 52, 325 18, 415 44" />
        </g>
        {/* Cincin radar konsentris */}
        <circle cx="200" cy="78" r="28" fill={hex} fillOpacity="0.1" stroke={hex} strokeOpacity="0.28" strokeWidth="1" />
        <circle cx="200" cy="78" r="52" fill="none" stroke={hex} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="200" cy="78" r="78" fill="none" stroke={hex} strokeOpacity="0.1" strokeWidth="1" />
      </svg>

      {/* Penanda pusat */}
      <div className="relative z-10 flex size-full flex-col items-center justify-center">
        <MapMarkerGlyph kind={kind} tier={tier} size={compact ? 'md' : 'lg'} className="drop-shadow-[0_4px_10px_rgba(15,23,42,0.18)]" />
      </div>

      {/* Label kiri atas (opsional) */}
      {badge && (
        <span className="absolute top-3 left-3 z-10 rounded-[8px] bg-white/88 px-2.5 py-1 text-[12px] font-medium text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          {badge}
        </span>
      )}

      {/* Koordinat & wilayah di kiri/kanan bawah */}
      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 z-10 flex items-center justify-between gap-2 text-[12px]">
        {subtitle ? (
          <span className="max-w-[54%] truncate rounded-[8px] bg-white/88 px-2 py-0.5 font-medium text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            {subtitle}
          </span>
        ) : (
          <span />
        )}
        <span className="num shrink-0 rounded-[8px] bg-white/88 px-2 py-0.5 font-normal text-ink-soft shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          {coordText}
        </span>
      </div>
    </div>
  )
}
