import { MapPin } from 'lucide-react'

export default function MeetupLocationBlock({ spot, campusLabel }: { spot: string; campusLabel: string }) {
  return (
    <section aria-label="Preferred meetup" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
      <p className="text-label font-semibold text-text-primary">Preferred meetup</p>

      {/* Flat campus map illustration */}
      <div aria-hidden="true" className="relative h-32 overflow-hidden rounded-corner-md bg-brand-tertiary">
        <span className="absolute left-md top-md h-8 w-16 rounded-corner-sm bg-bg-hover" />
        <span className="absolute right-md top-md h-10 w-12 rounded-corner-sm bg-bg-hover" />
        <span className="absolute bottom-md left-md h-6 w-12 rounded-corner-sm bg-bg-hover" />
        <span className="absolute bottom-md right-md h-8 w-20 rounded-corner-sm bg-bg-hover" />
        <span className="absolute inset-x-0 top-1/2 h-sm -translate-y-1/2 bg-surface-bg" />
        <span className="absolute inset-y-0 left-1/3 w-sm bg-surface-bg" />
        <span className="absolute inset-y-0 right-1/4 w-sm bg-surface-bg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-10 items-center justify-center rounded-corner-full border-2 border-surface-bg bg-accent text-on-accent">
            <MapPin size={20} />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-md">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-corner-full bg-accent-soft text-text-primary">
          <MapPin size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-label text-text-primary">{spot}</p>
          <p className="text-label-sm text-text-secondary">Inside {campusLabel} &middot; campus-approved spot</p>
        </div>
      </div>
    </section>
  )
}
