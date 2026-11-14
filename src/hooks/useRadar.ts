import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_SITE_ID, SITES } from '../data/mockConservationData'
import type { Ecosystem, MapStyle } from '../types/conservation'

export function useRadar() {
  const [filter, setFilterState] = useState<Ecosystem | 'all'>('all')
  const [style, setStyle] = useState<MapStyle>('terang')
  const [showHotspots, setShowHotspots] = useState(false)
  const [showSpecies, setShowSpecies] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_SITE_ID)
  const [joined, setJoined] = useState<ReadonlySet<string>>(new Set())
  const [fitAllSignal, setFitAllSignal] = useState(0)
  const [locateSignal, setLocateSignal] = useState(0)

  const sites = useMemo(
    () => (filter === 'all' ? SITES : SITES.filter((s) => s.ecosystem === filter)),
    [filter],
  )

  const selected = useMemo(
    () => sites.find((s) => s.id === selectedId) ?? null,
    [sites, selectedId],
  )

  const setFilter = useCallback(
    (next: Ecosystem | 'all') => {
      setFilterState(next)
      const list = next === 'all' ? SITES : SITES.filter((s) => s.ecosystem === next)
      if (!list.some((s) => s.id === selectedId)) setSelectedId(list[0]?.id ?? null)
    },
    [selectedId],
  )

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
