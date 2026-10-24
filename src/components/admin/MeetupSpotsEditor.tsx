import { Button, IconButton, InputField } from '@figma/astraui'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { CAMPUSES } from '../../data/seed'
import type { CampusId, MeetupSpots } from '../../services/types'
import FilterPills from '../FilterPills'
import FormField, { errorIdFor } from '../FormField'
import Spinner from '../Spinner'

type MeetupSpotsEditorProps = {
  spots: MeetupSpots
  campus: CampusId
  onCampusChange: (campus: CampusId) => void
  onSave: (campus: CampusId, spots: string[]) => Promise<boolean>
}

const SPOT_LIMIT = 40

export default function MeetupSpotsEditor({ spots, campus, onCampusChange, onSave }: MeetupSpotsEditorProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState<string | null>(null)
  const inputId = useId()
  const list = spots[campus]

  const save = async (next: string[], key: string) => {
    setPending(key)
    const saved = await onSave(campus, next)
    setPending(null)
    return saved
  }

  const add = async (event: FormEvent) => {
    event.preventDefault()
    const name = draft.trim()
    if (!name) return setError('Enter a spot name.')
    if (list.some((spot) => spot.toLowerCase() === name.toLowerCase())) return setError('That spot is already listed.')
    setError(undefined)
    if (await save([...list, name], 'add')) setDraft('')
  }

  return (
    <div className="flex flex-col gap-lg">
      <FilterPills
        label="Campus"
        options={CAMPUSES.map(({ id, label }) => ({ id, label }))}
        active={campus}
        onChange={(id) => {
          setError(undefined)
          onCampusChange(id)
        }}
      />
      <p className="text-label-sm text-text-secondary">
        Members choose from these when they list an item or propose a meetup. Removing a spot doesn&rsquo;t change
        existing listings.
      </p>

      <ul aria-label="Approved spots" className="overflow-hidden rounded-corner-lg bg-surface-bg">
        {list.map((spot) => (
          <li key={spot} className="flex items-center gap-md border-b border-border-secondary px-lg py-md last:border-b-0">
            <MapPin size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-label-sm text-text-primary">{spot}</span>
            <IconButton
              variant="subtle"
              size="small"
              icon={pending === spot ? <Spinner /> : <Trash2 size={16} />}
              aria-label={list.length === 1 ? `${spot} can't be removed: each campus needs one spot` : `Remove ${spot}`}
              disabled={list.length === 1 || pending !== null}
              onClick={() => save(list.filter((item) => item !== spot), spot)}
              className="touch-hit"
            />
          </li>
        ))}
      </ul>

      <form noValidate onSubmit={add} className="flex flex-col gap-md rounded-corner-lg bg-surface-bg p-lg">
        <FormField id={inputId} error={error}>
          <InputField
            id={inputId}
            label="Add a spot"
            placeholder="For example: Gate 1 Security Post"
            maxLength={SPOT_LIMIT}
            value={draft}
            onChange={(value) => {
              setDraft(value)
              if (error) setError(undefined)
            }}
            disabled={pending !== null}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorIdFor(inputId) : undefined}
          />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          size="small"
          disabled={pending !== null}
          iconStart={pending === 'add' ? <Spinner /> : <Plus size={14} />}
          className="self-end touch-hit"
        >
          {pending === 'add' ? 'Adding\u2026' : 'Add spot'}
        </Button>
      </form>
    </div>
  )
}
