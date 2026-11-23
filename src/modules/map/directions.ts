export type RouteMode = 'land' | 'air'

export interface RoutePoint {
  lat: number
  lng: number
}

export interface ActiveRoute {
  eventId: string
  mode: RouteMode
  origin: RoutePoint
  destination: RoutePoint
  distanceKm: number
  coordinates: [number, number][]
  landCoordinates?: [number, number][]
  landDistanceKm?: number
  airCoordinates: [number, number][]
  airDistanceKm: number
  landAvailable: boolean
  landError?: string
}

function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)))
}

/**
 * Great-circle arc in [lng, lat] coordinates for air routes.
 */
export function buildAirArc(from: RoutePoint, to: RoutePoint, segments = 48): {
  distanceKm: number
  coordinates: [number, number][]
} {
  const distanceKm = Math.round(haversineKm(from, to) * 10) / 10
  const rad = Math.PI / 180
  const deg = 180 / Math.PI
  const lat1 = from.lat * rad
  const lng1 = from.lng * rad
  const lat2 = to.lat * rad
  const lng2 = to.lng * rad

  const x1 = Math.cos(lat1) * Math.cos(lng1)
  const y1 = Math.cos(lat1) * Math.sin(lng1)
  const z1 = Math.sin(lat1)
  const x2 = Math.cos(lat2) * Math.cos(lng2)
  const y2 = Math.cos(lat2) * Math.sin(lng2)
  const z2 = Math.sin(lat2)

  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2))
  const omega = Math.acos(dot)
  if (omega < 1e-6) {
    return {
      distanceKm,
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }
  }

  const sinOmega = Math.sin(omega)
  const coordinates: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = Math.sin((1 - t) * omega) / sinOmega
    const b = Math.sin(t * omega) / sinOmega
    const x = a * x1 + b * x2
    const y = a * y1 + b * y2
    const z = a * z1 + b * z2
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * deg
    const lng = Math.atan2(y, x) * deg
    coordinates.push([lng, lat])
  }
  return { distanceKm, coordinates }
}

import { requestUserLocation as requestSharedUserLocation } from '../../lib/location'

export async function requestUserLocation(): Promise<RoutePoint> {
  const coords = await requestSharedUserLocation({ highAccuracy: true, timeoutMs: 8000 })
  if (coords) return coords
  throw new Error('Izin lokasi GPS belum aktif. Aktifkan izin lokasi di browser lalu coba lagi.')
}
