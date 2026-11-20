import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DashedOutline, DashedRow } from '../../components/ui/atoms'
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
        <div className="flex items-center gap-2">
          {!compact && (
            <span className="grid size-9 place-items-center rounded-full bg-mint/60 text-forest">
              <Inbox className="size-4.5" />
            </span>
          )}
          <div>
            <h2 className={`${compact ? 'font-display text-base font-semibold' : 'text-[20px] font-semibold tracking-tight'} text-ink`}>
              Notifikasi
            </h2>
            {!compact && (
              <p className="text-[11.5px] font-light text-ink-soft">Gerakan &amp; laporan terbaru</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadItems.length > 0 && (
            <span className="rounded-full bg-[#f4f5f7] px-2.5 py-0.5 text-[11px] font-normal text-ink">
              {unreadItems.length} baru
            </span>
          )}
          {profile && unreadItems.length > 0 && (
            <button
              type="button"
              disabled={busyAll}
              onClick={() => void markAllRead()}
              title="Tandai semua sudah dibaca"
              className="inline-flex items-center gap-1 rounded-full bg-mint/55 px-2.5 py-1 text-[11px] font-medium text-forest transition-colors hover:bg-mint disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Semua
            </button>
          )}
        </div>
      </div>

      {!profile ? (
        <div className="relative rounded-[14px] bg-[#f4f5f7] p-5 text-center">
          <DashedOutline rx={13} />
          <Bell className="mx-auto size-6 text-ink-soft" />
          <p className="mt-2 text-xs font-light text-ink-soft">
            Masuk untuk melihat notifikasi.
          </p>
          <button
            type="button"
            onClick={() => {
              onAfterAction?.()
              openAuthModal()
            }}
            className="btn-primary mt-3 h-9 px-4 text-xs"
          >
            Masuk
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
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
                  className={`h-7.5 rounded-full px-3 text-[11.5px] transition-colors ${
                    active ? 'bg-mint/80 font-medium text-forest' : 'bg-[#f4f5f7] font-light text-ink-soft hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {visibleItems.length === 0 ? (
            <div className="relative rounded-[14px] bg-[#f4f5f7] px-4 py-8 text-center">
              <DashedOutline rx={13} />
              <p className="text-xs font-light text-ink-soft">
                {filter === 'unread' ? 'Semua notifikasi sudah dibaca.' : 'Kotak masuk masih kosong.'}
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
                    className="flex w-full items-start gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-mint/25"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? 'bg-line' : 'bg-critical'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] ${n.is_read ? 'font-light text-ink-soft' : 'font-normal text-ink'}`}>
                        {n.title}
                      </span>
                      {n.detail && <span className="mt-0.5 block text-xs font-light text-ink-soft">{n.detail}</span>}
                      {n.created_at && (
                        <span className="mt-1 block text-[10.5px] font-light text-ink-soft/80">
                          {formatNotifTime(n.created_at)}
                        </span>
                      )}
                    </span>
                    {!n.is_read && !n.event_id && (
                      <span className="shrink-0 rounded-full bg-[#f4f5f7] px-2 py-0.5 text-[10px] font-normal text-ink-soft">
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
