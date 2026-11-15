import { useQuery } from '@tanstack/react-query'
import { fetchEnvLayers } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'

export function useEnvLayers(lat: number, lng: number, enabled: boolean) {
  return useQuery({
    queryKey: ['layers', `${lat.toFixed(1)},${lng.toFixed(1)}`],
    queryFn: ({ signal }) => fetchEnvLayers(lat, lng, signal),
    enabled,
    staleTime: CACHE_TTL_MS,
  })
}
