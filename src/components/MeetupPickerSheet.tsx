import { Button } from '@figma/astraui'
import { CalendarClock, MapPin } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import BottomSheet from './BottomSheet'

type MeetupPickerSheetProps = {
  isOpen: boolean
  onClose: () => void
  // campus-approved spots for the listing's campus
  spots: string[]
  campusLabel: string
  defaultLocation: string
  onSubmit: (proposal: { location: string; time: string }) => void
}

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

function PillGroup({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-md">
      <p id={labelId} className="text-label font-semibold text-text-primary">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className={className}>
        {children}
      </div>
    </div>
  )
}

export default function MeetupPickerSheet({
  isOpen,
  onClose,
  spots,
  campusLabel,
  defaultLocation,
  onSubmit,
}: MeetupPickerSheetProps) {
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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Propose a meetup"
      subtitle={`Approved spots at ${campusLabel}`}
      footer={
        <div className="flex flex-col gap-md">
          <p aria-live="polite" className="flex items-center gap-sm text-label-sm text-text-secondary">
            <CalendarClock size={16} className="shrink-0" />
            {time ? (
              <span className="text-text-primary">
                {day.prefix} &middot; {formatHour(hour!)} &middot; {location}
              </span>
            ) : (
              'Pick a time to continue'
            )}
          </p>
          <Button
            variant="primary"
            disabled={!time}
            onClick={() => time && onSubmit({ location, time })}
            className="w-full touch-hit"
          >
            Send proposal
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2xl">
        <PillGroup label="Campus spot" className="flex flex-wrap gap-sm">
          {spots.map((spot) => (
            <Button
              key={spot}
              size="small"
              variant={spot === location ? 'primary' : 'neutral'}
              role="radio"
              aria-checked={spot === location}
              iconStart={spot === location ? <MapPin size={14} /> : undefined}
              onClick={() => setLocation(spot)}
              className="touch-hit"
            >
              {spot}
            </Button>
          ))}
        </PillGroup>

        <PillGroup label="Day" className="grid grid-cols-3 gap-sm">
          {days.map((d) => {
            const disabled = d.offset === 0 && !todayOpen
            return (
              <Button
                key={d.offset}
                size="small"
                variant={d.offset === dayOffset ? 'primary' : 'neutral'}
                role="radio"
                aria-checked={d.offset === dayOffset}
                disabled={disabled}
                aria-label={disabled ? `${d.label}, no slots left` : d.label}
                onClick={() => pickDay(d.offset)}
                className="touch-hit"
              >
                {d.label}
              </Button>
            )
          })}
        </PillGroup>

        <PillGroup label="Time" className="grid grid-cols-3 gap-sm">
          {HOURS.map((h) => {
            const past = isPast(dayOffset, h)
            return (
              <Button
                key={h}
                size="small"
                variant={h === hour ? 'primary' : 'neutral'}
                role="radio"
                aria-checked={h === hour}
                disabled={past}
                onClick={() => setHour(h)}
                className="touch-hit"
              >
                {formatHour(h)}
              </Button>
            )
          })}
        </PillGroup>
      </div>
    </BottomSheet>
  )
}
