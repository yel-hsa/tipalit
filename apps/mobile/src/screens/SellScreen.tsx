// listing creation and edit screen

import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { services } from '@tipalit/services'
import { CATEGORY_FALLBACK_IMAGES, CATEGORY_LIST, SUBJECT_CODES, campusLabel } from '@tipalit/services/seed'
import type {
  Category,
  Condition,
  Listing,
  ListingDraft,
  TransactionType,
} from '@tipalit/services/types'
import { useSession } from '../session'
import {
  Button,
  FormField,
  Icon,
  ImageDropzone,
  InputField,
  RadioGroup,
  ScreenHeader,
  SelectField,
  Spinner,
  TextareaField,
  colors,
  radius,
  spacing,
  typography,
} from '../components/ported'

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

// downscale to a jpeg data url so the photo fits inside the listing document
const toDataUrl = async (uri: string): Promise<string> => {
  const result = await manipulateAsync(uri, [{ resize: { width: MAX_PHOTO_EDGE } }], {
    compress: 0.82,
    format: SaveFormat.JPEG,
    base64: true,
  })
  return result.base64 ? `data:image/jpeg;base64,${result.base64}` : result.uri
}

type SellScreenProps = {
  listing?: Listing
  onPublished: () => void
  onCancel?: () => void
  // demo hook: show validation errors immediately
  autoValidate?: boolean
}

