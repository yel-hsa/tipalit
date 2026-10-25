import { Button, InputField, RadioGroup, SelectField, TextareaField } from '@figma/astraui'
import { AlertCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import FormField, { errorIdFor } from '../components/FormField'
import ImageDropzone from '../components/ImageDropzone'
import ScreenHeader from '../components/ScreenHeader'
import Spinner from '../components/Spinner'
import { CATEGORY_FALLBACK_IMAGES, CATEGORY_LIST, SUBJECT_CODES } from '@tipalit/services/seed'
import type { Category, Condition, ListingDraft, TransactionType } from '@tipalit/services/types'

const CONDITION_OPTIONS = [
  { value: 'New', label: 'New', description: 'Unused, sealed or bought new' },
  { value: 'Like New', label: 'Like New', description: 'Barely used, no visible marks' },
  { value: 'Good', label: 'Good', description: 'Light wear, works perfectly' },
  { value: 'Fair', label: 'Fair', description: 'Visible wear, priced to move' },
]

const TRANSACTION_OPTIONS = [
  { value: 'sale', label: 'For sale', description: 'Fixed price in pesos' },
  { value: 'free', label: 'Free', description: 'Giving it away, no payment' },
  { value: 'trade', label: 'Trade', description: 'Swap for something similar' },
] satisfies { value: TransactionType; label: string; description: string }[]

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }))

const FALLBACK_IMAGES = new Set(Object.values(CATEGORY_FALLBACK_IMAGES))

// the adapter swaps in a stock photo when a doc has no images; seeding it would save it back on edit
const realPhotos = (urls: string[] | undefined): string[] => {
  const photos = urls ?? []
  return photos.some((url) => !FALLBACK_IMAGES.has(url)) ? photos : []
}

type FieldKey = 'title' | 'price' | 'category' | 'subject'
type Errors = Partial<Record<FieldKey, string>>
const FIELD_ORDER: FieldKey[] = ['title', 'price', 'category', 'subject']
const MAX_PRICE = 999999
const MAX_PHOTO_EDGE = 900
const MAX_PHOTOS = 5

// downscale to a jpeg data url so photos survive a refresh in local storage
const toDataUrl = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

type AddListingScreenProps = {
  mode: 'create' | 'edit'
  initial?: ListingDraft
  // campus-approved spots for the listing's campus
  spots: string[]
  campusLabel: string
  // false keeps the form values on a failed publish
  onSubmit: (draft: ListingDraft) => Promise<boolean>
  onBack?: () => void
  // demo hook: show validation errors immediately
  autoValidate?: boolean
}

const focusField = (key: FieldKey) => {
  const wrapper = document.getElementById(`${key}-field`)
  const control = wrapper?.querySelector<HTMLElement>('input, textarea, select, button')
  wrapper?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  control?.focus({ preventScroll: true })
}

