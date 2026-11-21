import {
  AnimatePresence,
  animate,
  motion,
  useAnimationControls,
  useDragControls,
  useMotionValue,
  usePresence,
  useSpring,
} from 'framer-motion'
import { Compass, MessageCircle, MoonStar, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

/**
 * Gajah Blam — companion interaktif untuk desktop.
 * Keluar dari logo Blam di navbar, lalu bertengger di dahan yang tumbuh dari tepi navbar.
 * - Klik: buka Blam Chat (AI)
 * - Seret: pindah posisi naik-turun sepanjang navbar
 * - Elus (gerakkan kursor bolak-balik di atasnya): reaksi sayang
 * - Diam lama: tertidur, gerakkan kursor untuk membangunkan
 * - Saat chat terbuka: ikut "mendengar", berpikir saat AI memproses, dan "bicara" saat balasan masuk
 */

type Mood = 'idle' | 'curious' | 'happy' | 'love' | 'thinking' | 'talking' | 'sleepy' | 'surprised'
type ParticleKind = 'heart' | 'spark' | 'z'
type Particle = { id: number; kind: ParticleKind; x: number; y: number; dx: number; rot: number }

const VB_W = 136
const VB_H = 128
const BOX_W = 140
const BOX_H = 136
/** Titik pusat visual gajah di dalam box (dipakai untuk animasi terbang dari/ke logo). */
const CENTER = { x: 70, y: 62 }
/** Posisi mata di koordinat viewBox (untuk eye-tracking). */
const EYE = { x: 80, y: 42 }
const SLEEP_AFTER_MS = 40_000

const PET_LINES = ['Terima kasih sudah menyapa', 'Siap membantu pantau peta', 'Ketuk untuk buka obrolan'] as const
const WAKE_LINES = ['Siap kembali aktif', 'Ada yang perlu dicek?'] as const
const TAP_WHILE_CHAT = ['Panel obrolan sedang aktif', 'Silakan tulis pertanyaanmu', 'Siap mendengarkan'] as const
const DRAG_LINES = ['Memindahkan posisi', 'Posisi diperbarui', 'Meletakkan di sini'] as const

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function HeartGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z"
        fill="#F472B6"
      />
      <path d="M7 8.2c.8-1 2-1.4 3-1" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function SparkGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 1.5c.9 5.4 3.6 8.1 9 9-5.4.9-8.1 3.6-9 9-.9-5.4-3.6-8.1-9-9 5.4-.9 8.1-3.6 9-9Z" fill="#A3E635" />
      <path d="M12 6c.4 2.6 1.6 3.8 4.2 4.2-2.6.4-3.8 1.6-4.2 4.2-.4-2.6-1.6-3.8-4.2-4.2C10.4 9.8 11.6 8.6 12 6Z" fill="#FEF9C3" />
    </svg>
  )
}

/** Dahan tempat gajah bertengger — tumbuh dari tepi kanan navbar. */
function PerchBranch() {
  return (
    <svg viewBox="0 0 140 34" className="h-[34px] w-[140px] overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="blam-perch-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B07A4F" />
          <stop offset="100%" stopColor="#7A4E2C" />
        </linearGradient>
      </defs>
      {/* bracket menempel di navbar */}
      <rect x="-6" y="6" width="12" height="18" rx="6" fill="#1E359E" fillOpacity=".14" />
      <path d="M0 15 C34 12, 76 17, 124 12" stroke="url(#blam-perch-wood)" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M6 13 C40 11, 80 15, 118 11" stroke="#fff" strokeOpacity=".22" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* ranting kecil + daun */}
      <path d="M104 13 C108 7, 112 4, 117 2" stroke="#7A4E2C" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M117 2 C116 -5, 123 -9, 130 -7 C128 -1, 123 2, 117 2 Z" fill="#22C55E" />
      <path d="M117 2 C123 2, 128 -1, 130 -7 C133 -1, 126 5, 117 2 Z" fill="#15803D" />
      <path d="M28 15 C27 21, 24 25, 19 28" stroke="#7A4E2C" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M19 28 C12 27, 9 33, 11 38 C16 37, 19 33, 19 28 Z" fill="#4ADE80" />
      <path d="M126 12 C132 10, 136 12, 137 15 C133 16, 129 15, 126 12 Z" fill="#86EFAC" />
    </svg>
  )
}

