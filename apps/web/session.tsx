import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { services } from '@tipalit/services'
import type { AuthResult, GoogleAccount, Session } from '@tipalit/services/types'

// staff sessions are short-lived on purpose; the console re-checks on every focus
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const EXPIRY_WARNING_MS = 5 * 60 * 1000

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in'

export type SignOutReason = 'manual' | 'expired' | 'revoked'

type SessionContextValue = {
  status: SessionStatus
  session: Session | null
  // set when the previous session ended without the admin asking
  signOutReason: SignOutReason | null
  expiresAt: number | null
  signIn: () => Promise<AuthResult>
  signOut: (reason?: SignOutReason) => Promise<void>
  registerAccountPicker: (picker: (() => Promise<GoogleAccount | null>) | null) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

const expiryOf = (session: Session) => new Date(session.issuedAt).getTime() + SESSION_TTL_MS

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const clear = useCallback((reason: SignOutReason) => {
    if (!mounted.current) return
    setSession(null)
    setStatus('signed-out')
    setSignOutReason(reason)
  }, [])

  const signOut = useCallback(
    async (reason: SignOutReason = 'manual') => {
      await services.auth.signOut().catch(() => undefined)
      clear(reason)
    },
    [clear],
  )

  // boot: restore a staff session, or drop a student one
  useEffect(() => {
    let active = true
    services.auth
      .getSession()
      .then((restored) => {
        if (!active) return
        if (!restored || restored.role !== 'admin') {
          setStatus('signed-out')
          return
        }
        if (Date.now() >= expiryOf(restored)) {
          void services.auth.signOut().catch(() => undefined)
          setStatus('signed-out')
          setSignOutReason('expired')
          return
        }
        setSession(restored)
        setStatus('signed-in')
      })
      .catch(() => {
        if (active) setStatus('signed-out')
      })
    return () => {
      active = false
    }
  }, [])

  // expiry: warn, then sign out when the staff session runs out
  useEffect(() => {
    if (!session) return
    const expiresAt = expiryOf(session)
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      void signOut('expired')
      return
    }
    const timer = window.setTimeout(() => void signOut('expired'), remaining)
    return () => window.clearTimeout(timer)
  }, [session, signOut])

  // another tab signing out ends this one too
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && !event.key.endsWith('session')) return
      if (event.newValue === null && session) clear('revoked')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [session, clear])

  // a suspended account is revoked server-side; re-check when the tab regains focus
  useEffect(() => {
    if (!session) return
    const recheck = async () => {
      if (document.visibilityState !== 'visible') return
      const current = await services.auth.getSession().catch(() => null)
      if (!current) clear('revoked')
    }
    document.addEventListener('visibilitychange', recheck)
    return () => document.removeEventListener('visibilitychange', recheck)
  }, [session, clear])

  const signIn = useCallback(async () => {
    const result = await services.auth.signInWithGoogle()
    if (result.ok) {
      if (result.session.role !== 'admin') {
        await services.auth.signOut().catch(() => undefined)
        return result
      }
      if (mounted.current) {
        setSession(result.session)
        setStatus('signed-in')
        setSignOutReason(null)
      }
    }
    return result
  }, [])

  const registerAccountPicker = useCallback(
    (picker: (() => Promise<GoogleAccount | null>) | null) => {
      services.demo?.registerAccountPicker(picker)
    },
    [],
  )

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      signOutReason,
      expiresAt: session ? expiryOf(session) : null,
      signIn,
      signOut,
      registerAccountPicker,
    }),
    [status, session, signOutReason, signIn, signOut, registerAccountPicker],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}

export { SESSION_TTL_MS, EXPIRY_WARNING_MS }
