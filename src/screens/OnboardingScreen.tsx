import { Button, Checkbox, IconButton } from '@figma/astraui'
import { ArrowLeft, ArrowRight, CheckCircle2, LogOut } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FormField, { errorIdFor } from '../components/FormField'
import ProfileFields, {
  focusProfileField,
  PROFILE_FIELD_ORDER,
  validateProfile,
  type ProfileDraft,
} from '../components/ProfileFields'
import SafetyRulesList from '../components/SafetyRulesList'
import Spinner from '../components/Spinner'

export type OnboardingStep = 'profile' | 'safety'

type OnboardingScreenProps = {
  step: OnboardingStep
  email: string
  initialDraft: ProfileDraft
  // saved partial profile lets a refresh resume at the pledge
  onSaveProfile: (draft: ProfileDraft) => Promise<boolean>
  onFinish: () => Promise<boolean>
  onBack: () => void
  onSignOut: () => Promise<void>
}

const STEPS: OnboardingStep[] = ['profile', 'safety']
const ID_PREFIX = 'onboarding'

export default function OnboardingScreen({
  step,
  email,
  initialDraft,
  onSaveProfile,
  onFinish,
  onBack,
  onSignOut,
}: OnboardingScreenProps) {
  const [draft, setDraft] = useState(initialDraft)
  const [submitted, setSubmitted] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [pledgeError, setPledgeError] = useState(false)
  const [pending, setPending] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const headingRef = useRef<HTMLParagraphElement>(null)

  const stepNumber = STEPS.indexOf(step) + 1
  const errors = submitted ? validateProfile(draft) : {}

  // move focus so screen readers announce the new step
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const continueToSafety = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setSubmitted(true)
    const nextErrors = validateProfile(draft)
    const first = PROFILE_FIELD_ORDER.find((key) => nextErrors[key])
    if (first) {
      requestAnimationFrame(() => focusProfileField(ID_PREFIX, first))
      return
    }
    setPending(true)
    await onSaveProfile({ ...draft, name: draft.name.trim() })
    // screen stays mounted for the pledge step, so clear pending on success too
    setPending(false)
  }

  const finish = async () => {
    if (pending) return
    if (!agreed) {
      setPledgeError(true)
      document.getElementById('pledge-field')?.querySelector<HTMLElement>('input, button')?.focus()
      return
    }
    setPending(true)
    const done = await onFinish()
    if (!done) setPending(false)
  }

  const back = () => (step === 'profile' ? setConfirmSignOut(true) : onBack())

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-md bg-brand-tertiary px-xl pb-lg pt-xl">
        <div className="flex items-center gap-md">
          <IconButton
            variant="neutral"
            icon={<ArrowLeft size={16} />}
            aria-label={step === 'profile' ? 'Back to sign in' : 'Back to profile setup'}
            onClick={back}
            disabled={pending}
            className="touch-hit"
          />
          <p className="flex-1 text-label-sm text-text-secondary">
            Step {stepNumber} of {STEPS.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepNumber}
          className="h-xs overflow-hidden rounded-corner-full bg-bg-hover"
        >
          <div
            className={`h-full rounded-corner-full bg-accent transition-all duration-300 motion-reduce:transition-none ${
              stepNumber === 1 ? 'w-1/2' : 'w-full'
            }`}
          />
        </div>
      </header>

      {step === 'profile' ? (
        <form noValidate onSubmit={continueToSafety} className="flex flex-1 flex-col gap-xl px-xl pb-xl">
          <div className="flex flex-col gap-xs">
            <p ref={headingRef} tabIndex={-1} role="heading" aria-level={1} className="text-title text-text-primary outline-none">
              Set up your profile
            </p>
            <p className="text-label-sm text-text-secondary">
              Signed in as <span className="text-text-primary">{email}</span>. Your campus decides which listings
              and meetup spots you see.
            </p>
          </div>

          <section aria-label="Profile details" className="rounded-corner-lg bg-surface-bg p-xl">
            <ProfileFields
              idPrefix={ID_PREFIX}
              value={draft}
              errors={errors}
              disabled={pending}
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            />
          </section>

          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            aria-busy={pending || undefined}
            iconEnd={pending ? undefined : <ArrowRight size={16} />}
            iconStart={pending ? <Spinner /> : undefined}
            className="mt-auto w-full touch-hit"
          >
            {pending ? 'Saving\u2026' : 'Continue'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-1 flex-col gap-xl px-xl pb-xl">
          <div className="flex flex-col gap-xs">
            <p ref={headingRef} tabIndex={-1} role="heading" aria-level={1} className="text-title text-text-primary outline-none">
              Campus safety pledge
            </p>
            <p className="text-label-sm text-text-secondary">
              Four rules every TIPalit member follows. They keep trades quick and safe.
            </p>
          </div>

          <section aria-label="Rules" className="rounded-corner-lg bg-surface-bg p-xl">
            <SafetyRulesList />
          </section>

          <FormField id="pledge" error={pledgeError && !agreed ? 'Check the box to agree before finishing.' : undefined}>
            <div
              aria-invalid={pledgeError && !agreed ? true : undefined}
              aria-describedby={pledgeError && !agreed ? errorIdFor('pledge') : undefined}
              className="rounded-corner-lg bg-surface-bg p-lg"
            >
              <Checkbox
                label="I agree to follow these rules"
                description="You can review them anytime from the sign-in screen."
                defaultChecked={agreed}
                disabled={pending}
                onChange={(checked) => {
                  setAgreed(checked)
                  if (checked) setPledgeError(false)
                }}
              />
            </div>
          </FormField>

          <Button
            variant="primary"
            onClick={finish}
            disabled={pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : <CheckCircle2 size={16} />}
            className="mt-auto w-full touch-hit"
          >
            {pending ? 'Finishing\u2026' : 'Finish'}
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmSignOut}
        title="Leave setup?"
        body="You'll be signed out. Anything you've entered on this step won't be saved."
        confirmLabel="Sign out"
        confirmIcon={<LogOut size={16} />}
        pending={signingOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={async () => {
          setSigningOut(true)
          await onSignOut()
        }}
      />
    </div>
  )
}
