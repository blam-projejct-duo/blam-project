# Surface Brief: Main Map Shell & Panels (`DesktopShell` / `MobileBumpShell`)

- **Mode:** Operate
- **Target:** `src/components/layout/DesktopShell.tsx`, `src/components/layout/MobileBumpShell.tsx`

## Direction contract

- **THESIS:** Menyatukan permukaan peta dan Liquid Glass orb dengan rail serta drawer kaca buram terang berlapis grup putih bersih (`Atlas Spasial Terang`), menolak pola drawer putih datar ber-border abu-abu yang terpisah dari peta.
- **OWN-WORLD:** Permukaan dasar kaca buram sejuk (`rgba(242, 246, 250, 0.84)` + `backdrop-blur`), grup konten putih `#FFFFFF` bertumpu di atasnya tanpa border berlebih, pembatas metrik vertikal tipis (`1px`), Cobalt `#2563EB` untuk seleksi/aksi utama, Ember `#EA580C` untuk karhutla, Violet `#7C3AED` untuk gunung berapi, dan Emerald `#15803D` untuk aksi lapangan; `Bricolage Grotesque` + `Plus Jakarta Sans` tabular.
- **STORY:** Warga atau relawan membuka peta, langsung melihat titik kritis dengan kode bentuk/warna yang jujur, memindai kondisi lokasi lewat strip metrik ringkas, lalu bergabung ke gerakan atau melapor lewat Blam Snap tanpa terputus rasa antar-layar.
- **FIRST VIEWPORT:** Peta penuh + Liquid Glass orbs + Gajah Blam tetap utuh; di Desktop, rail kiri dan drawer kanan berdampingan dalam kaca buram terang dengan active pill putih, menampilkan `Cari lokasi`, judul + hitungan, dan daftar sinyal/kartu aksi dalam grup putih; di Mobile, bottom sheet kaca buram terang meluncur di atas peta dengan struktur grup putih yang sama.
- **FORM:** Atlas Spasial Terang (Candidate 1 / `model-pick` dari daftar berurutan, `seed:f6c92010278dd9f1`).
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
