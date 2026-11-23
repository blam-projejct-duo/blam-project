import { Ban, Building2, ChevronDown, Crosshair, MapPin, Search, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import BlamLoader from '../../components/ui/BlamLoader'
import { StatusPill } from '../../components/ui/atoms'
import type { ConservationEvent, Organization } from '../../types'

type OrgTypeFilter = 'all' | 'community' | 'agency'

export default function AdminOrgsMonitorView({
  orgs,
  events,
  isLoading,
  busyId,
  expanded = false,
  onRevokeOrg,
  onFocusLocation,
}: {
  orgs: Organization[]
  events: ConservationEvent[]
  isLoading: boolean
  busyId: string | null
  expanded?: boolean
  onRevokeOrg: (orgId: string, orgName: string) => Promise<void>
  onFocusLocation?: (lat: number, lng: number) => void
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<OrgTypeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)

  const verifiedOrgs = useMemo(() => orgs.filter((o) => o.is_verified), [orgs])
  const q = search.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      verifiedOrgs.filter((o) => {
        if (typeFilter !== 'all' && o.type !== typeFilter) return false
        if (!q) return true
        return o.name.toLowerCase().includes(q) || o.region.toLowerCase().includes(q)
      }),
    [verifiedOrgs, typeFilter, q],
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
            placeholder="Cari organisasi atau instansi…"
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

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: `Semua (${verifiedOrgs.length})` },
              { id: 'community', label: 'Komunitas' },
              { id: 'agency', label: 'Instansi' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTypeFilter(chip.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                typeFilter === chip.id
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:text-ink'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card-quiet p-2">
          <BlamLoader label="Memuat daftar organisasi…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-quiet p-5 text-center text-[13px] text-ink-soft">
          Belum ada organisasi terverifikasi yang cocok.
        </div>
      ) : (
        <div className={expanded ? 'grid grid-cols-2 items-start gap-3' : 'flex flex-col gap-2'}>
          {filtered.map((o) => {
            const open = expandedId === o.id
            const isBusy = busyId === o.id
            const isConfirming = confirmRevokeId === o.id
            const orgEvents = events.filter((ev) => ev.organization_id === o.id)
            const activeEvCount = orgEvents.filter(
              (ev) => ev.status !== 'resolved' && ev.status !== 'cancelled',
            ).length

            return (
              <article
                key={o.id}
                className={`card-quiet overflow-hidden rounded-[12px] transition ${
                  open ? 'bg-white ring-2 ring-forest/30' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRevokeId(null)
                    setExpandedId((prev) => (prev === o.id ? null : o.id))
                  }}
                  className="flex w-full items-start justify-between gap-2 p-3.5 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          o.type === 'agency' ? 'bg-sky-500/12 text-sky-700' : 'bg-leaf/12 text-forest'
                        }`}
                      >
                        {o.type === 'agency' ? 'Instansi' : 'Komunitas'}
                      </span>
                      <span className="truncate text-[11px] text-ink-soft">{o.region}</span>
                    </div>
                    <p className="mt-1 truncate text-[14px] font-medium text-ink">{o.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-soft">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" /> {o.active_members_count ?? 0} anggota
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3" /> {orgEvents.length} event ({activeEvCount} aktif)
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`mt-1 size-4 shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {open && (
                  <div className="flex flex-col gap-2.5 border-t border-ink/8 px-3.5 pt-3 pb-3.5">
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-[8px] bg-canvas px-2 py-1.5">
                        <p className="num text-[14px] font-semibold text-ink">{o.active_members_count ?? 0}</p>
                        <p className="text-[10px] text-ink-soft">Aktif</p>
                      </div>
                      <div className="rounded-[8px] bg-canvas px-2 py-1.5">
                        <p className="num text-[14px] font-semibold text-ink">{o.pending_members_count ?? 0}</p>
                        <p className="text-[10px] text-ink-soft">Menunggu</p>
                      </div>
                      <div className="rounded-[8px] bg-canvas px-2 py-1.5">
                        <p className="num text-[14px] font-semibold text-ink">{o.actions_count ?? 0}</p>
                        <p className="text-[10px] text-ink-soft">Aksi</p>
                      </div>
                    </div>

                    {orgEvents.length === 0 ? (
                      <p className="text-[12px] text-ink-soft">Organisasi ini belum membuat event di radar.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-medium text-ink-soft">Event Terbaru ({orgEvents.length})</p>
                        {orgEvents.slice(0, 4).map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between gap-2 rounded-[9px] bg-canvas px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <StatusPill status={ev.status} />
                              <p className="mt-0.5 truncate text-[12px] font-medium text-ink">{ev.title}</p>
                              <p className="flex items-center gap-1 truncate text-[10px] text-ink-soft">
                                <MapPin className="size-2.5 shrink-0" /> {ev.location_name}
                              </p>
                            </div>
                            {onFocusLocation && (
                              <button
                                type="button"
                                onClick={() => onFocusLocation(ev.lat, ev.lng)}
                                aria-label={`Fokus peta ke ${ev.title}`}
                                className="shrink-0 rounded-full bg-white p-1.5 text-forest ring-1 ring-ink/8 hover:bg-forest/10"
                              >
                                <Crosshair className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-ink/8 pt-2">
                      {!isConfirming ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmRevokeId(o.id)}
                          className="btn-soft h-8 w-full !rounded-[8px] px-2.5 text-[12px] text-critical"
                        >
                          <Ban className="size-3.5" strokeWidth={1.75} /> Bekukan Verifikasi
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirmRevokeId(null)
                              void onRevokeOrg(o.id, o.name)
                            }}
                            className="h-8 flex-1 rounded-[8px] bg-critical px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
                          >
                            {isBusy ? 'Membekukan…' : 'Konfirmasi Bekukan'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmRevokeId(null)}
                            className="btn-soft h-8 !rounded-[8px] px-3 text-[12px] text-ink-soft"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
