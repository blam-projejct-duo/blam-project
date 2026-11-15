import type { Ecosystem, PinTone, ReportStatus, UserRole } from '../types'

export const STATUS_LABEL: Record<ReportStatus, string> = {
  rejected: 'Ditolak',
  open: 'Menunggu',
  escalated: 'Eskalasi',
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

export const ROLE_LABEL: Record<UserRole, string> = {
  citizen: 'Warga',
  volunteer: 'Relawan',
  agency: 'Instansi',
  admin: 'Admin',
}

export function pinTone(status: ReportStatus): PinTone {
  if (status === 'resolved') return 'resolved'
  if (status === 'in_progress') return 'progress'
  return 'critical'
}

export function relativeTime(iso: string): { label: string; minutes: number } {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return { label: 'Baru saja', minutes }
  if (minutes < 60) return { label: `${minutes} menit lalu`, minutes }
  const hours = Math.round(minutes / 60)
  if (hours < 24) return { label: `${hours} jam lalu`, minutes }
  const days = Math.round(hours / 24)
  if (days === 1) return { label: 'Kemarin', minutes }
  if (days < 7) return { label: `${days} hari lalu`, minutes }
  return { label: `${Math.round(days / 7)} minggu lalu`, minutes }
}

export function shortLocation(locationName: string): string {
  const first = locationName.split(',')[0].trim()
  return first.length > 22 ? `${first.slice(0, 21)}…` : first
}
