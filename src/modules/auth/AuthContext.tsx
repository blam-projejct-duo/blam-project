import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchDemoAccounts, fetchMe, getDemoSessionId, markNotificationRead, setDemoSessionId } from '../../lib/api'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { NotificationItem, OrganizationMember, Profile } from '../../types'

interface AuthContextValue {
  profile: Profile | null
  memberships: OrganizationMember[]
  notifications: NotificationItem[]
  demoAccounts: Profile[]
  loading: boolean
  authModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  loginDemo: (userId: string) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  readNotification: (id: string) => Promise<void>
  isLeadOf: (orgId: string | null | undefined) => boolean
  isActiveMemberOf: (orgId: string | null | undefined) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<OrganizationMember[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [demoAccounts, setDemoAccounts] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const refreshMe = useCallback(async () => {
    const hasDemo = Boolean(getDemoSessionId())
    let hasSupaSession = false
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      hasSupaSession = Boolean(data.session?.access_token)
    }
    if (!hasDemo && !hasSupaSession) {
      setProfile(null)
      setMemberships([])
      setNotifications([])
      return
    }
    try {
      const me = await fetchMe()
      setProfile(me.profile)
      setMemberships(me.memberships)
      setNotifications(me.notifications)
    } catch (err) {
      console.warn('[Blam:Auth] Gagal memuat sesi:', err)
      setDemoSessionId(null)
      setProfile(null)
      setMemberships([])
      setNotifications([])
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      setLoading(true)
      try {
        const demos = await fetchDemoAccounts().catch(() => [])
        if (active) setDemoAccounts(demos)
        await refreshMe()
      } finally {
        if (active) setLoading(false)
      }
    }
    void init()

    if (!supabase) return () => {
      active = false
    }

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshMe()
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [refreshMe])

  const loginDemo = useCallback(
    async (userId: string) => {
      if (supabase) await supabase.auth.signOut().catch(() => {})
      setDemoSessionId(userId)
      await refreshMe()
      setAuthModalOpen(false)
    },
    [refreshMe],
  )

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase Auth belum dikonfigurasi di .env')
      }
      setDemoSessionId(null)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      await refreshMe()
      setAuthModalOpen(false)
    },
    [refreshMe],
  )

  const registerWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase Auth belum dikonfigurasi di .env')
      }
      setDemoSessionId(null)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw new Error(error.message)
      await refreshMe()
      setAuthModalOpen(false)
    },
    [refreshMe],
  )

  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase Auth belum dikonfigurasi di .env')
    }
    setDemoSessionId(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }, [])

  const logout = useCallback(async () => {
    setDemoSessionId(null)
    if (supabase) await supabase.auth.signOut().catch(() => {})
    setProfile(null)
    setMemberships([])
    setNotifications([])
  }, [])

  const readNotification = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }, [])

  const isLeadOf = useCallback(
    (orgId: string | null | undefined) => {
      if (!orgId) return false
      return memberships.some(
        (m) => m.organization_id === orgId && m.status === 'active' && m.member_role === 'lead',
      )
    },
    [memberships],
  )

  const isActiveMemberOf = useCallback(
    (orgId: string | null | undefined) => {
      if (!orgId) return false
      return memberships.some((m) => m.organization_id === orgId && m.status === 'active')
    },
    [memberships],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      memberships,
      notifications,
      demoAccounts,
      loading,
      authModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
      loginDemo,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      refreshMe,
      readNotification,
      isLeadOf,
      isActiveMemberOf,
    }),
    [
      profile,
      memberships,
      notifications,
      demoAccounts,
      loading,
      authModalOpen,
      loginDemo,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      refreshMe,
      readNotification,
      isLeadOf,
      isActiveMemberOf,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