function BlamElephant({
  mood,
  dragging,
  lookX,
  lookY,
  headTilt,
  earCtl,
  trunkCtl,
  leafCtl,
  svgRef,
}: {
  mood: Mood
  dragging: boolean
  lookX: ReturnType<typeof useSpring>
  lookY: ReturnType<typeof useSpring>
  headTilt: ReturnType<typeof useSpring>
  earCtl: ReturnType<typeof useAnimationControls>
  trunkCtl: ReturnType<typeof useAnimationControls>
  leafCtl: ReturnType<typeof useAnimationControls>
  svgRef: RefObject<SVGSVGElement | null>
}) {
  const uid = useId().replace(/:/g, '')
  const gBody = `${uid}-body`
  const gBelly = `${uid}-belly`
  const gHead = `${uid}-head`
  const gEar = `${uid}-ear`
  const gEarIn = `${uid}-earin`
  const gTrunk = `${uid}-trunk`
  const gLeafL = `${uid}-ll`
  const gLeafR = `${uid}-lr`

  const sleepy = mood === 'sleepy'
  const earsPerk = mood === 'curious' || mood === 'thinking' || mood === 'talking' || mood === 'surprised'
  const legSwing = dragging ? [-34, 30, -34] : sleepy ? [-3, 3, -3] : [-8, 11, -8]
  const legDur = dragging ? 0.34 : sleepy ? 3.2 : 1.8

  const eyes = (() => {
    if (mood === 'happy' || mood === 'love') {
      return (
        <g>
          <path
            d="M74.5 43 C77 37.5, 83.5 37.5, 86 43"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
          {mood === 'love' && (
            <path
              d="M89.5 35.5 c-.7-.8-2-.8-2.6 0-.6-.8-1.9-.8-2.6 0-.7.8-.6 2.1.2 2.9l2.4 2.3 2.4-2.3c.8-.8.9-2.1.2-2.9Z"
              fill="#F472B6"
            />
          )}
        </g>
      )
    }
    if (sleepy) {
      return (
        <path d="M74.5 41.5 C77.5 45, 83.5 45, 86 41.5" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      )
    }
    const big = mood === 'surprised'
    return (
      <motion.g
        animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
        transition={{ duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity, repeatDelay: 0.8 }}
        style={{ originX: 0.5, originY: 0.5 }}
      >
        <ellipse cx={EYE.x + 0.5} cy={EYE.y} rx={big ? 6.2 : 5.3} ry={big ? 7 : 6.1} fill="#0B132B" />
        <ellipse cx={EYE.x + 0.5} cy={EYE.y + 1.2} rx={big ? 4.8 : 4} ry={big ? 4.8 : 4.2} fill="#1E3A8A" fillOpacity=".45" />
        <motion.g style={{ x: lookX, y: lookY }}>
          <circle cx={EYE.x - 1.4} cy={EYE.y - 2.1} r={big ? 2.5 : 2.1} fill="#FFFFFF" />
          <circle cx={EYE.x + 1.8} cy={EYE.y + 2.1} r="1" fill="#FFFFFF" fillOpacity=".82" />
        </motion.g>
      </motion.g>
    )
  })()

  const mouth = (() => {
    if (mood === 'happy' || mood === 'love') {
      return (
        <g>
          <path d="M78.5 56.8 C80.5 64.2, 88.5 64.2, 90.5 56.8 Z" fill="#0F3B66" />
          <path d="M81.2 60.5 C83.4 62.8, 86.2 62.8, 88 60.5 C86.2 59.4, 83.4 59.4, 81.2 60.5 Z" fill="#FB7185" />
        </g>
      )
    }
    if (mood === 'talking') {
      return (
        <motion.ellipse
          cx="85"
          cy="59.2"
          rx="3.6"
          fill="#0F3B66"
          animate={{ ry: [0.9, 3.4, 1.3, 3, 0.9] }}
          transition={{ duration: 0.65, repeat: Infinity }}
        />
      )
    }
    if (mood === 'surprised') return <ellipse cx="85" cy="59.2" rx="2.5" ry="3" fill="#0F3B66" />
    if (sleepy) return <path d="M82 58.8 C84 60, 86.5 60, 88.5 58.8" stroke="#0369A1" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    if (mood === 'thinking') return <path d="M81 59.4 C83.5 58.3, 86.2 60.4, 89 58.8" stroke="#0369A1" strokeWidth="1.9" strokeLinecap="round" fill="none" />
    return <path d="M79.5 57.2 C82.5 61.5, 87.2 61.5, 89.8 57.2" stroke="#0369A1" strokeWidth="2.1" strokeLinecap="round" fill="none" />
  })()

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} width={VB_W} height={VB_H} className="overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id={gBody} cx="38%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="52%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <linearGradient id={gBelly} x1="48" y1="68" x2="68" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0F9FF" stopOpacity=".85" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity=".35" />
        </linearGradient>
        <radialGradient id={gHead} cx="36%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#F0F9FF" />
          <stop offset="44%" stopColor="#7DD3FC" />
          <stop offset="78%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <linearGradient id={gTrunk} x1="90" y1="54" x2="128" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id={gEar} x1="16" y1="24" x2="58" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="48%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id={gEarIn} x1="22" y1="34" x2="52" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FECDD3" />
          <stop offset="65%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id={gLeafL} x1="118" y1="12" x2="132" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D9F99D" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={gLeafR} x1="122" y1="12" x2="136" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* bayangan kontak lembut di atas dahan */}
      <ellipse cx="58" cy="104.5" rx="26" ry="3.5" fill="#0B1B4D" fillOpacity=".18" />

      {/* ekor mungil */}
      <motion.g
        animate={{ rotate: sleepy ? [0, 4, 0] : [0, 18, -6, 0] }}
        transition={{ duration: sleepy ? 3 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: 1, originY: 0 }}
      >
        <path d="M27 83 C18 85, 15 92, 19 98" stroke="#0284C7" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path d="M19 98 C15 99, 14 103, 17.5 105 C20.5 103, 21.5 100, 19 98 Z" fill="#0369A1" />
      </motion.g>

      {/* badan bulat gemoy (bernapas) */}
      <motion.g
        animate={{ scaleY: sleepy ? [1, 1.045, 1] : [1, 1.025, 1], scaleX: sleepy ? [1, 0.985, 1] : [1, 0.992, 1] }}
        transition={{ duration: sleepy ? 3.6 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: 0.5, originY: 1 }}
      >
        <path
          d="M27 82 C27 65, 40 56, 55 56 C71 56, 82 67, 82 82 C82 96, 70 103, 55 103 C38 103, 27 95, 27 82 Z"
          fill={`url(#${gBody})`}
        />
        <ellipse cx="59" cy="84" rx="14.5" ry="12" fill={`url(#${gBelly})`} />
        {/* aksen syal daun Blam mini di leher */}
        <path d="M40 64 C52 69, 66 68, 76 62" stroke="#22C55E" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path d="M72 64 C76 67, 79 71, 77 74 C73 73, 71 68, 72 64 Z" fill="#4ADE80" />
      </motion.g>

      {/* kaki belakang menjuntai di dahan */}
      <motion.g
        animate={{ rotate: legSwing }}
        transition={{ duration: legDur, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: 0.5, originY: 0.08 }}
      >
        <rect x="44" y="92" width="13" height="22.5" rx="6.5" fill="#0EA5E9" />
        <ellipse cx="50.5" cy="112" rx="4.5" ry="2.2" fill="#BAE6FD" fillOpacity=".45" />
        <circle cx="47.8" cy="112.4" r="1.4" fill="#F0F9FF" />
        <circle cx="50.7" cy="113.1" r="1.4" fill="#F0F9FF" />
        <circle cx="53.6" cy="112.4" r="1.4" fill="#F0F9FF" />
      </motion.g>
      <motion.g
        animate={{ rotate: legSwing.map((v) => -v) }}
        transition={{ duration: legDur, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: 0.5, originY: 0.08 }}
      >
        <rect x="61" y="92" width="13" height="22.5" rx="6.5" fill="#38BDF8" />
        <ellipse cx="67.5" cy="112" rx="4.5" ry="2.2" fill="#E0F2FE" fillOpacity=".5" />
        <circle cx="64.8" cy="112.4" r="1.4" fill="#F0F9FF" />
        <circle cx="67.7" cy="113.1" r="1.4" fill="#F0F9FF" />
        <circle cx="70.6" cy="112.4" r="1.4" fill="#F0F9FF" />
      </motion.g>

      {/* sepasang tangan mungil di depan */}
      <motion.g
        animate={mood === 'happy' || mood === 'love' ? { rotate: [0, 24, 0] } : { rotate: 0 }}
        transition={{ duration: 0.48, repeat: mood === 'happy' || mood === 'love' ? Infinity : 0 }}
        style={{ originX: 0.7, originY: 0.1 }}
      >
        <ellipse cx="40.5" cy="88.5" rx="6.5" ry="9" fill="#0EA5E9" />
        <path d="M36.8 85 C38.5 81, 42.2 80.5, 44 83" stroke="#BAE6FD" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <circle cx="38.8" cy="96.2" r="1.3" fill="#F0F9FF" />
        <circle cx="42.1" cy="95.5" r="1.3" fill="#F0F9FF" />
      </motion.g>
      <motion.g
        animate={mood === 'happy' || mood === 'love' ? { rotate: [0, -26, 0] } : { rotate: 0 }}
        transition={{ duration: 0.48, repeat: mood === 'happy' || mood === 'love' ? Infinity : 0 }}
        style={{ originX: 0.3, originY: 0.1 }}
      >
        <ellipse cx="75.5" cy="87.5" rx="6.8" ry="9.2" fill="#38BDF8" />
        <path d="M71.5 84 C73 80, 77 79.5, 79 82" stroke="#E0F2FE" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <circle cx="74.2" cy="95.4" r="1.3" fill="#F0F9FF" />
        <circle cx="77.5" cy="94.6" r="1.3" fill="#F0F9FF" />
      </motion.g>

      {/* kepala (miring mengikuti kursor) */}
      <motion.g style={{ rotate: headTilt, originX: 0.38, originY: 0.82 }}>
        {/* jambul rambut lucu */}
        <path d="M62 21.5 C60.5 13, 68 9.5, 74 13.8 C71 16, 70 19, 70.5 22 Z" fill="#BAE6FD" />
        <path d="M69 20 C72 13.5, 78.5 12.5, 81.5 16.5 C78.5 18.2, 76.5 20.5, 75.5 23 Z" fill="#7DD3FC" />

        {/* belalai luwes + tunas daun Blam */}
        <motion.g animate={trunkCtl} style={{ originX: 0.08, originY: 0.92 }}>
          <motion.g
            animate={sleepy ? { rotate: [0, 6, 0] } : { rotate: [-3, 5, -3] }}
            transition={{ duration: sleepy ? 3.6 : 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: 0.08, originY: 0.92 }}
          >
            <path
              d="M93 49.5 C105 58, 115.5 55, 117.5 43.5 C119 35.5, 121.5 32, 126 32"
              stroke={`url(#${gTrunk})`}
              strokeWidth="9.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M97 46.5 C106 53, 113 50.5, 115 41.5"
              stroke="#FFFFFF"
              strokeOpacity=".45"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M104 51.5 L106 56 M110.5 48.5 L114 51" stroke="#E0F2FE" strokeOpacity=".8" strokeWidth="1.3" strokeLinecap="round" />
            <motion.g animate={leafCtl} style={{ originX: 0.5, originY: 1 }}>
              <path d="M125.5 32 C120 25, 121.5 16.5, 129 13.5 C131 20.5, 130.5 27.5, 125.5 32 Z" fill={`url(#${gLeafL})`} />
              <path d="M125.5 32 C130.5 27.5, 131 20.5, 129 13.5 C135.5 18.5, 134 27.5, 125.5 32 Z" fill={`url(#${gLeafR})`} />
              <path d="M126.5 29.5 L129 17.5" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.1" strokeLinecap="round" />
            </motion.g>
          </motion.g>
        </motion.g>

        {/* kepala utama + rim light */}
        <path
          d="M44.5 46 C44.5 30, 56 20, 72.5 20 C89 20, 100 30, 100 45.5 C100 60, 89 69.5, 72.5 69.5 C55 69.5, 44.5 60, 44.5 46 Z"
          fill={`url(#${gHead})`}
        />
        <path
          d="M52 29 C60 22.5, 74 21.5, 84 25"
          stroke="#FFFFFF"
          strokeOpacity=".65"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* alis ekspresif */}
        <motion.path
          d="M74.5 31.5 C77.8 29, 83 29, 86.2 31.5"
          stroke="#0369A1"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{ y: mood === 'surprised' || mood === 'curious' ? -2 : mood === 'thinking' ? -1 : 0, rotate: mood === 'thinking' ? -9 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16 }}
        />
        {eyes}
        <motion.ellipse
          cx="88.5"
          cy="52.2"
          rx="5.2"
          ry="2.8"
          fill="#FDA4AF"
          animate={{ opacity: mood === 'love' || mood === 'happy' ? 0.92 : 0.55 }}
        />
        {mouth}

        {/* telinga besar & lembut */}
        <motion.g
          animate={{ rotate: earsPerk ? -12 : sleepy ? 6 : 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          style={{ originX: 0.92, originY: 0.3 }}
        >
          <motion.g animate={earCtl} style={{ originX: 0.92, originY: 0.3 }}>
            <path
              d="M57.5 32.5 C44.5 20.5, 22 25.5, 18 44.5 C14.5 61.5, 25.5 77, 40.5 76.5 C53 76, 59.5 63.5, 60 51 C60.3 43, 59.5 37, 57.5 32.5 Z"
              fill={`url(#${gEar})`}
            />
            <path
              d="M52.5 39 C43.5 31.5, 29.5 35, 26.5 47.5 C24 58.5, 31 69, 41 69 C49 69, 53.5 60, 54 51.5 C54.2 46.5, 53.8 42, 52.5 39 Z"
              fill={`url(#${gEarIn})`}
              fillOpacity=".68"
            />
            <path d="M23.5 40.5 C29 31.5, 40 28.5, 50.5 31.5" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  )
}

