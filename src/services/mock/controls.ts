import type { DemoControls } from '../types'

export const DEFAULT_CONTROLS: DemoControls = {
  slowNetwork: false,
  failNextLoad: false,
  failNextPublish: false,
  sellerDeclines: false,
  googleFailure: 'none',
}

/** In-memory reviewer knobs. They reset on refresh. */
export const mockControls: DemoControls = { ...DEFAULT_CONTROLS }

/** One-shot flags clear themselves after firing, so the retry succeeds. */
export const consumeOnce = (key: 'failNextLoad' | 'failNextPublish') => {
  if (!mockControls[key]) return false
  mockControls[key] = false
  return true
}
