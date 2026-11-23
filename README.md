# Blam

Blam adalah aplikasi web untuk pemantauan radar lingkungan, pelaporan kejadian bencana/kerusakan alam, dan koordinasi aksi relawan berbasis peta interaktif.

## Fitur Utama

- Peta interaktif (tampilan globe 3D dan peta datar) untuk melihat titik panas, banjir, aktivitas vulkanik, dan aksi relawan.
- Panel Jelajah untuk memantau laporan kejadian dan data satelit/cuaca.
- Panel Gerakan untuk melihat, mencari, membuat, dan bergabung dalam aksi atau penggalangan dana relawan.
- Verifikasi laporan dan aksi menggunakan AI serta dukungan asisten chat (Blam Care).
- Profil pengguna, notifikasi, dan manajemen organisasi relawan.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query
- Peta: MapLibre GL JS, Leaflet
- Backend / API: Hono, Node.js
- Database, Auth & Storage: Supabase
- AI: Google Gemini API (`@google/genai`)

## Menjalankan Secara Lokal

1. Clone repository ini lalu masuk ke folder project:
   ```bash
   git clone <url-repository>
   cd blam-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Salin file `.env.example` menjadi `.env` dan isi variabel yang dibutuhkan:
   ```bash
   cp .env.example .env
   ```
   Variabel yang digunakan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `NASA_FIRMS_MAP_KEY`
   - `VITE_GOOGLE_MAPS_TILE_KEY`

4. Jalankan server pengembangan frontend dan API:
   ```bash
   npm run dev
   ```
   Untuk menjalankan server API lokal secara terpisah:
   ```bash
   npm run dev:api
   ```

5. Build dan lint:
   ```bash
   npm run build
   npm run lint
   ```

## Penggunaan Library Open-Source, Aset, Sumber Data, dan AI

Sesuai ketentuan kompetisi, berikut adalah daftar library open-source, aset, sumber data, dan AI coding assistant yang digunakan dalam pengembangan project ini:

### Library & Framework Open-Source
- React, React DOM, Vite, TypeScript
- Tailwind CSS (`tailwindcss`, `@tailwindcss/vite`)
- MapLibre GL JS (`maplibre-gl`) dan Leaflet (`leaflet`)
- Hono (`hono`, `@hono/node-server`)
- Supabase JS (`@supabase/supabase-js`)
- TanStack Query (`@tanstack/react-query`)
- Framer Motion (`framer-motion`)
- Google GenAI SDK (`@google/genai`)
- Ikon: Lucide React (`lucide-react`), Phosphor Icons (`@phosphor-icons/react`), Solar Icons (`@solar-icons/react`), React Icons (`react-icons`)
- Font: Fontsource (`@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/dm-sans`, `@fontsource-variable/fredoka`, `@fontsource-variable/inter`, `@fontsource-variable/plus-jakarta-sans`, `@fontsource-variable/rubik`)
- Tooling: `vite-plugin-pwa`, `oxlint`, `tsx`

### Sumber Data & Peta
- NASA FIRMS dan NASA EONET (data titik panas dan kejadian alam)
- Open-Meteo Flood & Forecast API (data prakiraan banjir dan cuaca)
- PetaBencana.id (data laporan bencana)
- OpenFreeMap / OpenStreetMap, EOX Sentinel-2 Cloudless, dan Esri World Imagery (layer peta dan citra satelit)

### Penggunaan AI
- Google Gemini API digunakan di dalam aplikasi untuk fitur verifikasi dan asisten Blam Care.
- Google Antigravity digunakan sebagai AI coding assistant selama proses pengembangan untuk membantu peninjauan kode, feedback UI, dan debugging.
