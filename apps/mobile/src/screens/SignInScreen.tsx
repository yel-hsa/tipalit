import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSession } from '../session'
import { colors, typography, space } from '../theme'
import { Button, Screen } from '../components/ui'

// mirrors apps/web/screens/AuthScreen.tsx — real Google sign-in only; the mock
// account-picker flow is gone. When Firebase is unconfigured the adapter
// surfaces a network reason and we show the same clear error state as web.
const REASONS: Record<string, string> = {
  domain: 'Use your @tip.edu.ph Google account.',
  unverified: 'Verify your Google email first, then try again.',
  network: "Couldn't reach Google. Check your connection and try again.",
  suspended: 'This account is suspended. Contact the Office of Student Affairs to appeal.',
  cancelled: 'Sign-in was cancelled.',
}

export default function SignInScreen() {
  const { signIn } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const reason = await signIn()
      if (reason) setError(REASONS[reason] ?? 'Sign-in failed. Try again.')
    } catch {
      setError("Couldn't reach Google. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>TIPalit</Text>
        <Text style={styles.tagline}>Buy and sell campus essentials with fellow TIP students.</Text>
        <Text style={styles.trust}>Every member signs in with a school Google account.</Text>
      </View>
      <View style={styles.actions}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label={busy ? 'Signing in…' : 'Continue with Google'} onPress={handleSignIn} busy={busy} />
        <Text style={styles.footnote}>Use your @tip.edu.ph Google account.</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', padding: space(5), gap: space(5) },
  hero: { flex: 1, justifyContent: 'center', gap: space(3) },
  wordmark: { ...typography.metric, fontSize: 40, color: colors.brandPrimary, letterSpacing: -1 },
  tagline: { ...typography.heading, color: colors.text },
  trust: { ...typography.labelSm, color: colors.textSecondary },
  actions: { gap: space(3) },
  error: { ...typography.labelSm, color: colors.danger },
  footnote: { ...typography.meta, color: colors.textSecondary, textAlign: 'center' },
})
