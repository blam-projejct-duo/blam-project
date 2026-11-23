import { useQuery } from '@tanstack/react-query'
import { reverseGeocode } from '../../lib/api'
import { resolveIndonesianProvince } from './indonesiaProvinces'

const PLACE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Ubah koordinat jadi nama tempat yang mudah dipahami (desa/kecamatan, kota/kabupaten, provinsi).
 * Koordinat dibulatkan ke 3 desimal (~100 m) supaya cache bisa dipakai bersama titik yang berdekatan.
 */
export function usePlaceName(lat: number, lng: number) {
  const rLat = Number(lat.toFixed(3))
  const rLng = Number(lng.toFixed(3))

  const query = useQuery({
    queryKey: ['place-name', rLat, rLng],
    queryFn: ({ signal }) => reverseGeocode(rLat, rLng, signal),
    staleTime: PLACE_TTL_MS,
    gcTime: PLACE_TTL_MS,
    retry: 1,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  })

  const data = query.data
  const label = data?.ok
    ? [data.name, data.detail].filter((s) => s && s !== 'Lokasi GPS').join(', ')
    : ''

  return {
    label: label || null,
    loading: query.isLoading,
  }
}

/** Teks lokasi siap tampil: nama tempat, status memuat, atau fallback ramah awam. */
export function placeText(place: { label: string | null; loading: boolean }): string {
  if (place.label) return place.label
  if (place.loading) return 'Mencari nama lokasi…'
  return 'Lokasi terpencil / belum bernama'
}

/**
 * Mengembalikan lokasi maksimal sampai tingkat kecamatan (tanpa nama jalan),
 * dengan fallback instan ke nama provinsi Indonesia.
 */
export function useAreaName(lat: number, lng: number): string {
  const rLat = Number(lat.toFixed(3))
  const rLng = Number(lng.toFixed(3))

  const query = useQuery({
    queryKey: ['place-name', rLat, rLng],
    queryFn: ({ signal }) => reverseGeocode(rLat, rLng, signal),
    staleTime: PLACE_TTL_MS,
    gcTime: PLACE_TTL_MS,
    retry: 1,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  })

  const data = query.data
  if (data?.ok) {
    const area = data.area?.trim()
    if (area) return area
    const detail = data.detail?.trim()
    if (detail && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(detail)) return detail
  }
  return resolveIndonesianProvince(lat, lng)
}
