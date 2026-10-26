import { httpsCallable } from 'firebase/functions'
import { ServiceError } from '../errors'
import type { Listing, ListingDraft, ListingPhoto } from '../types'
import { getFirebaseFunctions } from './config'

type CallableError = { code?: string }

type PhotoInput = Pick<ListingPhoto, 'id' | 'contentType' | 'sizeBytes' | 'sortOrder'>

export type ListingMediaReservation = {
  operationId: string
  listingId: string
  expiresAtMs: number
  uploads: Array<{
    fileName: string
    path: string
    contentType: ListingPhoto['contentType']
    sizeBytes: number
  }>
}

export type ListingMediaResult = {
  listingId: string
  listingVersion: number
}

const toServiceError = (error: unknown, fallback: string): ServiceError => {
  const code = (error as CallableError | null)?.code
  if (code === 'functions/unauthenticated') {
    return new ServiceError('unauthenticated', 'Sign in again to continue.')
  }
  if (code === 'functions/permission-denied') {
    return new ServiceError('forbidden', 'This account cannot change that listing.')
  }
  if (code === 'functions/not-found') {
    return new ServiceError('not_found', 'That listing or upload reservation no longer exists.')
  }
  if (
    code === 'functions/invalid-argument' ||
    code === 'functions/failed-precondition' ||
    code === 'functions/already-exists' ||
    code === 'functions/aborted' ||
    code === 'functions/deadline-exceeded'
  ) {
    return new ServiceError('invalid', fallback)
  }
  return new ServiceError('network', fallback)
}

const mutationFrom = (draft: ListingDraft, campus: Listing['campus'], department: Listing['department']) => ({
  title: draft.title,
  description: draft.description,
  price: draft.price,
  transactionType: draft.transactionType,
  courseCode: draft.courseCode,
  category: draft.category,
  department,
  condition: draft.condition,
  meetupSpot: draft.meetupSpot,
  campus,
})

export const callReserveListingMedia = async (input: {
  operationId: string
  kind: 'create' | 'update'
  listingId?: string
  expectedListingVersion: number
  draft: ListingDraft
  campus: Listing['campus']
  department: Listing['department']
  retainedPhotoIds: string[]
  photos: PhotoInput[]
}): Promise<ListingMediaReservation> => {
  try {
    const callable = httpsCallable<
      {
        operationId: string
        kind: 'create' | 'update'
        listingId?: string
        expectedListingVersion: number
        mutation: ReturnType<typeof mutationFrom>
        retainedPhotoIds: string[]
        photos: PhotoInput[]
      },
      ListingMediaReservation
    >(getFirebaseFunctions(), 'reserveListingMedia')
    const result = await callable({
      operationId: input.operationId,
      kind: input.kind,
      listingId: input.listingId,
      expectedListingVersion: input.expectedListingVersion,
      mutation: mutationFrom(input.draft, input.campus, input.department),
      retainedPhotoIds: input.retainedPhotoIds,
      photos: input.photos,
    })
    return result.data
  } catch (error) {
    throw toServiceError(error, "Couldn't reserve listing photos. Reload and try again.")
  }
}

export const callFinalizeListingMedia = async (operationId: string): Promise<ListingMediaResult> => {
  try {
    const callable = httpsCallable<{ operationId: string }, ListingMediaResult>(
      getFirebaseFunctions(),
      'finalizeListingMedia',
    )
    const result = await callable({ operationId })
    return result.data
  } catch (error) {
    throw toServiceError(error, "Couldn't publish these listing changes. Reload and try again.")
  }
}

export const callDeleteListingMedia = async (
  listingId: string,
  expectedListingVersion: number,
  operationId: string,
): Promise<void> => {
  try {
    const callable = httpsCallable<
      { listingId: string; expectedListingVersion: number; operationId: string },
      { listingId: string }
    >(getFirebaseFunctions(), 'deleteListingMedia')
    await callable({ listingId, expectedListingVersion, operationId })
  } catch (error) {
    throw toServiceError(error, "Couldn't remove this listing. Reload and try again.")
  }
}
