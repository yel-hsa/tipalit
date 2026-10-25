import { ServiceError } from '../errors'
import type { Report, ReportInput, ReportService } from '../types'
import { callSubmitReport } from './admin-callables'
import { getFirebaseAuth, isFirebaseConfigured } from './config'

export function createFirebaseReports(): ReportService {
  const auth = getFirebaseAuth()

  return {
    async submit(input: ReportInput): Promise<Report> {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new ServiceError('unauthenticated', 'Sign in again to send a report.')
      }
      if (!isFirebaseConfigured()) {
        throw new ServiceError('network', 'Firebase is not configured.')
      }

      return callSubmitReport(input.target.kind, input.target.id, input.reason, input.details)
    },
  }
}
