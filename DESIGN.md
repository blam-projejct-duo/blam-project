---
name: Blam — Atlas Spasial Terang
description: Radar konservasi pesisir & hutan Indonesia dengan Liquid Glass orb dock, sheet kaca buram terang, dan strip metrik tabular.
colors:
  canvas: "#eef2f7"
  surface: "#ffffff"
  atlas-sheet-light: "rgba(242, 246, 250, 0.84)"
  atlas-sheet-dark: "rgba(244, 247, 252, 0.90)"
  muted: "#e5ebf3"
  line: "#dfe6ef"
  ink: "#111827"
  ink-soft: "#4b5565"
  primary: "#2563eb"
  primary-deep: "#1d4ed8"
  mint: "#edf3fe"
  critical: "#dc2626"
  progress: "#d97706"
  resolved: "#15803d"
  volcano: "#7c3aed"
  storm: "#0891b2"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, DM Sans Variable, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque Variable, DM Sans Variable, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0em"
  subtitle:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0em"
  body:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  caption:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
  kicker:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
  micro:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  pill: "9999px"
  sheet: "22px"
  group: "16px"
  card: "12px"
  tile: "10px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.tile}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
---

## Overview

Blam menggunakan sistem visual **Atlas Spasial Terang**: peta interaktif penuh dengan **Liquid Glass orb dock** dan maskot **Gajah Blam** di lapisan utama, dipadukan dengan rail dan drawer/bottom-sheet kaca buram terang (`.atlas-sheet`) yang menampung grup konten putih bersih (`.atlas-group`) serta strip metrik horizontal bersekat tipis (`.atlas-strip`).

## Colors

- **Permukaan Spasial:** Sheet kaca buram `rgba(242, 246, 250, 0.84)` di atas peta terang dan `rgba(244, 247, 252, 0.90)` di atas peta satelit/gelap; grup konten di dalamnya selalu `#ffffff`.
- **Aksen Utama:** Cobalt Blue (`#2563eb` / `#1d4ed8`) untuk `.orb-primary`, tombol aksi utama, dan status terverifikasi.
- **Sinyal Bahaya & Status:** Karhutla/darurat `#dc2626`–`#f97316`, gunung berapi `#7c3aed`, banjir `#2563eb`, badai `#0891b2`, peringatan `#d97706`, aksi berjalan/selesai `#15803d`.

## Typography

- **Display (`h1`, `h2`):** `Bricolage Grotesque Variable` dengan `letter-spacing: -0.02em`.
- **UI & Telemetry (`.num`):** `DM Sans Variable` dengan `font-variant-numeric: tabular-nums` pada angka koordinat, hitungan sinyal, dan strip metrik.

## Layout

- **Desktop (`DesktopShell`):** Rail kiri dinamis (`72px`) + drawer kaca buram (`396px`, dapat diperluas hingga `920px` via `Perluas`/`Perkecil`) di kiri; kontrol profil, notifikasi, filter peta, zoom, dan lokasi di kanan.
- **Mobile (`MobileBumpShell`):** Pill `tampilan peta` di atas, search orb di kiri bawah, 3-orb dock (`Jelajah`, `Blam!`, `Gerakan`) di bawah, dan bottom sheet kaca buram (`rounded-t-[24px]`).

## Elevation & Depth

- Kedalaman dibangun lewat hierarki tiga lapis: **Peta penuh → Sheet kaca buram (`.atlas-sheet`, `blur(26px)`) → Grup putih bersih (`.atlas-group`)**, menghindari tumpukan border 1px abu-abu yang berat.

## Shapes

- Orb navigasi & kontrol peta tetap bulat penuh (`9999px`) dengan specularity Liquid Glass (`.orb-sheen`).
- Drawer desktop `22px`, bottom sheet mobile `24px`, grup inset `16px`, tombol & input `10px`–`12px`.

## Components

- **`.atlas-sheet`:** Permukaan frosted rail, drawer desktop, dan bottom sheet mobile.
- **`.atlas-group`:** Wadah daftar sinyal dan rincian lokasi putih bersih di atas sheet.
- **`.atlas-strip`:** Strip metrik horizontal bersekat `1px` vertikal tanpa kotak KPI terpisah.
- **`MapMarkerGlyph` & `AtlasCoordinateHero`:** Bahasa marker peta (solid vs putus-putus) yang seragam antara peta, daftar, dan header detail.

## Do's and Don'ts

- **Lakukan:** Gunakan `.atlas-group` di atas `.atlas-sheet` dan `.atlas-strip` untuk metrik lingkungan.
- **Jangan:** Membungkus setiap metrik ke dalam kotak KPI ber-border terpisah, memakai `bounce-easing`, atau mengubah Liquid Glass orb dan Gajah Blam di layar utama.
