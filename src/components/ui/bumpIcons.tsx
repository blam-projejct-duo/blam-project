import { useId } from 'react'

export function MapPillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pill-top-icon size-2.5 shrink-0 text-leaf" aria-hidden="true">
      <path
        d="M12 2.4c-3.9 0-7 3-7 6.8 0 4.6 5 10.1 6.3 11.5.4.4 1 .4 1.4 0C14 19.3 19 13.8 19 9.2c0-3.8-3.1-6.8-7-6.8Z"
        fill="currentColor"
      />
      <circle cx="12" cy="9.2" r="2.7" fill="#fff" fillOpacity="0.92" />
    </svg>
  )
}

export function RadarCompassIcon({
  light = false,
  className = 'relative z-10 size-[25px] -translate-y-0.5',
}: {
  light?: boolean
  className?: string
}) {
  const gradId = useId()
  const ring = light ? '#FFFFFF' : 'var(--color-leaf)'
  const tipMain = light ? '#FFFFFF' : 'var(--color-forest)'
  const tipSub = light ? '#A7F3D0' : '#34D399'
  const dot = light ? 'var(--color-forest)' : '#FFFFFF'
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? 'rgba(255,255,255,0.34)' : '#ECFDF5'} />
          <stop offset="100%" stopColor={light ? 'rgba(167,243,208,0.16)' : '#C6F0D3'} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.3" fill={`url(#${gradId})`} stroke={ring} strokeWidth="2" />
      <circle cx="12" cy="5.2" r="0.9" fill={ring} opacity="0.7" />
      <circle cx="12" cy="18.8" r="0.9" fill={ring} opacity="0.7" />
      <circle cx="5.2" cy="12" r="0.9" fill={ring} opacity="0.7" />
      <circle cx="18.8" cy="12" r="0.9" fill={ring} opacity="0.7" />
      <path
        d="M16.1 7.9c.3.2.4.5.2.9l-2.1 4.4c-.1.2-.3.4-.5.5l-4.4 2.1c-.4.2-.8 0-1-.3-.2-.3-.1-.6 0-.9l2.1-4.4c.1-.2.3-.4.5-.5l4.4-2.1c.3-.1.6 0 .8.3Z"
        fill={tipSub}
      />
      <path
        d="M16.1 7.9c.3.2.4.5.2.9l-2.1 4.4c-.1.2-.3.4-.5.5l-3.3-3.3 4.9-2.4c.3-.2.6-.2.8-.1Z"
        fill={tipMain}
      />
      <circle cx="12" cy="12" r="1.9" fill={dot} stroke={ring} strokeWidth="1.2" />
    </svg>
  )
}

export function BlamNatureIcon({
  light = true,
  className = 'relative z-10 size-[36px] drop-shadow-[0_2px_3px_rgba(10,42,24,0.24)]',
}: {
  light?: boolean
  className?: string
}) {
  const uid = useId()
  const leftGradId = `${uid}-l`
  const rightGradId = `${uid}-r`
  const maskId = `${uid}-m`
  return (
    <svg viewBox="0 0 570 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={leftGradId} x1="130" y1="76" x2="256" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? '#FFFFFF' : '#6CE79C'} />
          <stop offset="100%" stopColor={light ? '#E7F8ED' : '#278751'} />
        </linearGradient>
        <linearGradient id={rightGradId} x1="256" y1="76" x2="390" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? '#C8F5D7' : '#2F8A57'} />
          <stop offset="100%" stopColor={light ? '#9BE9B8' : '#184C30'} />
        </linearGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="512" height="512" fill="white" />
          <path d="M247 368 L252 178 C252 173, 260 173, 260 178 L265 368 Z" fill="black" />
          <path
            d="M254 282 C230 266, 206 252, 186 240"
            fill="none"
            stroke="black"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M258 250 C282 234, 304 220, 322 208"
            fill="none"
            stroke="black"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <g transform="translate(272, 238) scale(1.44) translate(-235.6, -257) translate(0, 22) rotate(14 256 234)">
        <g mask={`url(#${maskId})`}>
          <path
            d="M256 68 C239 68, 222 87, 195 135 C158 202, 122 284, 130 339 C136 375, 170 392, 204 375 L244 355 C250 352, 256 351, 256 351 L256 68 Z"
            fill={`url(#${leftGradId})`}
          />
          <path
            d="M256 68 C273 68, 290 87, 317 135 C354 202, 390 284, 382 339 C376 375, 342 392, 308 375 L268 355 C262 352, 256 351, 256 351 L256 68 Z"
            fill={`url(#${rightGradId})`}
          />
        </g>
      </g>
    </svg>
  )
}

