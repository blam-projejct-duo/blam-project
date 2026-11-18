import type { GeoJSONSource } from 'maplibre-gl'
import indonesiaBoundary from './indonesiaBoundary.json'

type GeoJsonData = Parameters<GeoJSONSource['setData']>[0]
type Coord = [number, number]

export const INDONESIA_GEOJSON = indonesiaBoundary as unknown as GeoJsonData

const BAND_COUNT = 40
const LNG_MIN = 95.2
const LNG_MAX = 141.0
export const WIPE_SOFTNESS = 0.22

function clipHalfplane(ring: Coord[], xCut: number, keepLeft: boolean): Coord[] {
  if (ring.length < 3) return []
  const out: Coord[] = []
  const inside = (p: Coord) => (keepLeft ? p[0] <= xCut : p[0] >= xCut)
  const intersect = (a: Coord, b: Coord): Coord => {
    const dx = b[0] - a[0]
    if (Math.abs(dx) < 1e-12) return [xCut, a[1]]
    const t = (xCut - a[0]) / dx
    return [xCut, a[1] + t * (b[1] - a[1])]
  }

  let prev = ring[ring.length - 1]
  let prevIn = inside(prev)
  for (const cur of ring) {
    const curIn = inside(cur)
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur))
      out.push(cur)
    } else if (prevIn) {
      out.push(intersect(prev, cur))
    }
    prev = cur
    prevIn = curIn
  }

  if (out.length < 3) return []
  const first = out[0]
  const last = out[out.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) out.push(first)
  return out
}

function clipSegmentToBand(a: Coord, b: Coord, x0: number, x1: number): [Coord, Coord] | null {
  const dx = b[0] - a[0]
  let t0 = 0
  let t1 = 1
  if (Math.abs(dx) < 1e-12) {
    if (a[0] < x0 || a[0] > x1) return null
  } else if (dx > 0) {
    t0 = Math.max(t0, (x0 - a[0]) / dx)
    t1 = Math.min(t1, (x1 - a[0]) / dx)
  } else {
    t0 = Math.max(t0, (x1 - a[0]) / dx)
    t1 = Math.min(t1, (x0 - a[0]) / dx)
  }
  if (t0 > t1) return null
  const dy = b[1] - a[1]
  return [
    [a[0] + t0 * dx, a[1] + t0 * dy],
    [a[0] + t1 * dx, a[1] + t1 * dy],
  ]
}

function appendSegment(chains: Coord[][], seg: [Coord, Coord]): void {
  const prevChain = chains[chains.length - 1]
  if (prevChain) {
    const tail = prevChain[prevChain.length - 1]
    if (Math.abs(tail[0] - seg[0][0]) < 1e-6 && Math.abs(tail[1] - seg[0][1]) < 1e-6) {
      prevChain.push(seg[1])
      return
    }
  }
  chains.push([seg[0], seg[1]])
}

let cachedWipe: { fill: GeoJsonData; line: GeoJsonData } | null = null

/** Pre-slices Indonesia's boundary into longitudinal bands so MapLibre can animate a 60fps wipe. */
export function getIndonesiaWipeSources(): { fill: GeoJsonData; line: GeoJsonData } {
  if (cachedWipe) return cachedWipe

  const polygons = indonesiaBoundary.features[0].geometry.coordinates as Coord[][][]
  const step = (LNG_MAX - LNG_MIN) / BAND_COUNT
  const fillFeatures: Array<{
    type: 'Feature'
    properties: { p: number }
    geometry: { type: 'MultiPolygon'; coordinates: Coord[][][] }
  }> = []
  const lineFeatures: Array<{
    type: 'Feature'
    properties: { p: number }
    geometry: { type: 'MultiLineString'; coordinates: Coord[][] }
  }> = []

  for (let i = 0; i < BAND_COUNT; i++) {
    const x0 = LNG_MIN + i * step
    const x1 = LNG_MIN + (i + 1) * step
    const p = i / (BAND_COUNT - 1)
    const bandPolys: Coord[][][] = []
    const bandLines: Coord[][] = []

    for (const poly of polygons) {
      const ring = poly[0]
      if (!ring || ring.length < 4) continue
      const clipped = clipHalfplane(clipHalfplane(ring, x0, false), x1, true)
      if (clipped.length >= 4) bandPolys.push([clipped])

      for (let k = 0; k < ring.length - 1; k++) {
        const seg = clipSegmentToBand(ring[k], ring[k + 1], x0, x1)
        if (seg) appendSegment(bandLines, seg)
      }
    }

    if (bandPolys.length > 0) {
      fillFeatures.push({
        type: 'Feature',
        properties: { p },
        geometry: { type: 'MultiPolygon', coordinates: bandPolys },
      })
    }
    if (bandLines.length > 0) {
      lineFeatures.push({
        type: 'Feature',
        properties: { p },
        geometry: { type: 'MultiLineString', coordinates: bandLines },
      })
    }
  }

  cachedWipe = {
    fill: { type: 'FeatureCollection', features: fillFeatures } as GeoJsonData,
    line: { type: 'FeatureCollection', features: lineFeatures } as GeoJsonData,
  }
  return cachedWipe
}
