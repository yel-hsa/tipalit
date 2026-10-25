import './src/bootstrap'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, StyleSheet } from 'react-native'
import AppShell from './src/AppShell'
import { SessionProvider, needsOnboarding, useSession } from './src/session'
import OnboardingScreen from './src/screens/OnboardingScreen'
import SignInScreen from './src/screens/SignInScreen'
import { Loading } from './src/components/ui'
import { colors } from './src/theme'

function Gate() {
  const { session, profile, loading } = useSession()

  if (loading) return <Loading />
  if (!session) return <SignInScreen />
  if (needsOnboarding(profile)) return <OnboardingScreen />
  return <AppShell />
}

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
})
