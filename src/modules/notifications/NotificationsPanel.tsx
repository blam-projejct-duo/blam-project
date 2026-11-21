import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DashedRow } from '../../components/ui/atoms'
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
          <div className="panel-tabs w-fit">
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
                  onClick={() => setFilter(item.id)}
                  className={`panel-tab ${active ? 'is-active' : ''}`}
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
            <div className={compact ? 'max-h-[320px] overflow-y-auto pr-1' : 'flex flex-col'}>
              {visibleItems.map((n) => (
                <DashedRow key={n.id} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) void readNotification(n.id)
                      if (n.event_id && onOpenEvent) {
                        onAfterAction?.()
                        onOpenEvent(n.event_id)
                      }
                    }}
                    className="flex w-full items-start gap-2.5 rounded-[10px] p-1.5 text-left transition-colors hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[14px] ${n.is_read ? 'font-normal text-ink-soft' : 'font-medium text-ink'}`}>
                        {n.title}
                      </span>
                      {n.detail && <span className="mt-0.5 block text-[12px] font-normal text-ink-soft">{n.detail}</span>}
                      {n.created_at && (
                        <span className="mt-1 block text-[12px] font-normal text-ink-soft">
                          {formatNotifTime(n.created_at)}
                        </span>
                      )}
                    </span>
                    {!n.is_read && (
                      <span className="shrink-0 text-[12px] font-medium text-leaf">
                        Baru
                      </span>
                    )}
                  </button>
                </DashedRow>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
