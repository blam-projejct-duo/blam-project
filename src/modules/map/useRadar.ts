import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { fetchEvents, fetchLandRoute, joinEvent } from '../../lib/api'
import type { Ecosystem, MapStyle, SatelliteSignal } from '../../types'
import type { ZoomCommand } from './MapView'
import { buildAirArc, requestUserLocation } from './directions'
import type { ActiveRoute, RouteMode } from './directions'
import { hazardToSignal } from './hotspotCluster'
import { useNationalHazards } from './useNationalHazards'

export type RadarLoadState = 'loading' | 'live' | 'error'

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
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [fitAllSignal, setFitAllSignal] = useState(0)
  const [fitIndonesiaSignal, setFitIndonesiaSignal] = useState(0)
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
    if (!selectedId) return null
    return events.find((ev) => ev.id === selectedId) ?? null
  }, [events, selectedId])

  const selLat = selected?.lat ?? null
  const selLng = selected?.lng ?? null
  const focus = useMemo(
    () => (selLat !== null && selLng !== null ? { lat: selLat, lng: selLng } : null),
    [selLat, selLng],
  )
  const national = useNationalHazards(focus)
  const hazards = useMemo(
    () =>
      filter === 'all'
        ? national.hazards.credible
        : national.hazards.credible.filter(
            (h) => (h.kind === 'flood' ? 'watershed' : 'tropical_forest') === filter,
          ),
    [national.hazards.credible, filter],
  )

  // Daftar Satelit hanya berisi kawasan kredibel (karhutla, gunung berapi, banjir, badai)
  const satelliteSignals = useMemo<SatelliteSignal[]>(() => hazards.map(hazardToSignal), [hazards])

  const clearRoute = useCallback(() => {
    setActiveRoute(null)
    setRouteError(null)
    setRouteLoading(false)
  }, [])

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedSignalState(null)
    setSelectedIdState(id)
    setActiveRoute((prev) => (prev && prev.eventId === id ? prev : null))
    setRouteError(null)
  }, [])

  const setSelectedSignal = useCallback((signal: SatelliteSignal | null) => {
    setSelectedSignalState(signal)
    setActiveRoute(null)
    setRouteError(null)
  }, [])

  const startDirections = useCallback(
    async (target: { id: string; lat: number; lng: number }, preferredMode: RouteMode = 'land') => {
      setRouteLoading(true)
      setRouteError(null)
      try {
        const origin = await requestUserLocation()
        const destination = { lat: target.lat, lng: target.lng }
        const air = buildAirArc(origin, destination)

        let landCoordinates: [number, number][] | undefined
        let landDistanceKm: number | undefined
        let landError: string | undefined

        try {
          const land = await fetchLandRoute(origin.lat, origin.lng, destination.lat, destination.lng)
          landCoordinates = land.coordinates
          landDistanceKm = land.distanceKm
        } catch (err) {
          landError = err instanceof Error ? err.message : 'Rute darat tidak tersedia'
        }

        const landAvailable = Boolean(landCoordinates && landCoordinates.length >= 2)
        const mode: RouteMode = preferredMode === 'land' && landAvailable ? 'land' : 'air'

        setActiveRoute({
          eventId: target.id,
          mode,
          origin,
          destination,
          distanceKm: mode === 'land' && landDistanceKm !== undefined ? landDistanceKm : air.distanceKm,
          coordinates: mode === 'land' && landCoordinates ? landCoordinates : air.coordinates,
          landCoordinates,
          landDistanceKm,
          airCoordinates: air.coordinates,
          airDistanceKm: air.distanceKm,
          landAvailable,
          landError,
        })
      } catch (err) {
        setRouteError(err instanceof Error ? err.message : 'Gagal mendapatkan lokasi GPS')
      } finally {
        setRouteLoading(false)
      }
    },
    [],
  )

  const switchRouteMode = useCallback((nextMode: RouteMode) => {
    setActiveRoute((prev) => {
      if (!prev || prev.mode === nextMode) return prev
      if (nextMode === 'land') {
        if (!prev.landAvailable || !prev.landCoordinates) return prev
        return {
          ...prev,
          mode: 'land',
          distanceKm: prev.landDistanceKm ?? prev.distanceKm,
          coordinates: prev.landCoordinates,
        }
      }
      return {
        ...prev,
        mode: 'air',
        distanceKm: prev.airDistanceKm,
        coordinates: prev.airCoordinates,
      }
    })
  }, [])

  const refreshLayers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['layers'] })
  }, [queryClient])

  const setFilter = useCallback(
    (next: Ecosystem | 'all') => {
      setFilterState(next)
      const list = next === 'all' ? allEvents : allEvents.filter((ev) => ev.ecosystem === next)
      if (selectedId && !list.some((ev) => ev.id === selectedId)) setSelectedIdState(null)
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
    activeRoute,
    routeLoading,
    routeError,
    startDirections,
    switchRouteMode,
    clearRoute,
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
    fitIndonesia: () => setFitIndonesiaSignal((n) => n + 1),
    locate: () => setLocateSignal((n) => n + 1),
    zoom: (dir: 1 | -1) => setZoomCommand((c) => ({ id: (c?.id ?? 0) + 1, dir })),
    fitAllSignal,
    fitIndonesiaSignal,
    locateSignal,
    zoomCommand,
  }
}

export type Radar = ReturnType<typeof useRadar>