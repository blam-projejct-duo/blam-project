export type UserRole = 'citizen' | 'volunteer' | 'agency' | 'admin'
export type Ecosystem = 'coastal_mangrove' | 'tropical_forest' | 'watershed'
export type ReportStatus = 'rejected' | 'open' | 'escalated' | 'in_progress' | 'resolved'
export type ReportSource = 'user' | 'nasa_firms' | 'nasa_eonet'
export type Severity = 'low' | 'medium' | 'critical'
export type ActionVisibility = 'public' | 'members_only'
export type OrgType = 'community' | 'agency'
export type MemberRole = 'lead' | 'member'
export type MemberStatus = 'pending' | 'active'
export type MapStyle = 'terang' | 'gelap' | 'satelit'

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

export interface ReportAction {
  id: string
  report_id?: string
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

export interface ActionParticipant {
  id: string
  user_id: string
  joined_at: string
}

export interface Report {
  id: string
  reporter_id: string | null
  assigned_org_id: string | null
  source?: ReportSource
  external_id?: string | null
  action_visibility: ActionVisibility
  title: string
  description: string
  ecosystem: Ecosystem
  threat_category: string
  lat: number
  lng: number
  location_name: string
  location_mismatch: boolean
  is_anonymous: boolean
  is_seed: boolean
  before_image_url: string | null
  status: ReportStatus
  ai_confidence: number
  ai_severity: Severity
  ai_recommendations: string[]
  ai_site_brief: string | null
  created_at: string
  updated_at: string
  reporter?: Pick<Profile, 'id' | 'full_name' | 'role'> | null
  assigned_org?: Pick<Organization, 'id' | 'name' | 'slug' | 'type' | 'region' | 'is_verified'> | null
  report_actions?: ReportAction[]
  action_participants?: ActionParticipant[]
}

export interface NotificationItem {
  id: string
  target_role: UserRole | null
  user_id: string | null
  report_id: string | null
  title: string
  detail: string
  is_read: boolean
  created_at: string
}

export interface HotspotPoint {
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
  species: SpeciesPoint[]
  fetchedAt: string
  cached: boolean
  sources: {
    nasaFirms: string
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
