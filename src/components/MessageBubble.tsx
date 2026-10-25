import { Avatar } from '@figma/astraui'

type MessageBubbleProps = {
  text: string
  fromMe: boolean
  initials: string
}

// kit ChatBubbles marks the non-user side with an AI sparkle, mislabelling human sellers
export default function MessageBubble({ text, fromMe, initials }: MessageBubbleProps) {
  return (
    <div className={`flex max-w-4/5 items-end gap-sm ${fromMe ? 'flex-row-reverse self-end' : 'self-start'}`}>
      <Avatar type="initial" initials={initials} size="small" className="shrink-0" />
      <p
        className={`rounded-corner-lg px-lg py-md text-label-sm whitespace-pre-wrap ${
          fromMe
            ? 'rounded-br-corner-sm bg-brand-primary text-on-brand'
            : 'rounded-bl-corner-sm border border-border-secondary bg-surface-bg text-text-primary'
        }`}
      >
        {text}
      </p>
    </div>
  )
}
