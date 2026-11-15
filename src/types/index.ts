export type UserRole = 'citizen' | 'volunteer' | 'agency' | 'admin'
export type Ecosystem = 'coastal_mangrove' | 'tropical_forest' | 'watershed'
export type ReportStatus = 'rejected' | 'pending_verification' | 'escalated' | 'verified'
export type EventStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled'
export type Severity = 'low' | 'medium' | 'critical'
export type EventVisibility = 'public' | 'members_only'
export type OrgType = 'community' | 'agency'
export type MemberRole = 'lead' | 'member'
export type MemberStatus = 'pending' | 'active'
export type MapStyle = 'terang' | 'gelap' | 'satelit'
export type RefSource = 'nasa_firms' | 'nasa_eonet'

export interface Profile {
  id: string
  email: string | null
  full_name: string
  avatar_url: string | null
  role: UserRole
  points: number
  created_at?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  type: OrgType
  region: string
  is_verified: boolean
  created_by: string | null
  created_at?: string
  creator?: Pick<Profile, 'id' | 'full_name' | 'role'> | null
  members?: OrganizationMember[]
  active_members_count?: number
  pending_members_count?: number
  actions_count?: number
  events_count?: number
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  member_role: MemberRole
  status: MemberStatus
  joined_at: string
  user?: Pick<Profile, 'id' | 'full_name' | 'email' | 'role' | 'points'> | null
  organization?: Pick<Organization, 'id' | 'name' | 'slug' | 'type' | 'region' | 'is_verified'> | null
}

export interface CitizenReport {
  id: string
  reporter_id: string | null
  verified_by: string | null
  verified_org_id: string | null
  title: string
  description: string
  ecosystem: Ecosystem
  threat_category: string
  lat: number
  lng: number
  location_name: string
  location_mismatch: boolean
  is_anonymous: boolean
  before_image_url: string
  status: ReportStatus
  ai_confidence: number
  ai_severity: Severity
  ai_recommendations: string[]
  ai_site_brief: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  reporter?: Pick<Profile, 'id' | 'full_name' | 'role'> | null
  verifier?: Pick<Profile, 'id' | 'full_name' | 'role'> | null
  verified_org?: Pick<Organization, 'id' | 'name' | 'type'> | null
  linked_events?: Pick<ConservationEvent, 'id' | 'title' | 'status'>[]
}

export interface EventAction {
  id: string
  event_id?: string
  actor_id: string | null
  organization_id: string | null
  notes: string
  after_image_url: string
  waste_kg: number | string
  trees_planted: number
  ai_recovery_score: number | null
  ai_comparison_summary: string | null
  verified_by_agency: boolean
  completed_at: string
  actor?: Pick<Profile, 'id' | 'full_name' | 'role'> | null
  organization?: Pick<Organization, 'id' | 'name' | 'type'> | null
}

export interface EventParticipant {
  id: string
  user_id: string
  joined_at: string
}

export interface ConservationEvent {
  id: string
  organization_id: string
  created_by: string | null
  report_id: string | null
  ref_source?: RefSource | null
  ref_external_id?: string | null
  visibility: EventVisibility
  title: string
  description: string
  ecosystem: Ecosystem
  category: string
  lat: number
  lng: number
  location_name: string
  cover_image_url: string | null
  status: EventStatus
  start_at: string | null
  end_at: string | null
  max_participants: number | null
  created_at: string
  updated_at: string
  organization?: Pick<Organization, 'id' | 'name' | 'slug' | 'type' | 'region' | 'is_verified'> | null
  creator?: Pick<Profile, 'id' | 'full_name' | 'role'> | null
  report?: Pick<
    CitizenReport,
    | 'id'
    | 'title'
    | 'threat_category'
    | 'before_image_url'
    | 'ai_severity'
    | 'ai_confidence'
    | 'ai_recommendations'
    | 'ai_site_brief'
    | 'status'
  > | null
  event_actions?: EventAction[]
  event_participants?: EventParticipant[]
}

export interface NotificationItem {
  id: string
  target_role: UserRole | null
  user_id: string | null
  report_id: string | null
  event_id: string | null
  title: string
  detail: string
  is_read: boolean
  created_at: string
}

export interface HotspotPoint {
  id?: string
  lat: number
  lng: number
  frp: number
  brightness: number
  confidence: string
  acqDate: string
  acqTime: string
  satellite: string
  daynight: string
}

export interface SatelliteSignal {
  id: string
  source: RefSource
  externalId: string
  title: string
  categoryLabel: string
  lat: number
  lng: number
  date: string
  confidence?: string
  frp?: number
  ecosystem: Ecosystem
}

export interface EonetPoint {
  id: string
  title: string
  category: string
  categoryLabel: string
  lat: number
  lng: number
  date: string
}

export interface SpeciesPoint {
  id: number
  lat: number
  lng: number
  name: string
  commonName: string | null
  group: string
  threatened: boolean
  observedOn: string | null
}

export interface EnvLayers {
  hotspots: HotspotPoint[]
  eonet: EonetPoint[]
  species: SpeciesPoint[]
  fetchedAt: string
  cached: boolean
  sources: {
    nasaFirms: string
    nasaEonet: string
    inaturalist: string
  }
}

export interface EnvPulse {
  aqi: number | null
  pm25: number | null
  waveM: number | null
  windKmh: number | null
  rainMm: number | null
  hotspots: number | null
  hotspotPoints?: HotspotPoint[]
  species: number | null
  eonet?: number | null
  fetchedAt: string
  cached: boolean
  sources?: Record<string, string>
}

export type PinTone = 'critical' | 'progress' | 'resolved'
