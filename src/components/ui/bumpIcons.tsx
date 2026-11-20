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
  className = 'relative z-10 size-[31px] -translate-y-0.5',
}: {
  light?: boolean
  className?: string
}) {
  const gradId = useId()
  const needleMain = light ? 'var(--color-forest)' : '#FFFFFF'
  const needleSub = light ? 'var(--color-leaf)' : '#A7F3D0'
  const dot = light ? '#FFFFFF' : 'var(--color-forest)'
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? '#FFFFFF' : '#4ADE80'} />
          <stop offset="55%" stopColor={light ? '#ECFDF5' : 'var(--color-leaf)'} />
          <stop offset="100%" stopColor={light ? '#D1FAE5' : 'var(--color-forest)'} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.6" fill={`url(#${gradId})`} />
      <circle cx="12" cy="12" r="9.1" fill="none" stroke="#FFFFFF" strokeOpacity={light ? 0.85 : 0.28} strokeWidth="1.2" />
      <path
        d="M16.4 7.6c.3.2.4.6.2 1l-2.3 4.8c-.1.2-.3.4-.5.5l-4.8 2.3c-.4.2-.8 0-1-.3-.2-.3-.1-.7 0-1l2.3-4.8c.1-.2.3-.4.5-.5l4.8-2.3c.3-.1.6 0 .8.3Z"
        fill={needleSub}
      />
      <path
        d="M16.4 7.6c.3.2.4.6.2 1l-2.3 4.8c-.1.2-.3.4-.5.5l-3.6-3.6 5.3-2.6c.3-.2.6-.2.9-.1Z"
        fill={needleMain}
      />
      <circle cx="12" cy="12" r="1.9" fill={dot} />
    </svg>
  )
}

