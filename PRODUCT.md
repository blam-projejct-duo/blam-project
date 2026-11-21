# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Warga dan relawan lapangan di Indonesia yang memantau titik kritis lingkungan di sekitar mereka (karhutla, banjir, gunung berapi, kerusakan pesisir/hutan), ingin bergabung ke aksi pemulihan nyata, atau melaporkan temuan lapangan secara cepat melalui Blam Snap.
- **Secondary:** Koordinator organisasi/komunitas konservasi dan instansi (`volunteer`, `agency`, `admin`) yang memverifikasi laporan warga, menindaklanjuti eskalasi, dan mengonversi temuan terverifikasi menjadi Event aksi publik; serta publik/evaluator yang memantau dampak dan berdonasi.

## Product Purpose

Memetakan sinyal krisis ekologis dan aksi konservasi Indonesia secara real-time, menjembatani pelaporan warga yang diaudit AI dengan verifikasi komunitas/instansi, lalu menggerakkan aksi pemulihan lapangan yang terukur (relawan, donasi, dan bukti Before–After).

## Positioning

Radar konservasi dua tahap (`reports` → `events`) yang menggabungkan sinyal satelit terbuka (**NASA FIRMS**, **NASA EONET v3**, **Open-Meteo**, **iNaturalist**) dengan laporan foto lapangan ber-audit **AI Vision Gatekeeper** (`gemini-2.5-flash`) dan asisten spasial **Gajah Blam**, sehingga setiap titik bahaya di peta terhubung langsung ke aksi pemulihan yang terverifikasi.

## Operating Context

- **Konteks penggunaan:** Dipakai di lapangan melalui ponsel (pelaporan cepat Blam Snap, navigasi rute aksi, pengecekan kondisi lokal) maupun di desktop oleh relawan/koordinator (eksplorasi peta nasional, verifikasi radar, pengelolaan organisasi, riwayat dampak).
- **Bahasa & Wilayah:** Bahasa Indonesia; cakupan geografis seluruh Indonesia dengan data koordinat, lokasi administratif, dan satuan metrik lokal (kg sampah, bibit tertanam, AQI, tinggi gelombang, curah hujan).
- **Mode demo:** Rute terpisah (`/?demo=1` / `/demo`) untuk simulasi peran secara cepat tanpa mencampur autentikasi asli di rute utama (`/`).

## Capabilities and Constraints

- **Stack:** React 19, Vite 8 PWA, Tailwind CSS v4, Framer Motion, MapLibre GL + Esri/OpenFreeMap/OSM, Hono API + Supabase, Gemini (`gemini-2.5-flash`).
- **Struktur rute & navigasi yang harus tetap utuh:** Peta interaktif full-bleed sebagai permukaan utama; Desktop menggunakan rail kiri dinamis + drawer yang dapat diperluas (`Perluas`/`Perkecil`) + orb kanan atas (`Profil/Masuk`, `Notifikasi`, `Filter peta`) + kontrol zoom/lokasi; Mobile menggunakan top pill `tampilan peta` + search orb kiri bawah + 3-orb dock bawah (`Jelajah`, `Blam!`, `Gerakan`).
- **Integritas data:** Tidak mengarang klaim komersial, testimoni, atau metrik dampak palsu; data satelit, cuaca, dan event mengikuti sumber API/state aplikasi.

## Brand Commitments

- **Aset wajib dipertahankan:** Peta interaktif full-bleed, **Liquid Glass orb dock** di tampilan utama, serta maskot **Gajah Blam** (`BlamNatureIcon` & companion interaktif).
- **Arah perombakan:** Merombak total panel/drawer, hirarki informasi, komponen list/detail, dan flow pengguna agar keluar dari kesan template SaaS putih datar — menyatukan kedalaman *frosted translucent sheet* dan kebersihan ritme metrik (seperti standar *craft* tata letak spasial Apple Maps) dengan karakter hangat, lapangan, dan tegas khas konservasi Indonesia serta ikonografi padat/ekspresif (gaya *Phosphor Fill/Duotone*, bukan garis tipis generik).

## Evidence on Hand

- Aplikasi web berjalan (`blam-project/`) dengan integrasi nyata NASA FIRMS, NASA EONET v3, Open-Meteo (Air Quality, Marine, Weather), iNaturalist, Supabase, dan Gemini.
- Font yang sudah terpasang di `package.json`: `Bricolage Grotesque`, `Plus Jakarta Sans`, `DM Sans`, `Inter`, `Fredoka`, `Rubik`.
- Aset merek & ilustrasi di `brand/` dan `src/components/ui/bumpIcons.tsx`.

## Product Principles

1. **Peta adalah Kanvas, Panel adalah Alat Lapangan:** Panel/drawer harus terasa menyatu secara spasial dengan peta dan Liquid Glass orb, bukan kotak SaaS opaque yang terputus.
2. **Satu Alur Utama yang Jelas:** Memudahkan warga bergerak mulus dari melihat titik kritis → memahami kondisi & urgensi → bergabung aksi atau melapor via Blam Snap.
3. **Beda Peran Data, Beda Bentuk Visual:** Sinyal satelit (*telemetry*), aksi lapangan (*foto & progres*), dan log riwayat tidak boleh dibungkus dalam kartu identik yang membosankan.
4. **Kejujuran Sinyal & Status:** Tingkat verifikasi (`Belum Cek` vs `Terverifikasi` vs `Ada Aksi`) dan jenis bahaya terbaca seketika melalui bentuk, warna, dan angka tabular yang disiplin.
