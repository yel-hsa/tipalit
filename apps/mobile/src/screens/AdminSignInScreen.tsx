import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSession } from '../session'
import { colors, radius, space, typography } from '../theme'
import { Button, Screen } from '../components/ui'

const REASONS: Record<string, string> = {
  'invalid-credentials': 'That email and password combination is not right. Try again.',
  'too-many-attempts': 'Too many attempts. Wait a moment and try again.',
  domain: 'That account is not a TIP staff account. Use your @tip.edu.ph email.',
  unverified: 'Verify that email first, then sign in again.',
  suspended: 'This account is suspended from TIPalit.',
  network: 'We could not reach the sign-in service. Check your connection.',
  cancelled: 'Sign-in was cancelled.',
}

/**
 * Mobile mirror of apps/web/screens/AdminSignInScreen.tsx: centered card,
 * gold TIPalit wordmark, tagline, labeled email + password inputs, charcoal
 * primary button. Email/Password only — students use the Google flow instead.
 */
export default function AdminSignInScreen({ onBack }: { onBack: () => void }) {
  const { signInWithEmail } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (busy || email.trim() === '' || password === '') return
    setBusy(true)
    setError(null)
    try {
      const reason = await signInWithEmail(email.trim(), password)
      if (reason) setError(REASONS[reason] ?? 'Sign-in failed. Try again.')
    } catch {
      setError('Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.wordmark}>TIPalit</Text>
            <Text style={styles.heading}>Admin console</Text>
            <Text style={styles.tagline}>For Office of Student Affairs staff. Students sign in with Google instead.</Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="staff@tip.edu.ph"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                onSubmitEditing={() => void submit()}
              />
            </View>

            <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} busy={busy} />
            <Text style={styles.footnote}>Sessions last 8 hours. Every action is recorded in the audit log.</Text>
          </View>

          <Button label="Back to student sign-in" variant="secondary" onPress={onBack} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.brandTertiary },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space(4), gap: space(3) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(4),
    gap: space(3),
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  heading: { ...typography.page, color: colors.text },
  tagline: { ...typography.cell, color: colors.textSecondary },
  error: { color: colors.danger, fontSize: 14 },
  field: { gap: space(1) },
  label: { ...typography.labelSm, color: colors.text },
  hint: { ...typography.meta, color: colors.textTertiary },
  inputWrap: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    paddingHorizontal: space(3),
    gap: space(1),
  },
  input: {
    ...typography.input,
    color: colors.text,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3),
  },
  footnote: { ...typography.meta, color: colors.textSecondary, textAlign: 'center' },
})
