import seedData from '../data/localDemoData.json'
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
  UserRole,
  VerifiedSignalRecord,
} from '../types'
import type {
  BlamChatAction,
  BlamChatContext,
  BlamChatTurn,
  CreateEventInput,
  ResolveEventInput,
  VerifyReportInput,
  VerifyReportResult,
} from './api'

const STORE_KEY = 'blam_local_demo_store_v1'

interface LocalStoreState {
  demoAccounts: Profile[]
  extraUsers: Profile[]
  organizations: Organization[]
  reports: CitizenReport[]
  events: ConservationEvent[]
  verifiedSignals: VerifiedSignalRecord[]
  envLayers: EnvLayers
  envPulse: EnvPulse
  fundraisings: FundraisingCampaign[]
  notifications: NotificationItem[]
}

function cloneSeed(): LocalStoreState {
  return JSON.parse(JSON.stringify(seedData)) as LocalStoreState
}

let memoryState: LocalStoreState | null = null

function loadState(): LocalStoreState {
  if (memoryState) return memoryState
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORE_KEY)
      if (raw) {
        memoryState = JSON.parse(raw) as LocalStoreState
        return memoryState
      }
    } catch {
      // ignore storage errors
    }
  }
  memoryState = cloneSeed()
  saveState(memoryState)
  return memoryState
}

