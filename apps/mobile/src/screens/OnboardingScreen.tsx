import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { CAMPUSES, PROGRAMS, YEAR_LEVELS } from '@tipalit/services/seed'
import type { CampusId, Profile } from '@tipalit/services/types'
import { useSession } from '../session'
import { colors, radius, space } from '../theme'
import { Button, Pill, Screen } from '../components/ui'

export default function OnboardingScreen() {
  const { session, profile, saveProfile } = useSession()
  const [name, setName] = useState(profile?.name ?? session?.name ?? '')
  const [campus, setCampus] = useState<CampusId | null>(profile?.campus ?? null)
  const [program, setProgram] = useState(profile?.program ?? '')
  const [year, setYear] = useState(profile?.year ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const complete = name.trim() && campus && program && year

  const submit = async () => {
    if (!session || !campus || !complete) return
    setBusy(true)
    setError(null)
    try {
      await saveProfile({
        ...(profile ?? { userId: session.userId, joinedAt: new Date().toISOString() }),
        name: name.trim(),
        email: session.email,
        campus,
        program,
        year,
        onboardedAt: new Date().toISOString(),
      })
    } catch {
      setError('We could not save your profile. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Set up your profile</Text>
        <Text style={styles.sub}>Sellers see this when you message them.</Text>

        <Field label="Full name">
          <TextInput value={name} onChangeText={setName} style={styles.input} autoCapitalize="words" />
        </Field>

        <Field label="Campus">
          <View style={styles.row}>
            {CAMPUSES.map((item) => (
              <Pill key={item.id} label={item.label} active={campus === item.id} onPress={() => setCampus(item.id)} />
            ))}
          </View>
        </Field>

        <Field label="Program">
          <View style={styles.row}>
            {PROGRAMS.map((item) => (
              <Pill key={item} label={item} active={program === item} onPress={() => setProgram(item)} />
            ))}
          </View>
        </Field>

        <Field label="Year level">
          <View style={styles.row}>
            {YEAR_LEVELS.map((item) => (
              <Pill key={item} label={item} active={year === item} onPress={() => setYear(item)} />
            ))}
          </View>
        </Field>

        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Continue" onPress={submit} disabled={!complete} busy={busy} />
      </ScrollView>
    </Screen>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: space(5), gap: space(5) },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: -space(3) },
  field: { gap: space(2) },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3),
    paddingVertical: space(3),
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  error: { color: colors.danger, fontSize: 14 },
})
