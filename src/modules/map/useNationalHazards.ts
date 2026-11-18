import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { fetchNationalHazards } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { EonetPoint, HotspotPoint } from '../../types'
import { buildHazards } from './hotspotCluster'
import type { HazardSet } from './hotspotCluster'

const EMPTY: HazardSet = { credible: [], weak: [] }
const EMPTY_HOTSPOTS: HotspotPoint[] = []
const EMPTY_EONET: EonetPoint[] = []

/**
 * Mengambil snapshot hazard nasional (NASA FIRMS + NASA EONET) dalam 1 request
 * ringkas tanpa memicu query iNaturalist per anchor.
 */
export function useNationalHazards() {
  const query = useQuery({
    queryKey: ['hazards', 'id'],
    queryFn: ({ signal }) => fetchNationalHazards(signal),
    staleTime: CACHE_TTL_MS,
  })

  const hotspots = query.data?.hotspots ?? EMPTY_HOTSPOTS
  const eonet = query.data?.eonet ?? EMPTY_EONET

  const hazards = useMemo(
    () => (hotspots.length || eonet.length ? buildHazards(hotspots, eonet) : EMPTY),
    [hotspots, eonet],
  )

  const nHot = hotspots.length
  const nEonet = eonet.length
  const nCredible = hazards.credible.length
  const nWeak = hazards.weak.length
  useEffect(() => {
    console.info('[Blam:Hazards]', { hotspots: nHot, eonet: nEonet, credible: nCredible, weak: nWeak })
  }, [nHot, nEonet, nCredible, nWeak])

  return { hazards, loading: query.isFetching }
}