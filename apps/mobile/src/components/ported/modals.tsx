/**
 * Web modals ported 1:1 from apps/web/components/RateModal.tsx and
 * ReportModal.tsx. All px values are the exact translation of the Tailwind
 * classes in the source; kit Modal (small 360) carries the chrome.
 */
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, typography } from '../../theme'
import { Button, Modal, RadioGroup, Spinner, TextareaField } from './kit'
import { AvatarInitials, StarRating } from './components'
import { Icon } from './Icon'

// ------------------------------------------------ apps/web RateModal ----
// Modal small title="Rate this meetup"; body flex-col gap-xl(16): centered
// col gap-sm(6) with Avatar large, text-label "How was meeting {first}?",
// listing title text-label-sm; StarRating; TextareaField rows=3 maxLength=300
// label "Add a comment (optional)" placeholder "On time, item as described…";
// footer: subtle "Skip" + primary "Submit rating" (pending: "Submitting…").
export function RateModal({
  isOpen,
  onClose,
  seller,
  listingTitle,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  seller: { initials: string; name: string }
  listingTitle?: string
  onSubmit: (rating: number, comment: string) => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)

  return (
    <Modal
      isOpen={isOpen}
      onClose={pending ? () => undefined : onClose}
      title="Rate this meetup"
      size="small"
      footer={
        <>
          <Button label="Skip" variant="subtle" onPress={onClose} disabled={pending} />
          <Button
            label={pending ? 'Submitting…' : 'Submit rating'}
            variant="primary"
            disabled={rating < 1 || pending}
            busy={pending}
            onPress={() => {
              setPending(true)
              onSubmit(rating, comment.trim())
            }}
          />
        </>
      }
    >
      <View style={styles.rateBody}>
        <View style={styles.rateHead}>
          <AvatarInitials initials={seller.initials} size={40} />
          <Text style={[typography.label, { color: colors.text }]}>
            How was meeting {seller.name.split(' ')[0]}?
          </Text>
          {listingTitle ? <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{listingTitle}</Text> : null}
        </View>
        <StarRating value={rating} onChange={setRating} />
        <TextareaField
          label="Add a comment (optional)"
          placeholder="On time, item as described…"
          rows={3}
          maxLength={300}
          value={comment}
          onChange={setComment}
          disabled={pending}
        />
      </View>
    </Modal>
  )
}

// ----------------------------------------------- apps/web ReportModal ----
// Modal small title "Report listing" / "Report {first}"; body gap-xl(16):
// notice row gap-md(8) rounded-8 bg-bg-faint p-md with ShieldAlert 16 mt-xs;
// "What's wrong?" text-label font-semibold + RadioGroup; TextareaField
// "Details (optional)" with "{n}/300" description; footer Cancel + Submit.
export type ReportTarget = { kind: 'listing' | 'user'; id: string; name: string }

const REASONS: Record<ReportTarget['kind'], string[]> = {
  listing: [
    'Scam or suspicious price',
    'Prohibited item',
    'Misleading photos or description',
    'Already sold',
    'Other',
  ],
  user: ['Not a TIP student', 'Harassment or inappropriate messages', 'No-show at meetup', 'Scam attempt', 'Other'],
}

export function ReportModal({
  isOpen,
  onClose,
  target,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  target: ReportTarget
  // false keeps the modal open so nothing is lost
  onSubmit: (reason: string, details: string) => Promise<boolean>
}) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!reason || pending) return
    setPending(true)
    const sent = await onSubmit(reason, details.trim())
    if (!sent) setPending(false)
  }

  const title = target.kind === 'listing' ? 'Report listing' : `Report ${target.name.split(' ')[0]}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={pending ? () => undefined : onClose}
      title={title}
      size="small"
      footer={
        <>
          <Button label="Cancel" variant="subtle" onPress={onClose} disabled={pending} />
          <Button
            label={pending ? 'Sending…' : 'Submit report'}
            variant="primary"
            disabled={!reason || pending}
            busy={pending}
            iconStart={pending ? <Spinner color="#ffffff" /> : undefined}
            onPress={submit}
          />
        </>
      }
    >
      <View style={styles.reportBody}>
        <View style={styles.notice}>
          <View style={styles.noticeIcon}>
            <Icon name="shield-alert" size={16} color={colors.textSecondary} />
          </View>
          <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
            {target.kind === 'listing' ? (
              <>
                Reporting <Text style={{ color: colors.text }}>{target.name}</Text>. The seller won’t know who
                reported it.
              </>
            ) : (
              <>{target.name} won’t be notified. Our team reviews every report within 24 hours.</>
            )}
          </Text>
        </View>
        <View style={styles.reasonCol}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>What’s wrong?</Text>
          <RadioGroup
            options={REASONS[target.kind].map((value) => ({ value, label: value }))}
            value={reason}
            onChange={setReason}
            disabled={pending}
          />
        </View>
        <TextareaField
          label="Details (optional)"
          placeholder="Anything that helps us review faster"
          rows={3}
          maxLength={300}
          value={details}
          onChange={setDetails}
          disabled={pending}
          description={`${details.length}/300`}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // body flex-col gap-xl(16)
  rateBody: { gap: 16 },
  rateHead: { alignItems: 'center', gap: 6 },
  reportBody: { gap: 16 },
  // notice: flex items-start gap-md(8) rounded-8 bg-bg-faint p-md(8)
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, backgroundColor: colors.bgFaint, padding: 8 },
  noticeIcon: { marginTop: 4 },
  reasonCol: { gap: 8 },
})
