import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  fetchDemoAccounts,
  fetchMe,
  getDemoSessionId,
  markNotificationRead,
  registerAccount,
  setDemoSessionId,
} from '../../lib/api'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { NotificationItem, OrganizationMember, Profile } from '../../types'

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email atau kata sandi salah'
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi'
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'Email ini sudah terdaftar. Silakan masuk.'
  }
  if (m.includes('password should be at least')) return 'Kata sandi minimal 6 karakter'
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Terlalu banyak percobaan. Coba beberapa menit lagi.'
  }
  return message || 'Autentikasi gagal'
}

interface AuthContextValue {
  isDemo: boolean
  profile: Profile | null
  memberships: OrganizationMember[]
  notifications: NotificationItem[]
  demoAccounts: Profile[]
  demoError: string | null
  loading: boolean
  authModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  refreshDemoAccounts: () => Promise<void>
  loginDemo: (userId: string) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithGoogleIdToken: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  readNotification: (id: string) => Promise<void>
  isLeadOf: (orgId: string | null | undefined) => boolean
  isActiveMemberOf: (orgId: string | null | undefined) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ isDemo, children }: { isDemo: boolean; children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<OrganizationMember[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [demoAccounts, setDemoAccounts] = useState<Profile[]>([])
  const [demoError, setDemoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const refreshDemoAccounts = useCallback(async () => {
    if (!isDemo) {
      setDemoAccounts([])
      setDemoError(null)
      return
    }
    try {
      const demos = await fetchDemoAccounts()
      setDemoAccounts(demos)
      setDemoError(null)
    } catch (err) {
      setDemoAccounts([])
      setDemoError(err instanceof Error ? err.message : 'Gagal memuat akun demo')
    }
  }, [isDemo])

  const refreshMe = useCallback(async () => {
    if (isDemo) {
      if (!getDemoSessionId()) {
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
        console.warn('[Blam:AuthDemo] Gagal memuat sesi demo:', err)
        setDemoSessionId(null)
        setProfile(null)
        setMemberships([])
        setNotifications([])
      }
      return
    }

    let hasSupaSession = false
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      hasSupaSession = Boolean(data.session?.access_token)
    }
    if (!hasSupaSession) {
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
      setProfile(null)
      setMemberships([])
      setNotifications([])
    }
  }, [isDemo])

  useEffect(() => {
    let active = true
    const init = async () => {
      setLoading(true)
      try {
        if (isDemo) {
          await refreshDemoAccounts()
        } else {
          setDemoAccounts([])
          setDemoError(null)
        }
        await refreshMe()
      } finally {
        if (active) setLoading(false)
      }
    }
    void init()

    if (isDemo || !supabase) {
      return () => {
        active = false
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshMe()
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [isDemo, refreshDemoAccounts, refreshMe])

  const loginDemo = useCallback(
    async (userId: string) => {
      if (!isDemo) {
        throw new Error('Akun demo hanya tersedia di halaman /demo')
      }
      setDemoSessionId(userId)
      await refreshMe()
      setAuthModalOpen(false)
    },
    [isDemo, refreshMe],
  )

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase Auth belum dikonfigurasi di .env')
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(translateAuthError(error.message))
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
      await registerAccount({ email, password, fullName })
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(translateAuthError(error.message))
      await refreshMe()
      setAuthModalOpen(false)
    },
    [refreshMe],
  )

  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase Auth belum dikonfigurasi di .env')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(translateAuthError(error.message))
  }, [])

  const loginWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase Auth belum dikonfigurasi di .env')
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      if (error) throw new Error(translateAuthError(error.message))
      await refreshMe()
      setAuthModalOpen(false)
    },
    [refreshMe],
  )

  const logout = useCallback(async () => {
    if (isDemo) {
      setDemoSessionId(null)
    } else if (supabase) {
      await supabase.auth.signOut().catch(() => { })
    }
    setProfile(null)
    setMemberships([])
    setNotifications([])
  }, [isDemo])

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
      isDemo,
      profile,
      memberships,
      notifications,
      demoAccounts,
      demoError,
      loading,
      authModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
      refreshDemoAccounts,
      loginDemo,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      loginWithGoogleIdToken,
      logout,
      refreshMe,
      readNotification,
      isLeadOf,
      isActiveMemberOf,
    }),
    [
      isDemo,
      profile,
      memberships,
      notifications,
      demoAccounts,
      demoError,
      loading,
      authModalOpen,
      refreshDemoAccounts,
      loginDemo,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      loginWithGoogleIdToken,
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