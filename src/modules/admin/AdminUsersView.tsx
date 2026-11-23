import { Award, Search, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import BlamLoader from '../../components/ui/BlamLoader'
import { ROLE_LABEL } from '../../lib/constants'
import type { Profile, UserRole } from '../../types'

type RoleFilter = 'all' | UserRole

const ROLE_BADGE_STYLE: Record<UserRole, string> = {
  citizen: 'bg-ink/8 text-ink-soft',
  volunteer: 'bg-leaf/12 text-forest',
  agency: 'bg-sky-500/12 text-sky-700',
  admin: 'bg-amber-500/15 text-amber-800',
}

export default function AdminUsersView({
  users,
  isLoading,
  expanded = false,
}: {
  users: Profile[]
  isLoading: boolean
  expanded?: boolean
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const q = search.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false
        if (!q) return true
        return u.full_name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
      }),
    [users, roleFilter, q],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className={expanded ? 'flex flex-wrap items-center justify-between gap-3' : 'flex flex-col gap-3'}>
        <div className={expanded ? 'relative min-w-0 flex-1' : 'relative'}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email…"
            className="h-9 w-full rounded-[10px] bg-white pr-8 pl-8 text-[13px] text-ink ring-1 ring-ink/10 placeholder:text-ink-soft/70 focus:ring-2 focus:ring-forest/40 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-soft hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div role="tablist" aria-label="Filter peran pengguna" className="panel-tabs min-w-0 flex-1">
          {(
            [
              { id: 'all', label: `Semua (${users.length})` },
              { id: 'citizen', label: 'Warga' },
              { id: 'volunteer', label: 'Relawan' },
              { id: 'agency', label: 'Instansi' },
              { id: 'admin', label: 'Admin' },
            ] as const
          ).map((chip) => {
            const active = roleFilter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRoleFilter(chip.id)}
                className={`panel-tab flex-1 whitespace-nowrap ${active ? 'is-active' : ''}`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="card-quiet p-2">
          <BlamLoader label="Memuat daftar pengguna…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-quiet p-5 text-center text-[13px] text-ink-soft">
          Tidak ada pengguna yang cocok dengan filter.
        </div>
      ) : (
        <div className={expanded ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2'}>
          {filtered.map((u) => {
            const initial = u.full_name?.slice(0, 1).toUpperCase() || 'B'
            return (
              <article key={u.id} className="card-quiet flex items-start gap-3 rounded-[12px] p-3">
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.full_name}
                    referrerPolicy="no-referrer"
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-[13px] font-semibold text-forest">
                    {initial}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink">{u.full_name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_STYLE[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-ink-soft">{u.email ?? 'Tanpa email'}</p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
                    <span className="num inline-flex items-center gap-1 font-medium text-ink">
                      <Award className="size-3 text-amber-500" /> {u.points} poin
                    </span>
                    {u.points >= 200 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-forest">
                        <Sparkles className="size-2.5" /> Aktif
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
