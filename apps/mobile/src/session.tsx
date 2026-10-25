import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { services } from '@tipalit/services'
import { isProfileComplete } from '@tipalit/services/profile'
import type { Profile, Session } from '@tipalit/services/types'

type SessionState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  // admins get the moderation drawer alongside the student tabs
  isAdmin: boolean
  signIn: () => Promise<string | null>
  signOut: () => Promise<void>
  saveProfile: (profile: Profile) => Promise<void>
  refreshProfile: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const stored = await services.profiles.get(userId)
    setProfile(stored)
    return stored
  }, [])

  useEffect(() => {
    let active = true
    services.auth
      .getSession()
      .then(async (stored) => {
        if (!active) return
        setSession(stored)
        if (stored) await loadProfile(stored.userId)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [loadProfile])

  const signIn = useCallback(async () => {
    const result = await services.auth.signInWithGoogle()
    if (!result.ok) return result.reason
    setSession(result.session)
    await loadProfile(result.session.userId)
    return null
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await services.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const saveProfile = useCallback(async (next: Profile) => {
    setProfile(await services.profiles.save(next))
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.userId)
  }, [session, loadProfile])

  const value = useMemo<SessionState>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: session?.role === 'admin',
      signIn,
      signOut,
      saveProfile,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signOut, saveProfile, refreshProfile],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}

export const needsOnboarding = (profile: Profile | null) => !isProfileComplete(profile)
