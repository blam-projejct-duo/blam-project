import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { fetchEnvLayers } from '../../lib/api'
import { CACHE_TTL_MS } from '../../lib/queryClient'
import type { EonetPoint, FloodPoint, HotspotPoint } from '../../types'
import { buildHazards, hotspotKey } from './hotspotCluster'
import type { HazardSet } from './hotspotCluster'

/**
 * /env/layers hanya mengembalikan data di sekitar satu titik, jadi dulu karhutla
 * baru muncul kalau event yang dipilih kebetulan dekat api. Sekarang kita tanya
 * beberapa titik jangkar yang menyebar di Indonesia, lalu hasilnya digabung.
 * Kunci cache sama dengan useEnvLayers (['layers', 'lat,lng' 1 desimal).
 */
const ANCHORS: ReadonlyArray<readonly [number, number]> = [
    [4.5, 97.0], // Aceh
    [2.0, 99.5], // Sumatera Utara
    [-0.5, 101.8], // Riau
    [-2.5, 103.5], // Jambi / Sumatera Selatan
    [-7.0, 107.0], // Jawa Barat & sekitarnya
    [-7.5, 112.0], // Jawa Timur (termasuk Bromo, Semeru)
    [-8.6, 116.5], // Bali & Nusa Tenggara
    [0.0, 110.5], // Kalimantan Barat
    [-2.5, 113.5], // Kalimantan Tengah
    [-1.0, 116.5], // Kalimantan Timur & Selatan
    [-1.5, 120.5], // Sulawesi
    [-3.0, 128.0], // Maluku
    [-7.8, 139.8], // Papua Selatan (Merauke / Boven Digoel)
    [-3.5, 134.5], // Papua Tengah / Papua Barat (Mimika / Nabire)
    [-1.2, 132.5], // Papua Barat Daya (Sorong / Teluk Bintuni)
    [-4.0, 138.5], // Papua Pegunungan
]

const EMPTY: HazardSet = { credible: [], weak: [] }

interface Merged {
    hotspots: HotspotPoint[]
    eonet: EonetPoint[]
    floods: FloodPoint[]
    loading: boolean
}

export function useNationalHazards(focus: { lat: number; lng: number } | null) {
    const anchors = useMemo(
        () => (focus ? [...ANCHORS, [focus.lat, focus.lng] as const] : ANCHORS),
        [focus],
    )

    const merged = useQueries({
        queries: anchors.map(([lat, lng]) => ({
            queryKey: ['layers', `${lat.toFixed(1)},${lng.toFixed(1)}`],
            queryFn: ({ signal }: { signal: AbortSignal }) => fetchEnvLayers(lat, lng, signal),
            staleTime: CACHE_TTL_MS,
        })),
        combine: (results): Merged => {
            const hot = new Map<string, HotspotPoint>()
            const eo = new Map<string, EonetPoint>()
            const fl = new Map<string, FloodPoint>()
            for (const r of results) {
                for (const h of r.data?.hotspots ?? []) hot.set(hotspotKey(h), h)
                for (const e of r.data?.eonet ?? []) eo.set(e.id, e)
                for (const f of r.data?.floods ?? []) fl.set(f.id, f)
            }
            return {
                hotspots: [...hot.values()],
                eonet: [...eo.values()],
                floods: [...fl.values()],
                loading: results.some((r) => r.isFetching),
            }
        },
    })

    const hazards = useMemo(
        () =>
            merged.hotspots.length || merged.eonet.length || merged.floods.length
                ? buildHazards(merged.hotspots, merged.eonet, merged.floods)
                : EMPTY,
        [merged.hotspots, merged.eonet, merged.floods],
    )

    const nHot = merged.hotspots.length
    const nEonet = merged.eonet.length
    const nFlood = merged.floods.length
    const nCredible = hazards.credible.length
    const nWeak = hazards.weak.length
    useEffect(() => {
        console.info('[Blam:Hazards]', { hotspots: nHot, eonet: nEonet, floods: nFlood, credible: nCredible, weak: nWeak })
    }, [nHot, nEonet, nFlood, nCredible, nWeak])

    return { hazards, loading: merged.loading }
}