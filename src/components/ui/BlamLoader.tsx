import { motion } from 'framer-motion'
import { useState } from 'react'
import { BlamNatureIcon } from './bumpIcons'

const FUN_MESSAGES = [
  'Memindai radar…',
  'Mengecek titik hijau…',
  'Menghubungkan relawan…',
  'Menjaga hutan & pesisir…',
] as const

export default function BlamLoader({
  label = 'Memuat…',
  fullHeight = false,
  className = '',
}: {
  label?: string
  fullHeight?: boolean
  className?: string
}) {
  const [tapCount, setTapCount] = useState(0)
  const displayLabel = tapCount === 0 ? label : FUN_MESSAGES[(tapCount - 1) % FUN_MESSAGES.length]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 text-center select-none ${
        fullHeight ? 'h-full min-h-[220px]' : 'py-10'
      } ${className}`}
    >
      <motion.button
        type="button"
        onClick={() => setTapCount((c) => c + 1)}
        aria-label={displayLabel}
        title="Klik Blam!"
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.9, rotate: 8 }}
        className="relative grid size-16 cursor-pointer place-items-center rounded-full focus:outline-none"
      >
        <motion.span
          aria-hidden="true"
          animate={{ scale: [0.85, 1.45], opacity: [0.45, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border-2 border-leaf/50 bg-mint/35"
        />
        <motion.span
          aria-hidden="true"
          animate={{ scale: [0.85, 1.45], opacity: [0.4, 0] }}
          transition={{ duration: 1.8, delay: 0.9, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-leaf/40"
        />
        <motion.span
          key={tapCount}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 grid size-12 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(37,99,235,0.14)]"
        >
          <BlamNatureIcon className="size-8" />
        </motion.span>
      </motion.button>

      <div className="flex flex-col items-center gap-1">
        <p className="text-[12px] font-medium text-ink-soft">{displayLabel}</p>
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 1.1, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
              className="size-1.5 rounded-full bg-leaf"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
