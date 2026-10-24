import { useCallback, useState } from 'react'

const SESSION_KEY = 'tipalit.reviewer'

/*
 * Reviewer mode shows demo tooling (state toggles, launchers, extra test
 * accounts). Turn it on with VITE_REVIEWER_MODE=true, a `?reviewer=1` URL
 * (remembered for the browser session, `?reviewer=0` clears it), or by
 * tapping the version line on Profile seven times.
 */
const readInitial = () => {
  let stored: string | null = null
  try {
    const param = new URLSearchParams(window.location.search).get('reviewer')
    if (param === '1') window.sessionStorage.setItem(SESSION_KEY, '1')
    if (param === '0') window.sessionStorage.setItem(SESSION_KEY, '0')
    stored = window.sessionStorage.getItem(SESSION_KEY)
  } catch {
    // sessionStorage can be blocked; fall back to the build flag.
  }
  if (stored === '1') return true
  if (stored === '0') return false
  return import.meta.env.VITE_REVIEWER_MODE === 'true'
}

export function useReviewerMode(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState(readInitial)

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, next ? '1' : '0')
    } catch {
      // Still toggles for this page view.
    }
    setEnabledState(next)
  }, [])

  return [enabled, setEnabled]
}