export function BlamNatureIcon({
  className = 'relative z-10 size-[52px] drop-shadow-[0_2px_4px_rgba(18,30,90,0.28)]',
  elephantAway = false,
  interactive = false,
}: {
  light?: boolean
  className?: string
  /** Sembunyikan gajah dari logo (dipakai saat Gajah Blam keluar jadi companion). */
  elephantAway?: boolean
  /** Aktifkan animasi gajah mengintip/melambai di dalam logo untuk menarik perhatian klik. */
  interactive?: boolean
}) {
  const uid = useId()
  const gGlobe = `${uid}-g`
  const gLand = `${uid}-ln`
  const gCradleA = `${uid}-ca`
  const gCradleB = `${uid}-cb`
  const gEl = `${uid}-el`
  const gArm = `${uid}-ar`
  const gEar = `${uid}-ea`
  const gEarIn = `${uid}-ei`
  const gLeafL = `${uid}-ll`
  const gLeafR = `${uid}-lr`
  const clipEarth = `${uid}-ec`
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gGlobe} cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="56%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0B1B4D" />
        </radialGradient>
        <linearGradient id={gLand} x1="200" y1="200" x2="420" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={gCradleA} x1="110" y1="290" x2="290" y2="445" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D9F99D" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={gCradleB} x1="110" y1="320" x2="290" y2="445" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id={gEl} x1="120" y1="90" x2="380" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="46%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={gArm} x1="130" y1="220" x2="250" y2="370" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={gEar} x1="85" y1="130" x2="210" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id={gEarIn} x1="100" y1="150" x2="185" y2="255" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id={gLeafL} x1="395" y1="88" x2="445" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BEF264" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={gLeafR} x1="400" y1="90" x2="448" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <clipPath id={clipEarth}>
          <path d="M276 134 C358 134, 424 192, 430 272 C434 328, 404 388, 344 416 C288 442, 212 438, 162 396 C122 362, 110 302, 126 244 C144 178, 202 134, 276 134 Z" />
        </clipPath>
      </defs>

      <g transform="translate(256, 256) scale(1.24) translate(-262, -264)">
        <path
          d="M276 134 C358 134, 424 192, 430 272 C434 328, 404 388, 344 416 C288 442, 212 438, 162 396 C122 362, 110 302, 126 244 C144 178, 202 134, 276 134 Z"
          fill={`url(#${gGlobe})`}
        />
        <g clipPath={`url(#${clipEarth})`}>
          <path
            d="M236 226 C268 208, 314 218, 330 242 C344 264, 318 286, 332 304 C346 322, 376 308, 388 326 C400 344, 374 382, 344 394 C314 406, 276 396, 272 368 C268 342, 290 332, 278 312 C266 292, 236 308, 222 290 C208 272, 212 240, 236 226 Z"
            fill={`url(#${gLand})`}
          />
          <path
            d="M390 220 C418 216, 442 244, 436 286 C430 324, 402 348, 382 338 C366 330, 374 300, 382 278 C390 258, 370 224, 390 220 Z"
            fill={`url(#${gLand})`}
            fillOpacity="0.90"
          />
          <path
            d="M226 408 C276 424, 338 416, 382 384"
            fill="none"
            stroke="#60A5FA"
            strokeOpacity="0.28"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>

        <path
          d="M114 316 C128 386, 198 440, 286 438 C242 424, 178 378, 146 318 C134 296, 112 300, 114 316 Z"
          fill={`url(#${gCradleB})`}
        />
        <path
          d="M118 308 C142 366, 208 424, 284 436 C234 426, 170 384, 134 328 C124 312, 116 306, 118 308 Z"
          fill={`url(#${gCradleA})`}
        />

        <g
          style={{
            opacity: elephantAway ? 0 : 1,
            transform: elephantAway ? 'translateY(-26px) scale(0.6)' : 'none',
            transformOrigin: '270px 230px',
            transition: elephantAway
              ? 'opacity 160ms ease, transform 220ms ease'
              : 'opacity 260ms ease 480ms, transform 420ms cubic-bezier(0.34,1.56,0.64,1) 480ms',
          }}
        >
        <g
          className={interactive && !elephantAway ? 'blam-logo-peek' : undefined}
          style={{ transformOrigin: '260px 240px' }}
        >
        <path
          d="M148 256 C158 314, 194 358, 236 364 C210 342, 190 302, 186 254 Z"
          fill="#0B1B4D"
          fillOpacity="0.24"
        />

        <path d="M214 106 C214 78, 240 68, 260 82 C252 90, 248 98, 250 106 Z" fill="#7DD3FC" />
        <path d="M244 98 C254 80, 272 78, 282 88 C272 94, 266 100, 262 108 Z" fill="#38BDF8" />

        <path
          d="M134 224 C120 278, 138 334, 182 356 C206 368, 238 358, 246 334 C252 314, 236 294, 212 292 C194 290, 188 270, 196 242 L202 214 Z"
          fill={`url(#${gArm})`}
        />
        <circle cx="226" cy="342" r="5" fill="#E0F2FE" fillOpacity="0.90" />
        <circle cx="211" cy="346" r="5" fill="#E0F2FE" fillOpacity="0.90" />

        <g
          className={interactive && !elephantAway ? 'blam-logo-trunk' : undefined}
          style={{ transformOrigin: '270px 190px' }}
        >
        <path
          d="M174 164 C178 112, 224 86, 278 98 C316 106, 338 134, 338 164 C338 186, 348 198, 368 196 C386 194, 396 176, 390 158 C386 144, 400 132, 414 140 C430 150, 430 180, 412 206 C394 234, 352 242, 314 228 C286 218, 262 224, 236 238 C206 254, 170 228, 174 164 Z"
          fill={`url(#${gEl})`}
        />

        <path d="M400 138 C394 110, 416 88, 444 94 C432 114, 416 128, 400 138 Z" fill={`url(#${gLeafL})`} />
        <path d="M400 138 C416 128, 432 114, 444 94 C446 122, 426 142, 400 138 Z" fill={`url(#${gLeafR})`} />
        <path
          d="M406 132 L434 104"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <path
          d="M254 126 C264 117, 278 118, 286 126"
          fill="none"
          stroke="#0369A1"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <g
          className={interactive && !elephantAway ? 'blam-logo-blink' : undefined}
          style={{ transformOrigin: '268px 152px' }}
        >
          <ellipse cx="268" cy="152" rx="15" ry="17" fill="#0F172A" />
          <circle cx="263" cy="145" r="5.6" fill="#FFFFFF" />
          <circle cx="272" cy="158" r="2.6" fill="#FFFFFF" fillOpacity="0.72" />
        </g>
        <ellipse cx="242" cy="178" rx="13" ry="7" fill="#FFFFFF" fillOpacity="0.32" />
        <path
          d="M276 196 C286 204, 298 202, 304 194"
          fill="none"
          stroke="#0369A1"
          strokeWidth="5"
          strokeLinecap="round"
        />
        </g>

        <g
          className={interactive && !elephantAway ? 'blam-logo-ear' : undefined}
          style={{ transformOrigin: '192px 170px' }}
        >
        <path
          d="M196 136 C168 110, 116 118, 94 156 C74 190, 84 244, 118 264 C144 278, 174 266, 186 242 C200 214, 206 164, 196 136 Z"
          fill={`url(#${gEar})`}
        />
        <path
          d="M178 156 C158 138, 126 144, 112 170 C98 194, 106 230, 130 242 C148 250, 166 242, 174 224 C182 204, 184 174, 178 156 Z"
          fill={`url(#${gEarIn})`}
          fillOpacity="0.48"
        />
        <path
          d="M110 156 C126 134, 152 128, 174 136"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.45"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        </g>

        {interactive && !elephantAway && (
          <path
            d="M446 66 C448 80, 456 88, 470 90 C456 92, 448 100, 446 114 C444 100, 436 92, 422 90 C436 88, 444 80, 446 66 Z"
            fill="#FEF08A"
            className="blam-logo-sparkle"
            style={{ transformOrigin: '446px 90px' }}
          />
        )}
        </g>
        </g>
      </g>
    </svg>
  )
}

