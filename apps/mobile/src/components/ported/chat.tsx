/**
 * Web shared components ported 1:1 from apps/web/components/*.tsx (chat flow).
 * Each export names its web source file. All px values are the exact
 * translation of the Tailwind classes in the source.
 */
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, typography } from '../../theme'
import { Button } from './kit'
import { Icon } from './Icon'
import { BottomSheet } from './components'

// ------------------------------------------- apps/web MeetupPickerSheet ----
// BottomSheet title="Propose a meetup" subtitle="Approved spots at {campus}";
// body flex flex-col gap-2xl (24); PillGroup: flex-col gap-md(8) with label
// text-label font-semibold; options row gap-sm(6) (day/time grid-cols-3);
// option Button small primary/neutral; footer flex-col gap-md(8): summary row
// gap-sm(6) text-label-sm with CalendarClock 16, time text-text-primary;
// primary Button "Send proposal" w-full.
type Day = { offset: number; label: string; prefix: string }

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatHour = (hour: number) => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`

// skips Sunday: no classes, so the third slot jumps to Monday
const buildDays = (now: Date): Day[] => {
  const third = (now.getDay() + 2) % 7 === 0 ? 3 : 2
  const weekday = (now.getDay() + third) % 7
  return [
    { offset: 0, label: 'Today', prefix: 'Today' },
    { offset: 1, label: 'Tomorrow', prefix: 'Tomorrow' },
    { offset: third, label: WEEKDAY_NAMES[weekday], prefix: WEEKDAYS[weekday] },
  ]
}

function PillGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.pillGroup}>
      <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
      <View style={styles.pillRow}>{children}</View>
    </View>
  )
}

export function MeetupPickerSheet({
  isOpen,
  onClose,
  spots,
  campusLabel,
  defaultLocation,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  // campus-approved spots for the listing's campus
  spots: string[]
  campusLabel: string
  defaultLocation: string
  onSubmit: (proposal: { location: string; time: string }) => void
}) {
  // mounted fresh per proposal, so "now" is captured once per open
  const now = useMemo(() => new Date(), [])
  const days = useMemo(() => buildDays(now), [now])
  const isPast = (dayOffset: number, hour: number) => dayOffset === 0 && hour <= now.getHours()
  const todayOpen = HOURS.some((hour) => !isPast(0, hour))

  const [location, setLocation] = useState(spots.includes(defaultLocation) ? defaultLocation : spots[0])
  const [dayOffset, setDayOffset] = useState<number>(todayOpen ? 0 : 1)
  const [hour, setHour] = useState<number | null>(null)

  const day = days.find((d) => d.offset === dayOffset) ?? days[1]
  const time = hour === null ? null : `${day.prefix}, ${formatHour(hour)}`

  const pickDay = (offset: number) => {
    setDayOffset(offset)
    if (hour !== null && isPast(offset, hour)) setHour(null)
  }

  if (!isOpen) return null

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Propose a meetup"
      subtitle={`Approved spots at ${campusLabel}`}
      footer={
        <View style={styles.footerCol}>
          <View style={styles.summaryRow} accessibilityLiveRegion="polite">
            <Icon name="calendar-clock" size={16} color={colors.textSecondary} />
            {time ? (
              <Text style={[typography.labelSm, { color: colors.text }]}>
                {day.prefix} · {formatHour(hour!)} · {location}
              </Text>
            ) : (
              <Text style={[typography.labelSm, { color: colors.textSecondary }]}>Pick a time to continue</Text>
            )}
          </View>
          <Button
            label="Send proposal"
            variant="primary"
            disabled={!time}
            onPress={() => time && onSubmit({ location, time })}
          />
        </View>
      }
    >
      <View style={styles.bodyCol}>
        <PillGroup label="Campus spot">
          {spots.map((spot) => (
            <Button
              key={spot}
              label={spot}
              size="small"
              variant={spot === location ? 'primary' : 'neutral'}
              iconStart={spot === location ? <Icon name="map-pin" size={14} color="#ffffff" /> : undefined}
              onPress={() => setLocation(spot)}
            />
          ))}
        </PillGroup>

        <PillGroup label="Day">
          {days.map((d) => {
            const disabled = d.offset === 0 && !todayOpen
            return (
              <Button
                key={d.offset}
                label={d.label}
                size="small"
                variant={d.offset === dayOffset ? 'primary' : 'neutral'}
                disabled={disabled}
                onPress={() => pickDay(d.offset)}
              />
            )
          })}
        </PillGroup>

        <PillGroup label="Time">
          {HOURS.map((h) => {
            const past = isPast(dayOffset, h)
            return (
              <Button
                key={h}
                label={formatHour(h)}
                size="small"
                variant={h === hour ? 'primary' : 'neutral'}
                disabled={past}
                onPress={() => setHour(h)}
              />
            )
          })}
        </PillGroup>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  bodyCol: { gap: 24 },
  pillGroup: { gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footerCol: { gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
