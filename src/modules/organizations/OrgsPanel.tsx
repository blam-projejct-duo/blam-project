import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, Plus, UserCheck, UserMinus, Users } from 'lucide-react'
import { useState } from 'react'
import { DashedOutline, DashedRow, Pill } from '../../components/ui/atoms'
import { createOrg, fetchOrgs, joinOrg, manageOrgMember } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { OrgType } from '../../types'
import { useAuth } from '../auth/AuthContext'

const field =
  'h-11 w-full rounded-full border border-leaf/15 bg-canvas px-4 text-sm font-medium text-ink placeholder:font-normal placeholder:text-ink-soft focus:border-leaf focus:bg-white focus:outline-none'

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
        <h2 className="text-[21px] font-semibold tracking-tight text-ink">Organisasi</h2>
        <button
          type="button"
          onClick={() => (profile ? setShowCreate((v) => !v) : openAuthModal())}
          className="btn-primary h-9 px-3.5 text-xs"
        >
          <Plus className="size-3.5" />
          Buat
        </button>
      </div>

      {showCreate && (
        <div className="relative flex flex-col gap-3 rounded-[20px] bg-[#f5f7ff] p-4">
          <DashedOutline rx={19} />
          <input className={field} placeholder="Nama organisasi" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            {(['community', 'agency'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`h-10 flex-1 rounded-full text-[12px] font-semibold transition-colors ${
                  type === t
                    ? 'bg-leaf text-white'
                    : 'border border-leaf/15 bg-white text-ink hover:bg-mint/30'
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
        <p className="relative rounded-[20px] bg-[#f5f7ff] px-4 py-3 text-xs font-light text-ink">
          <DashedOutline rx={19} />
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="relative rounded-[20px] bg-[#f5f7ff] px-4 py-3 text-xs font-light text-ink">
          <DashedOutline rx={19} />
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm font-light text-ink-soft">Memuat organisasi…</p>
      ) : orgs.length === 0 ? (
        <p className="py-8 text-center text-sm font-light text-ink-soft">Kosong</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => {
            const myMem = memberships.find((m) => m.organization_id === org.id)
            const lead = isLeadOf(org.id)
            const members = org.members ?? []
            return (
              <section key={org.id} className="relative rounded-[20px] bg-[#f5f7ff] p-4">
                <DashedOutline rx={19} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill>{org.type === 'agency' ? 'Instansi' : 'Komunitas'}</Pill>
                      <span className="text-xs font-light text-ink-soft">{org.region}</span>
                    </div>
                    <h3 className="font-sans mt-2 truncate text-[14.5px] font-normal text-ink">{org.name}</h3>
                    <p className="mt-1 flex items-center gap-3 text-[12px] font-light text-ink-soft">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {org.active_members_count ?? 0} anggota
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3.5" /> {org.actions_count ?? 0} aksi
                      </span>
                    </p>
                  </div>

                  {myMem ? (
                    <span className="inline-flex h-8.5 items-center gap-1 rounded-full bg-white px-3 text-[11.5px] font-normal text-ink">
                      <Check className="size-3.5" />
                      {myMem.status === 'pending' ? 'Menunggu' : myMem.member_role === 'lead' ? 'Ketua' : 'Anggota'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === org.id}
                      onClick={() => void requestJoin(org.id)}
                      className="h-8.5 rounded-full bg-white px-3.5 text-[11.5px] font-normal text-ink shadow-[0_1px_2px_rgba(18,29,79,0.04)] hover:bg-mint/45 disabled:opacity-50"
                    >
                      Gabung
                    </button>
                  )}
                </div>

                {lead && members.length > 0 && (
                  <div className="mt-4 border-t border-leaf/10 pt-3">
                    <p className="mb-1 text-[11px] font-light tracking-wider text-ink-soft uppercase">Anggota</p>
                    {members.map((m) => (
                      <DashedRow key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-normal text-ink">{m.user?.full_name ?? m.user_id}</p>
                          <p className="text-[11px] font-light text-ink-soft">
                            {m.member_role === 'lead' ? 'Ketua' : m.status === 'pending' ? 'Pending' : 'Aktif'}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {m.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === `${org.id}:${m.user_id}`}
                              onClick={() => void handleMember(org.id, m.user_id, 'approve')}
                              className="btn-primary h-8 px-3 text-xs"
                            >
                              <UserCheck className="size-3.5" /> Terima
                            </button>
                          )}
                          {m.user_id !== profile?.id && (
                            <button
                              type="button"
                              disabled={busyId === `${org.id}:${m.user_id}`}
                              onClick={() => void handleMember(org.id, m.user_id, 'remove')}
                              className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-normal text-ink-soft"
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