export function AksiActionIcon({
  light = false,
  className = 'relative z-10 size-[24px] -translate-y-0.5',
}: {
  light?: boolean
  className?: string
}) {
  const gradId = useId()
  const stroke = light ? 'var(--color-forest)' : '#FFFFFF'
  const clip = light ? 'var(--color-mint)' : '#D1FAE5'
  const clipBorder = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? '#FFFFFF' : '#34A867'} />
          <stop offset="100%" stopColor={light ? '#ECFDF5' : 'var(--color-forest)'} />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 12 12.5)">
        <rect x="4.5" y="5" width="15" height="15.2" rx="4.5" fill={`url(#${gradId})`} />
        <rect x="8.3" y="2.8" width="7.4" height="3.8" rx="1.9" fill={clip} stroke={clipBorder} strokeWidth="1.3" />
        <path
          d="M8.7 13.1l2.2 2.2 4.5-4.6"
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="8.5" y="16.9" width="7" height="1.5" rx="0.75" fill={stroke} fillOpacity="0.45" />
      </g>
      <circle cx="19.5" cy="5.5" r="1.4" fill="var(--color-leaf)" />
    </svg>
  )
}

export function BellSolidIcon({ light = false }: { light?: boolean }) {
  const main = light ? '#FFFFFF' : 'var(--color-leaf)'
  const accent = light ? 'var(--color-mint)' : 'var(--color-forest)'
  return (
    <svg
      viewBox="0 0 24 24"
      className={`relative z-10 size-[19px] ${light ? 'drop-shadow-[0_1.5px_2px_rgba(10,42,24,0.22)]' : ''}`}
      aria-hidden="true"
    >
      <g transform="rotate(-8 12 12)">
        <circle cx="12" cy="3.6" r="1.3" fill={accent} />
        <path
          d="M12 4.4a5.2 5.2 0 0 0-5.2 5.2v2.9c0 1-.4 2-1.1 2.7l-.7.8c-.6.6-.1 1.6.7 1.6h12.6c.8 0 1.3-1 .7-1.6l-.7-.8a3.8 3.8 0 0 1-1.1-2.7V9.6A5.2 5.2 0 0 0 12 4.4Z"
          fill={main}
        />
        <path d="M9.6 18.2a2.5 2.5 0 0 0 4.8 0" fill={accent} />
      </g>
      <path
        d="M18.6 6.8c.9.9 1.3 2 1.2 3.2"
        fill="none"
        stroke={accent}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GuestAvatarIcon({ light = false }: { light?: boolean }) {
  const head = light ? '#FFFFFF' : 'var(--color-leaf)'
  const bodyFill = light ? 'rgba(255,255,255,0.34)' : 'var(--color-mint)'
  const bodyStroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[19px]" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.9" fill={head} />
      <circle cx="10.7" cy="7.2" r="0.9" fill={light ? 'var(--color-leaf)' : '#FFFFFF'} fillOpacity="0.65" />
      <path
        d="M5.2 19.3c.7-3.4 3.4-5.2 6.8-5.2s6.1 1.8 6.8 5.2c.2.8-.4 1.5-1.2 1.5H6.4c-.8 0-1.4-.7-1.2-1.5Z"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SearchDuotoneIcon({ light = false }: { light?: boolean }) {
  const stroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  const lens = light ? 'rgba(255,255,255,0.26)' : 'var(--color-mint)'
  const accent = light ? '#A7F3D0' : 'var(--color-forest)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[17px]" aria-hidden="true">
      <circle cx="10.6" cy="10.6" r="6.3" fill={lens} stroke={stroke} strokeWidth="2.3" />
      <path
        d="M8.3 8.2a3.3 3.3 0 0 1 3.6-.8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M15.4 15.4l4.3 4.3" stroke={accent} strokeWidth="3.1" strokeLinecap="round" />
      <path d="M15.4 15.4l2.1 2.1" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  )
}

export function LocateDuotoneIcon({ light = false }: { light?: boolean }) {
  const stroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  const core = light ? '#A7F3D0' : 'var(--color-forest)'
  const inner = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[17px]" aria-hidden="true">
      <circle cx="12" cy="12" r="6.4" fill="none" stroke={stroke} strokeWidth="2.1" />
      <circle cx="12" cy="12" r="2.7" fill={inner} />
      <circle cx="11.3" cy="11.3" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <path
        d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4"
        fill="none"
        stroke={core}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FilterDuotoneIcon({ light = false }: { light?: boolean }) {
  const line = light ? '#FFFFFF' : 'var(--color-leaf)'
  const knobFill = light ? '#A7F3D0' : 'var(--color-mint)'
  const knobStroke = light ? '#FFFFFF' : 'var(--color-forest)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[17px]" aria-hidden="true">
      <path
        d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"
        fill="none"
        stroke={line}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="7.5" r="2.4" fill={knobFill} stroke={knobStroke} strokeWidth="1.9" />
      <circle cx="15.3" cy="12" r="2.4" fill={knobFill} stroke={knobStroke} strokeWidth="1.9" />
      <circle cx="10.8" cy="16.5" r="2.4" fill={knobFill} stroke={knobStroke} strokeWidth="1.9" />
    </svg>
  )
}

export function DampakDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      <path
        d="M12 12.2c0-4.3 3.1-7.4 7.5-7.4.3 4.4-2.8 7.5-7.5 7.4Z"
        fill="#34D399"
        stroke="var(--color-leaf)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 13.8c0-3.6-2.6-6.2-6.4-6.2-.2 3.7 2.4 6.2 6.4 6.2Z"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.8v7.6M7.2 19.6h9.6"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function OrgDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#C6F0D3" />
        </linearGradient>
      </defs>
      <rect
        x="4.2"
        y="4.2"
        width="10.4"
        height="15.8"
        rx="2.6"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
      />
      <path
        d="M14.6 9.5h3.2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-3.2"
        fill="#A7F3D0"
        fillOpacity="0.55"
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 8.3h3.6M7.6 11.7h3.6M9.4 20v-4.2"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function VerifyDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
      />
      <path
        d="M8.5 12.3l2.3 2.3 4.8-5"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function EventPlusDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#C6F0D3" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="5.2"
        width="16"
        height="14.8"
        rx="4"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
      />
      <path d="M4 9.5h16" stroke="var(--color-leaf)" strokeWidth="1.8" />
      <path
        d="M8.5 3.6v2.8M15.5 3.6v2.8M12 12.2v4.8M9.6 14.6h4.8"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EscalateDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      <path
        d="M12 3.4 4.8 6.5v5.3c0 4.6 3.1 8 7.2 9 4.1-1 7.2-4.4 7.2-9V6.5L12 3.4Z"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M12 8.2v4.6" fill="none" stroke="var(--color-forest)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.2" fill="var(--color-forest)" />
    </svg>
  )
}

export function AdminDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      <path
        d="M12 3.4 4.8 6.5v5.3c0 4.6 3.1 8 7.2 9 4.1-1 7.2-4.4 7.2-9V6.5L12 3.4Z"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 12.1 11 14l4-4.1"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
