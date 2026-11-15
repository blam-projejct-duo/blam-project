import { useCallback, useEffect, useState } from 'react'

export type AppPath = '/' | '/demo'

export function isDemoPathname(pathname?: string): boolean {
  if (typeof window === 'undefined' && pathname === undefined) return false
  const p = pathname ?? window.location.pathname
  return p === '/demo' || p.startsWith('/demo/')
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

  const navigateTo = useCallback((next: AppPath) => {
    if (typeof window === 'undefined') return
    if (window.location.pathname === next) return
    window.history.pushState(null, '', next)
    setPathname(next)
  }, [])

  return {
    pathname,
    isDemo: isDemoPathname(pathname),
    navigateTo,
  }
}
