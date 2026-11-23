import { useCallback, useEffect, useState } from 'react'

export type AppPath = '/' | '/demo' | '/privacy' | '/terms'

export function isDemoPathname(pathname?: string): boolean {
  if (typeof window === 'undefined' && pathname === undefined) return false
  const p = pathname ?? window.location.pathname
  return p === '/demo' || p.startsWith('/demo/')
}

export function getLegalRoute(pathname?: string): 'privacy' | 'terms' | null {
  if (typeof window === 'undefined' && pathname === undefined) return null
  const p = (pathname ?? window.location.pathname).replace(/\/+$/, '') || '/'
  if (p === '/privacy' || p === '/privacy.html') return 'privacy'
  if (p === '/terms' || p === '/terms.html') return 'terms'
  return null
}

/** Navigasi SPA di tab yang sama, bisa dipanggil dari komponen mana pun. */
export function navigateApp(next: AppPath, opts?: { replace?: boolean }) {
  if (typeof window === 'undefined') return
  if (window.location.pathname !== next) {
    const curState = window.history.state as { blamFrom?: string } | null
    if (opts?.replace) {
      window.history.replaceState({ blamFrom: curState?.blamFrom }, '', next)
    } else {
      window.history.pushState({ blamFrom: window.location.pathname }, '', next)
    }
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'auto' })
}

/** Kembali ke halaman sebelumnya di dalam Blam, atau ke beranda jika dibuka langsung. */
export function navigateBack(fallback: AppPath = '/') {
  if (typeof window === 'undefined') return
  const state = window.history.state as { blamFrom?: string } | null
  if (state?.blamFrom && !getLegalRoute(state.blamFrom)) {
    window.history.back()
    return
  }
  navigateApp(fallback, { replace: true })
}

export function useAppRoute() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname,
  )

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigateTo = useCallback((next: AppPath, opts?: { replace?: boolean }) => {
    navigateApp(next, opts)
  }, [])

  return {
    pathname,
    isDemo: isDemoPathname(pathname),
    legalPage: getLegalRoute(pathname),
    navigateTo,
  }
}