export interface BlamCompanionProps {
  logoRef: RefObject<HTMLElement | null>
  boundsRef: RefObject<HTMLElement | null>
  left: number
  bottom: number
  chatOpen: boolean
  chatBusy: boolean
  replyPulse: number
  tips: string[]
  onOpenChat: () => void
  onResetMap: () => void
  onDismiss: () => void
}

export default function BlamCompanion({
  logoRef,
  boundsRef,
  left,
  bottom,
  chatOpen,
  chatBusy,
  replyPulse,
  tips,
  onOpenChat,
  onResetMap,
  onDismiss,
}: BlamCompanionProps) {
  const [isPresent, safeToRemove] = usePresence()
  const outerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const flightCtl = useAnimationControls()
  const branchCtl = useAnimationControls()
  const bounceCtl = useAnimationControls()
  const earCtl = useAnimationControls()
  const trunkCtl = useAnimationControls()
  const leafCtl = useAnimationControls()
  const dragControls = useDragControls()

  const lookX = useSpring(0, { stiffness: 220, damping: 18 })
  const lookY = useSpring(0, { stiffness: 220, damping: 18 })
  const headTilt = useSpring(0, { stiffness: 120, damping: 14 })

  const [landed, setLanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sleeping, setSleeping] = useState(false)
  const [talking, setTalking] = useState(false)
  const [flash, setFlash] = useState<Mood | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])

  const flashTimer = useRef<number | null>(null)
  const bubbleTimer = useRef<number | null>(null)
  const hoverTimer = useRef<number | null>(null)
  const lastActivity = useRef(Date.now())
  const draggedRef = useRef(false)
  const particleId = useRef(0)
  const tipIdx = useRef(0)
  const pet = useRef({ lastX: 0, dir: 0, changes: 0, t: 0 })
  const sleepingRef = useRef(false)
  useEffect(() => {
    sleepingRef.current = sleeping
  }, [sleeping])

  const mood: Mood =
    flash ??
    (sleeping
      ? 'sleepy'
      : chatOpen
        ? chatBusy
          ? 'thinking'
          : talking
            ? 'talking'
            : 'curious'
        : hovered
          ? 'curious'
          : 'idle')
  const moodRef = useRef(mood)
  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  const flashMood = useCallback((m: Mood, ms: number) => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    setFlash(m)
    flashTimer.current = window.setTimeout(() => setFlash(null), ms)
  }, [])

  const say = useCallback((text: string, ms = 3600) => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
    setBubble(text)
    bubbleTimer.current = window.setTimeout(() => setBubble(null), ms)
  }, [])

  const spawn = useCallback((kind: ParticleKind, n = 1, origin = { x: 74, y: 22 }) => {
    const next: Particle[] = Array.from({ length: n }, () => ({
      id: ++particleId.current,
      kind,
      x: origin.x + (Math.random() - 0.5) * 26,
      y: origin.y + (Math.random() - 0.5) * 10,
      dx: (Math.random() - 0.5) * 40,
      rot: (Math.random() - 0.5) * 50,
    }))
    setParticles((prev) => [...prev.slice(-14), ...next])
  }, [])

  useEffect(
    () => () => {
      for (const t of [flashTimer, bubbleTimer, hoverTimer]) if (t.current) window.clearTimeout(t.current)
    },
    [],
  )

  // ---------- Terbang keluar dari logo & pulang ke logo ----------
  const logoOffset = useCallback(() => {
    const logo = logoRef.current?.getBoundingClientRect()
    const me = outerRef.current?.getBoundingClientRect()
    if (!logo || !me) return { x: -90, y: -300 }
    return {
      x: logo.left + logo.width / 2 - (me.left + CENTER.x),
      y: logo.top + logo.height / 2 - (me.top + CENTER.y),
    }
  }, [logoRef])

  useEffect(() => {
    if (!isPresent) return
    const { x, y } = logoOffset()
    let cancelled = false
    flightCtl.set({ x, y, scale: 0.22, rotate: -24, opacity: 0 })
    branchCtl.set({ scaleX: 0, opacity: 0 })
    const run = async () => {
      void branchCtl.start({
        scaleX: 1,
        opacity: 1,
        transition: { delay: 0.12, type: 'spring', stiffness: 240, damping: 16 },
      })
      await flightCtl.start({
        x: [x, x * 0.5, 0],
        y: [y, y * 0.5 - 70, 0],
        scale: [0.22, 1.08, 1],
        rotate: [-24, 14, 0],
        opacity: [0, 1, 1],
        transition: { duration: 0.8, times: [0, 0.55, 1], ease: [0.3, 0.7, 0.4, 1] },
      })
      if (cancelled) return
      await bounceCtl.start({
        scaleX: [1, 1.16, 0.95, 1.02, 1],
        scaleY: [1, 0.82, 1.06, 0.99, 1],
        transition: { duration: 0.5 },
      })
      if (cancelled) return
      setLanded(true)
      spawn('spark', 3, { x: 60, y: 96 })
      void earCtl.start({ rotate: [0, -20, 6, -14, 0], transition: { duration: 0.8 } })
      if (tips[0]) say(tips[0], 4200)
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent])

  useEffect(() => {
    if (isPresent) return
    setLanded(false)
    setBubble(null)
    setHovered(false)
    const { x, y } = logoOffset()
    const run = async () => {
      void bounceCtl.start({ scaleY: [1, 0.8, 1], scaleX: [1, 1.12, 1], transition: { duration: 0.22 } })
      await new Promise((r) => window.setTimeout(r, 160))
      void branchCtl.start({ scaleX: 0, opacity: 0, transition: { delay: 0.25, duration: 0.25 } })
      await flightCtl.start({
        x: [0, x * 0.5, x],
        y: [0, y * 0.5 - 60, y],
        scale: [1, 1.05, 0.2],
        rotate: [0, -12, -24],
        opacity: [1, 1, 0],
        transition: { duration: 0.6, times: [0, 0.5, 1], ease: [0.5, 0, 0.6, 1] },
      })
      safeToRemove?.()
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent])

  // ---------- Mata mengikuti kursor + deteksi aktivitas ----------
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastActivity.current = Date.now()
      if (sleepingRef.current) {
        setSleeping(false)
        flashMood('surprised', 900)
        say(pick(WAKE_LINES), 2600)
        void earCtl.start({ rotate: [0, -24, 8, -16, 0], transition: { duration: 0.7 } })
      }
      const el = svgRef.current
      if (!el) return
      if (moodRef.current === 'thinking') {
        lookX.set(-1.6)
        lookY.set(-2)
        headTilt.set(-6)
        return
      }
      const r = el.getBoundingClientRect()
      const s = r.width / VB_W
      const dx = e.clientX - (r.left + EYE.x * s)
      const dy = e.clientY - (r.top + EYE.y * s)
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, d / 200)
      lookX.set((dx / d) * 2.1 * k)
      lookY.set((dy / d) * 2.3 * k)
      headTilt.set(clamp(dy / 40, -7, 7) * (dx < 0 ? -0.6 : 1))
    }
    const onKey = () => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [earCtl, flashMood, headTilt, lookX, lookY, say])

  useEffect(() => {
    if (mood === 'thinking') {
      lookX.set(-1.6)
      lookY.set(-2)
      headTilt.set(-6)
    }
  }, [mood, headTilt, lookX, lookY])

  // ---------- Tidur setelah lama tidak ada aktivitas ----------
  useEffect(() => {
    if (!landed || chatOpen) return
    const id = window.setInterval(() => {
      if (!sleepingRef.current && Date.now() - lastActivity.current > SLEEP_AFTER_MS) {
        setSleeping(true)
        setBubble(null)
        headTilt.set(8)
        lookX.set(0)
        lookY.set(0)
      }
    }, 1500)
    return () => window.clearInterval(id)
  }, [landed, chatOpen, headTilt, lookX, lookY])

  useEffect(() => {
    if (!sleeping) return
    spawn('z', 1, { x: 96, y: 18 })
    const id = window.setInterval(() => spawn('z', 1, { x: 96, y: 18 }), 1700)
    return () => window.clearInterval(id)
  }, [sleeping, spawn])

  // ---------- Aksi iseng acak saat idle ----------
  useEffect(() => {
    if (!landed || sleeping || dragging) return
    let t: number
    const loop = () => {
      t = window.setTimeout(
        () => {
          const action = pick(['ear', 'ear', 'trunk', 'leaf', 'hop', 'sneeze'] as const)
          if (action === 'ear') void earCtl.start({ rotate: [0, -22, 6, -16, 4, 0], transition: { duration: 1 } })
          if (action === 'trunk') {
            void trunkCtl.start({ rotate: [0, -26, 10, -18, 0], transition: { duration: 1.2 } })
            spawn('spark', 2, { x: 126, y: 16 })
          }
          if (action === 'leaf') void leafCtl.start({ rotate: [0, 360], transition: { duration: 0.9, ease: 'easeInOut' } })
          if (action === 'hop') void bounceCtl.start({ y: [0, -9, 0, -4, 0], transition: { duration: 0.7 } })
          if (action === 'sneeze' && !chatOpen && Math.random() < 0.5) {
            flashMood('surprised', 450)
            window.setTimeout(() => {
              void trunkCtl.start({ rotate: [0, -30, 0], transition: { duration: 0.35 } })
              spawn('spark', 5, { x: 126, y: 20 })
              say('Siap aktif', 1600)
            }, 420)
          }
          loop()
        },
        4500 + Math.random() * 5000,
      )
    }
    loop()
    return () => window.clearTimeout(t)
  }, [landed, sleeping, dragging, chatOpen, bounceCtl, earCtl, flashMood, leafCtl, say, spawn, trunkCtl])

  // ---------- Tips berkala ----------
  useEffect(() => {
    if (!landed || chatOpen || sleeping || tips.length < 2) return
    const id = window.setInterval(() => {
      if (hoverTimer.current !== null) return
      tipIdx.current = (tipIdx.current % (tips.length - 1)) + 1
      say(tips[tipIdx.current], 4800)
      void earCtl.start({ rotate: [0, -14, 0], transition: { duration: 0.5 } })
    }, 16000)
    return () => window.clearInterval(id)
  }, [landed, chatOpen, sleeping, tips, say, earCtl])

  // ---------- Reaksi terhadap chat AI ----------
  useEffect(() => {
    if (chatOpen) {
      setBubble(null)
      setSleeping(false)
    }
  }, [chatOpen])

  useEffect(() => {
    if (!replyPulse) return
    setTalking(true)
    spawn('spark', 3, { x: 96, y: 40 })
    void earCtl.start({ rotate: [0, -18, 4, -12, 0], transition: { duration: 0.8 } })
    const t = window.setTimeout(() => setTalking(false), 1900)
    return () => window.clearTimeout(t)
  }, [replyPulse, earCtl, spawn])

  // ---------- Interaksi ----------
  const enterHover = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    if (!hovered) {
      setHovered(true)
      if (!sleepingRef.current) void earCtl.start({ rotate: [0, -16, 0], transition: { duration: 0.45 } })
    }
  }
  const leaveHover = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = null
      setHovered(false)
    }, 260)
  }

  const onPetMove = (e: ReactPointerEvent) => {
    if (e.buttons || dragging || sleepingRef.current) return
    const p = pet.current
    const dx = e.clientX - p.lastX
    if (Math.abs(dx) < 4) return
    const dir = Math.sign(dx)
    if (p.dir && dir !== p.dir) {
      if (Date.now() - p.t > 1100) p.changes = 0
      p.changes += 1
      p.t = Date.now()
      if (p.changes >= 5) {
        p.changes = 0
        flashMood('love', 1900)
        spawn('heart', 4)
        say(pick(PET_LINES), 2200)
        void earCtl.start({ rotate: [0, -20, 6, -20, 6, 0], transition: { duration: 0.9 } })
      }
    }
    p.dir = dir
    p.lastX = e.clientX
  }

  const onElephantClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    lastActivity.current = Date.now()
    if (sleepingRef.current) {
      setSleeping(false)
      flashMood('surprised', 900)
      say(pick(WAKE_LINES), 2400)
      void bounceCtl.start({ y: [0, -16, 0], transition: { duration: 0.45 } })
      return
    }
    if (chatOpen) {
      say(pick(TAP_WHILE_CHAT), 1800)
      flashMood('happy', 900)
      void trunkCtl.start({ rotate: [0, -24, 8, -24, 0], transition: { duration: 0.9 } })
      return
    }
    flashMood('happy', 1100)
    spawn('spark', 4)
    setBubble(null)
    void bounceCtl.start({
      y: [0, -16, 0],
      scaleY: [1, 1.08, 0.9, 1],
      scaleX: [1, 0.94, 1.08, 1],
      transition: { duration: 0.45 },
    })
    window.setTimeout(onOpenChat, 260)
  }

  const showMenu = hovered && landed && !chatOpen && !dragging && !sleeping
  const bubbleText = dragging ? bubble : showMenu ? null : chatOpen ? null : bubble

  return (
    <motion.div
      ref={outerRef}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={boundsRef}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true
        setDragging(true)
        setSleeping(false)
        flashMood('surprised', 100_000)
        say(pick(DRAG_LINES), 100_000)
      }}
      onDragEnd={() => {
        setDragging(false)
        setFlash(null)
        flashMood('happy', 900)
        setBubble(null)
        spawn('spark', 3, { x: 60, y: 98 })
        void bounceCtl.start({
          scaleX: [1, 1.14, 0.96, 1],
          scaleY: [1, 0.84, 1.05, 1],
          transition: { duration: 0.42 },
        })
        window.setTimeout(() => {
          draggedRef.current = false
        }, 80)
      }}
      initial={{ left, bottom }}
      animate={{ left, bottom }}
      transition={{
        left: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
        bottom: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{ width: BOX_W, height: BOX_H, zIndex: chatOpen ? 1010 : 710 }}
      className="pointer-events-none absolute select-none"
    >
      {/* dahan */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={branchCtl}
        style={{ originX: 0, top: 91 }}
        className="absolute left-0 drop-shadow-[0_3px_4px_rgba(19,36,26,0.22)]"
      >
        <PerchBranch />
      </motion.div>

      {/* gajah */}
      <motion.div initial={{ opacity: 0 }} animate={flightCtl} className="absolute inset-0">
        <motion.div animate={bounceCtl} style={{ originX: 0.45, originY: 0.78 }} className="absolute inset-0">
          <motion.button
            type="button"
            aria-label="Blam — klik untuk buka obrolan"
            title="Klik untuk obrolan, seret untuk pindah"
            onClick={onElephantClick}
            onPointerDown={(e) => {
              if (landed) dragControls.start(e)
            }}
            onPointerEnter={enterHover}
            onPointerLeave={leaveHover}
            onPointerMove={onPetMove}
            onFocus={enterHover}
            onBlur={leaveHover}
            whileHover={landed && !dragging ? { rotate: -3, x: 3 } : undefined}
            whileTap={{ scale: 0.94 }}
            className={`pointer-events-auto absolute top-0 left-0 rounded-[40%] outline-none focus-visible:ring-2 focus-visible:ring-leaf/60 ${
              dragging ? 'cursor-grabbing' : 'cursor-pointer'
            }`}
            style={{ touchAction: 'none', width: VB_W, height: VB_H - 6 }}
          >
            <BlamElephant
              mood={mood}
              dragging={dragging}
              lookX={lookX}
              lookY={lookY}
              headTilt={headTilt}
              earCtl={earCtl}
              trunkCtl={trunkCtl}
              leafCtl={leafCtl}
              svgRef={svgRef}
            />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* gelembung berpikir saat AI memproses */}
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="pointer-events-none absolute -top-9 left-[72px] flex items-end gap-1"
          >
            <span className="size-2 rounded-full bg-white shadow" />
            <span className="size-3 rounded-full bg-white shadow" />
            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 shadow-[0_6px_16px_-4px_rgba(19,36,26,0.3)]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.14 }}
                  className="size-1.5 rounded-full bg-leaf"
                />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* speech bubble / menu */}
      <AnimatePresence mode="wait">
        {(showMenu || bubbleText) && (
          <motion.div
            key={showMenu ? 'menu' : `say-${bubbleText}`}
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            style={{ originX: 0.1, originY: 1 }}
            onPointerEnter={enterHover}
            onPointerLeave={leaveHover}
            className="pointer-events-auto absolute bottom-[calc(100%-12px)] left-[54px] w-max max-w-[240px] rounded-[16px] rounded-bl-[6px] border border-line bg-white px-3.5 py-2.5 shadow-[0_14px_32px_-8px_rgba(15,29,50,0.2)]"
          >
            {showMenu ? (
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-semibold text-ink">Mulai obrolan</p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHovered(false)
                      onElephantClick()
                    }}
                    className="flex items-center gap-2 rounded-[10px] bg-leaf px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-forest"
                  >
                    <MessageCircle className="size-4" strokeWidth={1.75} /> Tanya Blam
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onResetMap()
                        flashMood('happy', 900)
                        say('Kembali ke Indonesia', 2200)
                        setHovered(false)
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-mint px-2.5 py-1.5 text-[12px] font-medium text-forest transition-colors hover:bg-mint/80"
                    >
                      <Compass className="size-4" strokeWidth={1.75} /> Reset peta
                    </button>
                    <button
                      type="button"
                      onClick={onDismiss}
                      className="btn-soft gap-1.5 !rounded-[10px] px-2.5 py-1.5 text-[12px] text-ink-soft hover:text-ink"
                    >
                      <MoonStar className="size-4" strokeWidth={1.75} /> Pulang
                    </button>
                  </div>
                </div>
                <p className="text-[12px] leading-tight font-normal text-ink-soft">Seret pindah, ketuk sapa</p>
              </div>
            ) : (
              <p className="text-[14px] leading-snug font-medium text-ink">{bubbleText}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* partikel */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, x: p.x, y: p.y, scale: 0.4, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: p.x + p.dx,
                y: p.y - (p.kind === 'z' ? 46 : 38),
                scale: p.kind === 'z' ? [0.6, 1.2] : [0.4, 1.1, 0.9],
                rotate: p.rot,
              }}
              transition={{ duration: p.kind === 'z' ? 2 : 1.1, ease: 'easeOut' }}
              onAnimationComplete={() => setParticles((prev) => prev.filter((q) => q.id !== p.id))}
              className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"
            >
              {p.kind === 'heart' && <HeartGlyph className="size-4" />}
              {p.kind === 'spark' && <SparkGlyph className="size-4" />}
              {p.kind === 'z' && <span className="text-[16px] font-semibold text-forest/70">z</span>}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/**
 * Avatar Gajah Blam mengintip dari pinggir layar di mobile saat Blam Chat ditutup.
 * - Bisa diseret naik-turun dan dipindah antara sisi kanan dan kiri layar (otomatis menempel ke tepi terdekat).
 * - Seret ke bagian bawah layar untuk menutup / menyembunyikan avatar.
 * - Tap untuk membuka kembali Blam Chat.
 */
