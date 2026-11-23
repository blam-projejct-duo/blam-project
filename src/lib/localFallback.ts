import { localStore } from './localStore'

function parseBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== 'string') return {}
  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function localFallbackDispatch<T>(
  rawPath: string,
  method: string,
  rawBody: BodyInit | null | undefined,
  userId: string | null,
): T {
  const [pathname, qs = ''] = rawPath.split('?')
  const params = new URLSearchParams(qs)
  const body = parseBody(rawBody)
  const upperMethod = method.toUpperCase()

  // Auth & Profile
  if (pathname === '/auth/demo-accounts' && upperMethod === 'GET') {
    return { accounts: localStore.getDemoAccounts() } as T
  }
  if (pathname === '/auth/me' && upperMethod === 'GET') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.getMe(userId) as T
  }
  if (pathname === '/auth/profile' && upperMethod === 'PATCH') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.updateProfile(userId, body as never) as T
  }

  // Notifications
  const notifMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/)
  if (notifMatch && upperMethod === 'PATCH') {
    localStore.markNotificationRead(notifMatch[1])
    return { ok: true } as T
  }

  // Events
  if (pathname === '/events' && upperMethod === 'GET') {
    const includeCancelled = params.get('includeCancelled') === '1'
    return { events: localStore.getEvents(includeCancelled) } as T
  }
  if (pathname === '/events' && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.createEvent(userId, body as never) as T
  }
  const evVisMatch = pathname.match(/^\/events\/([^/]+)\/visibility$/)
  if (evVisMatch && upperMethod === 'PATCH') {
    localStore.updateEventVisibility(evVisMatch[1], body.visibility as never)
    return { ok: true } as T
  }
  const evJoinMatch = pathname.match(/^\/events\/([^/]+)\/join$/)
  if (evJoinMatch && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.joinEvent(userId, evJoinMatch[1]) as T
  }
  const evResolveMatch = pathname.match(/^\/events\/([^/]+)\/resolve$/)
  if (evResolveMatch && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.resolveEvent(userId, evResolveMatch[1], body as never) as T
  }

  // Reports
  if (pathname === '/reports/queue' && upperMethod === 'GET') {
    const includeRejected = params.get('includeRejected') === '1'
    return { reports: localStore.getReportsQueue(includeRejected) } as T
  }
  if (pathname === '/reports/verify-and-create' && upperMethod === 'POST') {
    return localStore.verifyAndCreateReport(userId, body as never) as T
  }
  const repVerifyMatch = pathname.match(/^\/reports\/([^/]+)\/verify$/)
  if (repVerifyMatch && upperMethod === 'PATCH') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    localStore.verifyCitizenReport(
      userId,
      repVerifyMatch[1],
      body.status as 'verified' | 'rejected',
      body.organizationId as string | undefined,
    )
    return { ok: true } as T
  }

  // Organizations
  if (pathname === '/orgs' && upperMethod === 'GET') {
    const includeUnverified = params.get('includeUnverified') === '1'
    return { organizations: localStore.getOrgs(includeUnverified) } as T
  }
  if (pathname === '/orgs' && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.createOrg(userId, body as never) as T
  }
  const orgJoinMatch = pathname.match(/^\/orgs\/([^/]+)\/join$/)
  if (orgJoinMatch && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    localStore.joinOrg(userId, orgJoinMatch[1])
    return { ok: true } as T
  }
  const orgMemberMatch = pathname.match(/^\/orgs\/([^/]+)\/members\/([^/]+)$/)
  if (orgMemberMatch && upperMethod === 'POST') {
    return localStore.manageOrgMember(
      orgMemberMatch[1],
      orgMemberMatch[2],
      body.action as 'approve' | 'remove',
    ) as T
  }

  // Admin
  if (pathname === '/admin/verify-org' && upperMethod === 'POST') {
    localStore.verifyOrgAdmin(body.organizationId as string, Boolean(body.approve))
    return { ok: true } as T
  }
  if (pathname === '/admin/moderate-report' && upperMethod === 'POST') {
    localStore.moderateReportAdmin(body.reportId as string, body.status as never)
    return { ok: true } as T
  }
  if (pathname === '/admin/moderate-event' && upperMethod === 'POST') {
    localStore.moderateEventAdmin(body.eventId as string, body.status as never)
    return { ok: true } as T
  }
  if (pathname === '/admin/moderate-hotspot' && upperMethod === 'POST') {
    localStore.moderateHotspotAdmin(body.hotspotId as string)
    return { ok: true } as T
  }
  if (pathname === '/admin/revoke-org' && upperMethod === 'POST') {
    localStore.revokeOrgAdmin(body.organizationId as string)
    return { ok: true } as T
  }
  if (pathname === '/admin/moderate-fundraising' && upperMethod === 'POST') {
    localStore.moderateFundraisingAdmin(body.campaignId as string, body.status as never)
    return { ok: true } as T
  }
  if (pathname === '/admin/broadcast' && upperMethod === 'POST') {
    localStore.broadcastAdminNotification(body as never)
    return { ok: true } as T
  }
  if (pathname === '/admin/users' && upperMethod === 'GET') {
    return { users: localStore.getUsersAdmin() } as T
  }

  // Signals & Agency
  if (pathname === '/env/verified-signals' && upperMethod === 'GET') {
    return { signals: localStore.getVerifiedSignals() } as T
  }
  if (pathname === '/signals/verify' && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return { ok: true, signal: localStore.verifyRadarSignal(userId, body as never) } as T
  }
  if (pathname === '/agency/verify-action' && upperMethod === 'POST') {
    localStore.verifyActionAgency(body.actionId as string)
    return { ok: true } as T
  }

  // Env, Geocode, Route
  if (pathname === '/env/pulse' && upperMethod === 'GET') {
    const lat = Number(params.get('lat') ?? -6.2)
    const lng = Number(params.get('lng') ?? 106.8)
    return localStore.getEnvPulse(lat, lng) as T
  }
  if (pathname === '/env/layers' && upperMethod === 'GET') {
    return localStore.getEnvLayers() as T
  }
  if (pathname === '/geocode/reverse' && upperMethod === 'GET') {
    const lat = Number(params.get('lat') ?? -6.2)
    const lng = Number(params.get('lng') ?? 106.8)
    return localStore.reverseGeocode(lat, lng) as T
  }
  if (pathname === '/route' && upperMethod === 'GET') {
    const fromLat = Number(params.get('fromLat') ?? -6.2)
    const fromLng = Number(params.get('fromLng') ?? 106.8)
    const toLat = Number(params.get('toLat') ?? -6.1)
    const toLng = Number(params.get('toLng') ?? 106.77)
    return { ok: true, ...localStore.getLandRoute(fromLat, fromLng, toLat, toLng) } as T
  }

  // Fundraisings
  if (pathname === '/fundraisings' && upperMethod === 'GET') {
    return { fundraisings: localStore.getFundraisings() } as T
  }
  if (pathname === '/fundraisings' && upperMethod === 'POST') {
    if (!userId) throw new Error('Silakan masuk akun terlebih dahulu')
    return localStore.createFundraising(userId, body as never) as T
  }
  const fundDonateMatch = pathname.match(/^\/fundraisings\/([^/]+)\/donate$/)
  if (fundDonateMatch && upperMethod === 'POST') {
    return localStore.donateToFundraising(userId, fundDonateMatch[1], body as never) as T
  }

  // Chat
  if (pathname === '/chat' && upperMethod === 'POST') {
    return localStore.sendBlamChat((body.messages as never) ?? [], (body.context as never) ?? {}) as T
  }

  throw new Error(`Endpoint lokal tidak tersedia: ${upperMethod} ${pathname}`)
}
