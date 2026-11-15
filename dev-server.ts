import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'

function loadEnvFileForDebug(filePath: string): string[] {
  if (!existsSync(filePath)) {
    console.warn(`[DEV_ENV] Berkas .env tidak ditemukan di: ${filePath}`)
    return []
  }

  const loadedKeys: string[] = []
  const content = readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val
    }
    loadedKeys.push(key)
  }
  return loadedKeys
}

const envPath = resolve(process.cwd(), '.env')
const keys = loadEnvFileForDebug(envPath)

const WATCHED_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'NASA_FIRMS_MAP_KEY',
] as const

console.info(`[DEV_ENV] Membaca ${envPath} (${keys.length} kunci terbaca):`)
for (const k of WATCHED_KEYS) {
  const v = (process.env[k] ?? '').trim()
  const status = v ? `SET (${v.length} chars, prefix="${v.slice(0, 8)}...")` : 'EMPTY'
  console.info(`  - ${k}: ${status}`)
}

const { app } = await import('./api/index.ts')
const port = Number(process.env.PORT || 3001)

async function readBody(req: IncomingMessage): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = `http://localhost:${port}${req.url ?? '/'}`
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) {
        for (const item of v) headers.append(k, item)
      } else if (v !== undefined) {
        headers.set(k, v)
      }
    }
    const body = await readBody(req)
    const request = new Request(url, {
      method: req.method ?? 'GET',
      headers,
      body: body ? (body as unknown as BodyInit) : undefined,
    })
    const response = await app.fetch(request)
    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    const buf = Buffer.from(await response.arrayBuffer())
    res.end(buf)
  } catch (err) {
    console.error('[DEV_API] Request error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal dev server error' }))
  }
})

server.listen(port, () => {
  console.info(`[DEV_API] Server Hono aktif → http://localhost:${port}/api/health`)
})
