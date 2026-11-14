export interface PulseResponse {
  aqi: number | null
  pm25: number | null
  waveM: number | null
  windKmh: number | null
  rainMm: number | null
  hotspots: number | null
  species: number | null
  fetchedAt: string
  cached: boolean
}

export async function fetchPulse(lat: number, lng: number, signal?: AbortSignal): Promise<PulseResponse> {
  const res = await fetch(`/api/env/pulse?lat=${lat}&lng=${lng}`, { signal })
  if (!res.ok) throw new Error(`pulse ${res.status}`)
  return res.json()
}

// ---------- Pelaporan + AI Vision Gatekeeper ----------
export interface VerifyReportInput {
  imageBase64: string
  mimeType: 'image/jpeg'
  ecosystemType: 'coastal_mangrove' | 'tropical_forest' | 'watershed'
  description: string
  locationName: string
  lat: number
  lng: number
  isAnonymous: boolean
  reporterId?: string
}

export interface VerifyReportResult {
  isValid: boolean
  confidence: number
  severity: 'low' | 'medium' | 'critical'
  threatCategory: string
  summary: string
  reason: string
  recommendations: string[]
  saved: boolean
  reportId?: string
  imageUrl?: string
  pointsAwarded?: number
}

export async function verifyReport(input: VerifyReportInput): Promise<VerifyReportResult> {
  const res = await fetch('/api/ai/verify-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`)
  return data
}