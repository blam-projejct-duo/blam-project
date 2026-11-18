import type {
  CitizenReport,
  ConservationEvent,
  Ecosystem,
  EnvLayers,
  EnvPulse,
  EventStatus,
  EventVisibility,
  FundraisingCampaign,
  FundraisingDonation,
  HazardKind,
  NotificationItem,
  Organization,
  OrganizationMember,
  OrgType,
  PaymentMethod,
  Profile,
  RefSource,
  ReportStatus,
  Severity,
} from '../types'
import { isDemoPathname } from './route'
import { supabase } from './supabase'

const DEMO_STORAGE_KEY = 'blam_demo_user_id'

export function setDemoSessionId(userId: string | null) {
  if (typeof window === 'undefined') return
  if (userId) window.localStorage.setItem(DEMO_STORAGE_KEY, userId)
  else window.localStorage.removeItem(DEMO_STORAGE_KEY)
}

export function getDemoSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(DEMO_STORAGE_KEY)
}

async function getBearerToken(): Promise<string | null> {
  if (isDemoPathname()) {
    const demoId = getDemoSessionId()
    return demoId ? `demo:${demoId}` : null
  }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }
  return null
}

async function apiFetch<T>(
  path: string,
  init: RequestInit & { requireAuth?: boolean } = {},
): Promise<T> {
  const { requireAuth = false, headers: customHeaders, ...rest } = init
  const headers = new Headers(customHeaders)
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = await getBearerToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else if (requireAuth) {
    throw new Error('Silakan masuk akun terlebih dahulu')
  }

  const res = await fetch(`/api${path}`, { ...rest, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request gagal (${res.status})`)
  }
  return data as T
}

export async function fetchDemoAccounts(): Promise<Profile[]> {
  const res = await apiFetch<{ accounts: Profile[] }>('/auth/demo-accounts')
  return res.accounts
}

export async function registerAccount(input: {
  email: string
  password: string
  fullName: string
}): Promise<{ ok: boolean; userId: string }> {
  return apiFetch<{ ok: boolean; userId: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchMe(): Promise<{
  profile: Profile
  memberships: OrganizationMember[]
  notifications: NotificationItem[]
}> {
  return apiFetch('/auth/me', { requireAuth: true })
}

export async function updateMyProfile(input: {
  fullName?: string
  imageBase64?: string
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
}): Promise<{ ok: boolean; profile: Profile }> {
  return apiFetch('/auth/profile', {
    method: 'PATCH',
    requireAuth: true,
    body: JSON.stringify(input),
  })
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', requireAuth: true })
}

export async function fetchEvents(includeCancelled = false, forceRefresh = false): Promise<ConservationEvent[]> {
  const params = new URLSearchParams()
  if (includeCancelled) params.set('includeCancelled', '1')
  if (forceRefresh) params.set('refresh', '1')
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await apiFetch<{ events: ConservationEvent[] }>(`/events${qs}`, { cache: 'no-store' })
  return res.events
}

export interface CreateEventInput {
  organizationId?: string
  reportId?: string
  refSource?: RefSource
  refExternalId?: string
  visibility: EventVisibility
  title: string
  description?: string
  ecosystem: Ecosystem
  category: string
  lat: number
  lng: number
  locationName: string
  coverImageBase64?: string
  coverMimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  startAt?: string
  endAt?: string
  maxParticipants?: number
}

export async function createEvent(input: CreateEventInput): Promise<{
  ok: boolean
  event: { id: string; title: string; status: EventStatus }
}> {
  return apiFetch('/events', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(input),
  })
}

export async function updateEventVisibility(eventId: string, visibility: EventVisibility): Promise<void> {
  await apiFetch(`/events/${eventId}/visibility`, {
    method: 'PATCH',
    requireAuth: true,
    body: JSON.stringify({ visibility }),
  })
}

export async function joinEvent(
  eventId: string,
): Promise<{ ok: boolean; alreadyJoined: boolean; status: string; pointsAwarded: number }> {
  return apiFetch(`/events/${eventId}/join`, {
    method: 'POST',
    requireAuth: true,
  })
}

export interface ResolveEventInput {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  notes: string
  wasteKg: number
  treesPlanted: number
  organizationId?: string
}

export async function resolveEvent(
  eventId: string,
  input: ResolveEventInput,
): Promise<{
  ok: boolean
  actionId: string
  afterImageUrl: string
  recoveryScore: number
  comparisonSummary: string
  verifiedByAgency: boolean
  pointsAwarded: number
}> {
  return apiFetch(`/events/${eventId}/resolve`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(input),
  })
}

export async function fetchReportsQueue(includeRejected = false): Promise<CitizenReport[]> {
  const qs = includeRejected ? '?includeRejected=1' : ''
  const res = await apiFetch<{ reports: CitizenReport[] }>(`/reports/queue${qs}`, {
    requireAuth: true,
    cache: 'no-store',
  })
  return res.reports
}

export interface VerifyReportInput {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  ecosystem: Ecosystem
  incidentType?: string
  title?: string
  description: string
  audioBase64?: string
  audioMimeType?: string
  locationName: string
  lat: number
  lng: number
  locationMismatch: boolean
  isAnonymous: boolean
}

export interface VerifyReportResult {
  isValid: boolean
  matchesEcosystem: boolean
  confidence: number
  severity: Severity
  threatCategory: string
  summary: string
  reason: string
  recommendations: string[]
  saved: boolean
  status?: ReportStatus
  reportId?: string
  imageUrl?: string
  pointsAwarded?: number
}

export async function verifyAndCreateReport(input: VerifyReportInput): Promise<VerifyReportResult> {
  return apiFetch<VerifyReportResult>('/reports/verify-and-create', {
    method: 'POST',
    requireAuth: false,
    body: JSON.stringify(input),
  })
}

export async function verifyCitizenReport(
  reportId: string,
  status: 'verified' | 'rejected',
  organizationId?: string,
): Promise<void> {
  await apiFetch(`/reports/${reportId}/verify`, {
    method: 'PATCH',
    requireAuth: true,
    body: JSON.stringify({ status, organizationId }),
  })
}

export async function fetchOrgs(includeUnverified = false): Promise<Organization[]> {
  const qs = includeUnverified ? '?includeUnverified=1' : ''
  const res = await apiFetch<{ organizations: Organization[] }>(`/orgs${qs}`)
  return res.organizations
}

export async function createOrg(input: {
  name: string
  type: OrgType
  region: string
}): Promise<{ ok: boolean; organization: Organization }> {
  return apiFetch('/orgs', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(input),
  })
}

export async function joinOrg(orgId: string): Promise<void> {
  await apiFetch(`/orgs/${orgId}/join`, {
    method: 'POST',
    requireAuth: true,
  })
}

export async function manageOrgMember(
  orgId: string,
  userId: string,
  action: 'approve' | 'remove',
): Promise<{ ok: boolean; syncedRole: string | null }> {
  return apiFetch(`/orgs/${orgId}/members/${userId}`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ action }),
  })
}

export async function verifyOrgAdmin(organizationId: string, approve: boolean): Promise<void> {
  await apiFetch('/admin/verify-org', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ organizationId, approve }),
  })
}

export async function moderateReportAdmin(reportId: string, status: ReportStatus): Promise<void> {
  await apiFetch('/admin/moderate-report', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ reportId, status }),
  })
}

export async function moderateEventAdmin(eventId: string, status: 'cancelled' | 'open'): Promise<void> {
  await apiFetch('/admin/moderate-event', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ eventId, status }),
  })
}

export async function moderateHotspotAdmin(hotspotId: string): Promise<void> {
  await apiFetch('/admin/moderate-hotspot', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ hotspotId }),
  })
}

export async function verifyActionAgency(actionId: string): Promise<void> {
  await apiFetch('/agency/verify-action', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ actionId }),
  })
}

export async function fetchPulse(lat: number, lng: number, signal?: AbortSignal): Promise<EnvPulse> {
  const data = await apiFetch<EnvPulse>(`/env/pulse?lat=${lat}&lng=${lng}`, { signal })
  console.info('[Blam:EnvPulse]', { lat, lng, ...data })
  return data
}



export async function fetchEnvLayers(lat: number, lng: number, signal?: AbortSignal): Promise<EnvLayers> {
  const data = await apiFetch<EnvLayers>(`/env/layers?lat=${lat}&lng=${lng}`, { signal })
  console.info('[Blam:EnvLayers]', {
    lat,
    lng,
    hotspots: data.hotspots.length,
    eonet: data.eonet.length,
    species: data.species.length,
    cached: data.cached,
    sources: data.sources,
  })
  return data
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<{ ok: boolean; name: string; detail: string; fullAddress: string }> {
  return apiFetch<{ ok: boolean; name: string; detail: string; fullAddress: string }>(
    `/geocode/reverse?lat=${lat}&lng=${lng}`,
    { signal },
  )
}

export async function fetchLandRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  signal?: AbortSignal,
): Promise<{ distanceKm: number; coordinates: [number, number][] }> {
  return apiFetch<{ ok: true; distanceKm: number; coordinates: [number, number][] }>(
    `/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`,
    { signal },
  )
}

export async function fetchFundraisings(): Promise<FundraisingCampaign[]> {
  const res = await apiFetch<{ fundraisings: FundraisingCampaign[] }>('/fundraisings')
  return res.fundraisings
}

export async function createFundraising(input: {
  refSource: RefSource
  refExternalId: string
  hazardKind: HazardKind
  title: string
  description: string
  locationName: string
  lat: number
  lng: number
  targetAmount: number
  organizationId?: string
}): Promise<{ ok: boolean; fundraising: FundraisingCampaign }> {
  return apiFetch<{ ok: boolean; fundraising: FundraisingCampaign }>('/fundraisings', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(input),
  })
}

export async function donateToFundraising(
  fundraisingId: string,
  input: {
    amount: number
    paymentMethod: PaymentMethod
    bankName?: string
    isAnonymous: boolean
    donorName?: string
    message?: string
  },
): Promise<{ ok: boolean; fundraising: FundraisingCampaign; donation: FundraisingDonation }> {
  return apiFetch<{ ok: boolean; fundraising: FundraisingCampaign; donation: FundraisingDonation }>(
    `/fundraisings/${fundraisingId}/donate`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}


