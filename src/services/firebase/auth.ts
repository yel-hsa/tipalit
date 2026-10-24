import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ADMIN_EMAILS } from '../../data/seed'
import { initialsOf } from '../profile'
import type { AuthService, AuthResult, Role, Session } from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

const TIP_DOMAIN = /@tip\.edu\.ph$/i

const roleForEmail = (email: string): Role =>
  ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'member'

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

/**
 * Builds a Session from a Firebase User and an optional role override.
 */
function sessionFromUser(user: User, roleOverride?: Role): Session {
  const email = user.email || ''
  const name = nameFromUser(user)
  return {
    userId: user.uid,
    email,
    name,
    initials: initialsOf(name),
    issuedAt: new Date().toISOString(),
    role: roleOverride ?? roleForEmail(email),
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

      // Wait for auth to resolve current user
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

      // Strict @tip.edu.ph domain check
      if (!TIP_DOMAIN.test(currentUser.email)) {
        await firebaseSignOut(auth).catch(() => {})
        return null
      }

      // Google reports school-managed accounts as verified. Never create an app
      // session for an unverified token: Firestore and Storage enforce the same boundary.
      if (!currentUser.emailVerified) {
        await firebaseSignOut(auth).catch(() => {})
        return null
      }

      try {
        const userDocRef = doc(db, 'users_profile', currentUser.uid)
        const userSnapshot = await getDoc(userDocRef)

        if (userSnapshot.exists()) {
          const data = userSnapshot.data()
          if (data.status === 'suspended') {
            await firebaseSignOut(auth).catch(() => {})
            return null
          }
          const role: Role = data.role === 'admin' || roleForEmail(currentUser.email) === 'admin' ? 'admin' : 'member'
          return sessionFromUser(currentUser, role)
        }

        return sessionFromUser(currentUser)
      } catch (err) {
        console.warn('[TIPalit Firebase Auth] Could not fetch profile on getSession:', err)
        return sessionFromUser(currentUser)
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

        // FR-1.2: Must strictly reject any email that does not end with @tip.edu.ph
        if (!TIP_DOMAIN.test(email)) {
          await firebaseSignOut(auth).catch(() => {})
          return { ok: false, reason: 'domain', email }
        }

        if (!user.emailVerified) {
          await firebaseSignOut(auth).catch(() => {})
          return { ok: false, reason: 'unverified', email }
        }

        // Check if user is suspended in Firestore
        const userDocRef = doc(db, 'users_profile', user.uid)
        const userSnapshot = await getDoc(userDocRef)

        let role: Role = roleForEmail(email)
        if (userSnapshot.exists()) {
          const profileData = userSnapshot.data()
          if (profileData.status === 'suspended') {
            await firebaseSignOut(auth).catch(() => {})
            return { ok: false, reason: 'suspended', email }
          }
          if (profileData.role === 'admin') {
            role = 'admin'
          }
        } else {
          // Initialize base user profile document per PRD Section 5.1 Collection 1: users_profile
          const name = nameFromUser(user)
          await setDoc(
            userDocRef,
            {
              user_id: user.uid,
              email,
              full_name: name,
              campus: 'qc',
              department: 'General',
              is_verified: user.emailVerified,
              average_rating: 0.0,
              total_reviews: 0,
              role,
              status: 'active',
              joinedAt: new Date().toISOString(),
              created_at: serverTimestamp(),
            },
            { merge: true },
          )
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
