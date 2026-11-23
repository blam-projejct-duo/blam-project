interface ProvinceBox {
  name: string
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  cLat: number
  cLng: number
}

const PROVINCE_BOXES: readonly ProvinceBox[] = [
  { name: 'Aceh', minLat: 2.0, maxLat: 6.1, minLng: 95.0, maxLng: 98.3, cLat: 4.7, cLng: 96.7 },
  { name: 'Sumatera Utara', minLat: -0.6, maxLat: 4.3, minLng: 97.0, maxLng: 100.5, cLat: 2.1, cLng: 99.1 },
  { name: 'Sumatera Barat', minLat: -3.5, maxLat: 0.9, minLng: 98.5, maxLng: 101.9, cLat: -0.9, cLng: 100.4 },
  { name: 'Riau', minLat: -1.2, maxLat: 2.6, minLng: 100.0, maxLng: 103.8, cLat: 0.5, cLng: 101.7 },
  { name: 'Kepulauan Riau', minLat: -1.1, maxLat: 4.8, minLng: 103.2, maxLng: 109.2, cLat: 1.0, cLng: 104.5 },
  { name: 'Jambi', minLat: -2.8, maxLat: -0.7, minLng: 101.1, maxLng: 104.7, cLat: -1.6, cLng: 102.8 },
  { name: 'Sumatera Selatan', minLat: -4.9, maxLat: -1.6, minLng: 102.0, maxLng: 106.2, cLat: -3.3, cLng: 104.1 },
  { name: 'Kepulauan Bangka Belitung', minLat: -3.3, maxLat: -1.4, minLng: 105.1, maxLng: 108.9, cLat: -2.4, cLng: 106.8 },
  { name: 'Bengkulu', minLat: -5.5, maxLat: -2.2, minLng: 101.0, maxLng: 103.8, cLat: -3.8, cLng: 102.3 },
  { name: 'Lampung', minLat: -6.0, maxLat: -3.7, minLng: 103.6, maxLng: 105.9, cLat: -4.9, cLng: 105.1 },
  { name: 'Banten', minLat: -7.0, maxLat: -5.8, minLng: 105.0, maxLng: 106.5, cLat: -6.4, cLng: 106.1 },
  { name: 'DKI Jakarta', minLat: -6.38, maxLat: -5.9, minLng: 106.68, maxLng: 106.98, cLat: -6.2, cLng: 106.85 },
  { name: 'Jawa Barat', minLat: -7.85, maxLat: -5.9, minLng: 106.3, maxLng: 108.9, cLat: -6.9, cLng: 107.6 },
  { name: 'Jawa Tengah', minLat: -8.25, maxLat: -6.4, minLng: 108.5, maxLng: 111.7, cLat: -7.2, cLng: 110.2 },
  { name: 'DI Yogyakarta', minLat: -8.25, maxLat: -7.5, minLng: 110.0, maxLng: 110.85, cLat: -7.85, cLng: 110.4 },
  { name: 'Jawa Timur', minLat: -8.85, maxLat: -6.7, minLng: 110.9, maxLng: 114.7, cLat: -7.6, cLng: 112.7 },
  { name: 'Bali', minLat: -8.9, maxLat: -8.0, minLng: 114.4, maxLng: 115.75, cLat: -8.4, cLng: 115.2 },
  { name: 'Nusa Tenggara Barat', minLat: -9.1, maxLat: -8.0, minLng: 115.8, maxLng: 119.3, cLat: -8.65, cLng: 117.4 },
  { name: 'Nusa Tenggara Timur', minLat: -11.1, maxLat: -8.0, minLng: 118.9, maxLng: 125.2, cLat: -8.8, cLng: 121.6 },
  { name: 'Kalimantan Barat', minLat: -3.1, maxLat: 2.1, minLng: 108.5, maxLng: 114.2, cLat: -0.2, cLng: 111.0 },
  { name: 'Kalimantan Tengah', minLat: -3.6, maxLat: 0.8, minLng: 110.7, maxLng: 115.9, cLat: -1.6, cLng: 113.4 },
  { name: 'Kalimantan Selatan', minLat: -4.25, maxLat: -1.3, minLng: 114.3, maxLng: 116.6, cLat: -3.0, cLng: 115.3 },
  { name: 'Kalimantan Timur', minLat: -2.5, maxLat: 2.6, minLng: 113.8, maxLng: 119.1, cLat: 0.5, cLng: 116.5 },
  { name: 'Kalimantan Utara', minLat: 1.0, maxLat: 4.5, minLng: 114.5, maxLng: 118.2, cLat: 3.0, cLng: 116.6 },
  { name: 'Sulawesi Utara', minLat: 0.3, maxLat: 4.8, minLng: 123.1, maxLng: 127.2, cLat: 1.3, cLng: 124.8 },
  { name: 'Gorontalo', minLat: 0.2, maxLat: 1.1, minLng: 121.1, maxLng: 123.6, cLat: 0.7, cLng: 122.4 },
  { name: 'Sulawesi Tengah', minLat: -3.2, maxLat: 1.4, minLng: 119.4, maxLng: 124.3, cLat: -1.1, cLng: 121.0 },
  { name: 'Sulawesi Barat', minLat: -3.6, maxLat: -0.8, minLng: 118.7, maxLng: 119.9, cLat: -2.4, cLng: 119.2 },
  { name: 'Sulawesi Selatan', minLat: -7.5, maxLat: -1.9, minLng: 118.7, maxLng: 121.8, cLat: -4.4, cLng: 120.0 },
  { name: 'Sulawesi Tenggara', minLat: -6.3, maxLat: -2.7, minLng: 120.8, maxLng: 124.6, cLat: -4.1, cLng: 122.1 },
  { name: 'Maluku Utara', minLat: -2.5, maxLat: 2.8, minLng: 124.2, maxLng: 129.8, cLat: 0.8, cLng: 127.8 },
  { name: 'Maluku', minLat: -8.5, maxLat: -2.5, minLng: 125.5, maxLng: 135.0, cLat: -4.5, cLng: 129.5 },
  { name: 'Papua Barat Daya', minLat: -2.5, maxLat: 0.6, minLng: 129.3, maxLng: 133.5, cLat: -1.0, cLng: 131.6 },
  { name: 'Papua Barat', minLat: -4.4, maxLat: -0.7, minLng: 131.5, maxLng: 135.0, cLat: -2.5, cLng: 133.4 },
  { name: 'Papua Tengah', minLat: -5.3, maxLat: -2.5, minLng: 134.5, maxLng: 138.2, cLat: -3.7, cLng: 136.5 },
  { name: 'Papua', minLat: -3.8, maxLat: -0.5, minLng: 135.0, maxLng: 141.1, cLat: -2.4, cLng: 139.0 },
  { name: 'Papua Pegunungan', minLat: -5.2, maxLat: -3.2, minLng: 137.8, maxLng: 141.1, cLat: -4.1, cLng: 139.5 },
  { name: 'Papua Selatan', minLat: -9.2, maxLat: -4.9, minLng: 137.2, maxLng: 141.1, cLat: -7.3, cLng: 139.6 },
]

function nearestByCenter(lat: number, lng: number, candidates: readonly ProvinceBox[]): string {
  let best = candidates[0]
  let bestDist = Infinity
  for (const box of candidates) {
    const d = (lat - box.cLat) ** 2 + (lng - box.cLng) ** 2
    if (d < bestDist) {
      bestDist = d
      best = box
    }
  }
  return best.name
}

/**
 * Mengembalikan nama provinsi Indonesia berdasarkan koordinat lat/lng.
 * Digunakan sebagai fallback lokasi instan saat nama daerah spesifik tidak tersedia.
 */
export function resolveIndonesianProvince(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Indonesia'
  const matches = PROVINCE_BOXES.filter(
    (b) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng,
  )
  if (matches.length > 0) return nearestByCenter(lat, lng, matches)

  if (lat >= -11.5 && lat <= 6.5 && lng >= 94.5 && lng <= 141.5) {
    return nearestByCenter(lat, lng, PROVINCE_BOXES)
  }
  return 'Indonesia'
}
