import { createContext, useContext } from 'react'
import type { FundraisingCampaign, SatelliteSignal } from '../../types'

export interface SideFundraisingContextValue {
  openCreateFundraising: (signal: SatelliteSignal, onCreated: () => Promise<void>) => void
  openDonate: (campaign: FundraisingCampaign, onDonated: () => Promise<void>) => void
}

export const SideFundraisingContext = createContext<SideFundraisingContextValue | null>(null)

export function useSideFundraising() {
  return useContext(SideFundraisingContext)
}
