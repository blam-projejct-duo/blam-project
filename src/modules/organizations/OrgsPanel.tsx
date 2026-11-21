import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Building2, Check, Plus, SlidersHorizontal, UserCheck, UserMinus, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BlamNatureIcon } from '../../components/ui/bumpIcons'
import { createOrg, fetchOrgs, joinOrg, manageOrgMember } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { OrgType } from '../../types'
import { useAuth } from '../auth/AuthContext'

type OrgTab = 'Semua' | 'Diikuti'
type OrgTypeFilter = 'all' | OrgType

const ORG_TYPE_OPTIONS: { id: OrgTypeFilter; label: string }[] = [
  { id: 'all', label: 'Semua tipe' },
  { id: 'community', label: 'Komunitas' },
  { id: 'agency', label: 'Instansi' },
]

function orgInitials(name: string): string {
  const words = name
    .replaceAll(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'OR'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

const field =
  'h-10 w-full rounded-[10px] border border-line bg-canvas px-3 text-[13px] font-normal text-ink placeholder:text-ink-soft transition-colors focus:border-leaf focus:bg-white focus:outline-none'

export default function OrgsPanel({
  headerAction,
  query = '',
}: {
  headerAction?: ReactNode
  query?: string
} = {}) {
  const queryClient = useQueryClient()
  const { profile, memberships, openAuthModal, refreshMe, isLeadOf } = useAuth()
  const [tab, setTab] = useState<OrgTab>('Semua')
  const [typeFilter, setTypeFilter] = useState<OrgTypeFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<OrgType>('community')
  const [region, setRegion] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!filterOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [filterOpen])

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: () => fetchOrgs(false),
    staleTime: CACHE_TTL_MS,
  })

  const orgs = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data])
  const loading = orgsQuery.isPending && !orgsQuery.data
  const error =
    actionError ??
    (orgsQuery.isError && !orgsQuery.data
      ? orgsQuery.error instanceof Error
        ? orgsQuery.error.message
        : 'Gagal memuat organisasi'
      : null)

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const myOrgIds = new Set(memberships.map((m) => m.organization_id))
    return orgs.filter((org) => {
      if (tab === 'Diikuti' && !myOrgIds.has(org.id)) return false
      if (typeFilter !== 'all' && org.type !== typeFilter) return false
      if (q && !org.name.toLowerCase().includes(q) && !org.region.toLowerCase().includes(q)) return false
      return true
    })
  }, [orgs, memberships, tab, typeFilter, query])

  const refreshAll = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['orgs'] }), refreshMe()])
  }

  const submitCreate = async () => {
    if (!profile) return openAuthModal()
    if (name.trim().length < 3) return setActionError('Nama organisasi minimal 3 karakter')
    setBusyId('create')
    setActionError(null)
    setNotice(null)
    try {
      await createOrg({ name: name.trim(), type, region: region.trim() || 'Indonesia' })
      setName('')
      setRegion('')
      setShowCreate(false)
      setNotice('Organisasi diajukan. Menunggu verifikasi Admin.')
      await refreshAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengajukan organisasi')
    } finally {
      setBusyId(null)
    }
  }

  const requestJoin = async (orgId: string) => {
    if (!profile) return openAuthModal()
    setBusyId(orgId)
    setActionError(null)
    setNotice(null)
    try {
      await joinOrg(orgId)
      setNotice('Permintaan gabung terkirim ke Ketua organisasi.')
      await refreshAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal bergabung')
    } finally {
      setBusyId(null)
    }
  }

  const handleMember = async (orgId: string, userId: string, action: 'approve' | 'remove') => {
    setBusyId(`${orgId}:${userId}`)
    setActionError(null)
    try {
      await manageOrgMember(orgId, userId, action)
      await refreshAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengelola anggota')
    } finally {
      setBusyId(null)
    }
  }

  const activeFilterCount = typeFilter !== 'all' ? 1 : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[20px] font-semibold text-ink">Organisasi</h2>
          {!loading && orgs.length > 0 && (
            <span className="num text-[12px] font-normal text-ink-soft">{orgs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {headerAction}
          <button
            type="button"
            onClick={() => (profile ? setShowCreate((v) => !v) : openAuthModal())}
            className="btn-primary h-8 !rounded-[10px] px-2.5 text-[12px]"
          >
            <Plus className="size-4" strokeWidth={1.75} />
            Buat
          </button>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <div role="tablist" className="panel-tabs min-w-0 flex-1">
          {(['Semua', 'Diikuti'] as const).map((t) => {
            const active = tab === t
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={`panel-tab flex-1 whitespace-nowrap ${active ? 'is-active' : ''}`}
              >
                {t}
              </button>
            )
          })}
        </div>

        <div ref={filterRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-label="Filter tipe organisasi"
            title="Filter tipe organisasi"
            className={`relative grid size-9 place-items-center rounded-[11px] transition-colors ${
              activeFilterCount > 0 || filterOpen
                ? 'bg-leaf text-white shadow-xs'
                : 'bg-white/85 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:text-ink'
            }`}
          >
            <SlidersHorizontal className="size-4" strokeWidth={2} />
            {activeFilterCount > 0 && (
              <span className="num absolute -top-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-white bg-forest text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div
              role="menu"
              aria-label="Filter tipe organisasi"
              className="atlas-sheet absolute top-11 right-0 z-30 w-44 rounded-[16px] p-1.5"
            >
              {ORG_TYPE_OPTIONS.map((opt) => {
                const active = typeFilter === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setTypeFilter(opt.id)
                      setFilterOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                      active ? 'bg-mint font-medium text-forest' : 'text-ink hover:bg-canvas/80'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="size-3.5 shrink-0 text-forest" strokeWidth={2.2} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="atlas-group flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink">Ajukan Organisasi</h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[12px] font-medium text-ink-soft hover:text-ink"
            >
              Batal
            </button>
          </div>
          <input className={field} placeholder="Nama organisasi" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="panel-tabs">
            {(['community', 'agency'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`panel-tab flex-1 ${type === t ? 'is-active' : ''}`}
              >
                {t === 'community' ? 'Komunitas' : 'Instansi'}
              </button>
            ))}
          </div>
          <input className={field} placeholder="Wilayah (mis. Bengkulu)" value={region} onChange={(e) => setRegion(e.target.value)} />
          <button
            type="button"
            disabled={busyId === 'create'}
            onClick={() => void submitCreate()}
            className="btn-primary h-10 text-[13px] disabled:opacity-50"
          >
            {busyId === 'create' ? 'Mengajukan…' : 'Ajukan'}
          </button>
        </div>
      )}

      {notice && (
        <p className="atlas-group px-3.5 py-2.5 text-[12px] font-medium text-forest">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="atlas-group px-3.5 py-2.5 text-[12px] font-medium text-critical">
          {error}
        </p>
      )}

      {tab === 'Diikuti' && !profile ? (
        <div className="atlas-group flex flex-col items-center gap-2.5 p-6 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-canvas text-leaf">
            <Users className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink">Organisasi yang Kamu Ikuti</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Masuk untuk melihat keanggotaan dan mengelola organisasi kamu.
            </p>
          </div>
          <button type="button" onClick={openAuthModal} className="btn-primary mt-1 h-9 px-4 text-[12px]">
            Masuk
          </button>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-[13px] font-normal text-ink-soft">Memuat organisasi…</p>
      ) : filteredOrgs.length === 0 ? (
        <div className="atlas-group flex flex-col items-center gap-2 py-8 text-center">
          <BlamNatureIcon className="size-12 opacity-85" />
          <p className="text-[13px] font-normal text-ink-soft">
            {tab === 'Diikuti'
              ? 'Kamu belum bergabung dengan organisasi mana pun'
              : activeFilterCount > 0 || query.trim()
                ? 'Tidak ada organisasi cocok'
                : 'Belum ada organisasi'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredOrgs.map((org) => {
            const myMem = memberships.find((m) => m.organization_id === org.id)
            const lead = isLeadOf(org.id)
            const members = org.members ?? []
            const isAgency = org.type === 'agency'
            const membersCount = org.active_members_count ?? 0
            const actionsCount = org.actions_count ?? 0

            return (
              <li key={org.id} className="atlas-group p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-[12px] text-[13px] font-semibold tracking-tight ${
                      isAgency
                        ? 'border border-ink/8 bg-canvas text-ink'
                        : 'bg-mint text-forest'
                    }`}
                    aria-hidden="true"
                  >
                    {orgInitials(org.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="truncate text-[14px] font-semibold text-ink">{org.name}</h3>
                      {org.is_verified && <BadgeCheck className="size-3.5 shrink-0 text-leaf" />}
                    </div>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-normal text-ink-soft">
                      {isAgency ? (
                        <Building2 className="size-3 shrink-0" strokeWidth={1.8} />
                      ) : (
                        <Users className="size-3 shrink-0" strokeWidth={1.8} />
                      )}
                      <span className="truncate">
                        {isAgency ? 'Instansi' : 'Komunitas'} · {org.region}
                      </span>
                    </p>
                  </div>

                  {myMem ? (
                    <span
                      className={`shrink-0 pt-0.5 text-[12px] font-medium ${
                        myMem.status === 'pending' ? 'text-progress' : 'text-forest'
                      }`}
                    >
                      {myMem.status === 'pending' ? 'Menunggu' : myMem.member_role === 'lead' ? 'Ketua' : 'Anggota'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === org.id}
                      onClick={() => void requestJoin(org.id)}
                      className="btn-soft h-8 shrink-0 !rounded-[10px] px-3 text-[12px] disabled:opacity-50"
                    >
                      {busyId === org.id ? '…' : 'Gabung'}
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 divide-x divide-ink/8 rounded-[10px] border border-ink/6 bg-canvas/60 py-2 text-center">
                  <div>
                    <p className="num text-[15px] font-semibold text-ink">{membersCount}</p>
                    <p className="text-[11px] font-normal text-ink-soft">Anggota</p>
                  </div>
                  <div>
                    <p className="num text-[15px] font-semibold text-ink">{actionsCount}</p>
                    <p className="text-[11px] font-normal text-ink-soft">Gerakan</p>
                  </div>
                </div>

                {lead && members.length > 0 && (
                  <div className="mt-3 border-t border-ink/6 pt-2.5">
                    <p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-ink-soft uppercase">
                      Anggota ({members.length})
                    </p>
                    <ul className="divide-y divide-ink/6">
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {m.user?.full_name ?? m.user_id}
                            </p>
                            <p className="text-[11px] font-normal text-ink-soft">
                              {m.member_role === 'lead'
                                ? 'Ketua'
                                : m.status === 'pending'
                                  ? 'Menunggu persetujuan'
                                  : 'Aktif'}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            {m.status === 'pending' && (
                              <button
                                type="button"
                                disabled={busyId === `${org.id}:${m.user_id}`}
                                onClick={() => void handleMember(org.id, m.user_id, 'approve')}
                                className="btn-primary h-7 !rounded-[8px] px-2.5 text-[11px]"
                              >
                                <UserCheck className="size-3.5" strokeWidth={1.75} /> Terima
                              </button>
                            )}
                            {m.user_id !== profile?.id && (
                              <button
                                type="button"
                                disabled={busyId === `${org.id}:${m.user_id}`}
                                onClick={() => void handleMember(org.id, m.user_id, 'remove')}
                                className="btn-soft h-7 gap-1 !rounded-[8px] px-2.5 text-[11px] text-ink-soft"
                              >
                                <UserMinus className="size-3.5" strokeWidth={1.75} /> Keluarkan
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
