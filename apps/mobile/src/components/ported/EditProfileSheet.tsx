/**
 * 1:1 port of apps/web/components/EditProfileSheet.tsx.
 * BottomSheet + InlineAlert + ProfileFields + kit Buttons; the campus-change
 * confirm footer and pending spinner states are reproduced exactly.
 */
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { CAMPUSES, PROGRAMS, YEAR_LEVELS, campusLabel } from '@tipalit/services/seed'
import type { CampusId, Profile } from '@tipalit/services/types'
import { BottomSheet, InlineAlert, ProfileFields, Spinner } from './index'
import { Button } from './kit'
import { spacing } from './tokens'

export type ProfileDraft = { name: string; campus: CampusId | ''; program: string; year: string }
export type ProfileFieldKey = keyof ProfileDraft
export type ProfileErrors = Partial<Record<ProfileFieldKey, string>>

export const PROFILE_FIELD_ORDER: ProfileFieldKey[] = ['name', 'campus', 'program', 'year']

export const draftFromProfile = (profile: Profile | null, fallbackName: string): ProfileDraft => ({
  name: profile?.name || fallbackName,
  campus: profile?.campus ?? '',
  program: profile?.program ?? '',
  year: profile?.year ?? '',
})

export const validateProfile = (draft: ProfileDraft): ProfileErrors => {
  const errors: ProfileErrors = {}
  const name = draft.name.trim()
  if (!name) errors.name = 'Enter your name'
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters'
  if (!draft.campus) errors.campus = 'Choose your campus'
  if (!draft.program) errors.program = 'Choose your program'
  if (!draft.year) errors.year = 'Choose your year level'
  return errors
}

// focusProfileField has no RN equivalent (DOM ids); validation errors render
// inline through FormField, which is the same user-visible outcome.

type EditProfileSheetProps = {
  isOpen: boolean
  profile: Profile
  onClose: () => void
  onSave: (draft: ProfileDraft) => Promise<boolean>
}

export default function EditProfileSheet({ isOpen, profile, onClose, onSave }: EditProfileSheetProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile, profile.name))
  const [submitted, setSubmitted] = useState(false)
  const [confirmingCampus, setConfirmingCampus] = useState(false)
  const [pending, setPending] = useState(false)

  const errors = submitted ? validateProfile(draft) : {}
  const campusChanged = !!draft.campus && draft.campus !== profile.campus

  const save = async () => {
    setPending(true)
    const saved = await onSave({ ...draft, name: draft.name.trim() })
    setPending(false)
    if (!saved) setConfirmingCampus(false)
  }

  const submit = () => {
    setSubmitted(true)
    const nextErrors = validateProfile(draft)
    const first = PROFILE_FIELD_ORDER.find((key) => nextErrors[key])
    if (first) return
    if (campusChanged) setConfirmingCampus(true)
    else void save()
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={pending ? () => undefined : onClose}
      title="Edit profile"
      footer={
        confirmingCampus ? (
          <View style={styles.confirmCol}>
            <InlineAlert tone="info" icon="arrow-right">
              Your feed will switch to {campusLabel(draft.campus as CampusId)}. Existing listings stay on their
              original campus.
            </InlineAlert>
            <View style={styles.confirmGrid}>
              <Button
                label={`Keep ${campusLabel(profile.campus ?? 'manila')}`}
                variant="neutral"
                onPress={() => setConfirmingCampus(false)}
                disabled={pending}
              />
              <Button
                label={pending ? 'Saving…' : 'Switch campus'}
                variant="primary"
                onPress={() => void save()}
                disabled={pending}
                busy={pending}
                iconStart={pending ? <Spinner color="#ffffff" /> : undefined}
              />
            </View>
          </View>
        ) : (
          <Button
            label={pending ? 'Saving…' : 'Save changes'}
            variant="primary"
            onPress={submit}
            disabled={pending}
            busy={pending}
            iconStart={pending ? <Spinner color="#ffffff" /> : undefined}
            style={styles.saveFull}
          />
        )
      }
    >
      <ProfileFields
        campuses={CAMPUSES}
        programs={PROGRAMS}
        yearLevels={YEAR_LEVELS}
        value={draft}
        errors={errors}
        disabled={pending}
        onChange={(patch) => {
          setDraft((current) => ({ ...current, ...patch }) as ProfileDraft)
          if (patch.campus) setConfirmingCampus(false)
        }}
      />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  // footer confirm column: flex flex-col gap-md
  confirmCol: { gap: spacing.md },
  // grid grid-cols-2 gap-md
  confirmGrid: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  // w-full touch-hit
  saveFull: { alignSelf: 'stretch' },
})
