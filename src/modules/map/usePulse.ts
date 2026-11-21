import { useQuery } from '@tanstack/react-query'
import { fetchPulse } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { EnvPulse } from '../../types'

export interface PulseTileData {
  label: string
  value: string
  unit?: string
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function formatRainTile(rainMm: unknown): PulseTileData {
  if (!isNum(rainMm)) return { label: 'Curah Hujan', value: '-' }
  if (rainMm === 0) return { label: 'Curah Hujan', value: 'Kering · 0', unit: 'mm' }
  const status = rainMm <= 10 ? 'Hujan' : 'Deras'
  return { label: 'Curah Hujan', value: `${status} · ${rainMm.toFixed(1)}`, unit: 'mm' }
}

function formatWindTile(windKmh: unknown): PulseTileData {
  if (!isNum(windKmh)) return { label: 'Tiupan Angin', value: '-' }
  const w = Math.round(windKmh)
  const status = w < 15 ? 'Tenang' : w <= 30 ? 'Sedang' : 'Kencang'
  return { label: 'Tiupan Angin', value: `${status} · ${w}`, unit: 'km/j' }
}

function formatWaveTile(waveM: unknown): PulseTileData | null {
  if (!isNum(waveM)) return null
  const status = waveM < 0.5 ? 'Tenang' : waveM <= 1.5 ? 'Sedang' : 'Tinggi'
  return { label: 'Gelombang Laut', value: `${status} · ${waveM.toFixed(1)}`, unit: 'm' }
}

export function formatPulseTiles(pulse: EnvPulse | null): PulseTileData[] {
  const aqiTile: PulseTileData = isNum(pulse?.aqi)
    ? (() => {
        const aqi = Math.round(pulse.aqi)
        const status = aqi <= 50 ? 'Bersih' : aqi <= 100 ? 'Sedang' : aqi <= 150 ? 'Tercemar' : 'Bahaya'
        return { label: 'Kualitas Udara', value: `${status} · ${aqi}`, unit: 'AQI' }
      })()
    : { label: 'Kualitas Udara', value: '-' }

  const smokeTile: PulseTileData = isNum(pulse?.pm25)
    ? (() => {
        const pm = Math.round(pulse.pm25)
        const status = pm < 15 ? 'Normal' : pm <= 35 ? 'Sedang' : pm <= 55 ? 'Pekat' : 'Bahaya'
        return { label: 'Kepekatan Asap', value: `${status} · ${pm}`, unit: 'µg/m³' }
      })()
    : { label: 'Kepekatan Asap', value: '-' }

  const surfaceTile = formatWaveTile(pulse?.waveM) ?? formatRainTile(pulse?.rainMm)
  const windTile = formatWindTile(pulse?.windKmh)

  return [aqiTile, smokeTile, surfaceTile, windTile]
}

export function formatFloodPulseTiles(pulse: EnvPulse | null): PulseTileData[] {
  const tiles = [formatRainTile(pulse?.rainMm), formatWindTile(pulse?.windKmh)]
  const waveTile = formatWaveTile(pulse?.waveM)
  if (waveTile) tiles.push(waveTile)
  return tiles
}

export function usePulse(lat: number, lng: number) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`

  const query = useQuery({
    queryKey: ['pulse', key],
    queryFn: ({ signal }) => fetchPulse(lat, lng, signal),
    staleTime: CACHE_TTL_MS,
  })

  const status: 'loading' | 'live' | 'error' = query.data
    ? 'live'
    : query.isError
      ? 'error'
      : 'loading'

  return {
    pulse: query.data ?? null,
    status,
  }
}
