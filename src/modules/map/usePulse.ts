import { useQuery } from '@tanstack/react-query'
import { fetchPulse } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'

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
