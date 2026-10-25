import { MEETUP_SPOTS } from '../seed'
import type { MeetupSpots, SettingsService } from '../types'
import { delay } from './latency'
import { read, write } from './storage'

const isSpotList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((spot) => typeof spot === 'string')

const isSpots = (value: unknown): value is MeetupSpots =>
  typeof value === 'object' &&
  value !== null &&
  isSpotList((value as Record<string, unknown>).qc) &&
  isSpotList((value as Record<string, unknown>).manila)

const defaults = (): MeetupSpots => ({ qc: [...MEETUP_SPOTS.qc], manila: [...MEETUP_SPOTS.manila] })

export const loadSpots = () => read<MeetupSpots>('spots', defaults, isSpots)
export const saveSpots = (spots: MeetupSpots) => write('spots', spots)

export function createMockSettings(): SettingsService {
  return {
    async getMeetupSpots() {
      await delay(150)
      return loadSpots()
    },
  }
}
