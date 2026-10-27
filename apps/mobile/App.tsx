import './src/bootstrap'
import { StatusBar } from 'expo-status-bar'
import { Platform, SafeAreaView, StatusBar as RNStatusBar, StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans'
import { services } from '@tipalit/services'
import AppShell from './src/AppShell'
import { SessionProvider, needsOnboarding, useSession } from './src/session'
import IntroScreen from './src/screens/IntroScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import SignInScreen from './src/screens/SignInScreen'
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

  if (!fontsLoaded) {
    return <Loading />
  }

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
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
})


