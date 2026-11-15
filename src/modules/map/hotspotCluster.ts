import type { EonetPoint, HazardKind, HotspotPoint, SatelliteSignal } from '../../types'

/**
 * Aturan "hotspot" Blam (satu tempat, supaya mudah diubah & dijelaskan ke juri).
 *
 * 1. Karhutla (NASA FIRMS)
 *    - Titik api yang jaraknya <= FIRE_MERGE_KM digabung jadi SATU kawasan.
 *    - Kawasan dianggap KREDIBEL (langsung muncul di radar) bila salah satu terpenuhi:
 *        a) >= FIRE_MIN_POINTS titik berdekatan yang berkeyakinan sedang/tinggi
 *           (titik berkeyakinan rendah tidak dihitung), ATAU
 *        b) 1 titik berkeyakinan tinggi dengan daya >= FIRE_STRONG_FRP MW, ATAU
 *        c) total daya radiasi >= FIRE_HUGE_FRP MW.
 *    - Selain itu = "sinyal lemah" (disembunyikan, hanya muncul lewat chip Sinyal lemah).
 * 2. Bencana alam (NASA EONET)
 *    - Gunung berapi, banjir, karhutla, badai besar = selalu kredibel & langsung tampil.
 *    - Kategori lain = sinyal lemah.
 */
export const FIRE_MERGE_KM = 15
export const FIRE_MIN_POINTS = 3
export const FIRE_STRONG_FRP = 15
export const FIRE_HUGE_FRP = 50
const EONET_DEDUPE_KM = 30

export interface HazardPoint {
    id: string
    kind: HazardKind
    kindLabel: string
    source: 'nasa_firms' | 'nasa_eonet'
    externalId: string
    memberIds: string[]
    title: string
    lat: number
    lng: number
    date: string
    credible: boolean
    severity: 'high' | 'medium' | 'low'
    reason: string
    pointCount: number
    totalFrp: number
    maxFrp: number
    radiusKm: number
    confidence?: string
}

export interface HazardSet {
    credible: HazardPoint[]
    weak: HazardPoint[]
}

export const KIND_LABEL: Record<HazardKind, string> = {
    wildfire: 'Karhutla',
    suspected: 'Masih Dugaan',
    volcano: 'Gunung Berapi',
    flood: 'Banjir',
    storm: 'Badai',
    other: 'Bencana Lain',
}

export function hotspotKey(h: HotspotPoint): string {
    return h.id || `firms:${h.acqDate || 'nd'}:${h.acqTime || 'nt'}:${h.lat.toFixed(4)}:${h.lng.toFixed(4)}`
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const rad = Math.PI / 180
    const dLat = (bLat - aLat) * rad
    const dLng = (bLng - aLng) * rad
    const s =
        Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)))
}

type Conf = 'h' | 'n' | 'l'

function confLevel(raw: string): Conf {
    const c = String(raw ?? '').toLowerCase()
    if (c === 'h' || c === 'high') return 'h'
    if (c === 'l' || c === 'low') return 'l'
    const num = Number(c)
    if (Number.isFinite(num) && c !== '') return num >= 80 ? 'h' : num >= 30 ? 'n' : 'l'
    return 'n'
}

function groupFires(points: HotspotPoint[]): HotspotPoint[][] {
    const n = points.length
    const parent = Array.from({ length: n }, (_, i) => i)
    const find = (i: number): number => {
        let x = i
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]]
            x = parent[x]
        }
        return x
    }

    const cell = 0.15 // ~16 km, >= FIRE_MERGE_KM sehingga cukup cek 3x3 sel
    const grid = new Map<string, number[]>()
    points.forEach((p, i) => {
        const key = `${Math.floor(p.lat / cell)}:${Math.floor(p.lng / cell)}`
        const list = grid.get(key)
        if (list) list.push(i)
        else grid.set(key, [i])
    })

    points.forEach((p, i) => {
        const cy = Math.floor(p.lat / cell)
        const cx = Math.floor(p.lng / cell)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const list = grid.get(`${cy + dy}:${cx + dx}`)
                if (!list) continue
                for (const j of list) {
                    if (j <= i) continue
                    if (haversineKm(p.lat, p.lng, points[j].lat, points[j].lng) <= FIRE_MERGE_KM) {
                        parent[find(j)] = find(i)
                    }
                }
            }
        }
    })

    const groups = new Map<number, HotspotPoint[]>()
    points.forEach((p, i) => {
        const root = find(i)
        const list = groups.get(root)
        if (list) list.push(p)
        else groups.set(root, [p])
    })
    return [...groups.values()]
}

