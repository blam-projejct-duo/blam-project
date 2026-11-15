import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { fetchEvents, joinEvent } from '../../lib/api'
import type { ConservationEvent, Ecosystem, MapStyle } from '../../types'
import type { ZoomCommand } from './MapView'
import { useEnvLayers } from './useEnvLayers'

export type RadarLoadState = 'loading' | 'live' | 'error'

const pickDefault = (list: ConservationEvent[]) =>
  (list.find((ev) => ev.status === 'resolved') ?? list[0])?.id ?? null

function readInitialEventParam(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('event') ?? params.get('titik')
}

export function useRadar(currentUserId?: string | null) {
  const queryClient = useQueryClient()
  const [deepLinkedId] = useState<string | null>(readInitialEventParam)
  const [filter, setFilterState] = useState<Ecosystem | 'all'>('all')
  const [style, setStyle] = useState<MapStyle>('terang')
  const [showHotspots, setShowHotspots] = useState(false)
  const [showSpecies, setShowSpecies] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(() => readInitialEventParam())
  const [fitAllSignal, setFitAllSignal] = useState(0)
  const [locateSignal, setLocateSignal] = useState(0)
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand | null>(null)

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents(false),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const allEvents = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const state: RadarLoadState = eventsQuery.data
    ? 'live'
    : eventsQuery.isError
      ? 'error'
      : 'loading'
  const errorMessage =
    eventsQuery.isError && !eventsQuery.data
      ? eventsQuery.error instanceof Error
        ? eventsQuery.error.message
        : 'Gagal memuat data event radar dari server'
      : null

  const refresh = useCallback(async () => {
    const fresh = await fetchEvents(false, true)
    queryClient.setQueryData(['events'], fresh)
  }, [queryClient])

  const events = useMemo(
    () => (filter === 'all' ? allEvents : allEvents.filter((ev) => ev.ecosystem === filter)),
    [allEvents, filter],
  )

  const selected = useMemo(() => {
    if (selectedId) {
      const match = events.find((ev) => ev.id === selectedId)
      if (match) return match
    }
    const defId = pickDefault(events)
    return (defId ? events.find((ev) => ev.id === defId) : null) ?? events[0] ?? null
  }, [events, selectedId])

  const layersQuery = useEnvLayers(
    selected?.lat ?? -3.8,
    selected?.lng ?? 102.26,
    showHotspots || showSpecies,
  )

  const hotspots = useMemo(() => layersQuery.data?.hotspots ?? [], [layersQuery.data?.hotspots])
  const eonetPoints = useMemo(() => layersQuery.data?.eonet ?? [], [layersQuery.data?.eonet])
  const speciesPoints = useMemo(() => layersQuery.data?.species ?? [], [layersQuery.data?.species])

  const setFilter = useCallback(
    (next: Ecosystem | 'all') => {
      setFilterState(next)
      const list = next === 'all' ? allEvents : allEvents.filter((ev) => ev.ecosystem === next)
      if (!list.some((ev) => ev.id === selectedId)) setSelectedId(list[0]?.id ?? null)
    },
    [allEvents, selectedId],
  )

  const joinedIds = useMemo(() => {
    if (!currentUserId) return new Set<string>()
    return new Set(
      allEvents
        .filter((ev) => ev.event_participants?.some((p) => p.user_id === currentUserId))
        .map((ev) => ev.id),
    )
  }, [allEvents, currentUserId])

  const joinAction = useCallback(
    async (eventId: string) => {
      const res = await joinEvent(eventId)
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      return res
    },
    [queryClient],
  )

  return {
    deepLinkedId,
    allEvents,
    events,
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
    eonetPoints,
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
