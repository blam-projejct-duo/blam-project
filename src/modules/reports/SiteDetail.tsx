import {
  AlertTriangle,
  Bird,
  Camera,
  Check,
  Flame,
  Link2,
  Lock,
  MapPin,
  QrCode,
  Satellite,
  ShieldCheck,
  Users,
  Waves,
  Wind,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { StatusPill } from '../../components/ui/atoms'
import { updateReportVisibility } from '../../lib/api'
import type { Report } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { usePulse } from '../map/usePulse'
import BeforeAfterSlider from './BeforeAfterSlider'
import QrActionModal from './QrActionModal'
import ResolveActionModal from './ResolveActionModal'

interface Props {
  report: Report
  joined: boolean
  onJoin: () => Promise<void>
  onRefresh: () => Promise<void>
}

function Tile({
  icon,
  value,
  unit,
  label,
}: {
  icon: ReactNode
  value: string
  unit?: string
  label: string
}) {
  return (
    <div className="rounded-tile bg-canvas p-3.5">
      <div className="flex items-center gap-1.5 text-ink-soft">{icon}</div>
      <p className="num mt-2 text-[22px] leading-none text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-ink-soft">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  )
}

export default function SiteDetail({ report, joined, onJoin, onRefresh }: Props) {
  const { profile, memberships, openAuthModal, isLeadOf } = useAuth()
  const [copied, setCopied] = useState(false)
  const [busyJoin, setBusyJoin] = useState(false)
  const [busyVis, setBusyVis] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const { pulse, status: pulseStatus } = usePulse(report.lat, report.lng)
  const latestAction = [...(report.report_actions ?? [])].sort(
    (a, b) => +new Date(b.completed_at) - +new Date(a.completed_at),
  )[0]
  const resolved = report.status === 'resolved' && Boolean(latestAction)
  const participantsCount = report.action_participants?.length ?? 0

  const leadMemberships = memberships.filter(
    (m) => m.status === 'active' && m.member_role === 'lead' && m.organization?.is_verified,
  )
  const canManageVisibility =
    leadMemberships.length > 0 &&
    (!report.assigned_org_id || isLeadOf(report.assigned_org_id))
  const canResolve =
    profile &&
    (profile.role === 'volunteer' || profile.role === 'agency' || profile.role === 'admin') &&
    report.status !== 'resolved'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?titik=${report.id}`)
    } catch {
      /* clipboard tidak tersedia */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const handleJoin = async () => {
    if (!profile) {
      openAuthModal()
      return
    }
    setBusyJoin(true)
    setActionError(null)
    try {
      await onJoin()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal bergabung')
    } finally {
      setBusyJoin(false)
    }
  }

  const toggleVisibility = async () => {
    const targetOrgId = report.assigned_org_id ?? leadMemberships[0]?.organization_id
    if (!targetOrgId) return
    setBusyVis(true)
    setActionError(null)
    try {
      const next = report.action_visibility === 'public' ? 'members_only' : 'public'
      await updateReportVisibility(report.id, targetOrgId, next)
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah keterbukaan aksi')
    } finally {
      setBusyVis(false)
    }
  }

  const fmt = (v: number | null | undefined, digits = 0) =>
    typeof v === 'number' && Number.isFinite(v) ? (digits > 0 ? v.toFixed(digits) : String(v)) : '—'

  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={report.status} />
            {report.source === 'nasa_firms' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                <Flame className="size-3 text-critical" /> NASA FIRMS
              </span>
            )}
            {report.source === 'nasa_eonet' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                <Satellite className="size-3 text-cobalt" /> NASA EONET
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink-soft">
              {report.action_visibility === 'members_only' ? (
                <>
                  <Lock className="size-3" /> Anggota Org
                </>
              ) : (
                <>
                  <Users className="size-3" /> Terbuka
                </>
              )}
            </span>
            {report.location_mismatch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3D6] px-2.5 py-1 text-[11px] font-bold text-[#B45309]">
                <AlertTriangle className="size-3" /> Jarak GPS &gt;5 km
              </span>
            )}
          </div>
          <h2 className="mt-3 text-[22px] leading-tight font-extrabold tracking-tight text-ink">
            {report.title}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-ink-soft">
            <MapPin className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="truncate">{report.location_name}</span>
          </p>
          {report.assigned_org && (
            <p className="mt-1 text-xs font-bold text-cobalt">
              Pengampu: {report.assigned_org.name}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canResolve && (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="QR Aksi"
              className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-canvas"
            >
              <QrCode className="size-4.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label="Salin tautan titik"
            className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-canvas"
          >
            {copied ? (
              <Check className="size-5 text-emerald" strokeWidth={2.5} />
            ) : (
              <Link2 className="size-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </header>

      {resolved && latestAction && report.before_image_url ? (
        <BeforeAfterSlider
          before={report.before_image_url}
          after={latestAction.after_image_url}
          score={latestAction.ai_recovery_score ?? report.ai_confidence}
        />
      ) : resolved && latestAction ? (
        <div className="relative aspect-[16/10] @md:aspect-[2/1] overflow-hidden rounded-card bg-muted">
          <img src={latestAction.after_image_url} alt="Kondisi sesudah" className="size-full object-cover" />
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink">
            Sesudah
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-emerald px-2.5 py-1 text-[11px] font-extrabold text-white">
            AI {latestAction.ai_recovery_score ?? report.ai_confidence}%
          </span>
        </div>
      ) : report.before_image_url ? (
        <div className="relative aspect-[16/10] @md:aspect-[2/1] overflow-hidden rounded-card bg-muted">
          <img src={report.before_image_url} alt="Kondisi lapangan" className="size-full object-cover" />
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink">
            Sebelum
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-cobalt px-2.5 py-1 text-[11px] font-extrabold text-white">
            AI {report.ai_confidence}%
          </span>
        </div>
      ) : (
        <div className="relative flex aspect-[16/10] @md:aspect-[2/1] flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-line bg-canvas px-4 text-center">
          <span className="grid size-11 place-items-center rounded-full border border-line bg-white text-cobalt">
            {report.source === 'nasa_firms' ? (
              <Flame className="size-5 text-critical" />
            ) : (
              <Satellite className="size-5 text-cobalt" />
            )}
          </span>
          <p className="text-sm font-extrabold text-ink">{report.threat_category}</p>
          <p className="text-xs font-semibold text-ink-soft">
            {report.lat.toFixed(3)}, {report.lng.toFixed(3)}
          </p>
          <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink">
            Pantauan Satelit
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-cobalt px-2.5 py-1 text-[11px] font-extrabold text-white">
            AI {report.ai_confidence}%
          </span>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2.5 @md:grid-cols-4 ${pulseStatus === 'loading' ? 'animate-pulse' : ''}`}>
        <Tile icon={<Wind className="size-4" />} value={fmt(pulse?.aqi)} label="Kualitas udara" />
        <Tile
          icon={<Waves className="size-4" />}
          value={fmt(pulse?.waveM, 1)}
          unit={typeof pulse?.waveM === 'number' ? 'm' : undefined}
          label="Gelombang"
        />
        <Tile icon={<Flame className="size-4" />} value={fmt(pulse?.hotspots)} label="Hotspot · 20 km" />
        <Tile icon={<Bird className="size-4" />} value={fmt(pulse?.species)} label="Spesies" />
      </div>

      <p className="text-sm leading-relaxed text-ink/80">{report.ai_site_brief ?? report.description}</p>

      {report.ai_recommendations && report.ai_recommendations.length > 0 && (
        <ul className="space-y-1 border-t-[1.5px] border-dashed border-dash pt-3 text-xs font-medium text-ink-soft">
          {report.ai_recommendations.map((rec) => (
            <li key={rec}>• {rec}</li>
          ))}
        </ul>
      )}

      {latestAction && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-dashed border-dash pt-4 text-[13px] font-semibold text-ink-soft">
          <p>
            <span className="text-ink">{Number(latestAction.waste_kg)} kg</span> sampah ·{' '}
            <span className="text-ink">{latestAction.trees_planted}</span> bibit
          </p>
          {latestAction.verified_by_agency && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2.5 py-1 text-xs font-bold text-[#047857]">
              <ShieldCheck className="size-3.5" /> Sah Instansi
            </span>
          )}
        </div>
      )}

      {actionError && (
        <p role="alert" className="rounded-[16px] bg-[#FEE9E7] px-4 py-3 text-xs font-semibold text-[#B91C1C]">
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {report.status !== 'resolved' && (
          <button
            type="button"
            disabled={busyJoin || joined}
            onClick={() => void handleJoin()}
            aria-pressed={joined}
            className={`h-13 w-full text-[15px] ${joined ? 'btn-joined' : 'btn-primary'} disabled:opacity-80`}
          >
            {joined && <Check className="size-5" strokeWidth={2.75} />}
            {joined ? 'Tergabung' : 'Gabung Aksi'} · {participantsCount}
          </button>
        )}

        {canResolve && (
          <button
            type="button"
            onClick={() => setResolveOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-canvas text-sm font-bold text-ink hover:bg-muted"
          >
            <Camera className="size-4 text-cobalt" />
            Unggah Foto After
          </button>
        )}

        {canManageVisibility && report.status !== 'resolved' && (
          <button
            type="button"
            disabled={busyVis}
            onClick={() => void toggleVisibility()}
            className="h-11 w-full rounded-full border border-line bg-white text-xs font-bold text-ink-soft hover:text-ink disabled:opacity-50"
          >
            {report.action_visibility === 'public'
              ? 'Ubah ke Khusus Anggota Org'
              : 'Buka Aksi untuk Publik'}
          </button>
        )}
      </div>

      {resolveOpen && (
        <ResolveActionModal
          report={report}
          onClose={() => setResolveOpen(false)}
          onResolved={onRefresh}
        />
      )}

      {qrOpen && <QrActionModal report={report} onClose={() => setQrOpen(false)} />}
    </div>
  )
}