export function BlamAiAvatarIcon({
  withBadge = true,
  className = 'size-8 shrink-0',
}: {
  withBadge?: boolean
  className?: string
}) {
  const uid = useId()
  const gBg = `${uid}-bg`
  const gEl = `${uid}-el`
  const gEar = `${uid}-ea`
  const gLeafL = `${uid}-ll`
  const gLeafR = `${uid}-lr`
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gBg} cx="38%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="56%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0B1B4D" />
        </radialGradient>
        <linearGradient id={gEl} x1="150" y1="120" x2="370" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="48%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={gEar} x1="80" y1="150" x2="210" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id={gLeafL} x1="370" y1="90" x2="430" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BEF264" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={gLeafR} x1="375" y1="90" x2="435" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {withBadge && (
        <>
          <circle cx="256" cy="256" r="236" fill={`url(#${gBg})`} />
          <circle cx="256" cy="256" r="232" fill="none" stroke="#FFFFFF" strokeOpacity="0.24" strokeWidth="6" />
        </>
      )}

      <g
        transform={
          withBadge
            ? 'translate(248, 268) scale(1.02) translate(-252, -236)'
            : 'translate(256, 266) scale(1.18) translate(-252, -236)'
        }
      >
        <path d="M206 122 C206 94, 232 84, 252 98 C244 106, 240 114, 242 122 Z" fill="#7DD3FC" />
        <path d="M236 114 C246 96, 264 94, 274 104 C264 110, 258 116, 254 124 Z" fill="#38BDF8" />

        <path
          d="M164 216 C164 146, 212 106, 274 116 C322 124, 352 160, 352 204 C352 228, 362 240, 382 238 C398 236, 408 218, 402 198 C398 184, 414 172, 428 182 C444 192, 444 224, 424 252 C402 284, 354 294, 312 282 C276 310, 210 310, 178 274 C168 260, 164 240, 164 216 Z"
          fill={`url(#${gEl})`}
        />

        <path d="M412 178 C406 146, 430 122, 462 128 C448 150, 430 166, 412 178 Z" fill={`url(#${gLeafL})`} />
        <path d="M412 178 C430 166, 448 150, 462 128 C464 160, 442 182, 412 178 Z" fill={`url(#${gLeafR})`} />

        <path
          d="M250 152 C262 142, 278 143, 288 152"
          fill="none"
          stroke="#0369A1"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <ellipse cx="268" cy="184" rx="18" ry="21" fill="#0F172A" />
        <circle cx="262" cy="175" r="7" fill="#FFFFFF" />
        <circle cx="274" cy="192" r="3" fill="#FFFFFF" fillOpacity="0.72" />
        <ellipse cx="236" cy="216" rx="15" ry="8" fill="#FFFFFF" fillOpacity="0.34" />
        <path
          d="M276 238 C288 248, 302 246, 310 236"
          fill="none"
          stroke="#0369A1"
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        <path
          d="M188 164 C158 134, 100 144, 76 186 C54 224, 66 286, 104 308 C132 324, 166 310, 180 282 C194 250, 200 194, 188 164 Z"
          fill={`url(#${gEar})`}
        />
        <path
          d="M168 188 C146 168, 112 176, 98 204 C84 232, 94 270, 120 282"
          fill="none"
          stroke="#E0F2FE"
          strokeOpacity="0.45"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

