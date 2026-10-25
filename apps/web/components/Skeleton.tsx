type SkeletonProps = { className?: string }

export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-shimmer rounded-corner-md bg-bg-hover ${className}`} />
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col overflow-hidden rounded-corner-lg bg-surface-bg">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-col gap-sm p-lg">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-xs">
          <Skeleton className="h-5 w-16 rounded-corner-full" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  )
}

export function ChatRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-lg border-b border-border-secondary p-lg last:border-b-0">
      <Skeleton className="size-10 shrink-0 rounded-corner-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-sm">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="size-12 shrink-0" />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading your listings" className="flex flex-col gap-xl">
      <div className="grid grid-cols-3 gap-md">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-20 rounded-corner-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-md rounded-corner-lg bg-surface-bg p-xl">
        <Skeleton className="h-4 w-28" />
        {[0, 1].map((key) => (
          <div key={key} className="flex items-center gap-lg">
            <Skeleton className="size-14 shrink-0" />
            <div className="flex flex-1 flex-col gap-sm">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
