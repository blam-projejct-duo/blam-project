import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EcoBadge } from '../ui/atoms'
import type { Report } from '../../types'

type ListTab = 'Disarankan' | 'Terbaru' | 'Dampak'

const TABS: ListTab[] = ['Disarankan', 'Terbaru', 'Dampak']
const RANK = { escalated: 0, open: 1, in_progress: 2, resolved: 3, rejected: 4 } as const

function ReportRow({
  report,
  tab,
  joined,
  onOpen,
  onJoin,
}: {
  report: Report
  tab: ListTab
  joined: boolean
  onOpen: () => void
  onJoin: () => void
}) {
  const action = report.report_actions?.[0]
  const count = report.action_participants?.length ?? 0
  const meta =
    tab === 'Dampak' && action
      ? `${Number(action.waste_kg)} kg sampah • ${action.trees_planted} bibit`
      : `${count} relawan • ${report.location_name}`

  return (
    <li className="dashed-row flex items-center gap-3 py-3.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <EcoBadge ecosystem={report.ecosystem} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-ink">{report.title}</span>
          <span className="block truncate text-[13px] text-ink-soft">{meta}</span>
        </span>
      </button>
      {report.status !== 'resolved' && (
        <button
          type="button"
          onClick={onJoin}
          aria-pressed={joined}
          className={`h-10 shrink-0 rounded-full px-4 text-[13px] ${joined ? 'btn-joined' : 'btn-primary'}`}
        >
          {joined ? 'Tergabung' : 'Gabung'}
        </button>
      )}
    </li>
  )
}

export default function ReportListPanel({
  reports,
  joinedIds,
  query,
  onQueryChange,
  showSearch = true,
  autoFocus = false,
  onOpen,
  onJoin,
}: {
  reports: Report[]
  joinedIds: Set<string>
  query: string
  onQueryChange: (q: string) => void
  showSearch?: boolean
  autoFocus?: boolean
  onOpen: (id: string) => void
  onJoin: (id: string) => void
}) {
  const [tab, setTab] = useState<ListTab>('Disarankan')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = reports.filter(
      (r) => !q || r.title.toLowerCase().includes(q) || r.location_name.toLowerCase().includes(q),
    )
    if (tab === 'Terbaru') {
      return [...base].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    }
    if (tab === 'Dampak') {
      return base.filter((r) => r.status === 'resolved' && (r.report_actions?.length ?? 0) > 0)
    }
    return [...base].sort((a, b) => RANK[a.status] - RANK[b.status] || b.ai_confidence - a.ai_confidence)
  }, [reports, tab, query])

  return (
    <div>
      {showSearch && (
        <label className="flex h-12 items-center gap-2.5 rounded-full bg-canvas px-4">
          <Search className="size-4.5 shrink-0 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus={autoFocus}
            placeholder="Cari lokasi"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
          />
          {query && (
            <button type="button" aria-label="Hapus" onClick={() => onQueryChange('')}>
              <X className="size-4 text-ink-soft" />
            </button>
          )}
        </label>
      )}

      <div role="tablist" className={`flex gap-1 ${showSearch ? 'mt-4' : ''}`}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 rounded-full px-4 text-[15px] font-bold transition-colors ${
              tab === t ? 'bg-canvas text-cobalt' : 'text-ink-soft'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="mt-2">
        {rows.map((r) => (
          <ReportRow
            key={r.id}
            report={r}
            tab={tab}
            joined={joinedIds.has(r.id)}
            onOpen={() => onOpen(r.id)}
            onJoin={() => onJoin(r.id)}
          />
        ))}
      </ul>
      {rows.length === 0 && <p className="py-10 text-center text-sm font-semibold text-ink-soft">Tidak ada titik</p>}
    </div>
  )
}
