import { Avatar, Badge, Button, Tabs, useTheme } from '@figma/astraui'
import { ChevronRight, FlaskConical, LogOut, Moon, PackageOpen, Pencil, PlusCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import EditProfileSheet from '../components/EditProfileSheet'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import Pressable from '../components/Pressable'
import type { ProfileDraft } from '../components/ProfileFields'
import ScreenHeader from '../components/ScreenHeader'
import { ProfileSkeleton } from '../components/Skeleton'
import SwitchRow from '../components/SwitchRow'
import { campusLabel, formatMonthYear, priceLabel, timeAgo } from '../data/seed'
import type { CompleteProfile } from '../services/profile'
import type { Listing, Promotion, Theme } from '../services/types'

export const APP_VERSION = '0.1.0'
const REVIEWER_TAPS = 7
const TAP_WINDOW_MS = 1500

type ProfileScreenProps = {
  profile: CompleteProfile
  email: string
  initials: string
  myListings: Listing[]
  threadCount: number
  completedMeetups: number
  /** Active sponsor perks for this campus; empty hides the section. */
  promotions: Promotion[]
  loading: boolean
  error: boolean
  reviewerMode: boolean
  /** Staff accounts show an admin badge instead of the student verification. */
  isAdmin?: boolean
  onRetry: () => void
  onOpenListing: (listingId: string) => void
  onOpenPromotion: (promotion: Promotion) => void
  onSell: () => void
  onSaveProfile: (draft: ProfileDraft) => Promise<boolean>
  onThemeChange: (theme: Theme) => void
  onOpenReviewerTools: () => void
  onToggleReviewerMode: () => void
  onSignOut: () => Promise<void>
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-xs rounded-corner-lg bg-surface-bg px-md py-lg text-center">
      <span className="text-title text-text-primary">{value}</span>
      <span className="text-caption-sm text-text-secondary">{label}</span>
    </div>
  )
}

function ListingRows({
  listings,
  currentCampus,
  onOpen,
}: {
  listings: Listing[]
  currentCampus: CompleteProfile['campus']
  onOpen: (id: string) => void
}) {
  return (
    <ul className="overflow-hidden rounded-corner-lg bg-surface-bg">
      {listings.map((listing) => (
        <li key={listing.id} className="border-b border-border-secondary last:border-b-0">
          <Pressable
            onPress={() => onOpen(listing.id)}
            aria-label={`${listing.title}, ${priceLabel(listing)}${
              listing.status === 'sold' ? ', sold' : listing.status === 'reserved' ? ', reserved' : ''
            }`}
            className="flex items-center gap-lg p-lg hover:bg-surface-hover"
          >
            <img
              src={listing.imageUrl}
              alt=""
              className={`size-14 shrink-0 rounded-corner-md object-cover ${listing.status === 'sold' ? 'opacity-60 grayscale' : ''}`}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <p className="truncate text-label-sm text-text-primary">{listing.title}</p>
              <p className="text-label-sm font-semibold text-text-primary">{priceLabel(listing)}</p>
              <div className="flex flex-wrap items-center gap-sm">
                <Badge variant="default" label={listing.courseCode} />
                {listing.status === 'reserved' && <Badge variant="warning" label="Reserved" />}
                {listing.status === 'sold' && <Badge variant="danger" label="Sold" />}
                {listing.campus !== currentCampus && <Badge variant="secondary" label={campusLabel(listing.campus)} />}
                <span className="text-caption-sm text-text-tertiary">{timeAgo(listing.createdAt)}</span>
              </div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-text-secondary" />
          </Pressable>
        </li>
      ))}
    </ul>
  )
}

