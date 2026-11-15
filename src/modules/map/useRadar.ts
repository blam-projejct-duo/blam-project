import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { fetchReports, joinReportAction } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { Ecosystem, MapStyle, Report } from '../../types'
import type { ZoomCommand } from './MapView'
import { useEnvLayers } from './useEnvLayers'

export type RadarLoadState = 'loading' | 'live' | 'error'

const pickDefault = (list: Report[]) =>
  (list.find((r) => r.status === 'resolved') ?? list[0])?.id ?? null

export function useRadar(currentUserId?: string | null) {
  const queryClient = useQueryClient()
  const [filter, setFilterState] = useState<Ecosystem | 'all'>('all')
  const [style, setStyle] = useState<MapStyle>('terang')
  const [showHotspots, setShowHotspots] = useState(false)
  const [showSpecies, setShowSpecies] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fitAllSignal, setFitAllSignal] = useState(0)
  const [locateSignal, setLocateSignal] = useState(0)
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand | null>(null)

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchReports(false),
    staleTime: CACHE_TTL_MS,
  })

  const allReports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])
  const state: RadarLoadState = reportsQuery.data
    ? 'live'
    : reportsQuery.isError
      ? 'error'
      : 'loading'
  const errorMessage =
    reportsQuery.isError && !reportsQuery.data
      ? reportsQuery.error instanceof Error
        ? reportsQuery.error.message
        : 'Gagal memuat data radar dari server'
      : null

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
    await reportsQuery.refetch()
  }, [queryClient, reportsQuery])

  const reports = useMemo(
    () => (filter === 'all' ? allReports : allReports.filter((r) => r.ecosystem === filter)),
    [allReports, filter],
  )

  const selected = useMemo(() => {
    if (selectedId) {
      const match = reports.find((r) => r.id === selectedId)
      if (match) return match
    }
    const defId = pickDefault(reports)
    return (defId ? reports.find((r) => r.id === defId) : null) ?? reports[0] ?? null
  }, [reports, selectedId])

  const layersQuery = useEnvLayers(
    selected?.lat ?? -3.8,
    selected?.lng ?? 102.26,
    showHotspots || showSpecies,
  )

  const hotspots = useMemo(() => layersQuery.data?.hotspots ?? [], [layersQuery.data?.hotspots])
  const speciesPoints = useMemo(() => layersQuery.data?.species ?? [], [layersQuery.data?.species])

  const setFilter = useCallback(
    (next: Ecosystem | 'all') => {
      setFilterState(next)
      const list = next === 'all' ? allReports : allReports.filter((r) => r.ecosystem === next)
      if (!list.some((r) => r.id === selectedId)) setSelectedId(list[0]?.id ?? null)
    },
    [allReports, selectedId],
  )

  const joinedIds = useMemo(() => {
    if (!currentUserId) return new Set<string>()
    return new Set(
      allReports
        .filter((r) => r.action_participants?.some((p) => p.user_id === currentUserId))
        .map((r) => r.id),
    )
  }, [allReports, currentUserId])

  const joinAction = useCallback(
    async (reportId: string) => {
      const res = await joinReportAction(reportId)
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      return res
    },
    [queryClient],
  )

  return {
    allReports,
    reports,
    state,
    errorMessage,
    refresh,
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
    hotspots,
    speciesPoints,
    layersLoading: layersQuery.isFetching,
    joinedIds,
    joinAction,
    fitAll: () => setFitAllSignal((n) => n + 1),
    locate: () => setLocateSignal((n) => n + 1),
    zoom: (dir: 1 | -1) => setZoomCommand((c) => ({ id: (c?.id ?? 0) + 1, dir })),
    fitAllSignal,
    locateSignal,
    zoomCommand,
  }
}

export type Radar = ReturnType<typeof useRadar>
