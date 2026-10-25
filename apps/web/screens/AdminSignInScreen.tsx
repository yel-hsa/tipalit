import { Button } from '@figma/astraui'
import { Ban, Clock, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ADMIN_ACCOUNT } from '@tipalit/services/seed'
import type { AuthResult, GoogleAccount } from '@tipalit/services/types'
import googleMark from '../assets/google-g.svg'
import AccountChooser from '../components/admin/AccountChooser'
import InlineAlert from '../components/InlineAlert'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import type { SignOutReason } from '../session'

type AuthState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'domain'; email: string }
  | { kind: 'unverified'; email: string }
  | { kind: 'suspended'; email: string }
  | { kind: 'forbidden'; email: string }
  | { kind: 'network' }

type AdminSignInScreenProps = {
  onSignIn: () => Promise<AuthResult>
  // the mock adapter has no Google popup; it asks this picker for an account
  registerAccountPicker: (picker: (() => Promise<GoogleAccount | null>) | null) => void
  // why the previous session ended, when it wasn't a deliberate sign-out
  signOutReason: SignOutReason | null
}

const ENDED_NOTICE: Partial<Record<SignOutReason, { icon: typeof Clock; text: string }>> = {
  expired: { icon: Clock, text: 'Your session expired after 8 hours. Sign in again to keep moderating.' },
  revoked: { icon: ShieldCheck, text: 'Your session was ended elsewhere. Sign in again to continue.' },
}

export default function AdminSignInScreen({ onSignIn, registerAccountPicker, signOutReason }: AdminSignInScreenProps) {
  const [state, setState] = useState<AuthState>({ kind: 'idle' })
  const [choosing, setChoosing] = useState(false)
  const mounted = useRef(true)
  const pickerResolve = useRef<((account: GoogleAccount | null) => void) | null>(null)
  const pending = state.kind === 'pending'
  const ended = signOutReason ? ENDED_NOTICE[signOutReason] : undefined

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    registerAccountPicker(
      () =>
        new Promise<GoogleAccount | null>((resolve) => {
          pickerResolve.current = resolve
          setChoosing(true)
        }),
    )
    return () => registerAccountPicker(null)
  }, [registerAccountPicker])

  const settlePicker = (account: GoogleAccount | null) => {
    setChoosing(false)
    pickerResolve.current?.(account)
    pickerResolve.current = null
  }

  const signIn = async () => {
    if (pending) return
    setState({ kind: 'pending' })
    let result: AuthResult
    try {
      result = await onSignIn()
    } catch {
      result = { ok: false, reason: 'network' }
    }
    if (!mounted.current || result.ok) return

    if (result.reason === 'domain') setState({ kind: 'domain', email: result.email ?? 'That account' })
    else if (result.reason === 'suspended') setState({ kind: 'suspended', email: result.email ?? 'This account' })
    else if (result.reason === 'unverified') setState({ kind: 'unverified', email: result.email ?? 'This account' })
    else if (result.reason === 'network') setState({ kind: 'network' })
    else setState({ kind: 'idle' })
  }

  const googleIcon = <img src={googleMark} alt="" className="size-4" />

  return (
    <div className="flex min-h-dvh bg-surface-bg">
      {choosing && (
        <AccountChooser accounts={[ADMIN_ACCOUNT]} onPick={settlePicker} onCancel={() => settlePicker(null)} />
      )}

      <aside className="hidden w-[46%] max-w-[720px] shrink-0 flex-col justify-between border-r border-border-primary bg-surface-hover px-2xl py-2xl lg:flex">
        <Wordmark size="lg" />
        <div className="flex max-w-[28rem] flex-col gap-lg">
          <p className="text-page text-text-primary">Moderate the TIPalit marketplace with confidence.</p>
          <ul className="flex flex-col gap-md">
            {[
              'Review flagged listings and reported accounts in one queue.',
              'Take down listings and suspend members with a recorded reason.',
              'Every decision lands in the audit log with your name on it.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-md text-cell text-text-secondary">
                <ShieldCheck size={18} className="mt-xs shrink-0 text-success" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-caption-sm text-text-secondary">
          TIPalit &middot; Office of Student Affairs &middot; TIP Manila and TIP QC
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-xl py-2xl">
        <div className="flex w-full max-w-[24rem] flex-col gap-xl">
          <div className="flex flex-col gap-sm lg:hidden">
            <Wordmark size="lg" />
          </div>
          <div className="flex flex-col gap-xs">
            <p role="heading" aria-level={1} className="text-page text-text-primary">
              Sign in
            </p>
            <p className="text-cell text-text-secondary">Admin console for Office of Student Affairs staff.</p>
          </div>

          {ended && (
            <InlineAlert tone="info" icon={ended.icon}>
              {ended.text}
            </InlineAlert>
          )}

          {state.kind === 'domain' && (
            <InlineAlert
              action={
                <Button variant="neutral" size="small" onClick={signIn}>
                  Try another account
                </Button>
              }
            >
              <span className="font-semibold">{state.email}</span> isn&rsquo;t a TIP account. Sign in with your
              @tip.edu.ph Google account.
            </InlineAlert>
          )}
          {state.kind === 'unverified' && (
            <InlineAlert>
              <span className="font-semibold">{state.email}</span> hasn&rsquo;t verified its email with Google yet.
            </InlineAlert>
          )}
          {state.kind === 'forbidden' && (
            <InlineAlert
              icon={Ban}
              action={
                <Button variant="neutral" size="small" onClick={signIn}>
                  Use a staff account
                </Button>
              }
            >
              <span className="font-semibold">{state.email}</span> isn&rsquo;t a staff account. The console is limited
              to the Office of Student Affairs.
            </InlineAlert>
          )}
          {state.kind === 'suspended' && (
            <InlineAlert icon={Ban}>
              <span className="font-semibold">{state.email}</span> is suspended from TIPalit.
            </InlineAlert>
          )}
          {state.kind === 'network' && (
            <InlineAlert icon={WifiOff}>Couldn&rsquo;t reach Google. Check your connection and try again.</InlineAlert>
          )}

          <div className="flex flex-col gap-md">
            <Button
              variant="neutral"
              onClick={signIn}
              disabled={pending}
              aria-busy={pending || undefined}
              iconStart={pending ? <Spinner /> : state.kind === 'network' ? <RotateCcw size={16} /> : googleIcon}
              className="w-full"
            >
              {pending ? 'Signing in…' : state.kind === 'network' ? 'Try again' : 'Continue with Google'}
            </Button>
            <p className="text-caption-sm text-text-secondary">
              Use your @tip.edu.ph staff Google account. Sessions last 8 hours.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
