// student onboarding screen

import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { isProfileComplete } from '@tipalit/services/profile'
import { CAMPUSES, PROGRAMS, SAFETY_RULES, YEAR_LEVELS } from '@tipalit/services/seed'
import type { Profile } from '@tipalit/services/types'
import { useSession } from '../session'
import { colors, space, spacing, typography } from '../theme'
import {
  Button,
  Checkbox,
  ConfirmModal,
  FormField,
  IconButton,
  Icon,
  ProfileFields,
  SafetyRulesList,
  Spinner,
} from '../components/ported'
import {
  draftFromProfile,
  validateProfile,
  PROFILE_FIELD_ORDER,
  type ProfileDraft,
} from '../components/ported/EditProfileSheet'

type OnboardingStep = 'profile' | 'safety'

const STEPS: OnboardingStep[] = ['profile', 'safety']

export default function OnboardingScreen() {
  const { session, profile, saveProfile, signOut } = useSession()
  const [step, setStep] = useState<OnboardingStep>(() =>
    isProfileComplete(profile) ? 'safety' : 'profile',
  )
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    draftFromProfile(profile, session?.name ?? ''),
  )
  const [submitted, setSubmitted] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [pledgeError, setPledgeError] = useState(false)
  const [pending, setPending] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const stepNumber = STEPS.indexOf(step) + 1
  const errors = submitted ? validateProfile(draft) : {}

  // web moves DOM focus to the heading on step change so screen readers
  // announce it; RN Text has no focusable ref, so this is a documented
  // no-op on mobile (accessibilityRole="header" is kept on the heading).

  const continueToSafety = async () => {
    if (pending || !session) return
    setSubmitted(true)
    const nextErrors = validateProfile(draft)
    const first = PROFILE_FIELD_ORDER.find((key) => nextErrors[key])
    if (first) return
    setPending(true)
    // partial save keeps needsOnboarding true, so the gate keeps this screen
    // mounted for the pledge step — same as the web's onSaveProfile contract
    await saveProfile({
      ...(profile ?? { userId: session.userId, joinedAt: new Date().toISOString() }),
      name: draft.name.trim(),
      email: session.email,
      campus: (draft.campus || undefined) as Profile['campus'],
      program: draft.program,
      year: draft.year,
    })
    // screen stays mounted for the pledge step, so clear pending on success too
    setPending(false)
    setStep('safety')
  }

  const finish = async () => {
    if (pending) return
    if (!agreed) {
      setPledgeError(true)
      return
    }
    setPending(true)
    const done = await saveCompleteProfile(draft)
    if (!done) setPending(false)
  }

  const saveCompleteProfile = async (next: ProfileDraft): Promise<boolean> => {
    if (!session) return false
    try {
      const now = new Date().toISOString()
      await saveProfile({
        ...(profile ?? { userId: session.userId, joinedAt: now }),
        name: next.name.trim(),
        email: session.email,
        campus: next.campus as Profile['campus'],
        program: next.program,
        year: next.year,
        safetyAcceptedAt: now,
        onboardedAt: now,
      })
      return true
    } catch {
      return false
    }
  }

  const back = () => (step === 'profile' ? setConfirmSignOut(true) : setStep('profile'))

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <IconButton
              variant="neutral"
              icon={<Icon name="arrow-left" size={16} color={colors.brandPrimary} />}
              accessibilityLabel={step === 'profile' ? 'Back to sign in' : 'Back to profile setup'}
              onPress={back}
              disabled={pending}
            />
            <Text style={styles.stepLabel}>
              Step {stepNumber} of {STEPS.length}
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Setup progress"
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, stepNumber === 1 ? styles.progressHalf : styles.progressFull]} />
          </View>
        </View>

        {step === 'profile' ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.introCol}>
              <Text accessibilityRole="header" style={styles.heading}>
                Set up your profile
              </Text>
              <Text style={styles.sub}>
                Signed in as <Text style={styles.subStrong}>{session?.email ?? ''}</Text>. Your campus decides
                which listings and meetup spots you see.
              </Text>
            </View>

            <View style={styles.card} accessibilityLabel="Profile details">
              <ProfileFields
                campuses={CAMPUSES}
                programs={PROGRAMS}
                yearLevels={YEAR_LEVELS}
                value={draft}
                errors={errors}
                disabled={pending}
                onChange={(patch) => setDraft((current) => ({ ...current, ...patch }) as ProfileDraft)}
              />
            </View>

            <Button
              label={pending ? 'Saving…' : 'Continue'}
              variant="primary"
              onPress={() => void continueToSafety()}
              disabled={pending}
              busy={pending}
              iconEnd={pending ? undefined : <Icon name="arrow-right" size={16} color="#ffffff" />}
              iconStart={pending ? <Spinner color="#ffffff" /> : undefined}
              style={styles.footerButton}
            />
          </ScrollView>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.formContent}>
            <View style={styles.introCol}>
              <Text accessibilityRole="header" style={styles.heading}>
                Campus safety pledge
              </Text>
              <Text style={styles.sub}>
                Four rules every TIPalit member follows. They keep trades quick and safe.
              </Text>
            </View>

            <View style={styles.card} accessibilityLabel="Rules">
              <SafetyRulesList rules={SAFETY_RULES} />
            </View>

            <FormField error={pledgeError && !agreed ? 'Check the box to agree before finishing.' : undefined}>
              <View style={styles.pledgeCard}>
                <Checkbox
                  label="I agree to follow these rules"
                  description="You can review them anytime from the sign-in screen."
                  checked={agreed}
                  disabled={pending}
                  onChange={(checked) => {
                    setAgreed(checked)
                    if (checked) setPledgeError(false)
                  }}
                />
              </View>
            </FormField>

            <Button
              label={pending ? 'Finishing…' : 'Finish'}
              variant="primary"
              onPress={() => void finish()}
              disabled={pending}
              busy={pending}
              iconStart={pending ? <Spinner color="#ffffff" /> : <Icon name="check-circle-2" size={16} color="#ffffff" />}
              style={styles.footerButton}
            />
          </ScrollView>
        )}

        <ConfirmModal
          isOpen={confirmSignOut}
          title="Leave setup?"
          body="You'll be signed out. Anything you've entered on this step won't be saved."
          confirmLabel="Sign out"
          confirmIcon={<Icon name="log-out" size={16} color="#ffffff" />}
          pending={signingOut}
          onClose={() => setConfirmSignOut(false)}
          onConfirm={() => {
            setSigningOut(true)
            void signOut()
          }}
        />
      </View>
    </KeyboardAvoidingView>
  )
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  // header: sticky top-0 flex flex-col gap-md bg-brand-tertiary px-xl pb-lg pt-xl
  header: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  // header row: flex items-center gap-md
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // step label: flex-1 text-label-sm text-text-secondary
  stepLabel: { flex: 1, ...typography.labelSm, color: colors.textSecondary },
  // progressbar: h-xs overflow-hidden rounded-full bg-bg-hover
  progressTrack: {
    height: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.bgHover,
    overflow: 'hidden',
  },
  // fill: h-full rounded-full bg-accent transition-all; w-1/2 | w-full
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  progressHalf: { width: '50%' },
  progressFull: { width: '100%' },
  // form: flex-1 flex-col gap-xl px-xl pb-xl
  formContent: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  // intro: flex flex-col gap-xs
  introCol: { gap: spacing.xs },
  // heading: text-title text-text-primary
  heading: { ...typography.title, color: colors.text },
  // sub: text-label-sm text-text-secondary
  sub: { ...typography.labelSm, color: colors.textSecondary },
  // inline span text-text-primary
  subStrong: { color: colors.text },
  // section: rounded-corner-lg bg-surface-bg p-xl
  card: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  // pledge wrapper: rounded-corner-lg bg-surface-bg p-lg
  pledgeCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  // button: mt-auto w-full
  footerButton: { marginTop: 'auto', alignSelf: 'stretch' },
})
