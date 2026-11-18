import { QueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

export const CACHE_TTL_MS = 20 * 60 * 1000
const MAX_PERSIST_MS = 24 * 60 * 60 * 1000
const STORAGE_KEY = 'blam_query_cache_v5'
const MAX_PULSE_ENTRIES = 30

interface PersistedEntry {
  queryKey: QueryKey
  data: unknown
  dataUpdatedAt: number
}

interface PersistedStore {
  entries: Record<string, PersistedEntry>
}

function shouldPersistKey(key: QueryKey): boolean {
  const head = key[0]
  return head === 'events' || head === 'orgs' || head === 'pulse' || head === 'layers'
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TTL_MS,
      gcTime: MAX_PERSIST_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function hydrateQueryCache(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as PersistedStore | null
    if (!parsed?.entries || typeof parsed.entries !== 'object') return

    const now = Date.now()
    for (const entry of Object.values(parsed.entries)) {
      if (!entry || !Array.isArray(entry.queryKey) || !shouldPersistKey(entry.queryKey)) continue
      if (typeof entry.dataUpdatedAt !== 'number' || now - entry.dataUpdatedAt > MAX_PERSIST_MS) continue
      queryClient.setQueryData(entry.queryKey, entry.data, { updatedAt: entry.dataUpdatedAt })
    }
  } catch {
    /* abaikan cache rusak / localStorage nonaktif */
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

function flushPersist(): void {
  if (typeof window === 'undefined') return
  try {
    const now = Date.now()
    const all = queryClient.getQueryCache().getAll()
    const entries: Record<string, PersistedEntry> = {}
    const pulseEntries: [string, PersistedEntry][] = []

    for (const q of all) {
      if (q.state.status !== 'success' || q.state.data === undefined) continue
      if (!shouldPersistKey(q.queryKey)) continue
      if (now - q.state.dataUpdatedAt > MAX_PERSIST_MS) continue
      if (q.queryKey[0] === 'layers') {
        const layerData = q.state.data as { hotspots?: unknown[]; sources?: { nasaFirms?: string } } | undefined
        if (layerData?.sources?.nasaFirms && layerData.sources.nasaFirms !== 'ok' && (layerData.hotspots?.length ?? 0) === 0) {
          continue
        }
      }

      const entry: PersistedEntry = {
        queryKey: q.queryKey,
        data: q.state.data,
        dataUpdatedAt: q.state.dataUpdatedAt,
      }
      if (q.queryKey[0] === 'pulse' || q.queryKey[0] === 'layers') {
        pulseEntries.push([q.queryHash, entry])
      } else {
        entries[q.queryHash] = entry
      }
    }

    pulseEntries.sort((a, b) => b[1].dataUpdatedAt - a[1].dataUpdatedAt)
    for (const [hash, entry] of pulseEntries.slice(0, MAX_PULSE_ENTRIES)) {
      entries[hash] = entry
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries } satisfies PersistedStore))
  } catch {
    /* abaikan kuota penuh / mode privat */
  }
}

export function startQueryCachePersistence(): () => void {
  hydrateQueryCache()
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return
    if (!shouldPersistKey(event.query.queryKey)) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPersist, 250)
  })
}
