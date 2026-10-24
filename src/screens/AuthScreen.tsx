import { Button } from '@figma/astraui'
import { Ban, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import googleMark from '../assets/google-g.svg'
import BottomSheet from '../components/BottomSheet'
import InlineAlert from '../components/InlineAlert'
import SafetyRulesList from '../components/SafetyRulesList'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import type { AuthResult } from '../services/types'

type AuthState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'domain'; email: string }
  | { kind: 'unverified'; email: string }
  | { kind: 'suspended'; email: string }
  | { kind: 'network' }

type AuthScreenProps = {
  onSignIn: () => Promise<AuthResult>
  /** Demo launcher: open with the domain-rejected state already showing. */
  initialRejectedEmail?: string
}

export default function AuthScreen({ onSignIn, initialRejectedEmail }: AuthScreenProps) {
  const [state, setState] = useState<AuthState>(
    initialRejectedEmail ? { kind: 'domain', email: initialRejectedEmail } : { kind: 'idle' },
  )
  const [rulesOpen, setRulesOpen] = useState(false)
  const mounted = useRef(true)
  const pending = state.kind === 'pending'

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const signIn = async () => {
    if (pending) return
    setState({ kind: 'pending' })
    let result: AuthResult
    try {
      result = await onSignIn()
    } catch {
      result = { ok: false, reason: 'network' }
    }
    // On success App routes away and this screen unmounts.
    if (result.ok || !mounted.current) return
    if (result.reason === 'domain') setState({ kind: 'domain', email: result.email ?? 'That account' })
    else if (result.reason === 'suspended') setState({ kind: 'suspended', email: result.email ?? 'This account' })
    else if (result.reason === 'network') setState({ kind: 'network' })
    else setState({ kind: 'idle' })
  }

  const googleIcon = <img src={googleMark} alt="" className="size-4" />

  return (
    <div className="flex flex-1 flex-col justify-center gap-2xl px-xl py-2xl">
      <div className="flex flex-col items-center gap-lg text-center">
        <Wordmark size="lg" />
        <p role="heading" aria-level={1} className="text-heading text-text-primary">
          Buy and sell campus essentials with fellow TIP students.
        </p>
        <p className="flex items-center gap-xs text-label-sm text-text-secondary">
          <ShieldCheck size={16} className="shrink-0 text-success" aria-hidden="true" />
          Every member signs in with a school Google account.
        </p>
      </div>

      <div className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
        {state.kind === 'domain' && (
          <InlineAlert
            action={
              <Button variant="neutral" size="small" onClick={signIn} className="touch-hit">
                Try another account
              </Button>
            }
          >
            <span className="font-semibold">{state.email}</span> isn&rsquo;t a TIP account. Sign in with your
            @tip.edu.ph Google account.
          </InlineAlert>
        )}
        {state.kind === 'network' && (
          <InlineAlert icon={WifiOff}>Couldn&rsquo;t reach Google. Check your connection and try again.</InlineAlert>
        )}
        {state.kind === 'suspended' && (
          <InlineAlert icon={Ban}>
            <span className="font-semibold">{state.email}</span> is suspended from TIPalit. Contact the Office of
            Student Affairs to appeal.
          </InlineAlert>
        )}

        <Button
          variant="neutral"
          onClick={signIn}
          disabled={pending}
          aria-busy={pending || undefined}
          iconStart={pending ? <Spinner /> : state.kind === 'network' ? <RotateCcw size={16} /> : googleIcon}
          className="w-full touch-hit"
        >
          {pending ? 'Signing in\u2026' : state.kind === 'network' ? 'Try again' : 'Continue with Google'}
        </Button>
        <p className="text-center text-caption-sm text-text-secondary">Use your @tip.edu.ph Google account.</p>
      </div>

      <div className="flex flex-col items-center gap-xs text-center">
        <p className="text-caption-sm text-text-secondary">By continuing you agree to TIPalit&rsquo;s</p>
        <Button variant="subtle" size="small" onClick={() => setRulesOpen(true)} className="touch-hit">
          community rules
        </Button>
      </div>

      <BottomSheet
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Community rules"
        subtitle="Every member agrees to these before trading."
        footer={
          <Button variant="primary" onClick={() => setRulesOpen(false)} className="w-full touch-hit">
            Got it
          </Button>
        }
      >
        <SafetyRulesList />
      </BottomSheet>
    </div>
  )
}
