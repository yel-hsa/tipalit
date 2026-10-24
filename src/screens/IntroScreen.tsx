import { Button } from '@figma/astraui'
import { ArrowRight, CalendarCheck, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import Wordmark from '../components/Wordmark'
import { photo } from '../data/seed'

type Slide = { title: string; body: string; image: string; alt: string; icon: LucideIcon; chip: string }

const SLIDES: Slide[] = [
  {
    title: 'Verified TIP students only',
    body: 'Everyone signs in with a @tip.edu.ph Google account, so you know who you are dealing with.',
    image: photo('1774092137646-3f237fa563a3', 800, 1000),
    alt: 'Three smiling students holding up their ID badges',
    icon: ShieldCheck,
    chip: '@tip.edu.ph verified',
  },
  {
    title: 'Meet at campus-approved spots',
    body: 'Hand-offs happen inside your campus, at spots chosen with safety in mind.',
    image: photo('1743611978899-516e7bad4ec9', 800, 1000),
    alt: 'Students walking along a tree-lined campus pathway',
    icon: MapPin,
    chip: 'Library Plaza',
  },
  {
    title: 'Chat, schedule, and rate meetups',
    body: 'Agree on a time in chat, meet up, then rate each other to keep the community honest.',
    image: photo('1714746643422-13a50361aa66', 800, 1000),
    alt: 'Two people shaking hands over a book on a table',
    icon: CalendarCheck,
    chip: 'Meetup accepted',
  },
]

const SWIPE_THRESHOLD = 48

type IntroScreenProps = { onDone: () => void }

export default function IntroScreen({ onDone }: IntroScreenProps) {
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)
  const regionId = useId()
  const last = index === SLIDES.length - 1

  const go = (next: number) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)))

  const onPointerDown = (event: PointerEvent) => {
    startX.current = event.clientX
  }
  const onPointerUp = (event: PointerEvent) => {
    if (startX.current === null) return
    const delta = event.clientX - startX.current
    startX.current = null
    if (delta <= -SWIPE_THRESHOLD) go(index + 1)
    else if (delta >= SWIPE_THRESHOLD) go(index - 1)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(index + 1)
    if (event.key === 'ArrowLeft') go(index - 1)
  }

  return (
    <div className="flex flex-1 flex-col gap-xl px-xl pb-2xl pt-xl">
      <div className="flex items-center justify-between">
        <Wordmark />
        <Button variant="subtle" size="small" onClick={onDone} className="touch-hit">
          Skip
        </Button>
      </div>

      <section
        id={regionId}
        aria-roledescription="carousel"
        aria-label="About TIPalit. Use the arrow keys to change slides."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startX.current = null
        }}
        className="flex flex-1 touch-pan-y select-none flex-col overflow-hidden rounded-corner-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <div
          className="flex flex-1 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, slideIndex) => {
            const Icon = slide.icon
            const active = slideIndex === index
            return (
              <div
                key={slide.title}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${slideIndex + 1} of ${SLIDES.length}`}
                aria-hidden={!active}
                className="flex w-full shrink-0 flex-col gap-xl"
              >
                <div className="relative aspect-intro w-full overflow-hidden rounded-corner-lg bg-accent-soft">
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    draggable={false}
                    loading={slideIndex === 0 ? 'eager' : 'lazy'}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-lg left-lg flex items-center gap-sm rounded-corner-full bg-surface-bg py-sm pl-sm pr-lg shadow-raised">
                    <span className="flex size-8 items-center justify-center rounded-corner-full bg-accent text-on-accent">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="text-label-sm text-text-primary">{slide.chip}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-sm">
                  <p role="heading" aria-level={1} className="text-title text-text-primary">
                    {slide.title}
                  </p>
                  <p className="text-label-sm text-text-secondary">{slide.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-xl">
        <div className="flex items-center gap-sm" aria-hidden="true">
          {SLIDES.map((slide, slideIndex) => (
            <span
              key={slide.title}
              className={`h-sm rounded-corner-full transition-all motion-reduce:transition-none ${
                slideIndex === index ? 'w-2xl bg-brand-primary' : 'w-sm bg-border-primary'
              }`}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Slide {index + 1} of {SLIDES.length}
        </p>
        <Button
          variant="primary"
          aria-controls={regionId}
          iconEnd={<ArrowRight size={16} />}
          onClick={() => (last ? onDone() : go(index + 1))}
          className="touch-hit"
        >
          {last ? 'Get started' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
