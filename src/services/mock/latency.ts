import { mockControls } from './controls'

export const BASE_MS = 600
const SLOW_MS = 2000

// slow network stretches every call by the same factor
export const delay = (ms = BASE_MS) =>
  new Promise<void>((resolve) => {
    const factor = mockControls.slowNetwork ? SLOW_MS / BASE_MS : 1
    window.setTimeout(resolve, ms * factor)
  })
