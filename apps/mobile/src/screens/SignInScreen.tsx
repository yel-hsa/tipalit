import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { ADMIN_ACCOUNT } from '@tipalit/services/seed'
import { useSession } from '../session'
import { colors, space } from '../theme'
import { Button, Screen } from '../components/ui'

const REASONS: Record<string, string> = {
  domain: 'Use your @tip.edu.ph Google account.',
  unverified: 'Verify your Google email first, then try again.',
  network: 'We could not reach Google. Check your connection.',
  suspended: 'This account is suspended. Contact the student affairs office.',
  cancelled: 'Sign-in was cancelled.',
}

export default function SignInScreen() {
  const { signIn } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // the mock adapter has no native Google sheet, so it asks this picker for an account
  useEffect(() => {
    services.demo?.registerAccountPicker(async () => ADMIN_ACCOUNT)
    return () => services.demo?.registerAccountPicker(null)
  }, [])

  const handleSignIn = async () => {
    setBusy(true)
    setError(null)
    try {
      const reason = await signIn()
      if (reason) setError(REASONS[reason] ?? 'Sign-in failed. Try again.')
    } catch {
      setError('Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>TIPalit</Text>
        <Text style={styles.tagline}>Buy, sell, and trade with students on your campus.</Text>
      </View>
      <View style={styles.actions}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Continue with Google" onPress={handleSignIn} busy={busy} />
        <Text style={styles.footnote}>Only verified TIP student accounts can sign in.</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', padding: space(6) },
  hero: { flex: 1, justifyContent: 'center', gap: space(3) },
  wordmark: { fontSize: 40, fontWeight: '800', color: colors.accent, letterSpacing: -1 },
  tagline: { fontSize: 17, color: colors.muted, lineHeight: 24 },
  actions: { gap: space(3) },
  error: { color: colors.danger, fontSize: 14 },
  footnote: { fontSize: 12, color: colors.muted, textAlign: 'center' },
})
