import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { initialsOf } from '../profile'
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

  return {
    async getSession(): Promise<Session | null> {
      if (!isFirebaseConfigured()) {
        return null
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
        return { ok: false, reason: 'network' }
      }

      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        hd: 'tip.edu.ph',
        prompt: 'select_account',
      })

      try {
        const result = await signInWithPopup(auth, provider)
        const user = result.user
        const email = (user.email || '').trim().toLowerCase()

        if (!TIP_DOMAIN.test(email)) {
          await firebaseSignOut(auth).catch(() => {})
          return { ok: false, reason: 'domain', email }
        }

        if (!user.emailVerified) {
          await firebaseSignOut(auth).catch(() => {})
          return { ok: false, reason: 'unverified', email }
        }

        const userDocRef = doc(db, 'users_profile', user.uid)
        const userSnapshot = await getDoc(userDocRef)

        let role: Role = 'member'
        if (userSnapshot.exists()) {
          const profileData = userSnapshot.data()
          if (profileData.status !== 'active') {
            await firebaseSignOut(auth).catch(() => {})
            return { ok: false, reason: 'suspended', email }
          }
          const token = await user.getIdTokenResult()
          role = roleFromClaims(token.claims)
        } else {
          // rules pin create to role 'member'; leaving campus unset keeps onboarding running
          await setDoc(userDocRef, {
            user_id: user.uid,
            email,
            full_name: nameFromUser(user),
            is_verified: user.emailVerified,
            role: 'member',
            status: 'active',
            joinedAt: new Date().toISOString(),
          })
          const token = await user.getIdTokenResult()
          role = roleFromClaims(token.claims)
        }

        const session = sessionFromUser(user, role)
        return { ok: true, session }
      } catch (error: unknown) {
        const firebaseErr = error as { code?: string; message?: string }
        console.error('[TIPalit Firebase Auth] Sign-in error:', firebaseErr)

        if (
          firebaseErr.code === 'auth/popup-closed-by-user' ||
          firebaseErr.code === 'auth/cancelled-popup-request'
        ) {
          return { ok: false, reason: 'cancelled' }
        }

        return { ok: false, reason: 'network' }
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
