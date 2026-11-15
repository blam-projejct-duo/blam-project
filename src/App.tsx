import DesktopShell from './components/layout/DesktopShell'
import MobileBumpShell from './components/layout/MobileBumpShell'
import { useMediaQuery } from './lib/useMediaQuery'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import AuthModal from './modules/auth/AuthModal'
import { useRadar } from './modules/map/useRadar'

function BlamRoot() {
  const { profile } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const radar = useRadar(profile?.id)

  return (
    <>
      {isDesktop ? (
        <DesktopShell radar={radar} />
      ) : (
        <div className="h-dvh">
          <MobileBumpShell radar={radar} />
        </div>
      )}
      <AuthModal />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BlamRoot />
    </AuthProvider>
  )
}
