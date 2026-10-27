import { Button, InputField } from '@figma/astraui'
import { Ban, Clock, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ADMIN_ACCOUNT } from '@tipalit/services/seed'
import type { AuthResult, GoogleAccount } from '@tipalit/services/types'
import googleMark from '../assets/google-g.svg'
import AccountChooser from '../components/admin/AccountChooser'
import InlineAlert from '../components/InlineAlert'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import { useSession } from '../session'
import type { SignOutReason } from '../session'

type AuthState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'email-pending' }
  | { kind: 'domain'; email: string }
  | { kind: 'unverified'; email: string }
  | { kind: 'suspended'; email: string }
  | { kind: 'forbidden'; email: string }
  | { kind: 'network' }
  | { kind: 'invalid-credentials' }
  | { kind: 'too-many-attempts' }

const EMAIL_ERRORS: Partial<Record<Extract<AuthResult, { ok: false }>['reason'], string>> = {
  'invalid-credentials': 'Incorrect email or password.',
  'too-many-attempts': 'Too many attempts, try again shortly.',
  network: "Couldn't reach the sign-in service. Check your connection and try again.",
}

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
  const { signInWithEmail } = useSession()
  const [state, setState] = useState<AuthState>({ kind: 'idle' })
  const [choosing, setChoosing] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const mounted = useRef(true)
  const pickerResolve = useRef<((account: GoogleAccount | null) => void) | null>(null)
  const pending = state.kind === 'pending'
  const emailPending = state.kind === 'email-pending'
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

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (emailPending) return
    setState({ kind: 'email-pending' })
    setEmailError(null)
    let result: AuthResult
    try {
      result = await signInWithEmail(email.trim(), password)
    } catch {
      result = { ok: false, reason: 'network' }
    }
    if (!mounted.current || result.ok) return

    if (result.reason === 'invalid-credentials') {
      setState({ kind: 'invalid-credentials' })
      setEmailError(EMAIL_ERRORS['invalid-credentials'] ?? null)
    } else if (result.reason === 'too-many-attempts') {
      setState({ kind: 'too-many-attempts' })
      setEmailError(EMAIL_ERRORS['too-many-attempts'] ?? null)
    } else if (result.reason === 'network') {
      setState({ kind: 'network' })
      setEmailError(EMAIL_ERRORS.network ?? null)
    } else if (result.reason === 'suspended') {
      setState({ kind: 'suspended', email: result.email ?? 'This account' })
    } else if (result.reason === 'unverified') {
      setState({ kind: 'unverified', email: result.email ?? 'This account' })
    } else {
      setState({ kind: 'idle' })
    }
  }

  const googleIcon = <img src={googleMark} alt="" className="size-4" />

  return (
    <div className="flex min-h-dvh bg-surface-bg">
      {choosing && (
        <AccountChooser accounts={[ADMIN_ACCOUNT]} onPick={settlePicker} onCancel={() => settlePicker(null)} />
      )}

      <aside className="relative hidden w-[46%] max-w-[720px] shrink-0 flex-col justify-between overflow-hidden border-r border-border-secondary/80 bg-surface-darkest px-2xl py-2xl text-on-brand lg:flex">
        <div className="relative z-10">
          <Wordmark size="lg" />
        </div>
        <div className="relative z-10 flex max-w-[28rem] flex-col gap-lg">
          <div className="flex items-center gap-xs">
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent border border-accent/30">
              Staff &amp; Admin
            </span>
          </div>
          <p className="text-page font-semibold tracking-tight text-white">Moderate the TIPalit marketplace with confidence.</p>
          <ul className="flex flex-col gap-md">
            {[
              'Review flagged listings and reported accounts in one queue.',
              'Take down listings and suspend members with a recorded reason.',
              'Every decision lands in the audit log with your name on it.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-md text-cell text-[#e2e0da]">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-accent-soft/20 text-accent mt-0.5 border border-accent/20">
                  <ShieldCheck size={16} aria-hidden="true" />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-lg">
          <p className="text-caption-sm text-[#a39f97]">
            TIPalit &middot; Office of Student Affairs &middot; TIP Manila and TIP QC
          </p>
          <span className="text-xs font-medium text-accent">OSA Portal</span>
        </div>
        {/* subtle warm decorative gold glow */}
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-accent/5 blur-3xl" />
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

          <form noValidate onSubmit={submitEmail} className="flex flex-col gap-md">
            <InputField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@tip.edu.ph"
              value={email}
              disabled={emailPending}
              aria-invalid={emailError ? true : undefined}
              onChange={(value) => {
                setEmail(value)
                if (emailError) setEmailError(null)
              }}
            />
            <InputField
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Your staff password"
              value={password}
              disabled={emailPending}
              aria-invalid={emailError ? true : undefined}
              onChange={(value) => {
                setPassword(value)
                if (emailError) setEmailError(null)
              }}
            />
            {emailError && (
              <p role="alert" className="text-caption-sm text-danger">
                {emailError}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={emailPending} aria-busy={emailPending || undefined} iconStart={emailPending ? <Spinner /> : undefined} className="w-full">
              {emailPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="flex items-center gap-md" role="separator" aria-label="or">
            <span className="h-px flex-1 bg-border-primary" />
            <span className="text-caption-sm text-text-secondary">or</span>
            <span className="h-px flex-1 bg-border-primary" />
          </div>

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