export default function SellScreen({ listing, onPublished, onCancel, autoValidate }: SellScreenProps) {
  const { session, profile } = useSession()
  const editing = !!listing
  const campus = profile?.campus ?? ''
  const campusText = campus ? campusLabel(campus) : ''
  const [spots, setSpots] = useState<string[]>([])
  const [spot, setSpot] = useState(listing?.meetupSpot ?? '')
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => realPhotos(listing?.imageUrls))
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [title, setTitle] = useState(listing?.title ?? '')
  const [price, setPrice] = useState(listing ? String(listing.price) : '')
  const [transactionType, setTransactionType] = useState<TransactionType>(listing?.transactionType ?? 'sale')
  const [category, setCategory] = useState<string>(listing?.category ?? '')
  const [subject, setSubject] = useState(listing?.courseCode ?? '')
  const [condition, setCondition] = useState<Condition>(listing?.condition ?? 'Good')
  const [description, setDescription] = useState(listing?.description ?? '')

  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)

  const scrollRef = useRef<{ scrollTo: (options: { y: number; animated?: boolean }) => void } | null>(null)
  const fieldYs = useRef<Partial<Record<FieldKey, number>>>({})

  useEffect(() => {
    if (!campus) return
    services.settings
      .getMeetupSpots()
      .then((all) => setSpots(all[campus] ?? []))
      .catch(() => setSpots([]))
  }, [campus])

  const spotOptions =
    listing && listing.meetupSpot && !spots.includes(listing.meetupSpot)
      ? [listing.meetupSpot, ...spots]
      : spots
  const effectiveSpot = spot || spotOptions[0] || ''

  const selectPhoto = async () => {
    setPhotoError(null)
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setPhotoError('Photo access is needed to pick an image.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (result.canceled || !result.assets[0]) return
    try {
      const dataUrl = await toDataUrl(result.assets[0].uri)
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

  const focusField = (key: FieldKey) => {
    const y = fieldYs.current[key]
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true })
  }

  const validate = () => {
    setSubmitted(true)
    const first = FIELD_ORDER.find((key) => errors[key])
    if (first) focusField(first)
    return !first
  }

  useEffect(() => {
    if (autoValidate) validate()
    // mount only: demo launcher
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    if (pending || !validate()) return
    if (!session || !campus || !effectiveSpot) return
    setPending(true)
    const draft: ListingDraft = {
      title: title.trim(),
      price: transactionType === 'sale' ? priceValue : 0,
      transactionType,
      category: category as Category,
      courseCode: subject,
      meetupSpot: effectiveSpot,
      condition,
      description: description.trim(),
      imageUrls: photoUrls,
    }
    try {
      if (listing) {
        await services.listings.update(listing.id, draft)
      } else {
        await services.listings.create(draft, { userId: session.userId, campus })
      }
      onPublished()
    } catch {
      // failure keeps the form values
      setPending(false)
    }
  }

  const trackField = (key: FieldKey) => (event: { nativeEvent: { layout: { y: number } } }) => {
    fieldYs.current[key] = event.nativeEvent.layout.y
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={editing ? 'Edit listing' : 'New listing'}
        subtitle={editing ? `Listed at ${campusText}` : `Sell to verified students at ${campusText}`}
        onBack={onCancel}
      />

      <ScrollView
        ref={scrollRef as never}
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section} accessibilityLabel="Photos">
          <Text style={styles.sectionTitle}>Photos</Text>
          <ImageDropzone
            previewUrls={photoUrls}
            maxPhotos={MAX_PHOTOS}
            onAdd={selectPhoto}
            onRemove={removePhoto}
          />
          {photoError && (
            <View style={styles.errorRow} accessibilityRole="alert">
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{photoError}</Text>
            </View>
          )}
          {photoUrls.length === 0 && (
            <Text style={styles.caption}>No photos? We&rsquo;ll use a category image.</Text>
          )}
        </View>

        <View style={styles.section} accessibilityLabel="Details">
          <Text style={styles.sectionTitle}>Details</Text>
          <View onLayout={trackField('title')}>
            <FormField error={shown.title}>
              <InputField
                label="Title"
                placeholder="e.g. Casio fx-991ES Plus"
                value={title}
                maxLength={80}
                onChange={setTitle}
                disabled={pending}
              />
            </FormField>
          </View>
          <View style={styles.grid2}>
            <View style={styles.grid2Col} onLayout={trackField('price')}>
              <FormField error={shown.price}>
                {transactionType === 'sale' ? (
                  <InputField
                    label="Price"
                    placeholder="0"
                    keyboardType="numeric"
                    prefix={<Text style={styles.prefix}>₱</Text>}
                    value={price}
                    onChange={(value) => setPrice(value.replace(/\D/g, '').slice(0, 7))}
                    disabled={pending}
                  />
                ) : (
                  <View style={styles.noPriceBox}>
                    <Text style={styles.noPriceText}>
                      {transactionType === 'free' ? 'Free — no payment' : 'Trade — offer a swap'}
                    </Text>
                  </View>
                )}
              </FormField>
            </View>
            <View style={styles.grid2Col} onLayout={trackField('category')}>
              <FormField error={shown.category}>
                <SelectField
                  label="Category"
                  placeholder="Choose"
                  options={toOptions(CATEGORY_LIST)}
                  value={category}
                  onChange={setCategory}
                  disabled={pending}
                />
              </FormField>
            </View>
          </View>
          <View onLayout={trackField('subject')}>
            <FormField error={shown.subject}>
              <SelectField
                label="Subject code"
                placeholder="Choose"
                options={toOptions(SUBJECT_CODES)}
                value={subject}
                onChange={setSubject}
                disabled={pending}
              />
            </FormField>
          </View>
          <TextareaField
            label="Description"
            placeholder={
              transactionType === 'trade'
                ? 'What it is, its condition, and what you want in return...'
                : "Edition, wear, what's included..."
            }
            rows={4}
            value={description}
            onChange={setDescription}
          />
        </View>

        <View style={styles.section} accessibilityLabel="Transaction type">
          <Text style={styles.sectionTitle}>Transaction type</Text>
          <RadioGroup
            options={TRANSACTION_OPTIONS}
            value={transactionType}
            onChange={(value) => setTransactionType(value as TransactionType)}
            disabled={pending}
          />
        </View>

        <View style={styles.section} accessibilityLabel="Condition">
          <Text style={styles.sectionTitle}>Condition</Text>
          <RadioGroup
            options={CONDITION_OPTIONS}
            value={condition}
            onChange={(value) => setCondition(value as Condition)}
            disabled={pending}
          />
        </View>

        <View style={styles.section} accessibilityLabel="Meetup">
          <SelectField
            label="Meetup spot"
            description={`Approved spots at ${campusText}. Buyers see this as your preferred spot.`}
            options={toOptions(spotOptions)}
            value={effectiveSpot}
            onChange={setSpot}
          />
        </View>

        <View style={styles.submitCol}>
          {errorCount > 0 && (
            <View style={styles.errorRowCentered} accessibilityRole="alert">
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>
                Fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} to publish
              </Text>
            </View>
          )}
          <Button
            label={pending ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Post listing'}
            variant="primary"
            disabled={pending}
            busy={pending}
            iconStart={pending ? <Spinner color="#ffffff" /> : undefined}
            style={styles.submitButton}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
    </View>
  )
}

// form: flex flex-col gap-xl(16) px-xl(16) pb-xl(16)
// section: flex flex-col gap-lg(12) rounded-corner-lg(16) bg-surface-bg p-xl(16)
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandTertiary },
  scroll: { flex: 1 },
  form: { gap: spacing.xl, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  section: {
    gap: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  sectionTitle: { ...typography.label, fontWeight: '600', color: colors.text },
  grid2: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  grid2Col: { flex: 1 },
  prefix: { ...typography.inputSm, color: colors.textSecondary },
  noPriceBox: {
    flexGrow: 1,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgFaint,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  noPriceText: { ...typography.labelSm, fontWeight: '500', color: colors.textSecondary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  errorText: { ...typography.labelSm, color: colors.danger },
  caption: { ...typography.meta, fontWeight: '400', color: colors.textSecondary },
  submitCol: { gap: spacing.md },
  submitButton: { alignSelf: 'stretch', width: '100%' },
})
