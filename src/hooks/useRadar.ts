import { useCallback, useEffect, useMemo, useState } from 'react'
import { SITES as FALLBACK_SITES } from '../data/mockConservationData'
import { fetchSites } from '../services/reportsApi'
import type { ConservationSite, Ecosystem, MapStyle } from '../types/conservation'

export type DataSource = 'loading' | 'live' | 'fallback'

// Default: titik "resolved" pertama supaya Before–After langsung terlihat.
const pickDefault = (list: ConservationSite[]) =>
  (list.find((s) => s.status === 'resolved') ?? list[0])?.id ?? null

export function useRadar() {
  const [allSites, setAllSites] = useState<ConservationSite[]>([])
  const [source, setSource] = useState<DataSource>('loading')
  const [filter, setFilterState] = useState<Ecosystem | 'all'>('all')
  const [style, setStyle] = useState<MapStyle>('terang')
  const [showHotspots, setShowHotspots] = useState(false)
  const [showSpecies, setShowSpecies] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [joined, setJoined] = useState<ReadonlySet<string>>(new Set())
  const [fitAllSignal, setFitAllSignal] = useState(0)
  const [locateSignal, setLocateSignal] = useState(0)

  const load = useCallback(async () => {
    try {
      const live = await fetchSites()
      if (live.length === 0) throw new Error('Tabel reports kosong')
      setAllSites(live)
      setSource('live')
      setSelectedId((cur) => (cur && live.some((s) => s.id === cur) ? cur : pickDefault(live)))
    } catch (err) {
      console.warn('[Blum] Supabase gagal, pakai data lokal:', err)
      setAllSites(FALLBACK_SITES)
      setSource('fallback')
      setSelectedId((cur) => cur ?? pickDefault(FALLBACK_SITES))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sites = useMemo(
    () => (filter === 'all' ? allSites : allSites.filter((s) => s.ecosystem === filter)),
    [allSites, filter],
  )

  const selected = useMemo(
    () => sites.find((s) => s.id === selectedId) ?? null,
    [sites, selectedId],
  )

  const setFilter = useCallback(
    (next: Ecosystem | 'all') => {
      setFilterState(next)
      const list = next === 'all' ? allSites : allSites.filter((s) => s.ecosystem === next)
      if (!list.some((s) => s.id === selectedId)) setSelectedId(list[0]?.id ?? null)
    },
    [allSites, selectedId],
  )

  // Fase 1: lokal saja. Fase 2: optimistic + rollback ke /api/participants.
  const toggleJoin = useCallback((id: string) => {
    setJoined((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return {
    sites,
    source,
    refresh: load,
    selected,
    selectedId: selected?.id ?? null,
    setSelectedId,
    filter,
    setFilter,
    style,
    setStyle,
    showHotspots,
    toggleHotspots: () => setShowHotspots((v) => !v),
    showSpecies,
    toggleSpecies: () => setShowSpecies((v) => !v),
    joined,
    toggleJoin,
    fitAll: () => setFitAllSignal((n) => n + 1),
    locate: () => setLocateSignal((n) => n + 1),
    fitAllSignal,
    locateSignal,
  }
}

export type Radar = ReturnType<typeof useRadar>