import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, Plus, UserCheck, UserMinus, Users } from 'lucide-react'
import { useState } from 'react'
import { DashedRow, Pill } from '../../components/ui/atoms'
import { createOrg, fetchOrgs, joinOrg, manageOrgMember } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { OrgType } from '../../types'
import { useAuth } from '../auth/AuthContext'

const field =
  'h-11 w-full rounded-full border-[1.5px] border-dashed border-leaf/30 bg-canvas px-4 text-sm font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft focus:border-leaf focus:bg-white focus:outline-none'

export default function OrgsPanel() {
  const queryClient = useQueryClient()
  const { profile, memberships, openAuthModal, refreshMe, isLeadOf } = useAuth()
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<OrgType>('community')
  const [region, setRegion] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: () => fetchOrgs(false),
    staleTime: CACHE_TTL_MS,
  })

  const orgs = orgsQuery.data ?? []
  const loading = orgsQuery.isPending && !orgsQuery.data
  const error =
    actionError ??
    (orgsQuery.isError && !orgsQuery.data
      ? orgsQuery.error instanceof Error
        ? orgsQuery.error.message
        : 'Gagal memuat organisasi'
      : null)

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[22px] font-bold tracking-tight text-ink">Organisasi</h2>
        <button
          type="button"
          onClick={() => (profile ? setShowCreate((v) => !v) : openAuthModal())}
          className="btn-primary h-10 px-4 text-xs"
        >
          <Plus className="size-4" />
          Buat
        </button>
      </div>

      {showCreate && (
        <div className="capsule-dashed flex flex-col gap-3 rounded-[20px] p-4">
          <input className={field} placeholder="Nama organisasi" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            {(['community', 'agency'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`font-display h-10 flex-1 rounded-full text-xs font-semibold transition-colors ${
                  type === t
                    ? 'bg-leaf text-white'
                    : 'border-[1.5px] border-dashed border-leaf/30 bg-white text-ink hover:bg-mint/30'
                }`}
              >
                {t === 'community' ? 'Komunitas' : 'Instansi'}
              </button>
            ))}
          </div>
          <input className={field} placeholder="Wilayah" value={region} onChange={(e) => setRegion(e.target.value)} />
          <button
            type="button"
            disabled={busyId === 'create'}
            onClick={() => void submitCreate()}
            className="btn-primary h-11 text-xs disabled:opacity-50"
          >
            Ajukan
          </button>
        </div>
      )}

      {notice && (
        <p className="rounded-card border border-line bg-white px-4 py-3 text-xs font-semibold text-ink">{notice}</p>
      )}
      {error && (
        <p role="alert" className="rounded-card border border-line bg-white px-4 py-3 text-xs font-semibold text-ink">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm font-semibold text-ink-soft">Memuat organisasi…</p>
      ) : orgs.length === 0 ? (
        <p className="py-8 text-center text-sm font-semibold text-ink-soft">Kosong</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => {
            const myMem = memberships.find((m) => m.organization_id === org.id)
            const lead = isLeadOf(org.id)
            const members = org.members ?? []
            return (
              <section key={org.id} className="capsule-dashed rounded-[20px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill>{org.type === 'agency' ? 'Instansi' : 'Komunitas'}</Pill>
                      <span className="text-xs font-semibold text-ink-soft">{org.region}</span>
                    </div>
                    <h3 className="mt-2 truncate text-base font-extrabold text-ink">{org.name}</h3>
                    <p className="mt-1 flex items-center gap-3 text-xs font-semibold text-ink-soft">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {org.active_members_count ?? 0} anggota
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3.5" /> {org.actions_count ?? 0} aksi
                      </span>
                    </p>
                  </div>

                  {myMem ? (
                    <span className="inline-flex h-9 items-center gap-1 rounded-full bg-canvas px-3 text-xs font-bold text-ink">
                      <Check className="size-3.5" />
                      {myMem.status === 'pending' ? 'Menunggu' : myMem.member_role === 'lead' ? 'Ketua' : 'Anggota'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === org.id}
                      onClick={() => void requestJoin(org.id)}
                      className="h-9 rounded-full border border-line bg-white px-4 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-50"
                    >
                      Gabung
                    </button>
                  )}
                </div>

                {lead && members.length > 0 && (
                  <div className="mt-4 border-t-[1.5px] border-dashed border-dash pt-3">
                    <p className="mb-1 text-xs font-extrabold text-ink-soft uppercase">Kontrol Anggota</p>
                    {members.map((m) => (
                      <DashedRow key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{m.user?.full_name ?? m.user_id}</p>
                          <p className="text-[11px] font-semibold text-ink-soft">
                            {m.member_role === 'lead' ? 'Ketua' : m.status === 'pending' ? 'Pending' : 'Aktif'}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {m.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === `${org.id}:${m.user_id}`}
                              onClick={() => void handleMember(org.id, m.user_id, 'approve')}
                              className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-bold text-white"
                            >
                              <UserCheck className="size-3.5" /> Terima
                            </button>
                          )}
                          {m.user_id !== profile?.id && (
                            <button
                              type="button"
                              disabled={busyId === `${org.id}:${m.user_id}`}
                              onClick={() => void handleMember(org.id, m.user_id, 'remove')}
                              className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-canvas px-3 text-xs font-bold text-ink-soft"
                            >
                              <UserMinus className="size-3.5" /> Keluarkan
                            </button>
                          )}
                        </div>
                      </DashedRow>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
