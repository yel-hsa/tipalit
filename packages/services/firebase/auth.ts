import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { initialsOf } from '../profile'
import { getPlatform } from '../platform'
import type { AuthService, AuthResult, Role, Session } from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

const TIP_DOMAIN = /@tip\.edu\.ph$/i

const roleFromClaims = (claims: Record<string, unknown>): Role => (claims.admin === true ? 'admin' : 'member')

const nameFromUser = (user: User): string => {
  if (user.displayName && user.displayName.trim()) return user.displayName.trim()
  const email = user.email || ''
  return (
    email
      .split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ') || 'TIP Student'
  )
}

function sessionFromUser(user: User, role: Role): Session {
  const email = user.email || ''
  const name = nameFromUser(user)
  return {
    userId: user.uid,
    email,
    name,
    initials: initialsOf(name),
    issuedAt: new Date().toISOString(),
    role,
  }
}

export function createFirebaseAuth(): AuthService {
  const auth = getFirebaseAuth()
  const db = getFirebaseDb()

  // shared gates for every sign-in path: @tip.edu.ph, verified email, active
  // users_profile doc, role from custom claims (non-admins get 'member' and
  // the admin UI must deny on its own)
  const completeSignIn = async (user: User): Promise<AuthResult> => {
    const email = (user.email || '').trim().toLowerCase()

    if (!TIP_DOMAIN.test(email)) {
      await firebaseSignOut(auth).catch(() => {})
      return { ok: false, reason: 'domain', email }
    }

    const token = await user.getIdTokenResult().catch(() => null)
    const claims = token?.claims ?? {}
    const isAdmin = claims.admin === true

    if (!user.emailVerified && !isAdmin) {
      await firebaseSignOut(auth).catch(() => {})
      return { ok: false, reason: 'unverified', email }
    }

    const userDocRef = doc(db, 'users_profile', user.uid)
    const userSnapshot = await getDoc(userDocRef)

    let role: Role = roleFromClaims(claims)
    if (userSnapshot.exists()) {
      const profileData = userSnapshot.data()
      if (profileData.status !== 'active') {
        await firebaseSignOut(auth).catch(() => {})
        return { ok: false, reason: 'suspended', email }
      }
    } else {
      // rules pin create to role 'member'; leaving campus unset keeps onboarding running
      await setDoc(userDocRef, {
        user_id: user.uid,
        email,
        full_name: nameFromUser(user),
        is_verified: user.emailVerified || isAdmin,
        role: isAdmin ? 'admin' : 'member',
        status: 'active',
        joinedAt: new Date().toISOString(),
      })
    }

    return { ok: true, session: sessionFromUser(user, role) }
  }

  return {
    async getSession(): Promise<Session | null> {
      if (!isFirebaseConfigured()) {
        return null
      }

      // check if returning from a redirect sign-in
      try {
        const redirectResult = await getRedirectResult(auth).catch(() => null)
        if (redirectResult?.user) {
          const res = await completeSignIn(redirectResult.user)
          if (res.ok) return res.session
        }
      } catch (err) {
        console.warn('[TIPalit Firebase Auth] Redirect auth error:', err)
      }

      const currentUser = await new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            unsubscribe()
            resolve(user)
          },
          () => {
            unsubscribe()
            resolve(null)
          },
        )
      })

      if (!currentUser || !currentUser.email) return null

      if (!TIP_DOMAIN.test(currentUser.email)) {
        await firebaseSignOut(auth).catch(() => {})
        return null
      }

      // firestore and storage enforce the same verified-email boundary
      if (!currentUser.emailVerified) {
        await firebaseSignOut(auth).catch(() => {})
        return null
      }

      try {
        const userDocRef = doc(db, 'users_profile', currentUser.uid)
        const userSnapshot = await getDoc(userDocRef)

        if (userSnapshot.exists()) {
          const data = userSnapshot.data()
          if (data.status !== 'active') {
            await firebaseSignOut(auth).catch(() => {})
            return null
          }
          const token = await currentUser.getIdTokenResult()
          return sessionFromUser(currentUser, roleFromClaims(token.claims))
        }

        await firebaseSignOut(auth).catch(() => {})
        return null
      } catch (err) {
        console.warn('[TIPalit Firebase Auth] Could not fetch profile on getSession:', err)
        return null
      }
    },

    async signInWithGoogle(): Promise<AuthResult> {
      if (!isFirebaseConfigured()) {
        return {
          ok: false,
          reason: 'network',
          message: 'Firebase credentials missing. Check .env configuration.',
        }
      }

      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        hd: 'tip.edu.ph',
        prompt: 'select_account',
      })

      try {
        // native hosts register a googleSignIn handler on the platform; popup
        // cannot work outside a browser, so prefer the hook when installed
        const nativeHandler = getPlatform().googleSignIn
        let user: User
        if (nativeHandler) {
          const credential = await nativeHandler()
          if (!credential) return { ok: false, reason: 'cancelled' }
          const result = await signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken))
          user = result.user
        } else {
          try {
            const result = await signInWithPopup(auth, provider)
            user = result.user
          } catch (popupErr: unknown) {
            const err = popupErr as { code?: string }
            if (err?.code === 'auth/popup-blocked') {
              await signInWithRedirect(auth, provider)
              return { ok: false, reason: 'cancelled' }
            }
            throw popupErr
          }
        }
        return await completeSignIn(user)
      } catch (error: unknown) {
        const firebaseErr = error as { code?: string; message?: string }
        console.error('[TIPalit Firebase Auth] Sign-in error:', firebaseErr)

        if (
          firebaseErr.code === 'auth/popup-closed-by-user' ||
          firebaseErr.code === 'auth/cancelled-popup-request'
        ) {
          return { ok: false, reason: 'cancelled' }
        }

        let message = firebaseErr.message || 'Could not connect to Google sign-in service.'
        if (firebaseErr.code === 'auth/unauthorized-domain') {
          const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
          message = `Domain '${host}' is not authorized in Firebase Console > Authentication > Settings > Authorized Domains.`
        } else if (firebaseErr.code === 'auth/operation-not-allowed') {
          message = 'Google sign-in is not enabled in Firebase Console (Authentication > Sign-in method).'
        }

        return { ok: false, reason: 'network', message, code: firebaseErr.code }
      }
    },

    async signInWithEmail(email: string, password: string): Promise<AuthResult> {
      if (!isFirebaseConfigured()) {
        return { ok: false, reason: 'network' }
      }

      try {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password)
        return await completeSignIn(result.user)
      } catch (error: unknown) {
        const firebaseErr = error as { code?: string; message?: string }
        console.error('[TIPalit Firebase Auth] Email sign-in error:', firebaseErr)

        switch (firebaseErr.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            return { ok: false, reason: 'invalid-credentials', email }
          case 'auth/too-many-requests':
            return { ok: false, reason: 'too-many-attempts', email }
          case 'auth/network-request-failed':
            return { ok: false, reason: 'network' }
          default:
            return { ok: false, reason: 'network' }
        }
      }
    },

    async signOut(): Promise<void> {
      try {
        await firebaseSignOut(auth)
      } catch (err) {
        console.warn('[TIPalit Firebase Auth] Error on sign out:', err)
      }
    },
  }
}
