import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFundraisings } from '../../lib/api'
import type { FundraisingCampaign, SatelliteSignal } from '../../types'

export const FUNDRAISINGS_QUERY_KEY = ['fundraisings'] as const

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)))
}

export function isCriticalRadarSignal(signal: SatelliteSignal): boolean {
  if (signal.severity === 'high') return true
  return signal.kind === 'flood' || signal.kind === 'wildfire' || signal.kind === 'volcano' || signal.kind === 'storm'
}

export function findFundraisingForSignal(
  fundraisings: FundraisingCampaign[],
  signal: SatelliteSignal,
): FundraisingCampaign | null {
  const candidates = new Set([signal.externalId, ...(signal.memberIds ?? [])])
  return (
    fundraisings.find(
      (f) => f.ref_source === signal.source && candidates.has(f.ref_external_id) && f.status !== 'closed',
    ) ?? null
  )
}

export function useFundraisings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: FUNDRAISINGS_QUERY_KEY,
    queryFn: fetchFundraisings,
    staleTime: 30_000,
  })

  const refreshFundraisings = async () => {
    await queryClient.invalidateQueries({ queryKey: FUNDRAISINGS_QUERY_KEY })
  }

  return {
    fundraisings: query.data ?? [],
    isLoading: query.isLoading,
    refreshFundraisings,
  }
}