export function AksiActionIcon({
  light = false,
  className = 'relative z-10 size-[30px] -translate-y-0.5',
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
          <stop offset="0%" stopColor={light ? '#FFFFFF' : '#4ADE80'} />
          <stop offset="55%" stopColor={light ? '#ECFDF5' : 'var(--color-leaf)'} />
          <stop offset="100%" stopColor={light ? '#D1FAE5' : 'var(--color-forest)'} />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 12 12.5)">
        <rect x="4.2" y="4.8" width="15.6" height="15.8" rx="4.8" fill={`url(#${gradId})`} />
        <rect x="8.1" y="2.5" width="7.8" height="4" rx="2" fill={clip} stroke={clipBorder} strokeWidth="1.3" />
        <path
          d="M8.6 13.1l2.3 2.3 4.7-4.8"
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="8.4" y="17.1" width="7.2" height="1.6" rx="0.8" fill={stroke} fillOpacity="0.45" />
      </g>
      <circle cx="19.6" cy="5.4" r="1.5" fill="var(--color-leaf)" />
    </svg>
  )
}

export function BellSolidIcon({ light = false }: { light?: boolean }) {
  const main = light ? '#FFFFFF' : 'var(--color-leaf)'
  const accent = light ? 'var(--color-mint)' : 'var(--color-forest)'
  return (
    <svg
      viewBox="0 0 24 24"
      className={`relative z-10 size-[22px] ${light ? 'drop-shadow-[0_1.5px_2px_rgba(18,30,90,0.24)]' : ''}`}
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
        strokeWidth="2"
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
    <svg viewBox="0 0 24 24" className="relative z-10 size-[22px]" aria-hidden="true">
      <circle cx="12" cy="8.2" r="4" fill={head} />
      <circle cx="10.7" cy="7.2" r="0.9" fill={light ? 'var(--color-leaf)' : '#FFFFFF'} fillOpacity="0.65" />
      <path
        d="M5 19.4c.7-3.5 3.5-5.3 7-5.3s6.3 1.8 7 5.3c.2.8-.4 1.5-1.2 1.5H6.2c-.8 0-1.4-.7-1.2-1.5Z"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="2"
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
    <svg viewBox="0 0 24 24" className="relative z-10 size-[21px]" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.4" fill={lens} stroke={stroke} strokeWidth="2.6" />
      <path
        d="M8.1 8.1a3.4 3.4 0 0 1 3.7-.8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.88"
      />
      <path d="M15.4 15.4l4.4 4.4" stroke={accent} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M15.4 15.4l2.1 2.1" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function LocateDuotoneIcon({ light = false }: { light?: boolean }) {
  const stroke = light ? '#FFFFFF' : 'var(--color-leaf)'
  const core = light ? '#A7F3D0' : 'var(--color-forest)'
  const inner = light ? '#FFFFFF' : 'var(--color-leaf)'
  return (
    <svg viewBox="0 0 24 24" className="relative z-10 size-[21px]" aria-hidden="true">
      <circle cx="12" cy="12" r="6.4" fill="none" stroke={stroke} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="3" fill={inner} />
      <circle cx="11.2" cy="11.2" r="0.85" fill="#FFFFFF" opacity="0.82" />
      <path
        d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6"
        fill="none"
        stroke={core}
        strokeWidth="2.4"
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
    <svg viewBox="0 0 24 24" className="relative z-10 size-[19px]" aria-hidden="true">
      <path
        d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"
        fill="none"
        stroke={line}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="7.5" r="2.5" fill={knobFill} stroke={knobStroke} strokeWidth="2" />
      <circle cx="15.3" cy="12" r="2.5" fill={knobFill} stroke={knobStroke} strokeWidth="2" />
      <circle cx="10.8" cy="16.5" r="2.5" fill={knobFill} stroke={knobStroke} strokeWidth="2" />
    </svg>
  )
}

export function HistoryDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      <circle
        cx="12.5"
        cy="12"
        r="7.8"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.8"
      />
      <path
        d="M4.8 9.2A8.2 8.2 0 0 1 12.5 4.2M4.3 6.2v3.3h3.3"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 8.4v4l2.7 1.6"
        fill="none"
        stroke="var(--color-forest)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#DBE4FF" />
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
        fill="#BFDBFE"
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
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
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
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#DBE4FF" />
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
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
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
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
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

export function BlamChatDuotoneIcon({ className = 'relative z-10 size-6' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
      </defs>
      <path
        d="M5 6.2A2.8 2.8 0 0 1 7.8 3.4h8.4A2.8 2.8 0 0 1 19 6.2v6.6a2.8 2.8 0 0 1-2.8 2.8H11l-3.7 3a.7.7 0 0 1-1.1-.55V15.5A2.8 2.8 0 0 1 5 12.8V6.2Z"
        fill={`url(#${gradId})`}
        stroke="var(--color-leaf)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="9.2" cy="9.6" r="1.15" fill="var(--color-forest)" />
      <circle cx="12" cy="9.6" r="1.15" fill="var(--color-forest)" />
      <circle cx="14.8" cy="9.6" r="1.15" fill="var(--color-forest)" />
    </svg>
  )
}

export function SnapCameraDuotoneIcon({
  light = true,
  className = 'relative z-10 size-[30px]',
}: {
  light?: boolean
  className?: string
}) {
  const gradId = useId()
  const lensStroke = light ? 'var(--color-forest)' : '#FFFFFF'
  const lensFill = light ? 'var(--color-leaf)' : '#D1FAE5'
  const dot = light ? 'var(--color-leaf)' : '#FFFFFF'
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light ? '#FFFFFF' : '#4ADE80'} />
          <stop offset="100%" stopColor={light ? '#D1FAE5' : 'var(--color-forest)'} />
        </linearGradient>
      </defs>
      <path
        d="M4 8.5A2.8 2.8 0 0 1 6.8 5.7h1.5l1.1-1.7a1.6 1.6 0 0 1 1.4-.7h2.4c.6 0 1.1.3 1.4.7l1.1 1.7h1.5A2.8 2.8 0 0 1 20 8.5v8.2a2.8 2.8 0 0 1-2.8 2.8H6.8A2.8 2.8 0 0 1 4 16.7V8.5Z"
        fill={`url(#${gradId})`}
      />
      <circle cx="12" cy="12.6" r="3.6" fill={lensFill} stroke={lensStroke} strokeWidth="1.8" />
      <circle cx="16.8" cy="8.9" r="1" fill={dot} />
    </svg>
  )
}

export function DonateHeartDuotoneIcon({ className = 'relative z-10 size-[29px]' }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="55%" stopColor="var(--color-leaf)" />
          <stop offset="100%" stopColor="var(--color-forest)" />
        </linearGradient>
      </defs>
      <path
        d="M12 20.5s-7.4-4.6-9.2-9C1.4 8 3.8 4.4 7.5 4.4c2 0 3.6 1.1 4.5 2.6.9-1.5 2.5-2.6 4.5-2.6 3.7 0 6.1 3.6 4.7 7.1-1.8 4.4-9.2 9-9.2 9Z"
        fill={`url(#${gradId})`}
      />
      <path d="M12 9.6v5.2M9.4 12.2h5.2" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