function saveState(state: LocalStoreState) {
  memoryState = state
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function ecosystemSampleImage(ecosystem: Ecosystem, phase: 'before' | 'after' = 'before'): string {
  if (ecosystem === 'coastal_mangrove') return `/samples/mangrove-${phase}.svg`
  if (ecosystem === 'watershed') return `/samples/flood-${phase}.svg`
  return `/samples/forest-${phase}.svg`
}

function findUser(state: LocalStoreState, userId: string | null): Profile | null {
  if (!userId) return null
  return (
    state.demoAccounts.find((u) => u.id === userId) ??
    state.extraUsers.find((u) => u.id === userId) ??
    null
  )
}

function enrichOrg(state: LocalStoreState, org: Organization): Organization {
  const members = org.members ?? []
  const activeCount = members.filter((m) => m.status === 'active').length
  const pendingCount = members.filter((m) => m.status === 'pending').length
  const orgEvents = state.events.filter((e) => e.organization_id === org.id)
  const actionsCount = orgEvents.reduce((sum, e) => sum + (e.event_actions?.length ?? 0), 0)
  return {
    ...org,
    active_members_count: activeCount,
    pending_members_count: pendingCount,
    events_count: orgEvents.length,
    actions_count: actionsCount,
  }
}

export const localStore = {
  getDemoAccounts(): Profile[] {
    return loadState().demoAccounts
  },

  getMe(userId: string): {
    profile: Profile
    memberships: OrganizationMember[]
    notifications: NotificationItem[]
  } {
    const state = loadState()
    const profile = findUser(state, userId)
    if (!profile) throw new Error('Akun demo tidak ditemukan')

    const memberships: OrganizationMember[] = []
    for (const org of state.organizations) {
      for (const m of org.members ?? []) {
        if (m.user_id === userId) {
          memberships.push({
            ...m,
            organization: {
              id: org.id,
              name: org.name,
              slug: org.slug,
              type: org.type,
              region: org.region,
              is_verified: org.is_verified,
            },
          })
        }
      }
    }

    const notifications = state.notifications
      .filter(
        (n) =>
          n.user_id === userId ||
          n.target_role === profile.role ||
          (n.target_role === null && n.user_id === null),
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { profile, memberships, notifications }
  },

  updateProfile(
    userId: string,
    input: { fullName?: string; imageBase64?: string; mimeType?: string },
  ): { ok: boolean; profile: Profile } {
    const state = loadState()
    const profile = findUser(state, userId)
    if (!profile) throw new Error('Pengguna tidak ditemukan')
    if (input.fullName?.trim()) profile.full_name = input.fullName.trim()
    if (input.imageBase64 && input.mimeType) {
      profile.avatar_url = `data:${input.mimeType};base64,${input.imageBase64}`
    }
    saveState(state)
    return { ok: true, profile }
  },

  markNotificationRead(id: string): void {
    const state = loadState()
    const item = state.notifications.find((n) => n.id === id)
    if (item) {
      item.is_read = true
      saveState(state)
    }
  },

  getEvents(includeCancelled = false): ConservationEvent[] {
    const state = loadState()
    return state.events
      .filter((e) => includeCancelled || e.status !== 'cancelled')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  createEvent(
    userId: string,
    input: CreateEventInput,
  ): { ok: boolean; event: { id: string; title: string; status: EventStatus } } {
    const state = loadState()
    const creator = findUser(state, userId)
    const org =
      state.organizations.find((o) => o.id === input.organizationId) ??
      state.organizations.find((o) =>
        (o.members ?? []).some((m) => m.user_id === userId && m.status === 'active'),
      ) ??
      state.organizations[0]

    const linkedReport = input.reportId
      ? state.reports.find((r) => r.id === input.reportId) ?? null
      : null

    const now = new Date().toISOString()
    const newId = uid('ev')
    const coverUrl =
      input.coverImageBase64 && input.coverMimeType
        ? `data:${input.coverMimeType};base64,${input.coverImageBase64}`
        : linkedReport?.before_image_url ?? ecosystemSampleImage(input.ecosystem, 'before')

    const newEvent: ConservationEvent = {
      id: newId,
      organization_id: org.id,
      created_by: userId,
      report_id: input.reportId ?? null,
      ref_source: input.refSource ?? null,
      ref_external_id: input.refExternalId ?? null,
      visibility: input.visibility,
      title: input.title,
      description: input.description ?? 'Aksi konservasi kolaboratif bersama relawan dan warga.',
      ecosystem: input.ecosystem,
      category: input.category,
      lat: input.lat,
      lng: input.lng,
      location_name: input.locationName,
      cover_image_url: coverUrl,
      status: 'open',
      start_at: input.startAt ?? now,
      end_at: input.endAt ?? null,
      max_participants: input.maxParticipants ?? 40,
      created_at: now,
      updated_at: now,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        region: org.region,
        is_verified: org.is_verified,
      },
      creator: creator
        ? { id: creator.id, full_name: creator.full_name, role: creator.role }
        : null,
      report: linkedReport
        ? {
            id: linkedReport.id,
            title: linkedReport.title,
            threat_category: linkedReport.threat_category,
            before_image_url: linkedReport.before_image_url,
            ai_severity: linkedReport.ai_severity,
            ai_confidence: linkedReport.ai_confidence,
            ai_recommendations: linkedReport.ai_recommendations,
            ai_site_brief: linkedReport.ai_site_brief,
            status: linkedReport.status,
          }
        : null,
      event_actions: [],
      event_participants: [
        { id: uid('part'), user_id: userId, joined_at: now },
      ],
    }

    if (linkedReport) {
      linkedReport.status = 'verified'
      linkedReport.linked_events = [
        ...(linkedReport.linked_events ?? []),
        { id: newId, title: input.title, status: 'open' },
      ]
    }

    state.events.unshift(newEvent)
    state.notifications.unshift({
      id: uid('notif'),
      target_role: 'volunteer',
      user_id: null,
      report_id: input.reportId ?? null,
      event_id: newId,
      title: `Gerakan Baru: ${input.title}`,
      detail: `${org.name} membuka aksi di ${input.locationName}.`,
      is_read: false,
      created_at: now,
    })
    saveState(state)
    return { ok: true, event: { id: newId, title: input.title, status: 'open' } }
  },

  updateEventVisibility(eventId: string, visibility: EventVisibility): void {
    const state = loadState()
    const ev = state.events.find((e) => e.id === eventId)
    if (ev) {
      ev.visibility = visibility
      ev.updated_at = new Date().toISOString()
      saveState(state)
    }
  },

  joinEvent(
    userId: string,
    eventId: string,
  ): { ok: boolean; alreadyJoined: boolean; status: string; pointsAwarded: number } {
    const state = loadState()
    const ev = state.events.find((e) => e.id === eventId)
    if (!ev) throw new Error('Event tidak ditemukan')
    const participants = ev.event_participants ?? []
    const already = participants.some((p) => p.user_id === userId)
    if (already) {
      return { ok: true, alreadyJoined: true, status: ev.status, pointsAwarded: 0 }
    }
    participants.push({ id: uid('part'), user_id: userId, joined_at: new Date().toISOString() })
    ev.event_participants = participants
    if (ev.status === 'open') ev.status = 'in_progress'
    const user = findUser(state, userId)
    if (user) user.points += 15
    saveState(state)
    return { ok: true, alreadyJoined: false, status: ev.status, pointsAwarded: 15 }
  },

  resolveEvent(
    userId: string,
    eventId: string,
    input: ResolveEventInput,
  ): {
    ok: boolean
    actionId: string
    afterImageUrl: string
    recoveryScore: number
    comparisonSummary: string
    verifiedByAgency: boolean
    pointsAwarded: number
  } {
    const state = loadState()
    const ev = state.events.find((e) => e.id === eventId)
    if (!ev) throw new Error('Event tidak ditemukan')
    const actor = findUser(state, userId)
    const now = new Date().toISOString()
    const afterImageUrl = input.imageBase64
      ? `data:${input.mimeType};base64,${input.imageBase64}`
      : ecosystemSampleImage(ev.ecosystem, 'after')
    const recoveryScore = 91
    const comparisonSummary =
      'Kondisi tapak menunjukkan pemulihan nyata: limbah berkurang dan vegetasi/penghijauan baru mulai tertanam rapi.'
    const actionId = uid('act')
    const isAgency = actor?.role === 'agency'

    ev.event_actions = [
      ...(ev.event_actions ?? []),
      {
        id: actionId,
        event_id: eventId,
        actor_id: userId,
        organization_id: input.organizationId ?? ev.organization_id,
        notes: input.notes,
        after_image_url: afterImageUrl,
        waste_kg: input.wasteKg,
        trees_planted: input.treesPlanted,
        ai_recovery_score: recoveryScore,
        ai_comparison_summary: comparisonSummary,
        verified_by_agency: isAgency,
        completed_at: now,
        actor: actor ? { id: actor.id, full_name: actor.full_name, role: actor.role } : null,
        organization: ev.organization
          ? { id: ev.organization.id, name: ev.organization.name, type: ev.organization.type }
          : null,
      },
    ]
    ev.status = 'resolved'
    ev.updated_at = now
    if (actor) actor.points += 50
    saveState(state)
    return {
      ok: true,
      actionId,
      afterImageUrl,
      recoveryScore,
      comparisonSummary,
      verifiedByAgency: isAgency,
      pointsAwarded: 50,
    }
  },

  getReportsQueue(includeRejected = false): CitizenReport[] {
    const state = loadState()
    return state.reports
      .filter((r) => includeRejected || r.status !== 'rejected')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  verifyAndCreateReport(userId: string | null, input: VerifyReportInput): VerifyReportResult {
    const state = loadState()
    const reporter = findUser(state, userId)
    const now = new Date().toISOString()
    const reportId = uid('rep')
    const imageUrl = input.imageBase64
      ? `data:${input.mimeType};base64,${input.imageBase64}`
      : ecosystemSampleImage(input.ecosystem, 'before')

    const isCritical = input.incidentType === 'Kebakaran' || input.incidentType === 'Banjir'
    const severity: Severity = isCritical ? 'critical' : 'medium'
    const status: ReportStatus = isCritical ? 'escalated' : 'pending_verification'
    const threatCategory = input.incidentType ?? 'Ancaman Ekosistem'
    const title = input.title?.trim() || `${threatCategory} di ${input.locationName}`
    const recommendations = [
      'Lakukan verifikasi lapangan oleh relawan terdekat dalam 24 jam.',
      'Dokumentasikan radius dampak dan koordinasikan dengan organisasi wilayah.',
    ]

    const newReport: CitizenReport = {
      id: reportId,
      reporter_id: input.isAnonymous ? null : userId,
      verified_by: null,
      verified_org_id: null,
      title,
      description: input.description || 'Laporan cepat via Blam Snap.',
      ecosystem: input.ecosystem,
      threat_category: threatCategory,
      lat: input.lat,
      lng: input.lng,
      location_name: input.locationName,
      location_mismatch: input.locationMismatch,
      is_anonymous: input.isAnonymous,
      before_image_url: imageUrl,
      status,
      ai_confidence: 92,
      ai_severity: severity,
      ai_recommendations: recommendations,
      ai_site_brief: `Analisis visual Blam Snap mendeteksi indikasi ${threatCategory.toLowerCase()} pada ekosistem ${input.ecosystem}.`,
      verified_at: null,
      created_at: now,
      updated_at: now,
      reporter:
        !input.isAnonymous && reporter
          ? { id: reporter.id, full_name: reporter.full_name, role: reporter.role }
          : null,
      verifier: null,
      verified_org: null,
      linked_events: [],
    }

    state.reports.unshift(newReport)
    if (reporter && !input.isAnonymous) reporter.points += 25
    state.notifications.unshift({
      id: uid('notif'),
      target_role: isCritical ? 'agency' : 'volunteer',
      user_id: null,
      report_id: reportId,
      event_id: null,
      title: `Laporan Blam Snap: ${title}`,
      detail: `${input.locationName} · Skor AI 92% (${severity}).`,
      is_read: false,
      created_at: now,
    })
    saveState(state)

    return {
      isValid: true,
      matchesEcosystem: true,
      confidence: 92,
      severity,
      threatCategory,
      summary: newReport.ai_site_brief ?? title,
      reason: 'Foto sesuai dengan kategori ancaman ekologis dan koordinat lapangan.',
      recommendations,
      saved: true,
      status,
      reportId,
      imageUrl,
      pointsAwarded: reporter ? 25 : 0,
    }
  },

  verifyCitizenReport(
    userId: string,
    reportId: string,
    status: 'verified' | 'rejected',
    organizationId?: string,
  ): void {
    const state = loadState()
    const report = state.reports.find((r) => r.id === reportId)
    if (!report) throw new Error('Laporan tidak ditemukan')
    const verifier = findUser(state, userId)
    const org = organizationId ? state.organizations.find((o) => o.id === organizationId) : null
    report.status = status
    report.verified_by = userId
    report.verified_org_id = org?.id ?? null
    report.verified_at = new Date().toISOString()
    report.updated_at = report.verified_at
    report.verifier = verifier
      ? { id: verifier.id, full_name: verifier.full_name, role: verifier.role }
      : null
    report.verified_org = org ? { id: org.id, name: org.name, type: org.type } : null
    saveState(state)
  },

  getOrgs(includeUnverified = false): Organization[] {
    const state = loadState()
    return state.organizations
      .filter((o) => includeUnverified || o.is_verified)
      .map((o) => enrichOrg(state, o))
  },

  createOrg(
    userId: string,
    input: { name: string; type: OrgType; region: string },
  ): { ok: boolean; organization: Organization } {
    const state = loadState()
    const creator = findUser(state, userId)
    const now = new Date().toISOString()
    const id = uid('org')
    const slug = input.name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '')
    const newOrg: Organization = {
      id,
      name: input.name,
      slug,
      type: input.type,
      region: input.region,
      is_verified: creator?.role === 'admin',
      created_by: userId,
      created_at: now,
      creator: creator
        ? { id: creator.id, full_name: creator.full_name, role: creator.role }
        : null,
      members: [
        {
          id: uid('mem'),
          organization_id: id,
          user_id: userId,
          member_role: 'lead',
          status: 'active',
          joined_at: now,
          user: creator
            ? {
                id: creator.id,
                full_name: creator.full_name,
                email: creator.email,
                role: creator.role,
                points: creator.points,
              }
            : null,
        },
      ],
    }
    state.organizations.unshift(newOrg)
    saveState(state)
    return { ok: true, organization: enrichOrg(state, newOrg) }
  },

  joinOrg(userId: string, orgId: string): void {
    const state = loadState()
    const org = state.organizations.find((o) => o.id === orgId)
    if (!org) throw new Error('Organisasi tidak ditemukan')
    const user = findUser(state, userId)
    const members = org.members ?? []
    if (members.some((m) => m.user_id === userId)) return
    members.push({
      id: uid('mem'),
      organization_id: orgId,
      user_id: userId,
      member_role: 'member',
      status: 'pending',
      joined_at: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            points: user.points,
          }
        : null,
    })
    org.members = members
    saveState(state)
  },

  manageOrgMember(
    orgId: string,
    userId: string,
    action: 'approve' | 'remove',
  ): { ok: boolean; syncedRole: string | null } {
    const state = loadState()
    const org = state.organizations.find((o) => o.id === orgId)
    if (!org) throw new Error('Organisasi tidak ditemukan')
    const members = org.members ?? []
    let syncedRole: string | null = null
    if (action === 'approve') {
      const m = members.find((x) => x.user_id === userId)
      if (m) m.status = 'active'
      const u = findUser(state, userId)
      if (u && u.role === 'citizen') {
        u.role = org.type === 'agency' ? 'agency' : 'volunteer'
        syncedRole = u.role
      }
    } else {
      org.members = members.filter((x) => x.user_id !== userId)
    }
    saveState(state)
    return { ok: true, syncedRole }
  },

  verifyOrgAdmin(organizationId: string, approve: boolean): void {
    const state = loadState()
    if (approve) {
      const org = state.organizations.find((o) => o.id === organizationId)
      if (org) org.is_verified = true
    } else {
      state.organizations = state.organizations.filter((o) => o.id !== organizationId)
    }
    saveState(state)
  },

  moderateReportAdmin(reportId: string, status: ReportStatus): void {
    const state = loadState()
    const r = state.reports.find((x) => x.id === reportId)
    if (r) {
      r.status = status
      r.updated_at = new Date().toISOString()
      saveState(state)
    }
  },

  moderateEventAdmin(eventId: string, status: 'cancelled' | 'open'): void {
    const state = loadState()
    const ev = state.events.find((e) => e.id === eventId)
    if (ev) {
      ev.status = status
      ev.updated_at = new Date().toISOString()
      saveState(state)
    }
  },

  moderateHotspotAdmin(hotspotId: string): void {
    const state = loadState()
    state.envLayers.hotspots = state.envLayers.hotspots.filter((h) => h.id !== hotspotId)
    saveState(state)
  },

  revokeOrgAdmin(organizationId: string): void {
    const state = loadState()
    const org = state.organizations.find((o) => o.id === organizationId)
    if (org) {
      org.is_verified = false
      saveState(state)
    }
  },

  moderateFundraisingAdmin(campaignId: string, status: 'active' | 'closed'): void {
    const state = loadState()
    const f = state.fundraisings.find((x) => x.id === campaignId)
    if (f) {
      f.status = status
      saveState(state)
    }
  },

  broadcastAdminNotification(payload: {
    title: string
    detail: string
    target: 'all' | 'citizen' | 'volunteer' | 'agency'
  }): void {
    const state = loadState()
    const now = new Date().toISOString()
    const roles: UserRole[] =
      payload.target === 'all' ? ['citizen', 'volunteer', 'agency', 'admin'] : [payload.target]
    for (const role of roles) {
      state.notifications.unshift({
        id: uid('notif'),
        target_role: role,
        user_id: null,
        report_id: null,
        event_id: null,
        title: payload.title,
        detail: payload.detail,
        is_read: false,
        created_at: now,
      })
    }
    saveState(state)
  },

  getUsersAdmin(): Profile[] {
    const state = loadState()
    return [...state.demoAccounts, ...state.extraUsers]
  },

  getVerifiedSignals(): VerifiedSignalRecord[] {
    return loadState().verifiedSignals
  },

  verifyRadarSignal(
    userId: string,
    payload: {
      refSource: RefSource
      refExternalId: string
      memberIds?: string[]
      hazardKind?: HazardKind
      title: string
      lat: number
      lng: number
      note?: string
      organizationId?: string
    },
  ): VerifiedSignalRecord {
    const state = loadState()
    const user = findUser(state, userId)
    const org = payload.organizationId
      ? state.organizations.find((o) => o.id === payload.organizationId)
      : null
    const record: VerifiedSignalRecord = {
      id: uid('vsig'),
      ref_source: payload.refSource,
      ref_external_id: payload.refExternalId,
      member_ids: payload.memberIds ?? [payload.refExternalId],
      hazard_kind: payload.hazardKind ?? 'suspected',
      title: payload.title,
      lat: payload.lat,
      lng: payload.lng,
      note: payload.note ?? null,
      verified_by: userId,
      verified_by_name: user?.full_name ?? 'Relawan Demo',
      verified_org_id: org?.id ?? null,
      verified_org_name: org?.name ?? null,
      verified_at: new Date().toISOString(),
    }
    state.verifiedSignals.unshift(record)
    saveState(state)
    return record
  },

  verifyActionAgency(actionId: string): void {
    const state = loadState()
    for (const ev of state.events) {
      const act = ev.event_actions?.find((a) => a.id === actionId)
      if (act) {
        act.verified_by_agency = true
        saveState(state)
        return
      }
    }
  },

  getEnvPulse(lat: number, lng: number): EnvPulse {
    const state = loadState()
    const offset = Math.round((Math.abs(lat) + Math.abs(lng)) % 9)
    return {
      ...state.envPulse,
      aqi: (state.envPulse.aqi ?? 45) + offset,
      hotspots: state.envLayers.hotspots.length,
      species: state.envLayers.species.length,
      eonet: state.envLayers.eonet.length,
    }
  },

  getEnvLayers(): EnvLayers {
    return loadState().envLayers
  },

  reverseGeocode(
    lat: number,
    lng: number,
  ): { ok: boolean; name: string; detail: string; area?: string; fullAddress: string } {
    const cities = [
      { name: 'Jakarta Utara', area: 'DKI Jakarta', lat: -6.12, lng: 106.78 },
      { name: 'Bandung', area: 'Jawa Barat', lat: -6.92, lng: 107.62 },
      { name: 'Demak', area: 'Jawa Tengah', lat: -6.89, lng: 110.63 },
      { name: 'Lumajang', area: 'Jawa Timur', lat: -8.13, lng: 113.22 },
      { name: 'Denpasar', area: 'Bali', lat: -8.67, lng: 115.21 },
      { name: 'Palangka Raya', area: 'Kalimantan Tengah', lat: -2.21, lng: 113.92 },
      { name: 'Siak', area: 'Riau', lat: 0.78, lng: 102.04 },
      { name: 'Maros', area: 'Sulawesi Selatan', lat: -5.01, lng: 119.57 },
      { name: 'Aceh Tenggara', area: 'Aceh', lat: 3.45, lng: 97.75 },
    ]
    let nearest = cities[0]
    let bestDist = Infinity
    for (const c of cities) {
      const d = Math.hypot(lat - c.lat, lng - c.lng)
      if (d < bestDist) {
        bestDist = d
        nearest = c
      }
    }
    const coord = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    return {
      ok: true,
      name: `${nearest.name}, ${nearest.area}`,
      detail: `Koordinat ${coord}`,
      area: nearest.area,
      fullAddress: `Kawasan Konservasi ${nearest.name}, ${nearest.area}, Indonesia (${coord})`,
    }
  },

  getLandRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): { distanceKm: number; coordinates: [number, number][] } {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(toLat - fromLat)
    const dLng = toRad(toLng - fromLng)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2
    const distanceKm = Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
    const steps = 12
    const coordinates: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const curve = Math.sin(t * Math.PI) * 0.02
      coordinates.push([
        fromLng + (toLng - fromLng) * t + curve,
        fromLat + (toLat - fromLat) * t - curve * 0.5,
      ])
    }
    return { distanceKm, coordinates }
  },

  getFundraisings(): FundraisingCampaign[] {
    return loadState().fundraisings
  },

  createFundraising(
    userId: string,
    input: {
      refSource: RefSource
      refExternalId: string
      hazardKind: HazardKind
      title: string
      description: string
      locationName: string
      lat: number
      lng: number
      targetAmount: number
      coverImageBase64?: string
      coverMimeType?: string
      organizationId?: string
    },
  ): { ok: boolean; fundraising: FundraisingCampaign } {
    const state = loadState()
    const user = findUser(state, userId)
    const org = input.organizationId
      ? state.organizations.find((o) => o.id === input.organizationId)
      : null
    const id = uid('fund')
    const cover =
      input.coverImageBase64 && input.coverMimeType
        ? `data:${input.coverMimeType};base64,${input.coverImageBase64}`
        : input.hazardKind === 'wildfire'
          ? '/samples/fire-before.svg'
          : input.hazardKind === 'flood'
            ? '/samples/flood-before.svg'
            : input.hazardKind === 'volcano'
              ? '/samples/volcano-before.svg'
              : '/samples/mangrove-before.svg'

    const campaign: FundraisingCampaign = {
      id,
      ref_source: input.refSource,
      ref_external_id: input.refExternalId,
      hazard_kind: input.hazardKind,
      title: input.title,
      description: input.description,
      location_name: input.locationName,
      lat: input.lat,
      lng: input.lng,
      cover_image_url: cover,
      target_amount: input.targetAmount,
      collected_amount: 0,
      status: 'active',
      organizer_kind: org?.type === 'agency' ? 'agency' : user?.role === 'admin' ? 'admin' : 'organization',
      organizer_name: org?.name ?? user?.full_name ?? 'Komunitas Blam',
      organization_id: org?.id ?? null,
      created_by: userId,
      created_at: new Date().toISOString(),
      donations: [],
    }
    state.fundraisings.unshift(campaign)
    saveState(state)
    return { ok: true, fundraising: campaign }
  },

  donateToFundraising(
    userId: string | null,
    fundraisingId: string,
    input: {
      amount: number
      paymentMethod: PaymentMethod
      bankName?: string
      isAnonymous: boolean
      donorName?: string
      message?: string
    },
  ): { ok: boolean; fundraising: FundraisingCampaign; donation: FundraisingDonation } {
    const state = loadState()
    const campaign = state.fundraisings.find((f) => f.id === fundraisingId)
    if (!campaign) throw new Error('Kampanye donasi tidak ditemukan')
    const donor = findUser(state, userId)
    const donation: FundraisingDonation = {
      id: uid('don'),
      fundraising_id: fundraisingId,
      donor_id: input.isAnonymous ? null : userId,
      donor_name: input.isAnonymous
        ? 'Orang Baik'
        : input.donorName?.trim() || donor?.full_name || 'Donatur Tamu',
      is_anonymous: input.isAnonymous,
      amount: input.amount,
      payment_method: input.paymentMethod,
      bank_name: input.bankName ?? null,
      message: input.message ?? null,
      created_at: new Date().toISOString(),
    }
    campaign.donations.unshift(donation)
    campaign.collected_amount += input.amount
    if (campaign.collected_amount >= campaign.target_amount) {
      campaign.status = 'completed'
    }
    saveState(state)
    return { ok: true, fundraising: campaign, donation }
  },

  sendBlamChat(
    messages: BlamChatTurn[],
    context: BlamChatContext,
  ): { reply: string; actions?: BlamChatAction[] } {
    const last = messages[messages.length - 1]?.text.toLowerCase() ?? ''
    const state = loadState()
    const openEvents = state.events.filter((e) => e.status === 'open' || e.status === 'in_progress')

    if (context.selectedPoint) {
      const pt = context.selectedPoint
      return {
        reply: `Saat ini kamu sedang memantau **${pt.title}**${pt.locationName ? ` di ${pt.locationName}` : ''}. ${pt.description || pt.reason || 'Titik ini terintegrasi dengan radar konservasi Blam.'} Kamu bisa langsung ikut aksi, verifikasi lapangan, atau dukung kampanye donasinya.`,
        actions: [
          {
            type: 'open_blam_snap',
            label: 'Kirim Laporan Blam Snap',
            prefill: {
              incident: pt.signalKind === 'wildfire' ? 'Kebakaran' : pt.signalKind === 'flood' ? 'Banjir' : 'Lainnya',
              locationHint: pt.locationName ?? pt.title,
            },
          },
        ],
      }
    }

    if (last.includes('lapor') || last.includes('snap') || last.includes('sampah') || last.includes('banjir') || last.includes('kebakaran')) {
      const incident = last.includes('kebakaran')
        ? 'Kebakaran'
        : last.includes('banjir')
          ? 'Banjir'
          : last.includes('sampah')
            ? 'Sampah'
            : 'Lainnya'
      return {
        reply: `Siap! Untuk melaporkan kondisi ${incident.toLowerCase()} di lapangan, kamu bisa langsung unggah foto melalui **Blam Snap**. AI dan relawan akan memverifikasi titikmu.`,
        actions: [
          {
            type: 'open_blam_snap',
            label: `Buka Blam Snap (${incident})`,
            prefill: { incident },
          },
        ],
      }
    }

    const featured = openEvents[0]
    return {
      reply: `Halo${context.userName ? ` ${context.userName}` : ''}! Saat ini ada **${openEvents.length} gerakan konservasi aktif** dan **${state.envLayers.hotspots.length} titik panas** terpantau di radar Blam. Kamu bisa menjelajah peta, melapor via Blam Snap, atau bergabung ke aksi terdekat.`,
      actions: featured
        ? [
            {
              type: 'focus_map_point',
              label: `Lihat: ${featured.title}`,
              target: {
                title: featured.title,
                lat: featured.lat,
                lng: featured.lng,
                kind: 'event',
                eventId: featured.id,
              },
            },
          ]
        : undefined,
    }
  },
}
