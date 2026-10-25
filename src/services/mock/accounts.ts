import { ADMIN_EMAILS } from '../../data/seed'
import { ServiceError } from '../errors'
import type { AccountStatus, Role, Session } from '../types'
import { isRecordOf, read, write } from './storage'

// status lives server-side in production; a missing userId means active
const isStatus = (value: unknown): value is AccountStatus => value === 'active' || value === 'suspended'
const isStatusMap = isRecordOf(isStatus)

export const loadStatuses = () => read<Record<string, AccountStatus>>('accounts', () => ({}), isStatusMap)

export const statusOf = (userId: string): AccountStatus => loadStatuses()[userId] ?? 'active'

export const isSuspended = (userId: string) => statusOf(userId) === 'suspended'

export const writeStatus = (userId: string, status: AccountStatus) => {
  const next = { ...loadStatuses() }
  if (status === 'active') delete next[userId]
  else next[userId] = status
  write('accounts', next)
}

export const roleForEmail = (email: string): Role => (ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'member')

// mirrors the server-side check every admin endpoint must make
export const requireAdmin = (session: Session | null): Session => {
  if (!session) throw new ServiceError('unauthenticated', 'Sign in again to continue.')
  if (session.role !== 'admin') throw new ServiceError('forbidden', 'Only admins can do that.')
  return session
}
