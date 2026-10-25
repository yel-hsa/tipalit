import { Button } from '@figma/astraui'
import { ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { campusLabel } from '@tipalit/services/seed'
import type { CompleteProfile } from '@tipalit/services/profile'
import type { CampusId } from '@tipalit/services/types'
import BottomSheet from './BottomSheet'
import InlineAlert from './InlineAlert'
import ProfileFields, {
  draftFromProfile,
  focusProfileField,
  PROFILE_FIELD_ORDER,
  validateProfile,
  type ProfileDraft,
} from './ProfileFields'
import Spinner from './Spinner'

type EditProfileSheetProps = {
  isOpen: boolean
  profile: CompleteProfile
  onClose: () => void
  onSave: (draft: ProfileDraft) => Promise<boolean>
}

const ID_PREFIX = 'edit-profile'

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
    if (first) {
      requestAnimationFrame(() => focusProfileField(ID_PREFIX, first))
      return
    }
    if (campusChanged) setConfirmingCampus(true)
    else save()
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={pending ? () => undefined : onClose}
      title="Edit profile"
      footer={
        confirmingCampus ? (
          <div className="flex flex-col gap-md">
            <InlineAlert tone="info" icon={ArrowLeftRight}>
              Your feed will switch to {campusLabel(draft.campus as CampusId)}. Existing listings stay on their
              original campus.
            </InlineAlert>
            <div className="grid grid-cols-2 gap-md">
              <Button variant="neutral" onClick={() => setConfirmingCampus(false)} disabled={pending} className="touch-hit">
                Keep {campusLabel(profile.campus)}
              </Button>
              <Button
                variant="primary"
                onClick={save}
                disabled={pending}
                aria-busy={pending || undefined}
                iconStart={pending ? <Spinner /> : undefined}
                className="touch-hit"
              >
                {pending ? 'Saving\u2026' : 'Switch campus'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={submit}
            disabled={pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : undefined}
            className="w-full touch-hit"
          >
            {pending ? 'Saving\u2026' : 'Save changes'}
          </Button>
        )
      }
    >
      <ProfileFields
        idPrefix={ID_PREFIX}
        value={draft}
        errors={errors}
        disabled={pending}
        onChange={(patch) => {
          setDraft((current) => ({ ...current, ...patch }))
          if (patch.campus) setConfirmingCampus(false)
        }}
      />
    </BottomSheet>
  )
}
