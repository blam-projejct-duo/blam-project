import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Blam — Radar Konservasi Indonesia',
        short_name: 'Blam',
        description: 'Radar pemantauan & aksi konservasi pesisir, mangrove, dan hutan tropis Indonesia.',
        theme_color: '#F3F1ED',
        background_color: '#F3F1ED',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/.*\/tile\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'blam-satellite-tiles-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/fonts\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'blam-map-fonts-v1',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(planet|.*\.pbf)/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'blam-vector-tiles-v1',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) return 'maplibre'
          return undefined
        },
      },
    },
  },
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
})
