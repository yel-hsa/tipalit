import { httpsCallable } from 'firebase/functions'
import { ServiceError } from '../errors'
import type { AccountStatus, CampusId, MeetupSpots, MemberSummary, Report, ReportAction } from '../types'
import { getFirebaseFunctions } from './config'

type CallableError = { code?: string }

const toServiceError = (error: unknown, fallback: string): ServiceError => {
  const code = (error as CallableError | null)?.code
  if (code === 'functions/unauthenticated') {
    return new ServiceError('unauthenticated', 'Sign in again to continue.')
  }
  if (code === 'functions/permission-denied') {
    return new ServiceError('forbidden', 'Only active administrators can do that.')
  }
  if (code === 'functions/not-found') {
    return new ServiceError('not_found', 'That record no longer exists.')
  }
  if (code === 'functions/resource-exhausted') {
    return new ServiceError('invalid', 'Too many reports. Please try again later.')
  }
  if (code === 'functions/invalid-argument' || code === 'functions/failed-precondition') {
    return new ServiceError('invalid', fallback)
  }
  return new ServiceError('network', fallback)
}

type ResolveReportResult = { report: Report }
type SubmitReportResult = { report: Report }
type SetMemberStatusResult = { member: MemberSummary }
type SaveMeetupSpotsResult = { spots: MeetupSpots }

export const callRemoveListingAsAdmin = async (
  listingId: string,
  note: string,
): Promise<void> => {
  try {
    const callable = httpsCallable<
      { listingId: string; note: string },
      Record<string, never>
    >(getFirebaseFunctions(), 'removeListingAsAdmin')
    await callable({ listingId, note })
  } catch (error) {
    throw toServiceError(error, "Couldn't remove listing.")
  }
}

export const callSubmitReport = async (
  kind: 'listing' | 'user',
  targetId: string,
  reason: string,
  details: string,
): Promise<Report> => {
  try {
    const callable = httpsCallable<
      { kind: 'listing' | 'user'; targetId: string; reason: string; details: string },
      SubmitReportResult
    >(getFirebaseFunctions(), 'submitReport')
    const result = await callable({ kind, targetId, reason, details })
    return result.data.report
  } catch (error) {
    throw toServiceError(error, "Couldn't send report.")
  }
}

export const callResolveReport = async (
  reportId: string,
  action: ReportAction,
  note: string,
): Promise<Report> => {
  try {
    const callable = httpsCallable<
      { reportId: string; action: ReportAction; note: string },
      ResolveReportResult
    >(getFirebaseFunctions(), 'resolveReport')
    const result = await callable({ reportId, action, note })
    return result.data.report
  } catch (error) {
    throw toServiceError(error, "Couldn't update report.")
  }
}

export const callSetMemberStatus = async (
  userId: string,
  status: AccountStatus,
  note: string,
): Promise<MemberSummary> => {
  try {
    const callable = httpsCallable<
      { userId: string; status: AccountStatus; note: string },
      SetMemberStatusResult
    >(getFirebaseFunctions(), 'setMemberStatus')
    const result = await callable({ userId, status, note })
    return result.data.member
  } catch (error) {
    throw toServiceError(error, "Couldn't update member status.")
  }
}

export const callSaveMeetupSpots = async (
  campus: CampusId,
  spots: string[],
): Promise<MeetupSpots> => {
  try {
    const callable = httpsCallable<
      { campus: CampusId; spots: string[] },
      SaveMeetupSpotsResult
    >(getFirebaseFunctions(), 'saveMeetupSpots')
    const result = await callable({ campus, spots })
    return result.data.spots
  } catch (error) {
    throw toServiceError(error, "Couldn't save meetup spots.")
  }
}