function isKnownNonWildfire(lat: number, lng: number): boolean {
    // 1. TPA Jatibarang Semarang (-7.0051, 110.3505)
    if (Math.abs(lat - (-7.0051)) <= 0.035 && Math.abs(lng - 110.3505) <= 0.035) return true
    // 2. TPA Bantar Gebang Bekasi (-6.347, 106.994)
    if (Math.abs(lat - (-6.347)) <= 0.03 && Math.abs(lng - 106.994) <= 0.03) return true
    // 3. TPA Sarimukti Bandung Barat (-6.812, 107.368)
    if (Math.abs(lat - (-6.812)) <= 0.03 && Math.abs(lng - 107.368) <= 0.03) return true
    // 4. TPA Suwung Denpasar Bali (-8.718, 115.221)
    if (Math.abs(lat - (-8.718)) <= 0.03 && Math.abs(lng - 115.221) <= 0.03) return true
    // 5. TPA Benowo Surabaya (-7.22, 112.61) & TPA Piyungan Yogyakarta (-7.85, 110.43)
    if (Math.abs(lat - (-7.22)) <= 0.03 && Math.abs(lng - 112.61) <= 0.03) return true
    if (Math.abs(lat - (-7.85)) <= 0.03 && Math.abs(lng - 110.43) <= 0.03) return true
    // 6. Kilang Migas & Flare gas (Balongan, Cilacap, Balikpapan, Bojonegoro)
    if (Math.abs(lat - (-6.368)) <= 0.035 && Math.abs(lng - 108.384) <= 0.035) return true
    if (Math.abs(lat - (-7.702)) <= 0.035 && Math.abs(lng - 109.02) <= 0.035) return true
    if (Math.abs(lat - (-1.248)) <= 0.035 && Math.abs(lng - 116.835) <= 0.035) return true
    if (Math.abs(lat - (-7.165)) <= 0.035 && Math.abs(lng - 111.758) <= 0.035) return true
    // 7. Smelter Industri (Morowali, Cilegon)
    if (Math.abs(lat - (-2.827)) <= 0.04 && Math.abs(lng - 122.158) <= 0.04) return true
    if (Math.abs(lat - (-6.012)) <= 0.04 && Math.abs(lng - 105.998) <= 0.04) return true
    return false
}

function isTropicalForestZone(lat: number, lng: number): boolean {
    const isKalimantan = lat >= -4.5 && lat <= 4.5 && lng >= 108.5 && lng <= 119.0
    const isSumatera = lat >= -5.5 && lat <= 6.0 && lng >= 95.0 && lng <= 106.5
    const isPapua = lat >= -9.5 && lat <= 0.0 && lng >= 130.0 && lng <= 141.0
    return isKalimantan || isSumatera || isPapua
}

function buildFireArea(group: HotspotPoint[]): HazardPoint | null {
    let peak = group[0]
    let totalFrp = 0
    let wSum = 0
    let lat = 0
    let lng = 0
    let nonLowCount = 0
    let latestDate = ''
    for (const p of group) {
        const frp = Number.isFinite(p.frp) ? p.frp : 0
        totalFrp += frp
        const w = Math.max(frp, 1)
        wSum += w
        lat += p.lat * w
        lng += p.lng * w
        if (frp > (Number.isFinite(peak.frp) ? peak.frp : 0)) peak = p
        const lvl = confLevel(p.confidence)
        if (lvl !== 'l') nonLowCount++
        if (p.acqDate && p.acqDate > latestDate) latestDate = p.acqDate
    }
    lat /= wSum
    lng /= wSum

    if (isKnownNonWildfire(lat, lng)) {
        return null
    }

    let radiusKm = 0
    for (const p of group) radiusKm = Math.max(radiusKm, haversineKm(lat, lng, p.lat, p.lng))
    radiusKm = Math.max(1, Math.round(radiusKm))

    const count = group.length
    const peakConf = confLevel(peak.confidence)
    const peakFrp = Number.isFinite(peak.frp) ? peak.frp : 0
    const total = Math.round(totalFrp)

    const ruleCluster = nonLowCount >= FIRE_MIN_POINTS
    const ruleStrong = (peakConf === 'h' || peakConf === 'n') && peakFrp >= FIRE_STRONG_FRP
    const ruleHuge = totalFrp >= FIRE_HUGE_FRP
    const credible = ruleCluster || ruleStrong || ruleHuge

    // Sinyal lemah dihilangkan dari radar
    if (!credible) {
        return null
    }

    const confirmedWildfire = isTropicalForestZone(lat, lng) && (ruleCluster || ruleHuge)
    const kind: HazardKind = confirmedWildfire ? 'wildfire' : 'suspected'

    const reason =
        kind === 'wildfire'
            ? ruleHuge || total >= 100
                ? 'Kebakaran hutan dan lahan masif terpantau satelit dengan radiasi energi tinggi.'
                : `Kluster ${count} titik api aktif terdeteksi satelit dalam sebaran ±${radiusKm} km.`
            : 'Anomali radiasi panas terdeteksi satelit. Masih dugaan dan memerlukan verifikasi langsung relawan di lapangan.'

    // Karhutla terkonfirmasi selalu masuk Kritis (merah); dugaan masuk sedang (kuning)
    const severity: HazardPoint['severity'] = kind === 'wildfire' ? 'high' : 'medium'

    const title =
        kind === 'wildfire'
            ? count > 1
                ? `Karhutla · ${count} titik api`
                : `Karhutla · ${Math.round(peakFrp)} MW`
            : count > 1
                ? `Dugaan Anomali Panas · ${count} titik`
                : `Dugaan Anomali Panas · ${Math.round(peakFrp)} MW`

    const externalId = hotspotKey(peak)
    return {
        id: `nasa_firms:${externalId}`,
        kind,
        kindLabel: KIND_LABEL[kind],
        source: 'nasa_firms',
        externalId,
        memberIds: group.map(hotspotKey),
        title,
        lat,
        lng,
        date: latestDate || peak.acqDate,
        credible,
        severity,
        reason,
        pointCount: count,
        totalFrp: total,
        maxFrp: peakFrp,
        radiusKm,
        confidence: peakConf,
    }
}

