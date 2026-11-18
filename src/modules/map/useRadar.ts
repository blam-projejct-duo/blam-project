import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { fetchEvents, joinEvent } from '../../lib/api'
import type { ConservationEvent, Ecosystem, MapStyle, SatelliteSignal } from '../../types'
import type { ZoomCommand } from './MapView'
import { hazardToSignal } from './hotspotCluster'
import { useNationalHazards } from './useNationalHazards'

export type RadarLoadState = 'loading' | 'live' | 'error'

const pickDefault = (list: ConservationEvent[]) =>
  (list.find((ev) => ev.status === 'open') ?? list[0])?.id ?? null

function readInitialEventParam(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('event') ?? params.get('titik')
}

export function useRadar(currentUserId?: string | null) {
  const queryClient = useQueryClient()
  const [deepLinkedId] = useState<string | null>(readInitialEventParam)
  const [filter, setFilterState] = useState<Ecosystem | 'all'>('all')
  const [style, setStyle] = useState<MapStyle>('satelit')
  const [selectedId, setSelectedIdState] = useState<string | null>(() => readInitialEventParam())
  const [selectedSignal, setSelectedSignalState] = useState<SatelliteSignal | null>(null)
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

  const selLat = selected?.lat ?? null
  const selLng = selected?.lng ?? null
  const focus = useMemo(
    () => (selLat !== null && selLng !== null ? { lat: selLat, lng: selLng } : null),
    [selLat, selLng],
  )
  const national = useNationalHazards(focus)
  const hazards = national.hazards.credible

  // Daftar Satelit hanya berisi kawasan kredibel (karhutla, gunung berapi, banjir, badai)
  const satelliteSignals = useMemo<SatelliteSignal[]>(() => hazards.map(hazardToSignal), [hazards])

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedSignalState(null)
    setSelectedIdState(id)
  }, [])

  const setSelectedSignal = useCallback((signal: SatelliteSignal | null) => {
    setSelectedSignalState(signal)
  }, [])

  const refreshLayers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['layers'] })
  }, [queryClient])

  const setFilter = useCallback(
    (next: Ecosystem | 'all') => {
      setFilterState(next)
      const list = next === 'all' ? allEvents : allEvents.filter((ev) => ev.ecosystem === next)
      if (!list.some((ev) => ev.id === selectedId)) setSelectedIdState(list[0]?.id ?? null)
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
    selectedSignal,
    setSelectedSignal,
    satelliteSignals,
    refreshLayers,
    filter,
    setFilter,
    style,
    setStyle,
    hazards,
    layersLoading: national.loading,
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