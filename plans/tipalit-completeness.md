# TIPalit — Completeness pass (Profile tab, states, overlays, demo panel)

## Goal
Bring the existing 5-screen TIPalit app up to the master prompt's "production-ready" bar: every loading, empty, error, toast, and overlay state is in the UI and reachable. Most are reached through the normal flow. The rest are reached from a **Demo states** panel on a new **Profile** tab.

## Decisions already made
- **Tokens:** Keep `src/styles/global.css` as the single source of truth. Changes there are additive only (new tokens plus their `@theme inline` mappings). No hardcoded colors, sizes, or fonts in components. Instrument Sans stays the only font.
- **Navigation:** A 4th **Profile** tab: Home / Sell / Chats / Profile.
- **Demo states:** Natural flows first. A Demo states panel (on Profile) forces the states that are hard to reach naturally.
- **Components:** Use `@figma/astraui` (`Modal`, `Button`, `IconButton`, `RadioGroup`, `TextareaField`, `SwitchField`, `Toast`, `Badge`, `Avatar`) and `lucide-react` icons. The kit has no bottom sheet, skeleton, spinner, or field-error API, so those are small local components built only from tokens.

## Repo facts this plan relies on
- Routing lives in `src/App.tsx` as an in-memory `Route` union with `TAB_FOR_ROUTE`. The toast is a single `string | null` that clears after 3s and always renders as `variant="default"`.
- `--color-modal-scrim: var(--modal-scrim)` is mapped in `@theme`, but `--modal-scrim` is **never defined**. This is a latent bug and gets fixed below.
- `InputField`, `SelectField`, and `TextareaField` have no `error` or `invalid` prop. `InputField` and `TextareaField` pass through HTML attrs (`aria-invalid`, `id`, `aria-describedby`). `SelectField` does not.
- `SEED_LISTINGS` has 15 items, enough for 3 pages of 6.
- Right now `AddListingScreen` disables "Post listing" until the form is valid. That will change to submit-then-highlight.
- `ChatThreadScreen.onPropose` currently creates a random meetup slot right away. It will open a picker sheet instead.

---

## 1. Token additions (`src/styles/global.css`)
Add to `:root` and the dark block, then map in `@theme inline`:
- `--modal-scrim` (light `#1c1b1a80`, dark `#00000099`). Fixes the missing variable. Used by the sheet and, if needed, the Modal.
- `--danger-soft` (light `#e5484d14`, dark `#e5484d26`) → `--color-danger-soft`. Background for invalid fields.
- `--success-soft` (light `#3cc77414`, dark `#3cc77426`) → `--color-success-soft`. Background for the "Meetup completed" state.
- `--shadow-raised: 0 4px 6px -1px #0000001a` → `--shadow-raised`. Gives the Tailwind utility `shadow-raised`. Used only on the sheet, modal, and toast (PRD "2.0" depth rule).
- `--touch-target: 44px` → `--spacing-touch: var(--touch-target)`. Gives `min-h-touch`, `min-w-touch`, and `size-touch`.
- `@keyframes tip-shimmer` (opacity pulse 1 → .55 → 1, 1.4s) and `@keyframes tip-sheet-in` (translateY 100% → 0, 200ms). Expose them as `--animate-shimmer` and `--animate-sheet-in` in `@theme`. Wrap both in `@media (prefers-reduced-motion: reduce)` so they turn off.

## 2. New shared components (`src/components/`)
- **`Spinner.tsx`**: lucide `Loader2` with `animate-spin`. Props: `size` (default 16). Has `aria-hidden`. Used in `Button iconStart`.
- **`Skeleton.tsx`**: `<div className="animate-shimmer bg-bg-hover rounded-corner-md" />` with a `className` passthrough. Plus preset exports:
  - `ProductCardSkeleton`: same frame as ProductCard (square image, 2 text lines, badge pill).
  - `ChatRowSkeleton`: avatar circle, 3 lines, thumbnail.
  - `ProfileSkeleton`: header card, stat row, 2 inventory rows.
  - Each skeleton region is wrapped in `role="status" aria-label="Loading…"`.
