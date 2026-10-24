import { Badge, Button, ButtonGroup } from '@figma/astraui'
import { CalendarClock, CalendarPlus, CheckCircle2, MapPin, Star } from 'lucide-react'
import type { MeetupItem } from '../services/types'
import StarRating from './StarRating'

type MeetupProposalCardProps = {
  item: MeetupItem
  onRespond: (status: 'accepted' | 'declined') => void
  onProposeNew: () => void
  onComplete: () => void
  onRate: () => void
}

export default function MeetupProposalCard({
  item,
  onRespond,
  onProposeNew,
  onComplete,
  onRate,
}: MeetupProposalCardProps) {
  const fromMe = item.from === 'me'

  return (
    <div
      className={`flex w-full max-w-72 flex-col overflow-hidden rounded-corner-lg border border-border-secondary bg-surface-bg ${
        fromMe ? 'self-end' : 'self-start'
      }`}
    >
      <div className="flex flex-col gap-md p-lg">
        <div className="flex items-center justify-between gap-md">
          <span className="flex items-center gap-sm text-label-sm text-text-secondary">
            <CalendarClock size={16} />
            {fromMe ? 'You proposed' : 'Meetup proposal'}
          </span>
          {item.completed && <Badge variant="success" label="Completed" />}
          {!item.completed && item.status === 'accepted' && <Badge variant="success" label="Accepted" />}
          {item.status === 'declined' && <Badge variant="danger" label="Declined" />}
          {item.status === 'pending' && fromMe && <Badge variant="warning" label="Awaiting response" />}
        </div>

        <div className="flex flex-col gap-xs">
          <p className="text-label font-semibold text-text-primary">{item.time}</p>
          <p className="flex items-center gap-xs text-label-sm text-text-secondary">
            <MapPin size={14} />
            {item.location}
          </p>
        </div>

        {item.status === 'pending' && !fromMe && (
          <ButtonGroup align="justify">
            <Button variant="neutral" size="small" onClick={() => onRespond('declined')} className="touch-hit">
              Reschedule
            </Button>
            <Button variant="primary" size="small" onClick={() => onRespond('accepted')} className="touch-hit">
              Accept
            </Button>
          </ButtonGroup>
        )}

        {item.status === 'declined' && (
          <Button
            variant="subtle"
            size="small"
            iconStart={<CalendarPlus size={16} />}
            onClick={onProposeNew}
            className="touch-hit"
          >
            Propose new time
          </Button>
        )}

        {item.status === 'accepted' && !item.completed && (
          <Button
            variant="neutral"
            size="small"
            iconStart={<CheckCircle2 size={16} />}
            onClick={onComplete}
            className="touch-hit"
          >
            Mark as completed
          </Button>
        )}
      </div>

      {item.completed && (
        <div className="flex items-center justify-between gap-md bg-success-soft px-lg py-md">
          <span className="flex items-center gap-xs text-label-sm text-text-primary">
            <CheckCircle2 size={16} className="shrink-0 text-success" />
            {item.rating ? `You rated ${item.rating}/5` : 'Meetup done'}
          </span>
          {item.rating ? (
            <StarRating value={item.rating} readOnly />
          ) : (
            <Button variant="subtle" size="small" iconStart={<Star size={14} />} onClick={onRate} className="touch-hit">
              Rate now
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