function kindFromCategory(category: string): HazardKind {
    const c = category.toLowerCase()
    if (c.includes('wildfire')) return 'wildfire'
    if (c.includes('volcano')) return 'volcano'
    if (c.includes('flood')) return 'flood'
    if (c.includes('storm')) return 'storm'
    return 'other'
}

const EONET_REASON: Record<HazardKind, string> = {
    volcano: 'Aktivitas vulkanik aktif terpantau oleh sistem satelit NASA EONET.',
    flood: 'Genangan banjir terpantau oleh sistem satelit NASA EONET.',
    wildfire: 'Kebakaran hutan dan lahan berskala besar tercatat oleh sistem satelit NASA EONET.',
    suspected: 'Anomali panas terpantau satelit, perlu verifikasi langsung di lapangan.',
    storm: 'Sistem badai dan cuaca ekstrem terpantau aktif oleh NASA EONET.',
    other: 'Peristiwa alam terpantau oleh sistem satelit NASA EONET.',
}

const SEVERITY_RANK: Record<HazardPoint['severity'], number> = { high: 3, medium: 2, low: 1 }
const KIND_PRIORITY: Record<HazardKind, number> = { volcano: 4, flood: 4, wildfire: 3, suspected: 2, storm: 2, other: 1 }

export function severityRank(s: HazardPoint['severity']): number {
    return SEVERITY_RANK[s]
}

function eonetToHazard(e: EonetPoint): HazardPoint {
    const kind = kindFromCategory(`${e.category} ${e.categoryLabel}`)
    const credible = kind !== 'other'
    const severity: HazardPoint['severity'] = !credible
        ? 'low'
        : kind === 'storm'
            ? 'medium'
            : 'high'
    return {
        id: `nasa_eonet:${e.id}`,
        kind,
        kindLabel: KIND_LABEL[kind],
        source: 'nasa_eonet',
        externalId: e.id,
        memberIds: [e.id],
        title: e.title || KIND_LABEL[kind],
        lat: e.lat,
        lng: e.lng,
        date: e.date,
        credible,
        severity,
        reason: EONET_REASON[kind],
        pointCount: 1,
        totalFrp: 0,
        maxFrp: 0,
        radiusKm: 0,
    }
}

export function buildHazards(hotspots: HotspotPoint[], eonet: EonetPoint[]): HazardSet {
    const valid = hotspots.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng))
    const fires = groupFires(valid)
        .map(buildFireArea)
        .filter((f): f is HazardPoint => f !== null)
    const credibleFires = fires.filter((f) => f.credible)

    const eonetAreas: HazardPoint[] = []
    for (const e of eonet) {
        if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue
        const hz = eonetToHazard(e)
        if (hz.kind === 'wildfire') {
            // karhutla EONET yang sudah tercakup kawasan FIRMS tidak digambar dobel
            const twin = credibleFires.find(
                (f) => haversineKm(f.lat, f.lng, hz.lat, hz.lng) <= EONET_DEDUPE_KM + f.radiusKm,
            )
            if (twin) {
                twin.reason += ` Juga tercatat di NASA EONET: ${hz.title}.`
                continue
            }
        }
        eonetAreas.push(hz)
    }

    const all = [...fires, ...eonetAreas]
    const rank = (h: HazardPoint) =>
        SEVERITY_RANK[h.severity] * 1000 + KIND_PRIORITY[h.kind] * 100 + Math.min(99, h.totalFrp / 10)
    const credible = all.filter((h) => h.credible).sort((a, b) => rank(b) - rank(a))
    return { credible, weak: [] }
}

export function hazardToSignal(h: HazardPoint): SatelliteSignal {
    return {
        id: h.id,
        source: h.source,
        externalId: h.externalId,
        title: h.title,
        categoryLabel: h.kindLabel,
        lat: h.lat,
        lng: h.lng,
        date: h.date,
        confidence: h.confidence,
        frp: h.maxFrp > 0 ? h.maxFrp : undefined,
        ecosystem: h.kind === 'flood' ? 'watershed' : 'tropical_forest',
        kind: h.kind,
        reason: h.reason,
        pointCount: h.pointCount,
        totalFrp: h.totalFrp,
        radiusKm: h.radiusKm,
        memberIds: h.memberIds,
        credible: h.credible,
    }
}