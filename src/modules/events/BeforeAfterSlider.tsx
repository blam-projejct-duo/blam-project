import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

interface Props {
  before: string
  after: string
}

export default function BeforeAfterSlider({ before, after }: Props) {
  const [pos, setPos] = useState(55)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const moveTo = (clientX: number) => {
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  const onDown = (e: PointerEvent) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    moveTo(e.clientX)
  }
  const onMove = (e: PointerEvent) => {
    if (dragging.current) moveTo(e.clientX)
  }
  const onUp = () => {
    dragging.current = false
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
  }

  return (
    <div
      ref={boxRef}
      className="relative aspect-[16/10] @md:aspect-[2/1] w-full touch-pan-y select-none overflow-hidden rounded-card bg-muted"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <img src={after} alt="Sesudah" draggable={false} className="absolute inset-0 size-full object-cover" />
      <img
        src={before}
        alt="Sebelum"
        draggable={false}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink">
        Sebelum
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink">
        Sesudah
      </span>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Bandingkan sebelum dan sesudah"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={onKey}
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white text-ink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </div>
    </div>
  )
}
