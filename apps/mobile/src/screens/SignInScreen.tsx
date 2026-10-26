import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SAFETY_RULES } from '@tipalit/services/seed'
import { useSession } from '../session'
import { colors, space, typography } from '../theme'
import { spacePx } from '../components/ported/tokens'
import {
  BottomSheet,
  Button,
  Icon,
  InlineAlert,
  SafetyRulesList,
  Spinner,
  Wordmark,
} from '../components/ported'

// 1:1 port of apps/web/screens/AuthScreen.tsx — same JSX tree, same copy,
// same Tailwind values. The real signInWithGoogle() call comes from the
// existing mobile session context; only the visuals are ported.
type AuthState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'domain'; email: string }
  | { kind: 'unverified'; email: string }
  | { kind: 'suspended'; email: string }
  | { kind: 'network' }

export default function SignInScreen() {
  const { signIn } = useSession()
  const [state, setState] = useState<AuthState>({ kind: 'idle' })
  const [rulesOpen, setRulesOpen] = useState(false)
  const mounted = useRef(true)
  const pending = state.kind === 'pending'

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const signInPress = async () => {
    if (pending) return
    setState({ kind: 'pending' })
    let reason: string | null
    try {
      reason = await signIn()
    } catch {
      reason = 'network'
    }
    // success unmounts this screen, so only failures need state
    if (!reason || !mounted.current) return
    if (reason === 'domain') setState({ kind: 'domain', email: 'That account' })
    else if (reason === 'suspended') setState({ kind: 'suspended', email: 'This account' })
    else if (reason === 'network') setState({ kind: 'network' })
    else setState({ kind: 'idle' })
  }

  // documented deviation: the web renders the Google "G" SVG mark; RN has no
  // SVG renderer without a new dependency, so the same 16px slot shows the
  // Google glyph via the ported Icon swap point.
  const googleIcon = <Icon name="google" size={16} />

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Wordmark size="lg" />
        <Text role="heading" accessibilityRole="header" style={[typography.heading, { color: colors.text }]}>
          Buy and sell campus essentials with fellow TIP students.
        </Text>
        <View style={styles.trustRow}>
          <Icon name="shield-check" size={16} color={colors.success} />
          <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
            Every member signs in with a school Google account.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {state.kind === 'domain' && (
          <InlineAlert
            action={
              <Button
                variant="neutral"
                size="small"
                label="Try another account"
                onPress={signInPress}
              />
            }
          >
            <Text>
              <Text style={{ fontWeight: '600' }}>{state.email}</Text> isn&apos;t a TIP account. Sign in with your
              @tip.edu.ph Google account.
            </Text>
          </InlineAlert>
        )}
        {state.kind === 'network' && (
          <InlineAlert icon="wifi-off">Couldn&apos;t reach Google. Check your connection and try again.</InlineAlert>
        )}
        {state.kind === 'suspended' && (
          <InlineAlert icon="ban">
            <Text>
              <Text style={{ fontWeight: '600' }}>{state.email}</Text> is suspended from TIPalit. Contact the Office of
              Student Affairs to appeal.
            </Text>
          </InlineAlert>
        )}

        <Button
          variant="neutral"
          label={pending ? 'Signing in…' : state.kind === 'network' ? 'Try again' : 'Continue with Google'}
          onPress={signInPress}
          disabled={pending}
          busy={pending}
          iconStart={pending ? <Spinner /> : state.kind === 'network' ? <Icon name="rotate-ccw" size={16} /> : googleIcon}
          style={styles.fullWidth}
        />
        <Text style={[typography.meta, { color: colors.textSecondary, textAlign: 'center' }]}>
          Use your @tip.edu.ph Google account.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[typography.meta, { color: colors.textSecondary }]}>
          By continuing you agree to TIPalit&apos;s
        </Text>
        <Button variant="subtle" size="small" label="community rules" onPress={() => setRulesOpen(true)} />
      </View>

      <BottomSheet
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Community rules"
        subtitle="Every member agrees to these before trading."
        footer={
          <Button variant="primary" label="Got it" onPress={() => setRulesOpen(false)} style={styles.fullWidth} />
        }
      >
        <SafetyRulesList rules={SAFETY_RULES} />
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  // flex flex-1 flex-col justify-center gap-2xl px-xl py-2xl
  screen: {
    flex: 1,
    justifyContent: 'center',
    gap: space(6),
    paddingHorizontal: space(4),
    paddingVertical: space(6),
  },
  // flex flex-col items-center gap-lg text-center
  hero: { alignItems: 'center', gap: spacePx.lg },
  // flex items-center gap-xs
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacePx.xs },
  // flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl
  card: {
    gap: spacePx.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacePx.xl,
  },
  // w-full
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  // flex flex-col items-center gap-xs text-center
  footer: { alignItems: 'center', gap: space(1) },
})
