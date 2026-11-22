import { CheckCircle2, Megaphone, Send } from 'lucide-react'
import { useState } from 'react'

export interface BroadcastHistoryItem {
  id: string
  target: string
  title: string
  detail: string
  time: string
}

const TARGET_LABEL: Record<'all' | 'citizen' | 'volunteer' | 'agency', string> = {
  all: 'Semua Pengguna',
  volunteer: 'Relawan & Komunitas',
  agency: 'Instansi',
  citizen: 'Warga',
}

export default function AdminBroadcastView({
  history,
  onBroadcast,
}: {
  history: BroadcastHistoryItem[]
  onBroadcast: (payload: {
    title: string
    detail: string
    target: 'all' | 'citizen' | 'volunteer' | 'agency'
  }) => Promise<void>
}) {
  const [target, setTarget] = useState<'all' | 'citizen' | 'volunteer' | 'agency'>('all')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !detail.trim()) return
    setSending(true)
    setSentOk(false)
    try {
      await onBroadcast({ title: title.trim(), detail: detail.trim(), target })
      setTitle('')
      setDetail('')
      setSentOk(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <section className="card-quiet flex flex-col gap-3 p-3.5">
        <div className="flex items-center gap-1.5">
          <Megaphone className="size-4 text-forest" strokeWidth={1.75} />
          <h3 className="text-[13px] font-semibold text-ink">Kirim Pengumuman Resmi</h3>
        </div>
        <p className="text-[12px] leading-relaxed text-ink-soft">
          Pesan langsung masuk ke lonceng notifikasi sesuai target peran yang dipilih.
        </p>

        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'volunteer', label: 'Relawan' },
                { id: 'agency', label: 'Instansi' },
                { id: 'citizen', label: 'Warga' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTarget(t.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  target === t.id
                    ? 'bg-ink text-white'
                    : 'bg-canvas text-ink-soft hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setSentOk(false)
            }}
            placeholder="Judul pengumuman…"
            maxLength={140}
            className="h-9 rounded-[10px] bg-white px-3 text-[13px] text-ink ring-1 ring-ink/10 placeholder:text-ink-soft/70 focus:ring-2 focus:ring-forest/40 focus:outline-none"
          />

          <textarea
            value={detail}
            onChange={(e) => {
              setDetail(e.target.value)
              setSentOk(false)
            }}
            placeholder="Tulis isi pengumuman atau peringatan lapangan…"
            rows={4}
            maxLength={500}
            className="rounded-[10px] bg-white p-3 text-[13px] text-ink ring-1 ring-ink/10 placeholder:text-ink-soft/70 focus:ring-2 focus:ring-forest/40 focus:outline-none"
          />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-ink-soft">Target: {TARGET_LABEL[target]}</span>
            <button
              type="submit"
              disabled={sending || !title.trim() || !detail.trim()}
              className="btn-primary h-9 !rounded-[9px] px-3.5 text-[12px] disabled:opacity-50"
            >
              <Send className="size-3.5" /> {sending ? 'Mengirim…' : 'Kirim Siaran'}
            </button>
          </div>

          {sentOk && (
            <p className="flex items-center gap-1.5 rounded-[9px] bg-leaf/12 px-3 py-2 text-[12px] font-medium text-forest">
              <CheckCircle2 className="size-4 shrink-0" /> Pengumuman berhasil dikirim ke notifikasi!
            </p>
          )}
        </form>
      </section>

      <section className="card-quiet flex flex-col gap-2 p-3.5">
        <h3 className="text-[12px] font-semibold text-ink-soft">Riwayat Siaran Sesi Ini</h3>
        {history.length === 0 ? (
          <p className="text-[12px] text-ink-soft">Belum ada siaran yang dikirim pada sesi ini.</p>
        ) : (
          <ul className="divide-y divide-ink/8">
            {history.map((item) => (
              <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                    {item.target}
                  </span>
                  <span className="num text-[10px] text-ink-soft">{item.time}</span>
                </div>
                <p className="mt-1 text-[13px] font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-[12px] text-ink-soft">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
