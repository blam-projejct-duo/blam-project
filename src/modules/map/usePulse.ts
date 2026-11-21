import { useQuery } from '@tanstack/react-query'
import { fetchPulse } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { EnvPulse } from '../../types'

export interface PulseTileData {
  label: string
  value: string
  unit?: string
  status?: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function formatRainTile(rainMm: unknown): PulseTileData {
  if (!isNum(rainMm)) return { label: 'Hujan', value: '-', tone: 'neutral' }
  if (rainMm === 0) return { label: 'Hujan', value: '0', unit: 'mm', status: 'Kering', tone: 'neutral' }
  const status = rainMm <= 10 ? 'Hujan' : 'Deras'
  return {
    label: 'Hujan',
    value: rainMm.toFixed(1),
    unit: 'mm',
    status,
    tone: rainMm > 10 ? 'warn' : 'neutral',
  }
}

function formatWindTile(windKmh: unknown): PulseTileData {
  if (!isNum(windKmh)) return { label: 'Angin', value: '-', tone: 'neutral' }
  const w = Math.round(windKmh)
  const status = w < 15 ? 'Tenang' : w <= 30 ? 'Sedang' : 'Kencang'
  return {
    label: 'Angin',
    value: String(w),
    unit: 'km/j',
    status,
    tone: w > 30 ? 'warn' : 'neutral',
  }
}

function formatWaveTile(waveM: unknown): PulseTileData | null {
  if (!isNum(waveM)) return null
  const status = waveM < 0.5 ? 'Tenang' : waveM <= 1.5 ? 'Sedang' : 'Tinggi'
  return {
    label: 'Gelombang',
    value: waveM.toFixed(1),
    unit: 'm',
    status,
    tone: waveM > 1.5 ? 'warn' : 'neutral',
  }
}

export function formatPulseTiles(pulse: EnvPulse | null): PulseTileData[] {
  const aqiTile: PulseTileData = isNum(pulse?.aqi)
    ? (() => {
        const aqi = Math.round(pulse.aqi)
        const status = aqi <= 50 ? 'Bersih' : aqi <= 100 ? 'Sedang' : aqi <= 150 ? 'Tercemar' : 'Bahaya'
        const tone = aqi <= 50 ? 'good' : aqi <= 100 ? 'warn' : 'bad'
        return { label: 'Udara', value: String(aqi), unit: 'AQI', status, tone }
      })()
    : { label: 'Udara', value: '-', tone: 'neutral' }

  const smokeTile: PulseTileData = isNum(pulse?.pm25)
    ? (() => {
        const pm = Math.round(pulse.pm25)
        const status = pm < 15 ? 'Normal' : pm <= 35 ? 'Sedang' : pm <= 55 ? 'Pekat' : 'Bahaya'
        const tone = pm < 15 ? 'good' : pm <= 35 ? 'warn' : 'bad'
        return { label: 'Asap', value: String(pm), unit: 'µg/m³', status, tone }
      })()
    : { label: 'Asap', value: '-', tone: 'neutral' }

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
