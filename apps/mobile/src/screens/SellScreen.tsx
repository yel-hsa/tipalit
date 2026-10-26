import { useEffect, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { services } from '@tipalit/services'
import { CATEGORY_LIST, CONDITIONS, SUBJECT_CODES } from '@tipalit/services/seed'
import type {
  Category,
  Condition,
  Listing,
  ListingDraft,
  TransactionType,
} from '@tipalit/services/types'
import { useSession } from '../session'
import { colors, radius, space } from '../theme'
import { Button, Card, Pill, Screen } from '../components/ui'

const MAX_PHOTOS = 5
const MAX_EDGE = 900
const TRANSACTIONS: { value: TransactionType; label: string }[] = [
  { value: 'sale', label: 'For sale' },
  { value: 'free', label: 'Free' },
  { value: 'trade', label: 'Trade' },
]

// downscale to a jpeg data url so the photo fits inside the listing document
const toDataUrl = async (uri: string): Promise<string> => {
  const context = ImageManipulator.manipulate(uri).resize({ width: MAX_EDGE })
  const image = await context.renderAsync()
  const result = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG, base64: true })
  return `data:image/jpeg;base64,${result.base64}`
}

export default function SellScreen({
  listing,
  onPublished,
  onCancel,
}: {
  listing?: Listing
  onPublished: () => void
  onCancel?: () => void
}) {
  const { session, profile } = useSession()
  const [title, setTitle] = useState(listing?.title ?? '')
  const [price, setPrice] = useState(
    listing && listing.transactionType === 'sale' ? String(listing.price) : '',
  )
  const [transactionType, setTransactionType] = useState<TransactionType>(
    listing?.transactionType ?? 'sale',
  )
  const [category, setCategory] = useState<Category>(listing?.category ?? 'Textbooks')
  const [condition, setCondition] = useState<Condition>(listing?.condition ?? 'Good')
  const [courseCode, setCourseCode] = useState(
    listing?.courseCode ?? SUBJECT_CODES[0],
  )
  const [meetupSpot, setMeetupSpot] = useState(listing?.meetupSpot ?? '')
  const [spots, setSpots] = useState<string[]>([])
  const [description, setDescription] = useState(listing?.description ?? '')
  const [photos, setPhotos] = useState<string[]>(listing?.imageUrls ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.campus) return
    services.settings
      .getMeetupSpots()
      .then((all) => {
        const list = all[profile.campus!] ?? []
        setSpots(list)
        if (!listing) {
          setMeetupSpot((current) => current || list[0] || '')
        }
      })
      .catch(() => setSpots([]))
  }, [listing, profile?.campus])

  const addPhoto = async (source: 'camera' | 'library') => {
    if (photos.length >= MAX_PHOTOS) return
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError(source === 'camera' ? 'Camera access is needed to take a photo.' : 'Photo access is needed to pick an image.')
      return
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (result.canceled || !result.assets[0]) return
    try {
      const dataUrl = await toDataUrl(result.assets[0].uri)
      setPhotos((current) => [...current, dataUrl])
      setError(null)
    } catch {
      setError('That photo could not be processed. Try another.')
    }
  }

  const priceValue = Number(price.replace(/[^0-9.]/g, ''))
  const valid =
    title.trim().length > 2 &&
    meetupSpot &&
    description.trim().length > 0 &&
    (transactionType !== 'sale' || (priceValue > 0 && priceValue <= 999999))

  const publish = async () => {
    if (!session || !profile?.campus || !valid) return
    setBusy(true)
    setError(null)
    const draft: ListingDraft = {
      title: title.trim(),
      price: transactionType === 'sale' ? priceValue : 0,
      transactionType,
      category,
      courseCode,
      meetupSpot,
      condition,
      description: description.trim(),
      imageUrls: photos,
    }
    try {
      if (listing) {
        await services.listings.update(listing.id, draft)
      } else {
        await services.listings.create(draft, {
          userId: session.userId,
          campus: profile.campus,
        })
      }
      setTitle('')
      setPrice('')
      setDescription('')
      setPhotos([])
      onPublished()
    } catch {
      setError('We could not publish your listing. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>
          {listing ? 'Edit listing' : 'Sell an item'}
        </Text>

        <Card style={styles.photos}>
          <Text style={styles.label}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((uri, index) => (
              <Pressable
                key={`${index}-${uri.slice(-12)}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                hitSlop={8}
                onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
              >
                <Image source={{ uri }} style={styles.photo} accessibilityIgnoresInvertColors />
              </Pressable>
            ))}
            {photos.length < MAX_PHOTOS && (
              <View style={styles.photoActions}>
                <Button label="Camera" variant="secondary" onPress={() => addPhoto('camera')} />
                <Button label="Library" variant="secondary" onPress={() => addPhoto('library')} />
              </View>
            )}
          </ScrollView>
          <Text style={styles.hint}>Tap a photo to remove it.</Text>
        </Card>

        <Field label="Title">
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="e.g. Calculus 8th edition" />
        </Field>

        <Field label="Transaction">
          <View style={styles.row}>
            {TRANSACTIONS.map((item) => (
              <Pill
                key={item.value}
                label={item.label}
                active={transactionType === item.value}
                onPress={() => setTransactionType(item.value)}
              />
            ))}
          </View>
        </Field>

        {transactionType === 'sale' && (
          <Field label="Price (PHP)">
            <TextInput
              value={price}
              onChangeText={setPrice}
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
            />
          </Field>
        )}

        <Field label="Category">
          <View style={styles.row}>
            {CATEGORY_LIST.map((item) => (
              <Pill key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
            ))}
          </View>
        </Field>

        <Field label="Condition">
          <View style={styles.row}>
            {CONDITIONS.map((item) => (
              <Pill key={item} label={item} active={condition === item} onPress={() => setCondition(item)} />
            ))}
          </View>
        </Field>

        <Field label="Course code">
          <View style={styles.row}>
            {SUBJECT_CODES.slice(0, 8).map((item) => (
              <Pill key={item} label={item} active={courseCode === item} onPress={() => setCourseCode(item)} />
            ))}
          </View>
        </Field>

        <Field label="Meetup spot">
          <View style={styles.row}>
            {spots.map((item) => (
              <Pill key={item} label={item} active={meetupSpot === item} onPress={() => setMeetupSpot(item)} />
            ))}
          </View>
        </Field>

        <Field label="Description">
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Condition details, edition, what's included"
          />
        </Field>

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}>
          {listing && onCancel && (
            <View style={styles.cancelAction}>
              <Button label="Cancel" variant="secondary" onPress={onCancel} />
            </View>
          )}
          <View style={styles.saveAction}>
            <Button
              label={listing ? 'Save changes' : 'Publish listing'}
              onPress={publish}
              disabled={!valid}
              busy={busy}
            />
          </View>
        </View>
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
  content: { padding: space(4), gap: space(4), paddingBottom: space(10) },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  photos: { gap: space(2) },
  photoRow: { gap: space(2), alignItems: 'center' },
  photo: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: '#eee' },
  photoActions: { gap: space(2) },
  hint: { fontSize: 12, color: colors.muted },
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
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  actions: { flexDirection: 'row', gap: space(3) },
  cancelAction: { flex: 1 },
  saveAction: { flex: 2 },
  error: { color: colors.danger, fontSize: 14 },
})