export function MobilePeekElephant({
  onClick,
  onDismiss,
}: {
  onClick: () => void
  onDismiss?: () => void
}) {
  const uid = useId().replace(/:/g, '')
  const gHead = `${uid}-mh`
  const gEar = `${uid}-me`
  const gEarIn = `${uid}-mei`
  const gLeafL = `${uid}-mll`
  const gLeafR = `${uid}-mlr`

  const [side, setSide] = useState<'left' | 'right'>('right')
  const [yPos, setYPos] = useState(() =>
    typeof window !== 'undefined' ? clamp(Math.round(window.innerHeight * 0.48), 116, window.innerHeight - 190) : 380,
  )
  const [dragging, setDragging] = useState(false)
  const [dismissArmed, setDismissArmed] = useState(false)
  const draggedRef = useRef(false)

  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)

  const isRight = side === 'right'
  const peekFrames = isRight ? [16, 6, 12, 5, 16] : [-16, -6, -12, -5, -16]
  const tiltFrames = isRight ? [-4, 2, -2, 3, -4] : [4, -2, 2, -3, 4]

  return (
    <>
      <AnimatePresence>
        {dragging && onDismiss && (
          <motion.div
            key="mobile-peek-dismiss-zone"
            aria-label="Lepas di sini untuk menutup avatar"
            initial={{ opacity: 0, y: 24, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: dismissArmed ? 1.22 : 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className={`pointer-events-none fixed bottom-8 left-1/2 z-[515] grid size-12 -translate-x-1/2 place-items-center rounded-full border transition-colors duration-150 ${
              dismissArmed
                ? 'border-critical bg-critical text-white shadow-[0_8px_20px_rgba(15,29,50,0.2)]'
                : 'border-line bg-white text-ink-soft shadow-[0_8px_20px_rgba(15,29,50,0.14)]'
            }`}
          >
            <X className="size-5" strokeWidth={1.75} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.18}
        style={{
          top: yPos,
          x: dragX,
          y: dragY,
          left: isRight ? 'auto' : 0,
          right: isRight ? 0 : 'auto',
          touchAction: 'none',
        }}
        initial={{ x: isRight ? 84 : -84, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isRight ? 84 : -84, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onDragStart={() => {
          draggedRef.current = true
          setDragging(true)
          setDismissArmed(false)
        }}
        onDrag={(_, info) => {
          if (!onDismiss) return
          const vw = window.innerWidth || 390
          const vh = window.innerHeight || 844
          const distToX = Math.hypot(info.point.x - vw / 2, info.point.y - (vh - 56))
          const armed = distToX <= 80 || info.point.y >= vh - 115
          setDismissArmed((prev) => (prev === armed ? prev : armed))
        }}
        onDragEnd={(_, info) => {
          const vw = window.innerWidth || 390
          const vh = window.innerHeight || 844
          const distToX = Math.hypot(info.point.x - vw / 2, info.point.y - (vh - 56))
          const shouldDismiss = Boolean(onDismiss) && (distToX <= 80 || info.point.y >= vh - 115)

          setDragging(false)
          setDismissArmed(false)

          if (shouldDismiss) {
            onDismiss?.()
            window.setTimeout(() => {
              draggedRef.current = false
            }, 80)
            return
          }

          const nextSide: 'left' | 'right' = info.point.x < vw / 2 ? 'left' : 'right'
          const nextY = clamp(Math.round(yPos + info.offset.y), 116, Math.max(180, vh - 190))

          setSide(nextSide)
          setYPos(nextY)
          dragY.set(0)
          void animate(dragX, 0, { type: 'spring', stiffness: 360, damping: 28 })

          window.setTimeout(() => {
            draggedRef.current = false
          }, 80)
        }}
        className="pointer-events-auto fixed z-[520] -translate-y-1/2 select-none"
      >
      <motion.button
        type="button"
        onClick={() => {
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          onClick()
        }}
        aria-label="Buka Blam Chat"
        title="Ketuk untuk buka Blam Chat • seret ke kanan/kiri atau atas/bawah"
        animate={
          dragging
            ? { x: 0, rotate: 0, scale: dismissArmed ? 0.78 : 1.08, opacity: dismissArmed ? 0.85 : 1 }
            : { x: peekFrames, rotate: tiltFrames, scale: 1, opacity: 1 }
        }
        transition={
          dragging
            ? { duration: 0.15 }
            : {
                x: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
              }
        }
        whileTap={{ scale: 0.92 }}
        className={`relative grid size-[74px] place-items-center outline-none ${
          dragging ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* aura lembut di balik gajah */}
        <span
          aria-hidden="true"
          className={`absolute size-12 rounded-full bg-sky-400/28 blur-md ${isRight ? 'right-1' : 'left-1'}`}
        />

        {/* redesign gajah mengintip sambil berpegangan di tepi layar */}
        <svg
          viewBox="0 0 104 104"
          className={`size-full overflow-visible drop-shadow-[0_6px_16px_rgba(11,27,77,0.36)] ${
            isRight ? '-scale-x-100' : ''
          }`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={gHead} cx="38%" cy="28%" r="74%">
              <stop offset="0%" stopColor="#F0F9FF" />
              <stop offset="44%" stopColor="#7DD3FC" />
              <stop offset="80%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </radialGradient>
            <linearGradient id={gEar} x1="8" y1="22" x2="48" y2="78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id={gEarIn} x1="14" y1="30" x2="42" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FECDD3" />
              <stop offset="68%" stopColor="#FBCFE8" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>
            <linearGradient id={gLeafL} x1="76" y1="12" x2="94" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D9F99D" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id={gLeafR} x1="82" y1="12" x2="98" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>
          </defs>

          {/* jambul rambut lucu */}
          <path d="M40 21 C38.5 13, 45.5 9.5, 51.5 13.5 C48.5 15.8, 47.5 18.8, 48 21.5 Z" fill="#BAE6FD" />
          <path d="M46.5 19.5 C49.5 13.5, 55.5 12.5, 58.5 16.5 C55.5 18.2, 53.5 20.5, 52.5 22.8 Z" fill="#7DD3FC" />

          {/* belalai + tunas daun Blam */}
          <motion.g
            animate={{ rotate: [-4, 7, -4] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '62px', originY: '56px' }}
          >
            <path
              d="M64 56 C76 64, 87 60, 89 47 C90.5 39, 93 35, 97 35"
              stroke={`url(#${gHead})`}
              strokeWidth="9.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M69 53 C78 59, 85 56.5, 87 46.5"
              stroke="#FFFFFF"
              strokeOpacity=".45"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M96.5 35 C91 27.5, 92.5 18.5, 100 15.5 C102 22.5, 101.5 30, 96.5 35 Z" fill={`url(#${gLeafL})`} />
            <path d="M96.5 35 C101.5 30, 102 22.5, 100 15.5 C106.5 20.5, 105 30, 96.5 35 Z" fill={`url(#${gLeafR})`} />
            <path d="M97.5 32.5 L100 19.5" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.1" strokeLinecap="round" />
          </motion.g>

          {/* kepala bulat gemoy + rim light */}
          <path
            d="M21 50 C21 31, 34 20, 51 20 C68 20, 79 31, 79 49 C79 65, 67 75, 50 75 C32 75, 21 65, 21 50 Z"
            fill={`url(#${gHead})`}
          />
          <path d="M29 30 C37 23, 52 22, 62 26" stroke="#fff" strokeOpacity=".65" strokeWidth="2.2" strokeLinecap="round" fill="none" />

          {/* syal daun Blam mini */}
          <path d="M27 70 C39 76, 56 76, 68 70" stroke="#22C55E" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M62 72 C66 75, 69 79, 66.5 82 C63 81, 61 76, 62 72 Z" fill="#4ADE80" />

          {/* alis + mata glossy berkedip */}
          <path d="M52 33 C55.5 30.2, 61 30.2, 64 33" stroke="#0369A1" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <motion.g
            animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
            transition={{ duration: 4.4, times: [0, 0.88, 0.91, 0.94, 1], repeat: Infinity }}
            style={{ originX: '58.5px', originY: '44.5px' }}
          >
            <ellipse cx="58.5" cy="44.5" rx="5.5" ry="6.4" fill="#0B132B" />
            <ellipse cx="58.5" cy="45.8" rx="4.2" ry="4.4" fill="#1E3A8A" fillOpacity=".45" />
            <circle cx="56.6" cy="42.2" r="2.2" fill="#fff" />
            <circle cx="60.1" cy="46.6" r="1" fill="#fff" fillOpacity=".82" />
          </motion.g>
          <ellipse cx="66.5" cy="55" rx="5.2" ry="2.8" fill="#FDA4AF" fillOpacity=".8" />
          <path d="M57 60.5 C60 64.5, 64.8 64.5, 67.5 60.5" stroke="#0369A1" strokeWidth="2.1" strokeLinecap="round" fill="none" />

          {/* telinga besar */}
          <motion.g
            animate={{ rotate: [0, -10, 0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '36px', originY: '38px' }}
          >
            <path
              d="M35 35 C22 23, 2 28, -2 48 C-5 65, 6 80, 21 80 C33 80, 38 66, 38.5 53 C38.8 45, 38 39, 35 35 Z"
              fill={`url(#${gEar})`}
            />
            <path
              d="M30 41.5 C21 33.5, 8 37, 5 50 C2.5 61, 9.5 72, 19.5 72 C27.5 72, 32 62.5, 32.5 54 Z"
              fill={`url(#${gEarIn})`}
              fillOpacity=".68"
            />
          </motion.g>

          {/* dua tangan mungil berpegangan di tepi layar */}
          <ellipse cx="18" cy="79" rx="7" ry="6" fill="#0EA5E9" />
          <circle cx="21.8" cy="77.5" r="1.3" fill="#F0F9FF" />
          <circle cx="21.8" cy="80.8" r="1.3" fill="#F0F9FF" />
          <ellipse cx="42" cy="84" rx="7.2" ry="6.2" fill="#38BDF8" />
          <circle cx="45.8" cy="82.5" r="1.3" fill="#F0F9FF" />
          <circle cx="45.8" cy="85.8" r="1.3" fill="#F0F9FF" />
        </svg>
      </motion.button>
    </motion.div>
    </>
  )
}
