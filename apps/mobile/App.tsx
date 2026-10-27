import './src/bootstrap'
import { StatusBar } from 'expo-status-bar'
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans'
import { services } from '@tipalit/services'
import { GOOGLE_TEST_ACCOUNTS } from '@tipalit/services/seed'
import type { GoogleAccount } from '@tipalit/services/types'
import AppShell from './src/AppShell'
import { SessionProvider, needsOnboarding, useSession } from './src/session'
import IntroScreen from './src/screens/IntroScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import SignInScreen from './src/screens/SignInScreen'
import GoogleAccountChooser from './src/components/GoogleAccountChooser'
import { Loading } from './src/components/ui'
import { colors } from './src/theme'

function Gate() {
  const { session, profile, loading } = useSession()
  const [introSeen, setIntroSeen] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    services.prefs
      .get()
      .then((prefs) => {
        if (active) setIntroSeen(Boolean(prefs?.introSeen))
      })
      .catch(() => {
        if (active) setIntroSeen(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading || introSeen === null) return <Loading />
  if (!session && !introSeen) {
    return (
      <IntroScreen
        onDone={() => {
          services.prefs.set({ introSeen: true }).catch(() => undefined)
          setIntroSeen(true)
        }}
      />
    )
  }
  if (!session) return <SignInScreen />
  if (needsOnboarding(profile)) return <OnboardingScreen />
  return <AppShell />
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Instrument Sans': InstrumentSans_400Regular,
    'InstrumentSans-Regular': InstrumentSans_400Regular,
    'InstrumentSans-Medium': InstrumentSans_500Medium,
    'InstrumentSans-SemiBold': InstrumentSans_600SemiBold,
    'InstrumentSans-Bold': InstrumentSans_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  })

  const [chooserOpen, setChooserOpen] = useState(false)
  const chooserResolve = useRef<((account: GoogleAccount | null) => void) | null>(null)

  useEffect(() => {
    const demo = services.demo
    if (!demo) return
    demo.registerAccountPicker(
      () =>
        new Promise<GoogleAccount | null>((resolve) => {
          chooserResolve.current = resolve
          setChooserOpen(true)
        }),
    )
    return () => demo.registerAccountPicker(null)
  }, [])

  const closeChooser = (account: GoogleAccount | null) => {
    setChooserOpen(false)
    chooserResolve.current?.(account)
    chooserResolve.current = null
  }

  if (!fontsLoaded) {
    return <Loading />
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <SessionProvider>
        <Gate />
      </SessionProvider>
      <GoogleAccountChooser
        isOpen={chooserOpen}
        accounts={GOOGLE_TEST_ACCOUNTS}
        onSelect={(account) => closeChooser(account)}
        onClose={() => closeChooser(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
  },
})


