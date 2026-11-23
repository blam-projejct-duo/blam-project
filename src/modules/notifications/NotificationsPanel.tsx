import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

type NotifFilter = 'all' | 'unread'

function formatNotifTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPanel({
  compact = false,
  onOpenEvent,
  onAfterAction,
}: {
  compact?: boolean
  onOpenEvent?: (eventId: string) => void
  onAfterAction?: () => void
}) {
  const { profile, notifications, openAuthModal, readNotification } = useAuth()
  const [filter, setFilter] = useState<NotifFilter>('all')
  const [busyAll, setBusyAll] = useState(false)

  const unreadItems = useMemo(() => notifications.filter((n) => !n.is_read), [notifications])
  const visibleItems = useMemo(
    () => (filter === 'unread' ? unreadItems : notifications),
    [filter, notifications, unreadItems],
  )

  const markAllRead = async () => {
    if (unreadItems.length === 0 || busyAll) return
    setBusyAll(true)
    try {
      await Promise.all(unreadItems.map((n) => readNotification(n.id)))
    } finally {
      setBusyAll(false)
    }
  }

  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {!compact && (
            <span className="row-icon text-leaf">
              <Inbox className="size-4" strokeWidth={1.75} />
            </span>
          )}
          <div>
            <h2 className={`${compact ? 'font-sans text-[16px] font-semibold' : 'text-[20px] font-semibold'} text-ink`}>
              Notifikasi
            </h2>
            {!compact && (
              <p className="text-[12px] font-normal text-ink-soft">Gerakan &amp; laporan terbaru</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadItems.length > 0 && (
            <span className="num rounded-[8px] border border-line bg-canvas px-2 py-0.5 text-[12px] font-medium text-ink">
              {unreadItems.length} baru
            </span>
          )}
          {profile && unreadItems.length > 0 && (
            <button
              type="button"
              disabled={busyAll}
              onClick={() => void markAllRead()}
              title="Tandai semua sudah dibaca"
              className="btn-soft h-8 gap-1 !rounded-[8px] px-2.5 text-[12px] text-leaf disabled:opacity-50"
            >
              <CheckCheck className="size-4" strokeWidth={1.75} />
              Semua
            </button>
          )}
        </div>
      </div>

      {!profile ? (
        <div className="card-quiet p-5 text-center">
          <Bell className="mx-auto size-6 text-ink-soft" strokeWidth={1.75} />
          <p className="mt-2 text-[12px] font-normal text-ink-soft">
            Masuk untuk melihat notifikasi
          </p>
          <button
            type="button"
            onClick={() => {
              onAfterAction?.()
              openAuthModal()
            }}
            className="btn-primary mt-3 h-9 px-4 text-[12px]"
          >
            Masuk
          </button>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Filter notifikasi" className="panel-tabs w-full">
            {(
              [
                { id: 'all', label: `Semua (${notifications.length})` },
                { id: 'unread', label: `Belum dibaca (${unreadItems.length})` },
              ] as const
            ).map((item) => {
              const active = filter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`panel-tab flex-1 whitespace-nowrap ${active ? 'is-active' : ''}`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {visibleItems.length === 0 ? (
            <div className="card-quiet px-4 py-8 text-center">
              <p className="text-[12px] font-normal text-ink-soft">
                {filter === 'unread' ? 'Semua notifikasi dibaca' : 'Belum ada notifikasi'}
              </p>
            </div>
          ) : (
            <div
              className={`flex flex-col gap-2 ${
                compact ? 'max-h-[320px] overflow-y-auto pr-1' : ''
              }`}
            >
              {visibleItems.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.is_read) void readNotification(n.id)
                    if (n.event_id && onOpenEvent) {
                      onAfterAction?.()
                      onOpenEvent(n.event_id)
                    }
                  }}
                  className={`flex w-full items-start gap-2.5 rounded-[14px] border p-3 text-left transition-all ${
                    n.is_read
                      ? 'border-line bg-canvas/70 hover:bg-white'
                      : 'border-leaf/25 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)] hover:border-leaf/45'
                  }`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      n.is_read ? 'bg-ink/15' : 'bg-leaf'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={`block text-[13.5px] leading-snug ${
                          n.is_read ? 'font-normal text-ink-soft' : 'font-semibold text-ink'
                        }`}
                      >
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[10.5px] font-semibold text-forest">
                          Baru
                        </span>
                      )}
                    </span>
                    {n.detail && (
                      <span className="mt-1 block text-[12px] leading-relaxed font-normal text-ink-soft">
                        {n.detail}
                      </span>
                    )}
                    {n.created_at && (
                      <span className="mt-1.5 block text-[11px] font-normal text-ink-soft/80">
                        {formatNotifTime(n.created_at)}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
