export type Ecosystem = 'coastal_mangrove' | 'tropical_forest' | 'watershed'

export type SiteStatus = 'ai_verified' | 'in_progress' | 'resolved'

export type Severity = 'critical' | 'medium'

export type MapStyle = 'terang' | 'gelap' | 'satelit'

export interface SitePulse {
  aqi: number
  waveM: number
  hotspots: number
  species: number
}

export interface SiteImpact {
  volunteers: number
  wasteKg: number
  trees: number
  co2Kg: number
  recoveryScore: number
}

export interface ConservationSite {
  id: string
  title: string
  shortName: string
  locationName: string
  province: string
  ecosystem: Ecosystem
  status: SiteStatus
  severity: Severity
  aiScore: number
  lat: number
  lng: number
  participants: number
  brief: string
  communityNote: string
  beforeImage: string
  afterImage?: string
  pulse: SitePulse
  impact?: SiteImpact
  updatedAt: string
  updatedMinutes: number
}
