export interface CompressedImage {
  base64: string
  mimeType: 'image/jpeg'
  previewUrl: string
  bytes: number
}

const MAX_SIDE = 1280
const TARGET_BYTES = 350 * 1024

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode gagal'))), 'image/jpeg', q))

const toBase64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })

/** Resize + re-encode JPEG lewat canvas (otomatis membuang EXIF/GPS) hingga < 350 KB. */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  let side = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  let blob: Blob | null = null

  for (let round = 0; round < 4 && !blob; round++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * side))
    canvas.height = Math.max(1, Math.round(bmp.height * side))
    const ctx = canvas.getContext('2d')!
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

  const final = blob!
  return {
    base64: await toBase64(final),
    mimeType: 'image/jpeg',
    previewUrl: URL.createObjectURL(final),
    bytes: final.size,
  }
}