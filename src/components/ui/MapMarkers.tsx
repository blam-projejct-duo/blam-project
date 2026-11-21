import type { HazardKind, SignalVerificationState } from '../../types'

const HAZARD_HEX: Record<HazardKind | 'event', string> = {
  wildfire: '#F97316',
  suspected: '#F59E0B',
  volcano: '#7C3AED',
  flood: '#2563EB',
  storm: '#0891B2',
  other: '#F59E0B',
  event: '#15803D',
}

const HAZARD_TINT: Record<HazardKind | 'event', string> = {
  wildfire: '#FFF3E8',
  suspected: '#FEF7E0',
  volcano: '#F3EEFE',
  flood: '#EDF3FE',
  storm: '#E8F7FA',
  other: '#FEF7E0',
  event: '#ECF7F0',
}

function InnerGlyph({ kind, color }: { kind: HazardKind | 'event'; color: string }) {
  if (kind === 'volcano') {
    return (
      <path
        d="M12.5 18.5 16 12.5 19.5 18.5 23 14.5 26 23.5H10L12.5 18.5Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (kind === 'flood') {
    return (
      <path
        d="M18 11.5c1.8 2.4 4.2 5 4.2 7.3a4.2 4.2 0 1 1-8.4 0c0-2.3 2.4-4.9 4.2-7.3Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (kind === 'storm') {
    return (
      <path
        d="M13 15.5h8.2a2 2 0 1 0-1.6-3.2M13 19h9.5a2 2 0 1 1-1.5 3.3M13 22h5.2"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (kind === 'event') {
    return (
      <path
        d="M18 22.5v-5.5m0 0c0-3 2.3-4.8 4.8-4.8 0 2.6-1.8 4.8-4.8 4.8Zm0 0c0-2.5-1.9-4.1-4.2-4.1 0 2.3 1.5 4.1 4.2 4.1Z"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  return (
    <path
      d="M18.2 11.2c.6 2 2.4 3.3 3.4 5.2a4.6 4.6 0 1 1-7.8 3.2c0-1.4.6-2.6 1.5-3.6.2 1.1.9 1.6 1.6 1.6.9 0 1.3-.8 1.1-2-.2-1.4-.4-2.7.2-4.4Z"
      fill="none"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/**
 * Bahasa marker peta Blam (tetesan api, segitiga gunung, tetes banjir, pin gerakan)
 * digunakan konsisten di baris daftar, filter, dan header detail.
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
  const tint = HAZARD_TINT[effectiveKind]
  const isUnverified = tier === 'unverified' && effectiveKind !== 'event'
  const px = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-11' : 'size-9'
  const strokeColor = isUnverified ? hex : '#FFFFFF'
  const fillColor = isUnverified ? tint : hex

  return (
    <svg viewBox="0 0 36 36" className={`${px} shrink-0 ${className}`} aria-hidden="true">
      {effectiveKind === 'volcano' ? (
        <path
          d="M18 4.5 Q25 14 31.5 27.5 Q32 30.5 28.5 30.5 L7.5 30.5 Q4 30.5 4.5 27.5 Q11 14 18 4.5 Z"
          fill={fillColor}
          stroke={isUnverified ? hex : '#FFFFFF'}
          strokeWidth={isUnverified ? 2.1 : 2}
          strokeDasharray={isUnverified ? '4 3' : undefined}
          strokeLinejoin="round"
        />
      ) : effectiveKind === 'flood' ? (
        <path
          d="M18 3.8 C26.8 12.2 29.8 18.8 29.8 22.8 C29.8 28.6 24.5 32.5 18 32.5 C11.5 32.5 6.2 28.6 6.2 22.8 C6.2 18.8 9.2 12.2 18 3.8 Z"
          fill={fillColor}
          stroke={isUnverified ? hex : '#FFFFFF'}
          strokeWidth={isUnverified ? 2.1 : 2}
          strokeDasharray={isUnverified ? '4 3' : undefined}
        />
      ) : effectiveKind === 'event' ? (
        <path
          d="M18 3.8 C24.8 3.8 30 9 30 15.6 C30 23.2 21.4 30.4 18 33 C14.6 30.4 6 23.2 6 15.6 C6 9 11.2 3.8 18 3.8 Z"
          fill={fillColor}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      ) : effectiveKind === 'storm' ? (
        <polygon
          points="18,4 30,11 30,25 18,32 6,25 6,11"
          fill={fillColor}
          stroke={isUnverified ? hex : '#FFFFFF'}
          strokeWidth={isUnverified ? 2.1 : 2}
          strokeDasharray={isUnverified ? '4 3' : undefined}
          strokeLinejoin="round"
        />
      ) : effectiveKind === 'suspected' || isUnverified ? (
        <circle
          cx="18"
          cy="18"
          r="13.2"
          fill={fillColor}
          stroke={hex}
          strokeWidth="2.2"
          strokeDasharray="4.5 3"
        />
      ) : (
        <path
          d="M18 3.5 C23.5 9.8 30.2 15.6 29.2 22.6 C28.2 28.8 23.6 32.4 18 32.4 C12.4 32.4 7.8 28.8 6.8 22.6 C5.8 15.6 12.5 9.8 18 3.5 Z"
          fill={fillColor}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      )}
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
      className={`relative overflow-hidden bg-[#eef3f8] ${compact ? 'h-32' : 'h-40'} ${className}`}
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
        <span className="absolute top-3 left-3 z-10 rounded-[8px] border border-line bg-white/92 px-2.5 py-1 text-[12px] font-medium text-ink">
          {badge}
        </span>
      )}

      {/* Koordinat & wilayah di kiri/kanan bawah */}
      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 z-10 flex items-center justify-between gap-2 text-[12px]">
        {subtitle ? (
          <span className="truncate rounded-[8px] border border-line bg-white/92 px-2 py-0.5 font-medium text-ink">
            {subtitle}
          </span>
        ) : (
          <span />
        )}
        <span className="num shrink-0 rounded-[8px] border border-line bg-white/92 px-2 py-0.5 font-normal text-ink-soft">
          {coordText}
        </span>
      </div>
    </div>
  )
}
