import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import DesktopShell from './components/layout/DesktopShell'
import MobileBumpShell from './components/layout/MobileBumpShell'
import { getDemoSessionId } from './lib/api'
import { navigateBack, useAppRoute } from './lib/route'
import type { AppPath } from './lib/route'
import { useMediaQuery } from './lib/useMediaQuery'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import AuthModal from './modules/auth/AuthModal'
import DemoPortalPage from './modules/demo/DemoPortalPage'
import { LegalModal } from './modules/legal/LegalPages'
import { useRadar } from './modules/map/useRadar'

function BlamRoot({ isDemo, onNavigate }: { isDemo: boolean; onNavigate: (path: AppPath) => void }) {
  const { profile, loading, openAuthModal } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const radar = useRadar(profile?.id)
  const [demoGuestEntered, setDemoGuestEntered] = useState(false)

  useEffect(() => {
    document.title = isDemo ? 'Blam - Mode Demo' : 'Blam - Radar Konservasi'
  }, [isDemo])

  if (isDemo && loading && Boolean(getDemoSessionId())) {
    return <div className="h-dvh w-full bg-canvas" />
  }

  if (isDemo && !profile && !demoGuestEntered) {
    return (
      <DemoPortalPage
        onEnterGuest={() => setDemoGuestEntered(true)}
        onGoLive={() => onNavigate('/')}
      />
    )
  }

  return (
    <>
      {isDesktop ? (
        <DesktopShell radar={radar} />
      ) : (
        <div className="h-dvh">
          <MobileBumpShell radar={radar} />
        </div>
      )}

      {isDemo && (
        <button
          type="button"
          onClick={openAuthModal}
          className={
            isDesktop
              ? 'orb-surface orb-surface-btn fixed top-4 right-20 z-[500] flex h-11 items-center gap-2 px-4 text-xs font-normal text-forest'
              : 'glass fixed top-[calc(env(safe-area-inset-top)+16px)] left-4 z-[500] flex h-12 items-center gap-1.5 rounded-full px-3.5 text-xs font-normal text-ink'
          }
        >
          <span className="size-2 rounded-full bg-leaf" />
          Demo
        </button>
      )}

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
    </>
  )
}

export default function App() {
  const { isDemo, legalPage, navigateTo } = useAppRoute()

  return (
    <>
      <AuthProvider key={isDemo ? 'demo' : 'live'} isDemo={isDemo}>
        <BlamRoot isDemo={isDemo} onNavigate={navigateTo} />
      </AuthProvider>

      <AnimatePresence>
        {legalPage && (
          <LegalModal
            key="legal-modal"
            page={legalPage}
            onNavigate={(path) => navigateTo(path, { replace: true })}
            onClose={() => navigateBack('/')}
          />
        )}
      </AnimatePresence>
    </>
  )
}