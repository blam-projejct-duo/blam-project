# Blam — Radar Konservasi Pesisir & Hutan Indonesia

Platform pemetaan, pelaporan warga, verifikasi komunitas/instansi, dan aksi pemulihan ekosistem pesisir, mangrove, hutan tropis, serta daerah aliran sungai di Indonesia (**IT RUSH 2026**).

---

## Arsitektur & Fitur Utama

- **Radar Peta & Sinyal Satelit:** Menampilkan event konservasi resmi organisasi (`events`) serta sinyal satelit **NASA FIRMS** & **NASA EONET v3** sebagai referensi pemantauan (*Live Pulse 2x2*: Udara, Gelombang, Hotspot, Spesies).
- **Siklus Dua Tahap (`reports` → `events`):** Laporan warga diaudit **AI Vision Gatekeeper** (`gemini-2.5-flash`), masuk ke Radar Verifikasi relawan/komunitas/instansi (`pending_verification` / `escalated` → `verified`), dan hanya menjadi Event publik setelah dibuat secara manual oleh organisasi (`community` / `agency`).
- **Model Organisasi & 6 Peran Fungsional:** `Guest`, `citizen`, `volunteer`, `agency`, `Org Lead`, dan `admin` dengan sinkronisasi otomatis peran berbasis keanggotaan aktif (`docs/schema.sql`).
- **Mode Demo Terpisah (`/demo`):** Portal khusus evaluasi peran secara cepat tanpa mencampur autentikasi asli di rute utama (`/`).

---

## Menjalankan Secara Lokal

1. Jalankan skrip [../docs/schema.sql](../docs/schema.sql) pada **Supabase SQL Editor**.
2. Salin `.env.example` menjadi `.env` dan isi variabel lingkungan (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `NASA_FIRMS_MAP_KEY`).
3. Instal dependensi dan jalankan frontend + API:

```bash
npm install
npm run dev:api   # Terminal 1 — Hono API (port 3001)
npm run dev       # Terminal 2 — Vite PWA (port 5173)
```

4. Verifikasi build & lint:

```bash
npm run lint
npm run build
```

---

## Atribusi Library, API Terbuka & Asisten AI

### Library & Framework
- **Frontend:** `react`, `react-dom`, `vite`, `vite-plugin-pwa`, `tailwindcss`, `@tailwindcss/vite`, `@tanstack/react-query`, `framer-motion`, `lucide-react`, `maplibre-gl`, `@fontsource-variable/plus-jakarta-sans`
- **Backend & Database:** `hono`, `@hono/node-server`, `@supabase/supabase-js`, `@google/genai`
- **Tooling:** `typescript`, `tsx`, `oxlint`

### API Terbuka & Sumber Data Peta
- **Open-Meteo** (*Air Quality*, *Marine*, *Weather Forecast*) — indeks kualitas udara, tinggi gelombang, kecepatan angin, dan curah hujan.
- **iNaturalist API** (`species_counts` & `observations`) — keragaman dan observasi spesies di sekitar titik lokasi.
- **NASA FIRMS** (`VIIRS_NOAA21_NRT`) — titik panas (*hotspot*) satelit.
- **NASA EONET v3** — daftar kejadian bencana alam aktif wilayah Indonesia.
- **OpenFreeMap** & **OpenStreetMap** — *vector tiles* dan *glyphs* peta dasar.
- **Esri World Imagery** — citra satelit untuk mode lapisan `SATELIT`.
- **QRServer API** (`api.qrserver.com`) — pembuatan QR tautan aksi lapangan.

### Kecerdasan Buatan & Asisten Pengembang
- **Google Gemini API (`gemini-2.5-flash`):** Audit kelayakan foto laporan warga (*AI Vision Gatekeeper*), penilaian *severity* & rekomendasi aksi, serta perbandingan bukti *Before–After* pemulihan.
- **AI Coding Assistant:** Membantu penulisan kode, penyelarasan arsitektur dengan dokumen spesifikasi di `docs/`, dan peninjauan kualitas kode.