export default function AddListingScreen({
  mode,
  initial,
  spots,
  campusLabel,
  onSubmit,
  onBack,
  autoValidate,
}: AddListingScreenProps) {
  const editing = mode === 'edit'
  const spotOptions = initial && !spots.includes(initial.meetupSpot) ? [initial.meetupSpot, ...spots] : spots
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => realPhotos(initial?.imageUrls))
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [transactionType, setTransactionType] = useState<TransactionType>(initial?.transactionType ?? 'sale')
  const [category, setCategory] = useState<string>(initial?.category ?? '')
  const [subject, setSubject] = useState(initial?.courseCode ?? '')
  const [spot, setSpot] = useState(initial?.meetupSpot ?? spots[0])
  const [condition, setCondition] = useState<Condition>(initial?.condition ?? 'Good')
  const [description, setDescription] = useState(initial?.description ?? '')

  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)

  const selectPhoto = async (file: File) => {
    setPhotoError(null)
    try {
      const dataUrl = await toDataUrl(file)
      setPhotoUrls((urls) => (urls.length >= MAX_PHOTOS ? urls : [...urls, dataUrl]))
    } catch {
      setPhotoError("Couldn't read that photo. Try a JPG or PNG.")
    }
  }

  const removePhoto = (index: number) => {
    setPhotoUrls((urls) => urls.filter((_, i) => i !== index))
  }

  const priceValue = Number(price)
  const errors = useMemo<Errors>(() => {
    const next: Errors = {}
    const trimmed = title.trim()
    if (!trimmed) next.title = 'Add a title'
    else if (trimmed.length < 3) next.title = 'Title must be at least 3 characters'
    // free and trade listings have no price; a sale needs a positive one
    if (transactionType === 'sale' && (!price || priceValue === 0)) next.price = 'Enter a price'
    else if (priceValue > MAX_PRICE) next.price = 'Max ₱999,999'
    if (!category) next.category = 'Choose a category'
    if (!subject) next.subject = 'Choose a subject code'
    return next
  }, [title, price, priceValue, transactionType, category, subject])

  // errors stay hidden until the first submit, then update live
  const shown = submitted ? errors : {}
  const errorCount = Object.keys(shown).length

  const validate = () => {
    setSubmitted(true)
    const first = FIELD_ORDER.find((key) => errors[key])
    if (first) requestAnimationFrame(() => focusField(first))
    return !first
  }

  useEffect(() => {
    if (autoValidate) validate()
    // mount only: demo launcher
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending || !validate()) return
    setPending(true)
    const saved = await onSubmit({
      title: title.trim(),
      price: transactionType === 'sale' ? priceValue : 0,
      transactionType,
      category: category as Category,
      courseCode: subject,
      meetupSpot: spot,
      condition,
      description: description.trim(),
      imageUrls: photoUrls,
    })
    // success navigates away; failure keeps the form values
    if (!saved) setPending(false)
  }

  const invalidProps = (key: FieldKey) =>
    shown[key] ? { 'aria-invalid': true, 'aria-describedby': errorIdFor(key) } : {}

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader
        title={editing ? 'Edit listing' : 'New listing'}
        subtitle={editing ? `Listed at ${campusLabel}` : `Sell to verified students at ${campusLabel}`}
        onBack={onBack}
      />

      <form noValidate onSubmit={handleSubmit} aria-busy={pending || undefined} className="flex flex-col gap-xl px-xl pb-xl">
        <section aria-label="Photos" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
          <p className="text-label font-semibold text-text-primary">Photos</p>
          <ImageDropzone
            previewUrls={photoUrls}
            maxPhotos={MAX_PHOTOS}
            onSelect={selectPhoto}
            onRemove={removePhoto}
          />
          {photoError && (
            <p role="alert" className="flex items-center gap-xs text-label-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              {photoError}
            </p>
          )}
          {photoUrls.length === 0 && (
            <p className="text-caption-sm text-text-secondary">No photos? We&rsquo;ll use a category image.</p>
          )}
        </section>

        <section aria-label="Details" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
          <p className="text-label font-semibold text-text-primary">Details</p>
          <FormField id="title" error={shown.title}>
            <InputField
              id="title"
              label="Title"
              placeholder="e.g. Casio fx-991ES Plus"
              value={title}
              maxLength={80}
              onChange={setTitle}
              readOnly={pending}
              {...invalidProps('title')}
            />
          </FormField>
          <div className="grid grid-cols-2 items-start gap-lg">
            <FormField id="price" error={shown.price}>
              {transactionType === 'sale' ? (
                <InputField
                  id="price"
                  label="Price"
                  placeholder="0"
                  inputMode="numeric"
                  prefix={'₱'}
                  value={price}
                  onChange={(value) => setPrice(value.replace(/\D/g, '').slice(0, 7))}
                  readOnly={pending}
                  {...invalidProps('price')}
                />
              ) : (
                <div className="flex h-full flex-col justify-center rounded-corner-md border border-border-primary bg-bg-faint px-md py-md">
                  <p className="text-label-sm font-medium text-text-secondary">
                    {transactionType === 'free' ? 'Free — no payment' : 'Trade — offer a swap'}
                  </p>
                </div>
              )}
            </FormField>
            <FormField id="category" error={shown.category}>
              <SelectField
                label="Category"
                placeholder="Choose"
                options={toOptions(CATEGORY_LIST)}
                value={category}
                onChange={setCategory}
                disabled={pending}
              />
            </FormField>
          </div>
          <SelectField
            label="Subject code"
            placeholder="Choose"
            options={toOptions(SUBJECT_CODES)}
            value={subject}
            onChange={setSubject}
            disabled={pending}
          />
          <TextareaField
            label="Description"
            placeholder={
              transactionType === 'trade'
                ? 'What it is, its condition, and what you want in return...'
                : 'Edition, wear, what’s included...'
            }
            rows={4}
            value={description}
            onChange={setDescription}
          />
        </section>

        <section aria-label="Transaction type" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
          <p className="text-label font-semibold text-text-primary">Transaction type</p>
          <RadioGroup
            name="transactionType"
            options={TRANSACTION_OPTIONS}
            value={transactionType}
            onChange={(value) => setTransactionType(value as TransactionType)}
          />
        </section>

        <section aria-label="Condition" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
          <p className="text-label font-semibold text-text-primary">Condition</p>
          <RadioGroup
            name="condition"
            options={CONDITION_OPTIONS}
            value={condition}
            onChange={(value) => setCondition(value as Condition)}
          />
        </section>

        <section aria-label="Meetup" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
          <SelectField
            label="Meetup spot"
            description={`Approved spots at ${campusLabel}. Buyers see this as your preferred spot.`}
            options={toOptions(spotOptions)}
            value={spot}
            onChange={setSpot}
          />
        </section>

        <div className="flex flex-col gap-md">
          {errorCount > 0 && (
            <p role="alert" className="flex items-center justify-center gap-xs text-label-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              Fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} to publish
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : undefined}
            className="w-full touch-hit"
          >
            {pending ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Post listing'}
          </Button>
        </div>
      </form>
    </div>
  )
}
