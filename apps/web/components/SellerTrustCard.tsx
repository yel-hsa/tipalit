import { Avatar, Badge } from '@figma/astraui'
import { ShieldCheck, Star } from 'lucide-react'
import type { Seller } from '@tipalit/services/types'

export default function SellerTrustCard({ seller }: { seller: Seller }) {
  return (
    <section aria-label="Seller" className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
      <div className="flex items-center gap-lg">
        <Avatar type="initial" initials={seller.initials} size="large" />
        <div className="min-w-0 flex-1">
          <p className="text-label text-text-primary truncate">{seller.name}</p>
          <p className="text-label-sm text-text-secondary truncate">
            {seller.program}
            {seller.year && ` \u00b7 ${seller.year}`}
          </p>
          {seller.rating ? (
            <p
              className="mt-xs flex items-center gap-xs text-label-sm text-text-primary"
              aria-label={`Rated ${seller.rating} out of 5 from ${seller.reviews ?? 0} reviews`}
            >
              <Star size={12} className="fill-accent text-accent" aria-hidden="true" />
              {seller.rating.toFixed(1)}
              <span className="text-caption-sm text-text-secondary">
                ({seller.reviews ?? 0} review{(seller.reviews ?? 0) === 1 ? '' : 's'})
              </span>
            </p>
          ) : (
            <p className="mt-xs flex items-center gap-xs text-caption-sm text-text-secondary">
              <Star size={12} aria-hidden="true" />
              No reviews yet
            </p>
          )}
        </div>
        <Badge variant="success" label="Verified" />
      </div>
      <div className="flex items-center gap-md rounded-corner-md bg-bg-faint p-md">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-corner-full bg-success text-on-reverse">
          <ShieldCheck size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-label-sm text-text-primary">Verified TIP Student</p>
          <p className="text-caption-sm text-text-secondary">Signed in with a @tip.edu.ph Google account</p>
        </div>
      </div>
    </section>
  )
}
