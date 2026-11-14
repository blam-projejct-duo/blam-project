import { useEffect, useState } from 'react'
import { fetchPulse } from '../services/apiClient'
import type { ConservationSite, SitePulse } from '../types/conservation'

const memo = new Map<string, SitePulse>()

/** Pulse live per titik; jatuh ke nilai bawaan (site.pulse) kalau API gagal / kosong. */
export function usePulse(site: ConservationSite) {
  const key = `${site.lat.toFixed(2)},${site.lng.toFixed(2)}`
  const [pulse, setPulse] = useState<SitePulse>(memo.get(key) ?? site.pulse)
  const [status, setStatus] = useState<'loading' | 'live' | 'fallback'>(memo.has(key) ? 'live' : 'loading')

  useEffect(() => {
    const cached = memo.get(key)
    if (cached) {
      setPulse(cached)
      setStatus('live')
      return
    }
    const ctrl = new AbortController()
    setPulse(site.pulse)
    setStatus('loading')
    fetchPulse(site.lat, site.lng, ctrl.signal)
      .then((r) => {
        const next: SitePulse = {
          aqi: r.aqi ?? site.pulse.aqi,
          waveM: r.waveM ?? 0,
          hotspots: r.hotspots ?? site.pulse.hotspots,
          species: r.species ?? site.pulse.species,
        }
        memo.set(key, next)
        setPulse(next)
        setStatus('live')
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setStatus('fallback')
      })
    return () => ctrl.abort()
  }, [key, site.lat, site.lng, site.pulse])

  return { pulse, status }
}