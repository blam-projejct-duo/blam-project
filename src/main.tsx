import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getLegalRoute } from './lib/route'
import { queryClient, startQueryCachePersistence } from './lib/queryClient'

declare global {
  interface Window {
    __hideSplash?: () => void
  }
}

startQueryCachePersistence()

// Splash (didefinisikan di index.html) ditutup saat aplikasi siap:
// - halaman legal (/privacy, /terms) tidak memuat peta, jadi cukup tunggu UI pertama tergambar
// - halaman lain menunggu peta selesai dimuat (event 'blam:map-ready' dari MapView), maksimal 3,5 dtk
const hideSplash = () => window.__hideSplash?.()
if (getLegalRoute()) {
  requestAnimationFrame(() => requestAnimationFrame(hideSplash))
} else {
  window.addEventListener('blam:map-ready', hideSplash, { once: true })
  window.setTimeout(hideSplash, 3500)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)