export default function ProfileScreen({
  profile,
  email,
  initials,
  myListings,
  threadCount,
  completedMeetups,
  promotions,
  loading,
  error,
  reviewerMode,
  isAdmin = false,
  onRetry,
  onOpenListing,
  onOpenPromotion,
  onSell,
  onSaveProfile,
  onThemeChange,
  onOpenReviewerTools,
  onToggleReviewerMode,
  onSignOut,
}: ProfileScreenProps) {
  const { theme, setTheme } = useTheme()
  const [editing, setEditing] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const taps = useRef({ count: 0, at: 0 })

  const active = myListings.filter((listing) => listing.status === 'active')
  const sold = myListings.filter((listing) => listing.status === 'sold')

  // Hidden reviewer switch: seven quick taps on the version line.
  const tapVersion = () => {
    const now = Date.now()
    taps.current.count = now - taps.current.at < TAP_WINDOW_MS ? taps.current.count + 1 : 1
    taps.current.at = now
    if (taps.current.count >= REVIEWER_TAPS) {
      taps.current.count = 0
      onToggleReviewerMode()
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Profile" />

      <div className="flex flex-col gap-xl px-xl pb-xl">
        <section aria-label="Account" className="flex flex-col items-center gap-lg rounded-corner-lg bg-surface-bg p-xl text-center">
          <div className="relative">
            <Avatar type="initial" initials={initials} size="large" className="size-16 text-heading" />
            <span className="absolute -bottom-xs -right-xs flex size-6 items-center justify-center rounded-corner-full border-2 border-surface-bg bg-success text-on-reverse">
              <ShieldCheck size={12} aria-hidden="true" />
            </span>
          </div>
          <div className="flex flex-col items-center gap-xs">
            <p className="text-heading text-text-primary">{profile.name}</p>
            <p className="text-label-sm text-text-secondary">{email}</p>
            <p className="text-label-sm text-text-secondary">
              {profile.program} &middot; {profile.year}
            </p>
            <div className="mt-xs">
              <Badge variant="brand" label={campusLabel(profile.campus)} />
            </div>
          </div>
          <div className="flex w-full items-center gap-md rounded-corner-md bg-bg-faint p-md text-left">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-corner-full bg-success text-on-reverse">
              <ShieldCheck size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-text-primary">{isAdmin ? 'TIPalit admin' : 'Verified TIP Student'}</p>
              <p className="text-caption-sm text-text-secondary">Member since {formatMonthYear(profile.joinedAt)}</p>
            </div>
            <Badge variant={isAdmin ? 'secondary' : 'success'} label={isAdmin ? 'Admin' : 'Verified'} />
          </div>
          <Button variant="neutral" size="small" iconStart={<Pencil size={14} />} onClick={() => setEditing(true)} className="touch-hit">
            Edit profile
          </Button>
        </section>

        {loading ? (
          <ProfileSkeleton />
        ) : error ? (
          <LoadError what="your listings" onRetry={onRetry} />
        ) : (
          <>
            <section aria-label="Activity" className="grid grid-cols-3 gap-md">
              <Stat value={active.length} label="Active listings" />
              <Stat value={threadCount} label="Chats" />
              <Stat value={completedMeetups} label="Meetups done" />
            </section>

            <section aria-labelledby="inventory-title" className="flex flex-col gap-md">
              <div className="flex items-center justify-between">
                <p id="inventory-title" role="heading" aria-level={2} className="text-label font-semibold text-text-primary">
                  My listings
                </p>
                {myListings.length > 0 && (
                  <Button variant="subtle" size="small" iconStart={<PlusCircle size={14} />} onClick={onSell} className="touch-hit">
                    New
                  </Button>
                )}
              </div>
              {myListings.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="You have no listings yet"
                  body="Turn last term's books and tools into cash for this one."
                  action={
                    <Button variant="primary" size="small" iconStart={<PlusCircle size={14} />} onClick={onSell} className="touch-hit">
                      List an item
                    </Button>
                  }
                />
              ) : (
                <Tabs
                  tabs={[
                    {
                      id: 'active',
                      label: `Active (${active.length})`,
                      content:
                        active.length > 0 ? (
                          <ListingRows listings={active} currentCampus={profile.campus} onOpen={onOpenListing} />
                        ) : (
                          <p className="rounded-corner-lg bg-surface-bg p-xl text-center text-label-sm text-text-secondary">
                            Nothing for sale right now.
                          </p>
                        ),
                    },
                    {
                      id: 'sold',
                      label: `Sold (${sold.length})`,
                      content:
                        sold.length > 0 ? (
                          <ListingRows listings={sold} currentCampus={profile.campus} onOpen={onOpenListing} />
                        ) : (
                          <p className="rounded-corner-lg bg-surface-bg p-xl text-center text-label-sm text-text-secondary">
                            Items you mark as sold show up here.
                          </p>
                        ),
                    },
                  ]}
                />
              )}
            </section>
          </>
        )}

        {promotions.length > 0 && (
          <section aria-labelledby="perks-title" className="flex flex-col gap-md">
            <p id="perks-title" role="heading" aria-level={2} className="text-label font-semibold text-text-primary">
              Student perks
            </p>
            <ul className="overflow-hidden rounded-corner-lg bg-surface-bg">
              {promotions.map((promotion) => (
                <li key={promotion.id} className="border-b border-border-secondary last:border-b-0">
                  <Pressable
                    onPress={() => onOpenPromotion(promotion)}
                    aria-label={`${promotion.type === 'perk' ? 'Perk' : 'Sponsor offer'}: ${promotion.title} by ${promotion.sponsorName}`}
                    className="flex items-center gap-lg p-lg hover:bg-surface-hover"
                  >
                    {promotion.imageUrl ? (
                      <img src={promotion.imageUrl} alt="" className="size-12 shrink-0 rounded-corner-md object-cover" />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-corner-md bg-accent-soft text-text-primary">
                        <Sparkles size={20} aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-sm text-text-primary">{promotion.title}</p>
                      <p className="truncate text-caption-sm text-text-secondary">{promotion.sponsorName}</p>
                    </div>
                    <Badge variant={promotion.type === 'perk' ? 'brand' : 'secondary'} label={promotion.type === 'perk' ? 'Perk' : 'Sponsor'} />
                    <ChevronRight size={16} className="shrink-0 text-text-secondary" />
                  </Pressable>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Preferences" className="rounded-corner-lg bg-surface-bg p-lg">
          <SwitchRow
            icon={<Moon size={20} />}
            label="Dark mode"
            description="Easier on the eyes for late-night review sessions."
            checked={theme === 'dark'}
            onChange={(on) => {
              const next = on ? 'dark' : 'light'
              setTheme(next)
              onThemeChange(next)
            }}
          />
        </section>

        {reviewerMode && (
          <section aria-label="Reviewer" className="overflow-hidden rounded-corner-lg bg-surface-bg">
            <Pressable onPress={onOpenReviewerTools} className="flex min-h-touch items-center gap-lg p-lg hover:bg-surface-hover">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-corner-full bg-accent-soft text-text-primary">
                <FlaskConical size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-label text-text-primary">Reviewer tools</p>
                <p className="text-caption-sm text-text-secondary">Force loading, empty, and error states</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-text-secondary" />
            </Pressable>
          </section>
        )}

        <Button variant="neutral" iconStart={<LogOut size={16} />} onClick={() => setConfirmSignOut(true)} className="w-full touch-hit">
          Sign out
        </Button>

        <Pressable
          onPress={tapVersion}
          aria-label={`TIPalit version ${APP_VERSION}`}
          className="self-center rounded-corner-md px-md py-xs text-caption-sm text-text-tertiary"
        >
          TIPalit v{APP_VERSION}
        </Pressable>
      </div>

      {editing && (
        <EditProfileSheet
          isOpen
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={async (draft) => {
            const saved = await onSaveProfile(draft)
            if (saved) setEditing(false)
            return saved
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmSignOut}
        title="Sign out of TIPalit?"
        body="Your profile and listings stay saved. Sign back in with the same Google account to pick up where you left off."
        confirmLabel="Sign out"
        confirmIcon={<LogOut size={16} />}
        pending={signingOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={async () => {
          setSigningOut(true)
          await onSignOut()
        }}
      />
    </div>
  )
}
