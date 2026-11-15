export interface CompressedImage {
  base64: string
  mimeType: 'image/jpeg'
  previewUrl: string
  bytes: number
}

const MAX_SIDE = 1280
const TARGET_BYTES = 350 * 1024

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('Encode foto gagal'))), 'image/jpeg', q),
  )

const toBase64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })

/** Resize + re-encode JPEG via canvas (menghapus metadata EXIF/GPS demi privasi) hingga < 350 KB. */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  let side = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  let blob: Blob | null = null

  for (let round = 0; round < 4 && !blob; round++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * side))
    canvas.height = Math.max(1, Math.round(bmp.height * side))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas tidak tersedia')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    for (const q of [0.82, 0.7, 0.58, 0.46]) {
      const b = await toBlob(canvas, q)
      if (b.size <= TARGET_BYTES) {
        blob = b
        break
      }
      if (q === 0.46 && round === 3) blob = b
    }
    side *= 0.8
  }
  bmp.close()

  if (!blob) throw new Error('Kompresi foto gagal')
  return {
    base64: await toBase64(blob),
    mimeType: 'image/jpeg',
    previewUrl: URL.createObjectURL(blob),
    bytes: blob.size,
  }
}

/** Hitung jarak Haversine (km) antara GPS perangkat & pin lokasi untuk flag location_mismatch (> 5 km). */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
