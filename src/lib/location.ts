import { useEffect, useState } from 'react'

export interface UserCoords {
  lat: number
  lng: number
}

export type GeoPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

interface LocationSnapshot {
  coords: UserCoords | null
  permission: GeoPermissionState
  requesting: boolean
  error: string | null
}

let snapshot: LocationSnapshot = {
  coords: null,
  permission: typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'prompt' : 'unsupported',
  requesting: false,
  error: null,
}

const listeners = new Set<() => void>()
let inflightPromise: Promise<UserCoords | null> | null = null
let permissionWatcherStarted = false

function emit() {
  for (const fn of listeners) fn()
}

function setSnapshot(patch: Partial<LocationSnapshot>) {
  snapshot = { ...snapshot, ...patch }
  emit()
}

function ensurePermissionWatcher() {
  if (permissionWatcherStarted || typeof navigator === 'undefined') return
  permissionWatcherStarted = true
  if (!('geolocation' in navigator)) {
    setSnapshot({ permission: 'unsupported' })
    return
  }
  if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        setSnapshot({ permission: status.state as GeoPermissionState })
        status.onchange = () => {
          setSnapshot({ permission: status.state as GeoPermissionState })
          if (status.state === 'granted' && !snapshot.coords) {
            void requestUserLocation()
          }
        }
      })
      .catch(() => {
        // ignore browsers without permissions API for geolocation
      })
  }
}

export function getCachedUserCoords(): UserCoords | null {
  return snapshot.coords
}

export function getLocationSnapshot(): LocationSnapshot {
  return snapshot
}

export function requestUserLocation(opts?: {
  highAccuracy?: boolean
  timeoutMs?: number
  forceRefresh?: boolean
}): Promise<UserCoords | null> {
  ensurePermissionWatcher()

  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    setSnapshot({
      permission: 'unsupported',
      requesting: false,
      error: 'Perangkat atau browser tidak mendukung GPS',
    })
    return Promise.resolve(null)
  }

  if (snapshot.coords && !opts?.forceRefresh) {
    return Promise.resolve(snapshot.coords)
  }

  if (inflightPromise) return inflightPromise

  setSnapshot({ requesting: true, error: null })

  inflightPromise = new Promise<UserCoords | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: UserCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        inflightPromise = null
        setSnapshot({
          coords,
          permission: 'granted',
          requesting: false,
          error: null,
        })
        resolve(coords)
      },
      (err) => {
        inflightPromise = null
        const denied = err.code === 1
        setSnapshot({
          permission: denied ? 'denied' : snapshot.permission,
          requesting: false,
          error: denied
            ? 'Izin lokasi ditolak. Aktifkan lokasi di pengaturan browser.'
            : 'Gagal mendapatkan lokasi GPS.',
        })
        resolve(snapshot.coords)
      },
      {
        enableHighAccuracy: opts?.highAccuracy ?? false,
        maximumAge: opts?.forceRefresh ? 5000 : 30000,
        timeout: opts?.timeoutMs ?? 6000,
      },
    )
  })

  return inflightPromise
}

export function useUserLocation(): LocationSnapshot {
  const [state, setState] = useState<LocationSnapshot>(snapshot)

  useEffect(() => {
    ensurePermissionWatcher()
    const onChange = () => setState(snapshot)
    listeners.add(onChange)
    onChange()
    return () => {
      listeners.delete(onChange)
    }
  }, [])

  return state
}
