import { initialsOf } from '../profile'
import type { AuthService, Session } from '../types'
import { isSuspended, roleForEmail } from './accounts'
import { mockControls } from './controls'
import { pickAccount } from './googleAccountPicker'
import { delay } from './latency'
import { createSignInProfile, loadProfiles, saveProfile } from './profiles'
import { hasShape, read, remove, write } from './storage'

// ux only; a real backend must verify the `hd` claim on the id token
const TIP_DOMAIN = /@tip\.edu\.ph$/i

const isSessionShape = hasShape<Session>({ userId: 'string', email: 'string', name: 'string', initials: 'string' })
const isSession = (value: unknown): value is Session | null => value === null || isSessionShape(value)

export const readSession = () => read<Session | null>('session', () => null, isSession)

const userIdFor = (email: string) => `u_${email.split('@')[0].replace(/[^a-z0-9]/g, '_')}`

const nameFromEmail = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ') || 'TIP Student'

export function createMockAuth({ onSignOut }: { onSignOut: () => void }): AuthService {
  return {
    async getSession() {
      await delay(300)
      const session = readSession()
      if (!session) return null
      // suspension lands on the next app start, like a revoked server session
      if (isSuspended(session.userId)) {
        remove('session')
        return null
      }
      return { ...session, role: session.role ?? roleForEmail(session.email) }
    },

    async signInWithGoogle() {
      if (mockControls.googleFailure === 'cancel') {
        await delay(300)
        return { ok: false, reason: 'cancelled' }
      }
      const account = await pickAccount()
      if (!account) return { ok: false, reason: 'cancelled' }
      await delay()
      if (mockControls.googleFailure === 'network') return { ok: false, reason: 'network' }

      const email = account.email.trim().toLowerCase()
      if (!TIP_DOMAIN.test(email)) return { ok: false, reason: 'domain', email }

      const name = account.name.trim() || nameFromEmail(email)
      const userId = userIdFor(email)
      if (isSuspended(userId)) return { ok: false, reason: 'suspended', email }
      // stub profile with no campus, so first sign-in routes into onboarding
      if (!loadProfiles()[userId]) saveProfile(createSignInProfile(userId, name, email))
      const session: Session = {
        userId,
        email,
        name,
        initials: initialsOf(name),
        issuedAt: new Date().toISOString(),
        role: roleForEmail(email),
      }
      write('session', session)
      return { ok: true, session }
    },

    async signOut() {
      onSignOut()
      remove('session')
      await delay(200)
    },
  }
}
