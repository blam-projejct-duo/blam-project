import { Suspense, lazy, useEffect, useState } from 'react'
import { getDemoSessionId } from './lib/api'
import { useAppRoute } from './lib/route'
import type { AppPath } from './lib/route'
import { useMediaQuery } from './lib/useMediaQuery'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import { useRadar } from './modules/map/useRadar'

const DesktopShell = lazy(() => import('./components/layout/DesktopShell'))
const MobileBumpShell = lazy(() => import('./components/layout/MobileBumpShell'))
const AuthModal = lazy(() => import('./modules/auth/AuthModal'))
const DemoPortalPage = lazy(() => import('./modules/demo/DemoPortalPage'))

function BlamRoot({ isDemo, onNavigate }: { isDemo: boolean; onNavigate: (path: AppPath) => void }) {
  const { profile, loading, openAuthModal } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const radar = useRadar(profile?.id)
  const [demoGuestEntered, setDemoGuestEntered] = useState(false)

  useEffect(() => {
    document.title = isDemo ? 'Blam — Mode Demo' : 'Blam — Radar Konservasi'
  }, [isDemo])

  if (isDemo && !profile && !demoGuestEntered && !(loading && Boolean(getDemoSessionId()))) {
    return (
      <Suspense fallback={<div className="h-dvh w-full bg-canvas" />}>
        <DemoPortalPage
          onEnterGuest={() => setDemoGuestEntered(true)}
          onGoLive={() => onNavigate('/')}
        />
      </Suspense>
    )
  }

  return (
    <>
      <Suspense fallback={<div className="h-dvh w-full bg-canvas" />}>
        {isDesktop ? (
          <DesktopShell radar={radar} />
        ) : (
          <div className="h-dvh">
            <MobileBumpShell radar={radar} />
          </div>
        )}
      </Suspense>

      {isDemo && (
        <button
          type="button"
          onClick={openAuthModal}
          className={
            isDesktop
              ? 'fixed top-4 right-20 z-[500] flex h-12 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-extrabold text-ink transition-colors hover:bg-canvas'
              : 'glass fixed top-[calc(env(safe-area-inset-top)+16px)] left-4 z-[500] flex h-12 items-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold text-ink'
          }
        >
          <span className="size-2 rounded-full bg-cobalt" />
          Demo
        </button>
      )}

      <Suspense fallback={null}>
        <AuthModal
          onExitDemo={isDemo ? () => setDemoGuestEntered(false) : undefined}
          onGoLive={
            isDemo
              ? () => {
                  setDemoGuestEntered(false)
                  onNavigate('/')
                }
              : undefined
          }
        />
      </Suspense>
    </>
  )
}

export default function App() {
  const { isDemo, navigateTo } = useAppRoute()

  return (
    <AuthProvider key={isDemo ? 'demo' : 'live'} isDemo={isDemo}>
      <BlamRoot isDemo={isDemo} onNavigate={navigateTo} />
    </AuthProvider>
  )
}
