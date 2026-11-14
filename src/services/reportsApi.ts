import { SITES } from '../data/mockConservationData'
import type {
  ConservationSite,
  Ecosystem,
  Severity,
  SitePulse,
  SiteStatus,
} from '../types/conservation'
import { supabase } from './supabaseClient'

interface ActionRow {
  after_image_url: string
  volunteers_count: number
  waste_kg: number | string
  trees_planted: number
  estimated_co2_kg: number | string
  ai_recovery_score: number | null
  completed_at: string
}

interface ReportRow {
  id: string
  title: string
  ecosystem_type: Ecosystem
  lat: number
  lng: number
  location_name: string
  province: string
  before_image_url: string
  status: SiteStatus | 'rejected'
  ai_confidence: number
  ai_severity: 'low' | 'medium' | 'critical'
  ai_site_brief: string | null
  description: string
  community_impact_note: string | null
  participants_count: number
  updated_at: string
  conservation_actions: ActionRow[]
}

const EMPTY_PULSE: SitePulse = { aqi: 0, waveM: 0, hotspots: 0, species: 0 }

// Sementara (fase 1): pulse diambil dari seed mirror berdasar koordinat.
// Fase 2 diganti GET /api/env/pulse.
function seedPulse(lat: number, lng: number): SitePulse {
  const hit = SITES.find(
    (s) => Math.abs(s.lat - lat) < 0.01 && Math.abs(s.lng - lng) < 0.01,
  )
  return hit?.pulse ?? EMPTY_PULSE
}

function relativeTime(iso: string): { label: string; minutes: number } {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return { label: 'Baru saja', minutes }
  if (minutes < 60) return { label: `${minutes} menit lalu`, minutes }
  const hours = Math.round(minutes / 60)
  if (hours < 24) return { label: `${hours} jam lalu`, minutes }
  const days = Math.round(hours / 24)
  if (days === 1) return { label: 'Kemarin', minutes }
  if (days < 7) return { label: `${days} hari lalu`, minutes }
  return { label: `${Math.round(days / 7)} minggu lalu`, minutes }
}

function shortName(locationName: string): string {
  const first = locationName.split(',')[0].trim()
  return first.length > 22 ? `${first.slice(0, 21)}…` : first
}

function toSite(r: ReportRow): ConservationSite {
  const action = [...(r.conservation_actions ?? [])].sort(
    (a, b) => +new Date(b.completed_at) - +new Date(a.completed_at),
  )[0]
  const resolved = r.status === 'resolved' && action
  const time = relativeTime(r.updated_at)
  const severity: Severity = r.ai_severity === 'critical' ? 'critical' : 'medium'

  return {
    id: r.id,
    title: r.title,
    shortName: shortName(r.location_name),
    locationName: r.location_name,
    province: r.province,
    ecosystem: r.ecosystem_type,
    status: r.status as SiteStatus,
    severity,
    aiScore: r.ai_confidence,
    lat: r.lat,
    lng: r.lng,
    participants: r.participants_count,
    brief: r.ai_site_brief ?? r.description,
    communityNote: r.community_impact_note ?? '',
    beforeImage: r.before_image_url,
    afterImage: resolved ? action.after_image_url : undefined,
    pulse: seedPulse(r.lat, r.lng),
    impact: resolved
      ? {
          volunteers: action.volunteers_count,
          wasteKg: Number(action.waste_kg),
          trees: action.trees_planted,
          co2Kg: Number(action.estimated_co2_kg),
          recoveryScore: action.ai_recovery_score ?? 0,
        }
      : undefined,
    updatedAt: time.label,
    updatedMinutes: time.minutes,
  }
}

export async function fetchSites(): Promise<ConservationSite[]> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi (.env)')

  const { data, error } = await supabase
    .from('reports')
    .select(
      `id, title, ecosystem_type, lat, lng, location_name, province, before_image_url,
       status, ai_confidence, ai_severity, ai_site_brief, description,
       community_impact_note, participants_count, updated_at,
       conservation_actions ( after_image_url, volunteers_count, waste_kg, trees_planted,
                              estimated_co2_kg, ai_recovery_score, completed_at )`,
    )
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .returns<ReportRow[]>()

  if (error) throw error
  return (data ?? []).map(toSite)
}