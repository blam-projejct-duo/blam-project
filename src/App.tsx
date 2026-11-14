import DesktopCommandCenter from './components/desktop/DesktopCommandCenter'
import BumpMobileExperience from './components/mobile/BumpMobileExperience'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useRadar } from './hooks/useRadar'

export default function App() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const radar = useRadar()

  return isDesktop ? (
    <DesktopCommandCenter radar={radar} />
  ) : (
    <div className="h-dvh">
      <BumpMobileExperience radar={radar} />
    </div>
  )
}
