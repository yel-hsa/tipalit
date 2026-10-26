import { InputField, RadioGroup } from '@figma/astraui'
import { useId } from 'react'
import { CAMPUSES, PROGRAMS, YEAR_LEVELS } from '@tipalit/services/seed'
import type { CampusId, Profile } from '@tipalit/services/types'
import FormField, { errorIdFor } from './FormField'
import SelectField from './SelectField'

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

// scrolls to and focuses the first invalid field
export const focusProfileField = (idPrefix: string, key: ProfileFieldKey) => {
  const wrapper = document.getElementById(`${idPrefix}-${key}-field`)
  const control = wrapper?.querySelector<HTMLElement>('input, button')
  wrapper?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  control?.focus({ preventScroll: true })
}

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }))

type ProfileFieldsProps = {
  // keeps ids unique between the onboarding form and the edit sheet
  idPrefix: string
  value: ProfileDraft
  errors: ProfileErrors
  disabled?: boolean
  onChange: (patch: Partial<ProfileDraft>) => void
}

export default function ProfileFields({ idPrefix, value, errors, disabled, onChange }: ProfileFieldsProps) {
  const campusLabelId = useId()
  const id = (key: ProfileFieldKey) => `${idPrefix}-${key}`
  const invalid = (key: ProfileFieldKey) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': errorIdFor(id(key)) } : {}

  return (
    <div className="flex flex-col gap-lg">
      <FormField id={id('name')} error={errors.name}>
        <InputField
          id={id('name')}
          label="Full name"
          description="Shown to buyers and sellers."
          autoComplete="name"
          maxLength={60}
          value={value.name}
          readOnly={disabled}
          onChange={(name) => onChange({ name })}
          {...invalid('name')}
        />
      </FormField>

      <FormField id={id('campus')} error={errors.campus}>
        <p id={campusLabelId} className="text-label-sm text-text-primary">
          Campus
        </p>
        <div role="group" aria-labelledby={campusLabelId} {...invalid('campus')}>
          <RadioGroup
            name={id('campus')}
            options={CAMPUSES.map((campus) => ({ value: campus.id, label: campus.label, description: campus.area }))}
            value={value.campus}
            disabled={disabled}
            onChange={(campus) => onChange({ campus: campus as CampusId })}
          />
        </div>
      </FormField>

      <div className="grid grid-cols-2 items-start gap-lg">
        <FormField id={id('program')} error={errors.program}>
          <SelectField
            label="Program"
            placeholder="Choose"
            options={toOptions(PROGRAMS)}
            value={value.program}
            disabled={disabled}
            onChange={(program) => onChange({ program })}
          />
        </FormField>
        <FormField id={id('year')} error={errors.year}>
          <SelectField
            label="Year level"
            placeholder="Choose"
            options={toOptions(YEAR_LEVELS)}
            value={value.year}
            disabled={disabled}
            onChange={(year) => onChange({ year })}
          />
        </FormField>
      </div>
    </div>
  )
}