- **`EmptyState.tsx`**: pulls the repeated empty-state markup (icon circle + title + body + optional action) out of Feed and ChatList. Props: `icon`, `title`, `body`, `action?`. Flat 2.0 look: a tinted icon circle on `bg-accent-soft` with `text-on-accent`, behind a simple 2-shape flat illustration (two layered token-colored circles) so it reads as "graphic" without adding images.
- **`FormField.tsx`**: wrapper that shows field errors. Props: `error?: string`, `id`, `children`. When `error` is set:
  - The wrapper gets `bg-danger-soft rounded-corner-md p-sm -mx-sm` and `data-invalid`.
  - Below the child it renders `<p id={id+'-error'} role="alert" className="text-label-sm text-danger">` with an `AlertCircle` icon, matching the Auth error style.
  - For `InputField` and `TextareaField`, the caller also passes `aria-invalid` and `aria-describedby`.
- **`BottomSheet.tsx`**: custom, portal-free (renders inside PhoneShell, so it's clamped to `max-w-phone`).
  - Props: `isOpen`, `onClose`, `title`, `children`, `footer`.
  - Layout: a fixed `bg-modal-scrim` scrim, plus a panel `rounded-t-corner-lg bg-surface-bg shadow-raised animate-sheet-in` with a grab handle and `role="dialog" aria-modal aria-labelledby`.
  - Behavior: Esc and scrim click close it. It focuses the first focusable element on open and restores focus on close. It locks body scroll while open. The panel scrolls internally with `max-h-[85dvh]`.
- **`StarRating.tsx`**: 5 lucide `Star` buttons, each `size-touch`. Uses `role="radiogroup"` with one `role="radio"` per star and `aria-checked`. Arrow keys change the value. Filled stars are `fill-accent text-accent`; unfilled are `text-text-tertiary`. Under the stars, a label changes with the value ("Poor" … "Excellent").

## 3. Global toast upgrade (`App.tsx`, `PhoneShell.tsx`)
- State becomes `{ id: number; message: string; variant: 'default'|'success'|'error'|'warning' } | null`. Add a helper `notify(message, variant='default')`. The `id` increment restarts the 3s timer when two toasts in a row have the same text.
- Pass `variant` to `Toast`. Use `onDismiss` to clear early. Add `shadow-raised` around the toast.
- When the route is `thread`, the toast sits above the composer: PhoneShell takes a `toastOffset: 'tabs' | 'composer' | 'cta'` prop that maps to bottom classes. Default is `tabs`. Detail uses `cta` because of its sticky bottom button.
- Events:

| Trigger | Message | Variant |
|---|---|---|
| Listing posted | "Listing published!" | success |
| Publish failure (demo toggle) | "Couldn't publish. Check your connection and try again." | error |
| Message sent | "Message sent" | default |
| Meetup proposed | "Meetup proposal sent" | default |
| Meetup accepted (by seller or by me) | "Meetup accepted" | success |
| Meetup declined | "Meetup declined" | warning |
| Report submitted | "Report sent. Our team will review it within 24 hours." | success |
| Rating submitted | "Thanks for rating {seller first name}!" | success |
| Logged out | "Signed out" | default |
| Share tapped on detail | "Link copied" (copy `location.href` via `navigator.clipboard` if available) | default |

- "Message sent" only fires for the **first** message in each thread visit, so it doesn't spam during a normal conversation. Track the thread id in a ref and reset it when the user leaves the thread.

## 4. Navigation: 4-tab bar + Profile route
- `Tab = 'home'|'sell'|'chats'|'profile'`. Add `{ name: 'profile' }` to `Route`. `TAB_FOR_ROUTE.profile = 'profile'`. Widen `detail.from` to `Tab` (already typed that way). Back from a detail opened on Profile goes to `profile`.
- Redesign `BottomTabBar` for 4 items at 390px:
  - Each item is a vertical `Pressable` (icon over label), `flex-1 min-h-touch`.
  - Active item: the icon sits in a `bg-brand-primary text-on-brand rounded-corner-full px-lg py-xs` pill. The label is `text-text-primary font-semibold`. Set `aria-current="page"`.
  - Inactive items: `text-text-secondary`, hover `bg-bg-hover`.
  - Icons: `Home`, `PlusCircle`, `MessageCircle`, `User`.
  - Chats shows an unread dot (`bg-danger size-2 rounded-corner-full`) when any thread has a pending seller meetup ("Respond"). This reuses the `needsReply` logic, moved into a helper in `seed.ts`.
- `showTabs` includes `profile`.

## 5. Profile screen (`src/screens/ProfileScreen.tsx`)
Props: `user`, `myListings: Listing[]`, `threadCount`, `completedMeetups`, `loading`, `onOpenListing(id)`, `onSell()`, `onOpenDemo()`, `onLogout()`.
- `ScreenHeader` titled "Profile". Its trailing slot holds a `Settings` IconButton that opens the demo panel, as a second way in.
- **Identity card** (`bg-surface-bg rounded-corner-lg p-xl`):
  - Large `Avatar` initials, name, email, and a green "Verified TIP Student" row using the same shield styling as `SellerTrustCard`.
  - Member since "This term".
- **Stat row**: 3 equal tiles: Active listings, Chats, Meetups done.
- **My listings (inventory)**:
  - Rows show a thumbnail, title, price, course-code badge, and "Posted {postedAt}". Tapping a row opens the detail with `from: 'profile'`.
  - Empty state (this is what a new user sees, since the seed has no `me` listings): `EmptyState` with icon `PackageOpen`, title "You have no active listings", body "Turn last term's books and tools into cash for this one.", and a primary "List an item" action that goes to Sell.
- **Preferences**: `SwitchField` "Dark mode", wired to the kit's `useTheme()`. Confirm `ThemeContextValue` exposes a setter/toggle. If it doesn't, leave this row out (don't fake it).
- **Demo states** row: a `Pressable` list row with `FlaskConical` icon, label "Demo states", chevron. Opens the panel.
- **Sign out**: a neutral full-width Button with `LogOut` icon. Clears `user`, goes to `auth`, toast "Signed out". Listings and threads are left as they are.
- While `loading`, render `ProfileSkeleton` instead of the identity card, stats, and inventory.

## 6. Loading states
- A central `useSimulatedLoad(key, deps)` pattern in App. Simpler version: App holds `loaded: Set<'feed'|'chats'|'profile'>`.
  - On entering one of those routes, if the key isn't in `loaded` (or `demo.slowNetwork` is on), set `loading=true` and clear it after the delay. Normal delay is 900ms; slow-network delay is 2000ms. Then add the key to `loaded`.
  - Timers go through the existing `later()` and get cleared on unmount.
- **Feed:** while loading, show 6 `ProductCardSkeleton` in the grid and a skeleton for the "N items" count. Search and pills stay usable.
- **Chat list:** 4 `ChatRowSkeleton`.
- **Profile:** `ProfileSkeleton`.
- **Button spinners:**
  - Auth "Continue": 800ms pending. The button is disabled, shows `Spinner` with the label "Verifying…", and the input is read-only.
  - "Post listing": 900ms pending, label "Publishing…".
  - Report "Submit report" and Rate "Submit rating": 600ms each.
  - All pending buttons get `aria-busy`.

## 7. Empty states
- **Feed search/filter:**
  - With a query: title is `No items found for "{query}"`.
  - With only a pill filter: title is `No {category} listings yet`.
  - Body: "Try another subject code or category." Actions: "Clear filters" plus a secondary "Sell one instead" that goes to Sell.
- **Chat inbox:** `EmptyState` with `MessageCircle`, "No conversations yet", "Message a seller from any listing to arrange a campus meetup.", and a primary "Browse listings" action that goes to feed. Reached naturally only after the demo toggle, since the seed has threads.
- **Inventory:** see §5.

## 8. Feed infinite scroll cue
- `FeedScreen` keeps `visibleCount` (starts at 6). It resets to 6 when `query` or `category` changes.
- A sentinel `<div>` after the grid is watched by an `IntersectionObserver` (`rootMargin: '200px'`). When it's visible and `visibleCount < results.length` and not already loading more, set `loadingMore=true`. After 700ms, add 6 to `visibleCount`.
- While `loadingMore`, append 2 `ProductCardSkeleton` to the grid, plus a centered row with `Spinner` and "Loading more listings…" (`aria-live="polite"`).
- When everything is shown and there are more than 6 results: an end marker with a hairline, then "You're all caught up" and `CheckCircle2`. Hide it when results ≤ 6.
- The "N items" count still shows the total number of results.

## 9. Add Listing validation
- The button is always enabled (except while pending). On submit, compute errors:
  - title: "Add a title" (empty) or "Title must be at least 3 characters".
  - price: "Enter a price" (empty or 0) or "Max ₱999,999".
  - category: "Choose a category".
  - subject: "Choose a subject code".
- Wrap each field in `FormField`. After the first submit attempt (`submitted=true`), errors update live and clear as fields get fixed.
- Focus and `scrollIntoView({ block: 'center' })` the first invalid field. Selects are wrapped in a focusable div with an `id`, and focus goes to the wrapper.
- Above the button, show a summary: `role="alert"` danger text "Fix {n} field(s) to publish". This replaces the current grey helper text.
- Photo stays optional (category fallback image).
- Submit flow: pending spinner, then either:
  - Success: `addListing` with `notify('Listing published!','success')`.
  - Failure (`demo.failNextPublish`): stay on the form with all values kept, show an error toast, and turn the toggle off automatically so the retry works.

## 10. Overlays
### 10a. Report modal (`src/components/ReportModal.tsx`)
Uses the kit `Modal` (`size="small"`).
- Props: `isOpen`, `onClose`, `target: { kind: 'listing'|'user'; name: string }`, `onSubmit(reason, details)`.
- Title: "Report listing" or "Report {name}".
- Body:
  - Short safety line.
  - `RadioGroup` of reasons. Listing: "Scam or suspicious price", "Prohibited item", "Misleading photos or description", "Already sold", "Other". User: "Not a TIP student", "Harassment or inappropriate messages", "No-show at meetup", "Scam attempt", "Other".
  - `TextareaField` "Details (optional)", maxLength 300.
- Footer: subtle "Cancel" and primary "Submit report". Submit stays disabled until a reason is picked, then runs the spinner flow and toasts.
- Entry points:
  - Product Detail: a `Flag` IconButton next to Share (`aria-label="Report listing"`). Hidden on your own listing.
  - Chat thread header: a `Flag` IconButton (`aria-label="Report {seller}"`) in the header row.

### 10b. Rate transaction modal (`src/components/RateModal.tsx`)
Uses the kit `Modal`.
- Shows the seller avatar, name, and listing title, then `StarRating` (required) and `TextareaField` "Add a comment (optional)".
- Footer: "Skip" and "Submit rating". Submit stays disabled until rating ≥ 1.
- Data:
  - Extend the meetup `ChatItem` with `completed?: boolean; rating?: number`.
  - Once a meetup is `accepted`, `MeetupProposalCard` shows a "Mark as completed" neutral button (`CheckCircle2`). It sets `completed=true` and opens the RateModal for that item.
  - After rating, the card shows a `bg-success-soft` footer: "Completed · You rated 4/5" with the stars shown read-only.
  - Skip leaves it `completed` without a rating and shows a "Rate now" text button that reopens the modal.
- "Meetups done" on Profile = count of `completed` meetups.

### 10c. Meetup picker bottom sheet (`src/components/MeetupPickerSheet.tsx`)
Uses `BottomSheet`.
- Props: `isOpen`, `onClose`, `defaultLocation`, `onSubmit({ location, time })`.
- Sections:
  - **Location:** `MEETUP_SPOTS` as wrap-pill radios (`min-h-touch`, active uses `bg-brand-primary text-on-brand`). Defaults to the listing's `meetupSpot`.
  - **Day:** 3 pills, "Today", "Tomorrow", and the next weekday name. Computed from `new Date()` and skips Sunday.
  - **Time:** a 3-column grid of slots from 8:00 AM to 5:00 PM every hour. Slots that have already passed today are disabled. Nothing is preselected.
- Footer:
  - A summary line ("Tue · 2:00 PM · Library Plaza").
  - A primary "Send proposal" button, disabled until day and time are both picked.
- Time string format: `"{Today|Tomorrow|Weekday}, {h:mm A}"`, the same shape `MeetupProposalCard` already shows.
- Wiring:
  - The composer's calendar IconButton and the declined card's "Propose new" both open the sheet.
  - `proposeMeetup(threadId, { location, time })` replaces the random-slot logic.
  - The simulated seller still auto-accepts after 1.5s. **Exception:** if `demo.sellerDeclines` is on, the seller declines and replies "Can't make that one, can you pick another time?"
  - The `MEETUP_SLOTS` seed constant is no longer used by App. Delete it if nothing else uses it.

## 11. Demo states panel (`src/components/DemoStatesPanel.tsx`)
Kit `Modal` (`size="medium"`), titled "Demo states", with the subtitle "For reviewers: force states that are hard to reach in a normal session."
- App state: `demo = { slowNetwork, emptyInbox, emptyInventory, failNextPublish, sellerDeclines }`, all false at start.
- **Toggles** (`SwitchField` with descriptions):
  - Slow network: skeletons show on every visit, for 2s.
  - Empty inbox: the Chat list renders `[]` and the Chats dot is hidden. Threads are only hidden, not deleted.
  - Empty inventory: Profile's inventory renders `[]` even if you've posted.
  - Fail next publish.
  - Seller declines meetups.
- **Quick launchers** (neutral small Buttons). Each one closes the panel, then navigates or opens the overlay:
  - "Feed loading": clears `loaded`, then goes to feed.
  - "Empty search": goes to feed with an initial query of `"MATH 999"`. FeedScreen gets an optional `initialQuery` prop, applied through a `key` remount.
  - "Domain error": logs out to auth with an `initialEmail` of `juan.delacruz@gmail.com` and auto-submits, so the inline red error shows.
  - "Form validation": goes to Sell with `autoValidate` so errors show right away.
  - "Report modal": opens on the first seed listing.
  - "Rate modal": opens for the first accepted seed meetup. If none exists, it uses the first thread with a synthetic target and no data change.
  - "Meetup picker": opens the first thread with the sheet open.
- **Reset demo data**: a danger-styled subtle button. Restores the seed listings and threads, clears `loaded`, and turns every toggle off.
- Every "Demo states" mention in the UI uses the `FlaskConical` icon, so reviewers can tell it's a tooling surface.

## 12. Touch-target and a11y audit (44×44)
- Apply `min-h-touch` (and `min-w-touch` on icon-only controls) to:
  - All IconButtons: header back, share, report, settings, composer actions.
  - Category pills.
  - Tab items.
  - Meetup card buttons.
  - Sheet pills and slots.
  - Star buttons.
  - Image dropzone remove button.
  - ProductCard (already large).
- Kit `Button`/`IconButton` take `className`, so pass it there. If the kit's internal height ignores `min-h`, wrap the control in a `size-touch flex items-center justify-center` hit-area span instead of changing its visuals.
- Modals and sheet: focus moves in on open and back on close. Escape closes. Only the topmost overlay is interactive.

## 13. File change summary
- **Edit:**
  - `src/styles/global.css`
  - `src/App.tsx`: routes, toast, loading, demo, overlays state, rate/report targets.
  - `src/components/BottomTabBar.tsx`
  - `src/components/PhoneShell.tsx`: toast offset.
  - `src/components/CategoryPills.tsx`: touch.
  - `src/components/MeetupProposalCard.tsx`: completed/rating UI.
  - `src/components/ImageDropzone.tsx`: touch.
  - `src/data/seed.ts`: `completed`/`rating` fields, one seed thread with an accepted meetup, `threadNeedsReply` helper.
  - `src/screens/AuthScreen.tsx`: pending spinner, `initialEmail`/`autoSubmit`.
  - `src/screens/FeedScreen.tsx`: skeletons, pagination, empty copy, `initialQuery`.
  - `src/screens/ChatListScreen.tsx`: skeleton, EmptyState.
  - `src/screens/ChatThreadScreen.tsx`: report button, sheet trigger, rate trigger.
  - `src/screens/ProductDetailScreen.tsx`: report, share toast.
  - `src/screens/AddListingScreen.tsx`: validation, pending, failure.
- **Add:**
  - `src/screens/ProfileScreen.tsx`
  - `src/components/{Spinner,Skeleton,EmptyState,FormField,BottomSheet,StarRating,ReportModal,RateModal,MeetupPickerSheet,DemoStatesPanel}.tsx`
- All new components are default exports. Strings with apostrophes use double quotes.

## 14. Verification
1. `pnpm build` (tsc + vite) passes.
2. A manual walkthrough in the preview at 390px:
   - Auth: gmail address → inline red error; valid email → spinner → feed skeletons → grid.
   - Scrolling the feed loads pages 2 and 3 with skeletons and the spinner, then "You're all caught up". Searching "MATH 999" shows the empty state with the quoted query.
   - Sell: submitting empty highlights 4 fields and focuses Title. Valid submit → "Publishing…" → success toast → listing at the top of the feed. With the fail toggle on → error toast and values kept.
   - Detail: report modal → submit → toast.
   - Thread: picker sheet → proposal → auto-accept toast → "Mark as completed" → rate modal → completed footer. With the decline toggle on → declined → "Propose new" reopens the sheet.
   - Profile: skeleton on first visit; empty inventory for a new user; the posted listing appears after posting; stats update; sign out works.
   - Demo panel: each toggle and launcher reaches its state; Reset restores the seed.
   - Dark mode (if wired): all new surfaces read correctly.
3. Grep check: no hex, `rgb(`, or px literals in `src/components`/`src/screens` (except `size={n}` icon props). No `font-family` outside `global.css`.

## Out of scope
Real backend or persistence, push notifications, editing or deleting your own listings, mark-as-sold, multi-photo upload, routing URLs.
