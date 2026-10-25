import type { DemoControls } from '../types'

export const DEFAULT_CONTROLS: DemoControls = {
  slowNetwork: false,
  failNextLoad: false,
  failNextPublish: false,
  sellerDeclines: false,
  googleFailure: 'none',
}

// in-memory only, so knobs reset on refresh
export const mockControls: DemoControls = { ...DEFAULT_CONTROLS }

// one-shot flags clear after firing so the retry succeeds
export const consumeOnce = (key: 'failNextLoad' | 'failNextPublish') => {
  if (!mockControls[key]) return false
  mockControls[key] = false
  return true
}
