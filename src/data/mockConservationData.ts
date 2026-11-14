import type { ConservationSite, Ecosystem, SiteStatus } from '../types/conservation'

export const STATUS_LABEL: Record<SiteStatus, string> = {
  ai_verified: 'Kritis',
  in_progress: 'Ditangani',
  resolved: 'Pulih',
}

export const ECOSYSTEM_LABEL: Record<Ecosystem, string> = {
  coastal_mangrove: 'Mangrove',
  tropical_forest: 'Hutan',
  watershed: 'Muara',
}

export const ECOSYSTEM_FILTERS: { id: Ecosystem | 'all'; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'coastal_mangrove', label: 'Mangrove' },
  { id: 'tropical_forest', label: 'Hutan' },
  { id: 'watershed', label: 'Muara' },
]

// Cermin seed `docs/schema.sql` bagian 6.4 — dipakai sebagai fallback tanpa backend.
export const SITES: ConservationSite[] = [
  {
    id: 'jenggalu',
    title: 'Muara Jenggalu',
    shortName: 'Jenggalu',
    locationName: 'Pantai Panjang, Bengkulu',
    province: 'Bengkulu',
    ecosystem: 'coastal_mangrove',
    status: 'resolved',
    severity: 'critical',
    aiScore: 94,
    lat: -3.8355,
    lng: 102.2835,
    participants: 18,
    brief:
      'Udara bersih, gelombang 1.1 m masih membawa kiriman plastik. Mangrove yang pulih kini melindungi tambak dan jalur kepiting nelayan.',
    communityNote: '45 nelayan terlindungi dari abrasi dan mikroplastik.',
    beforeImage: '/samples/waste-before.svg',
    afterImage: '/samples/waste-after.svg',
    pulse: { aqi: 38, waveM: 1.1, hotspots: 0, species: 24 },
    impact: { volunteers: 18, wasteKg: 145, trees: 120, co2Kg: 1476, recoveryScore: 92 },
    updatedAt: '2 jam lalu',
    updatedMinutes: 120,
  },
  {
    id: 'sungai-suci',
    title: 'Sungai Suci',
    shortName: 'Sungai Suci',
    locationName: 'Bengkulu Tengah',
    province: 'Bengkulu',
    ecosystem: 'coastal_mangrove',
    status: 'in_progress',
    severity: 'medium',
    aiScore: 89,
    lat: -3.7295,
    lng: 102.2385,
    participants: 9,
    brief:
      'Angin barat 19 km/j, gelombang 1.6 m. Pasang pemecah ombak bambu dulu sebelum penyulaman bibit.',
    communityNote: 'Menahan abrasi jalan wisata pesisir warga.',
    beforeImage: '/samples/mangrove-before.svg',
    pulse: { aqi: 42, waveM: 1.6, hotspots: 0, species: 17 },
    updatedAt: 'Kemarin',
    updatedMinutes: 1440,
  },
  {
    id: 'rajo-lelo',
    title: 'Tahura Rajo Lelo',
    shortName: 'Rajo Lelo',
    locationName: 'Zona penyangga, Bengkulu',
    province: 'Bengkulu',
    ecosystem: 'tropical_forest',
    status: 'ai_verified',
    severity: 'critical',
    aiScore: 91,
    lat: -3.748,
    lng: 102.371,
    participants: 5,
    brief:
      'Tunggul tebangan baru dan 1 hotspot di radius 18 km. Kehilangan tajuk memicu erosi ke hilir.',
    communityNote: 'Menjaga air bersih untuk 3 desa sekitar.',
    beforeImage: '/samples/forest-before.svg',
    pulse: { aqi: 55, waveM: 0, hotspots: 1, species: 31 },
    updatedAt: '5 jam lalu',
    updatedMinutes: 300,
  },
  {
    id: 'muara-angke',
    title: 'Muara Angke',
    shortName: 'Muara Angke',
    locationName: 'Jakarta Utara',
    province: 'DKI Jakarta',
    ecosystem: 'coastal_mangrove',
    status: 'resolved',
    severity: 'medium',
    aiScore: 96,
    lat: -6.1155,
    lng: 106.7745,
    participants: 27,
    brief:
      'AQI sedang (78). Mangrove sehat menyaring polutan dan jadi habitat burung air.',
    communityNote: 'Kanal nelayan tradisional kembali lancar.',
    beforeImage: '/samples/mangrove-before.svg',
    afterImage: '/samples/mangrove-after.svg',
    pulse: { aqi: 78, waveM: 0.7, hotspots: 0, species: 46 },
    impact: { volunteers: 27, wasteKg: 210, trees: 200, co2Kg: 2460, recoveryScore: 95 },
    updatedAt: '3 hari lalu',
    updatedMinutes: 4320,
  },
  {
    id: 'mahakam',
    title: 'Delta Mahakam',
    shortName: 'Mahakam',
    locationName: 'Kutai Kartanegara',
    province: 'Kalimantan Timur',
    ecosystem: 'tropical_forest',
    status: 'resolved',
    severity: 'medium',
    aiScore: 93,
    lat: -0.588,
    lng: 117.345,
    participants: 22,
    brief:
      '38 spesies tercatat, termasuk habitat bekantan. Koridor nipah-mangrove kembali menyerap karbon biru.',
    communityNote: 'Peluang silvofishery kepiting bagi warga delta.',
    beforeImage: '/samples/forest-before.svg',
    afterImage: '/samples/forest-after.svg',
    pulse: { aqi: 31, waveM: 0.4, hotspots: 0, species: 38 },
    impact: { volunteers: 22, wasteKg: 60, trees: 350, co2Kg: 4305, recoveryScore: 90 },
    updatedAt: '1 minggu lalu',
    updatedMinutes: 10080,
  },
  {
    id: 'krueng-aceh',
    title: 'Muara Krueng Aceh',
    shortName: 'Krueng Aceh',
    locationName: 'Banda Aceh',
    province: 'Aceh',
    ecosystem: 'watershed',
    status: 'ai_verified',
    severity: 'critical',
    aiScore: 90,
    lat: 5.5815,
    lng: 95.3245,
    participants: 11,
    brief:
      'Hujan masih berlanjut 24 jam. Angkut sampah dalam 48 jam sebelum pasang purnama membawanya ke laut.',
    communityNote: 'Mencegah jaring nelayan dan terumbu karang rusak.',
    beforeImage: '/samples/waste-before.svg',
    pulse: { aqi: 47, waveM: 1.3, hotspots: 0, species: 12 },
    updatedAt: '40 menit lalu',
    updatedMinutes: 40,
  },
]

export const DEFAULT_SITE_ID = 'jenggalu'

export function pinTone(status: SiteStatus): 'critical' | 'progress' | 'resolved' {
  if (status === 'resolved') return 'resolved'
  if (status === 'in_progress') return 'progress'
  return 'critical'
}
