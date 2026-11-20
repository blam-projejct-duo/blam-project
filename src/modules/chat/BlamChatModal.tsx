import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CornerDownRight, MapPin, RotateCcw, Send, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { DashedOutline } from '../../components/ui/atoms'
import { BlamAiAvatarIcon, SnapCameraDuotoneIcon } from '../../components/ui/bumpIcons'
import { sendBlamChat } from '../../lib/api'
import type { BlamChatAction, BlamChatContext, BlamChatTurn } from '../../lib/api'

const STARTERS = [
  'Gerakan apa yang lagi jalan?',
  'Cara lapor lewat Blam Snap',
] as const

const LOADING_PHASES = [
  'Sebentar ya…',
  'Mengecek data…',
] as const

function BlamThinkingBubble() {
  const [phaseIdx, setPhaseIdx] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhaseIdx((i) => (i + 1) % LOADING_PHASES.length)
    }, 1800)
    return () => window.clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2.5"
    >
      <div className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 1.42, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-leaf/30"
        />
        <motion.span
          animate={{ y: [0, -2, 0], rotate: [-6, 6, -6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative grid size-7 place-items-center rounded-full border border-line bg-white"
        >
          <BlamAiAvatarIcon withBadge={false} className="size-5.5" />
        </motion.span>
      </div>

      <div className="relative flex items-center gap-2.5 overflow-hidden rounded-[14px] rounded-tl-md bg-[#f4f5f7] px-3.5 py-2.5">
        <DashedOutline rx={13} />

        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((idx) => (
            <motion.span
              key={idx}
              animate={{ y: [0, -3.5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.85,
                repeat: Infinity,
                delay: idx * 0.15,
                ease: 'easeInOut',
              }}
              className="size-1.5 rounded-full bg-ink-soft/60"
            />
          ))}
        </div>

        <div className="min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={phaseIdx}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="truncate text-[11.5px] font-medium text-ink-soft"
            >
              {LOADING_PHASES[phaseIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

const GREETING: BlamChatTurn = {
  role: 'assistant',
  text: 'Mau cek gerakan sekitar atau tanya kondisi lapangan?',
}

const CHAT_STORAGE_KEY = 'blam:chat:history:v1'
const MAX_STORED_TURNS = 30

function loadStoredMessages(): BlamChatTurn[] {
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return [GREETING]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [GREETING]
    const valid = parsed.filter(
      (m): m is BlamChatTurn =>
        Boolean(m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string'),
    )
    if (valid.length === 0) return [GREETING]
    const tail = valid.slice(-MAX_STORED_TURNS)
    return tail[0]?.role === 'assistant' && tail[0]?.text === GREETING.text ? tail : [GREETING, ...tail]
  } catch {
    return [GREETING]
  }
}

function saveStoredMessages(messages: BlamChatTurn[]) {
  try {
    if (messages.length <= 1) {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY)
      return
    }
    const toStore = [GREETING, ...messages.slice(1).slice(-(MAX_STORED_TURNS - 1))]
    window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
}

function FormattedText({ text }: { text: string }) {
  const renderInline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-medium text-ink">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-ink/90">
            {part.slice(1, -1)}
          </em>
        )
      }
      return <Fragment key={idx}>{part}</Fragment>
    })

  const lines = text.split('\n')
  return (
    <div className="flex flex-col gap-1 text-[12px] leading-[1.5] text-ink/85">
      {lines.map((raw, i) => {
        const trimmed = raw.trim()
        if (!trimmed) return <span key={i} className="h-0.5" />
        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <div key={i} className="flex items-start gap-2 pl-0.5">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-leaf/65" />
              <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
            </div>
          )
        }
        return <p key={i}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

export interface BlamPointPromptSuggestion {
  key: number
  title: string
  prompts: string[]
  context?: BlamChatContext
}

export default function BlamChatModal({
  context,
  onClose,
  onAction,
  placement = 'center',
  companionLeft = 220,
  onBusyChange,
  onReply,
  pointSuggestion,
}: {
  context: BlamChatContext
  onClose: () => void
  onAction?: (action: BlamChatAction) => void
  /** 'companion' = panel muncul di samping Gajah Blam (desktop), bukan di tengah layar. */
  placement?: 'center' | 'companion'
  companionLeft?: number
  onBusyChange?: (busy: boolean) => void
  onReply?: () => void
  pointSuggestion?: BlamPointPromptSuggestion | null
}) {
  const [messages, setMessages] = useState<BlamChatTurn[]>(() => loadStoredMessages())
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissedSuggestionKey, setDismissedSuggestionKey] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef(messages)
  const isCompanion = placement === 'companion'

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  useEffect(() => {
    if (!isCompanion) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isCompanion, onClose])

  useEffect(() => {
    saveStoredMessages(messages)
  }, [messages])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  const resetChat = () => {
    abortRef.current?.abort()
    setBusy(false)
    setError(null)
    setInput('')
    setMessages([GREETING])
  }

  const submit = async (
    rawText: string,
    opts?: { contextOverride?: BlamChatContext },
  ) => {
    const clean = rawText.trim()
    if (!clean || busy) return
    setError(null)
    setInput('')

    const baseMessages = messagesRef.current
    const nextHistory: BlamChatTurn[] = [...baseMessages, { role: 'user', text: clean }]
    messagesRef.current = nextHistory
    setMessages(nextHistory)
    setBusy(true)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const apiTurns = nextHistory.slice(1)
      const res = await sendBlamChat(apiTurns, opts?.contextOverride ?? context, ctrl.signal)
      if (ctrl.signal.aborted) return
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply, actions: res.actions }])
      onReply?.()
    } catch (err) {
      if (ctrl.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Gagal menghubungi Blam Chat')
    } finally {
      if (!ctrl.signal.aborted) setBusy(false)
    }
  }

  const activeSuggestion =
    pointSuggestion && pointSuggestion.key !== dismissedSuggestionKey && !busy
      ? pointSuggestion
      : null

  return (
    <motion.div
      role="dialog"
      aria-modal={!isCompanion}
      aria-label="Blam Chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className={
        isCompanion
          ? 'pointer-events-none fixed inset-0 z-[1000]'
          : 'fixed inset-0 z-[1000] flex items-end justify-center bg-ink/35 p-0 backdrop-blur-[2px] md:items-center md:p-6'
      }
    >
      <motion.div
        initial={
          isCompanion
            ? { left: companionLeft, x: -24, opacity: 0, scale: 0.94 }
            : { y: 48, opacity: 0, scale: 0.98 }
        }
        animate={
          isCompanion
            ? { left: companionLeft, x: 0, opacity: 1, scale: 1 }
            : { y: 0, opacity: 1, scale: 1 }
        }
        exit={
          isCompanion
            ? { left: companionLeft, x: -20, opacity: 0, scale: 0.94 }
            : { y: 36, opacity: 0, scale: 0.98 }
        }
        transition={
          isCompanion
            ? {
                left: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                default: { type: 'spring', stiffness: 320, damping: 28 },
              }
            : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
        }
        style={isCompanion ? { transformOrigin: 'left center' } : undefined}
        className={
          isCompanion
            ? 'pointer-events-auto absolute top-[70px] bottom-4 flex w-[392px] flex-col overflow-hidden rounded-[20px] border border-white/80 bg-white/97 shadow-[0_18px_46px_-8px_rgba(19,36,26,0.28)] backdrop-blur-md'
            : 'flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-line bg-white md:h-[640px] md:max-w-[460px] md:rounded-[20px]'
        }
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white">
              <BlamAiAvatarIcon withBadge={false} className="size-7" />
            </span>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">Blam Chat</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={resetChat}
                aria-label="Chat baru"
                title="Chat baru"
                className="grid size-9 place-items-center rounded-xl bg-[#f4f5f7] text-ink transition-colors hover:bg-[#eaecf0]"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid size-9 place-items-center rounded-xl bg-[#f4f5f7] text-ink transition-colors hover:bg-[#eaecf0]"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          <div className="flex flex-col gap-3">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex justify-end"
                >
                  <div className="max-w-[82%] rounded-[14px] rounded-br-md bg-[#2563eb] px-3.5 py-2 text-[12px] leading-[1.45] font-normal text-white shadow-[0_2px_8px_rgba(37,99,235,0.16)]">
                    {m.text}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={i}
                  initial={i === 0 ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-line bg-white">
                      <BlamAiAvatarIcon withBadge={false} className="size-5.5" />
                    </span>
                    <div className="relative max-w-[85%] rounded-[14px] rounded-tl-md bg-[#f4f5f7] px-4 py-3 text-ink">
                      <DashedOutline rx={13} />
                      <FormattedText text={m.text} />
                    </div>
                  </div>
                  {m.actions && m.actions.length > 0 && onAction && (
                    <div className="flex flex-col gap-1.5 pl-9">
                      {m.actions.map((act, idx) => (
                        <button
                          key={`${act.type}-${idx}`}
                          type="button"
                          onClick={() => onAction(act)}
                          className="group flex items-center justify-between gap-3 rounded-[14px] bg-[#f4f5f7] px-3.5 py-2.5 text-left transition-colors hover:bg-[#eaecf0]"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="blam-gradient grid size-9 shrink-0 place-items-center rounded-[10px] text-white">
                              {act.type === 'focus_map_point' ? (
                                <MapPin className="size-4.5" />
                              ) : (
                                <SnapCameraDuotoneIcon light className="size-4.5" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] font-normal text-ink">
                                {act.label}
                              </span>
                              <span className="block truncate text-[11px] font-light text-ink-soft">
                                {act.type === 'focus_map_point' ? act.target.title : act.prefill.description}
                              </span>
                            </span>
                          </span>
                          <ArrowUpRight className="size-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ),
            )}

            <AnimatePresence>{busy && <BlamThinkingBubble key="blam-thinking" />}</AnimatePresence>

            {error && (
              <p
                role="alert"
                className="rounded-[16px] border border-critical/25 bg-critical/8 px-3.5 py-2 text-[11.5px] font-semibold text-critical"
              >
                {error}
              </p>
            )}

            {messages.length === 1 && !busy && !activeSuggestion && (
              <div className="mt-0.5 flex flex-wrap gap-1.5 pl-9">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void submit(q)}
                    className="rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-left text-[11.5px] leading-[1.4] font-light text-ink transition-colors hover:bg-[#eaecf0]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {activeSuggestion && (
            <motion.div
              key={activeSuggestion.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex shrink-0 flex-wrap justify-end gap-1.5 border-t border-line/60 bg-white/95 px-4 py-2"
            >
              {activeSuggestion.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setDismissedSuggestionKey(activeSuggestion.key)
                    void submit(prompt, { contextOverride: activeSuggestion.context })
                  }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-[#f4f5f7] px-3 py-1.5 text-left text-[11.5px] font-medium text-ink transition-colors hover:bg-[#eaecf0]"
                >
                  <CornerDownRight className="size-3.5 shrink-0 text-[#2563eb]" />
                  <span className="truncate">{prompt}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit(input)
          }}
          className="flex shrink-0 items-center gap-2 border-t border-line bg-white px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya kondisi sekitar atau Blam…"
            maxLength={1000}
            className="h-10 min-w-0 flex-1 rounded-xl bg-[#f4f5f7] px-3.5 text-[12px] font-normal text-ink outline-none placeholder:font-light placeholder:text-ink-soft focus:bg-[#eaecf0]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Kirim pesan"
            className="btn-primary grid size-10 shrink-0 place-items-center rounded-xl disabled:opacity-45"
          >
            <Send className="size-4" />
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
