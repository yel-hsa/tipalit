# TIPalit — Mobile Marketplace Frontend (Astra Kit)

## Goal
Build a clickable, mobile-first prototype of TIPalit, a campus-only marketplace for TIP students, with all 5 PRD screens connected: Auth, Feed, Product Detail, Add Listing, and Chat (plus a conversation list for the Chats tab). All styling comes from Astra kit components and tokens, so a brand change later (logo color) only needs edits to the kit/tokens, not to the screens.

## Confirmed decisions
- **Design system:** `@figma/astraui` components plus Astra token classes only. No hex values, no custom shadows, no gradients. Font is Instrument Sans, the kit's only family.
- **Navigation:** bottom tab bar with **Home / Sell / Chats**. The tab bar is hidden on Auth, Product Detail, and an open chat thread.
- **Viewport:** a centered column sized like a phone (390px wide, full height). On wider screens the column sits on a neutral backdrop.
- **Images:** real Unsplash photos for product listings, sourced by invoking the `make/unsplash` skill during implementation. Sellers use initials avatars (no stock faces).
- **Data:** interactive state held in memory (resets on reload). New listings show up in the feed, messages send, and Accept/Decline updates the meetup card.
- **Logo:** a placeholder wordmark in one `Wordmark` component, so the real logo can be swapped in later by changing one file.
- **Brand color:** Astra `brand-primary` stands in for "Primary Color" until the logo arrives.

## Defaults I chose (change in review if needed)
1. **Auth:** one email field plus the "Continue with @tip.edu.ph Email" button. Only addresses ending in `@tip.edu.ph` are accepted; anything else shows an inline error in the field description. Login is mocked, and the display name comes from the part of the email before the @.
2. **Chats tab:** shows a conversation list (2 seeded threads). "Message Seller" on a product opens that listing's thread, or creates it if it doesn't exist.
3. **Simulated seller replies:** each message you send gets a scripted seller reply after about 1.2s, cycling through 3 short replies.
4. **Chat bubbles:** these use the kit's `ChatBubbles` (`user` for you, `ai` for the seller) with the kit's own colors, even where they differ from the PRD's "primary for user". This follows the kit-only rule.
5. **Dark mode:** `ThemeProvider` follows the system setting, and there is no toggle in the UI.

## Setup changes
- `package.json`: add `"lucide-react": "^0.487.0"` to `dependencies` (it's in the pnpm store but not resolvable from the top level yet). Run `pnpm install` once if the import fails to resolve.
- `src/index.css`, in this order:
  1. `@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;450;500;600&display=swap');` (the kit's CSS names Instrument Sans but ships no `@font-face`).
  2. `@import 'tailwindcss';`
  3. `@import '@figma/astraui/styles.css';`
  4. An `@theme inline` bridge that only points at the kit's CSS variables, so the app's own Tailwind can generate token utilities. This adds no new values:
     - Colors: `--color-brand-{primary,hover,dark,secondary,tertiary,muted}`, `--color-surface-{bg,secondary-bg,hover,dark}`, `--color-text-{primary,secondary,tertiary}`, `--color-border-{primary,secondary,selected}`, `--color-bg-{faint,subtle,hover}`, `--color-on-{brand,reverse}`, `--color-{success,warning,danger}`, `--color-input-bg`, each set to `var(--<name>)`.
     - Spacing: `--spacing-{xs,sm,md,lg,xl,2xl}: var(--space-*)`.
     - Radius: `--radius-corner-{sm,md,lg,full}: var(--corner-*)`.
     - Fonts: `--font-sans` / `--font-display`: `'Instrument Sans', system-ui, sans-serif`.
     - Typography classes (`text-title`, `text-heading`, `text-label`, `text-label-sm`, `text-input`, `text-video-title`) already come precompiled from the kit's CSS and are used as-is.
  5. Base: `body { @apply bg-surface-hover text-text-primary font-sans; }`
- `src/main.tsx` stays the same. `App.tsx` wraps everything in `ThemeProvider`.

## File structure
```
src/
  App.tsx                 ThemeProvider, PhoneShell, app state, screen switching
  data/seed.ts            types, seed listings, sellers, categories, subjects, meetup spots, seed threads
  components/
    PhoneShell.tsx        centered 390px column, renders the tab bar when visible
    BottomTabBar.tsx      Home / Sell / Chats
    Wordmark.tsx          placeholder logo (single swap point)
    ScreenHeader.tsx      back IconButton + title + optional trailing slot
    CategoryPills.tsx     horizontal scroll row of pill Buttons
    ProductCard.tsx
    SellerTrustCard.tsx
    MeetupLocationBlock.tsx
    MeetupProposalCard.tsx
    PillToggle.tsx        segmented pill toggle for text options (Condition)
    ImageDropzone.tsx
  screens/
    AuthScreen.tsx
    FeedScreen.tsx
    ProductDetailScreen.tsx
    AddListingScreen.tsx
    ChatListScreen.tsx
    ChatThreadScreen.tsx
```
All components are default exports. Strings with apostrophes use double quotes.

## Data model (`src/data/seed.ts`)
```ts
type Condition = 'Like New' | 'Good' | 'Used'
type Seller = { id: string; name: string; initials: string; program: string; year: string; verified: true }
type Listing = {
  id: string; title: string; price: number; courseCode: string;
  category: 'Textbooks' | 'Calculators' | 'Uniforms' | 'Lab Gear' | 'Drafting Tools';
  department: 'Engineering' | 'CBA' | 'CS/IT' | 'Architecture';
  condition: Condition; description: string; imageUrl: string;
  sellerId: string; meetupSpot: string; postedAt: string; // e.g. "2h ago"
}
type MeetupStatus = 'pending' | 'accepted' | 'declined'
type ChatItem =
  | { id: string; kind: 'message'; from: 'me' | 'seller'; text: string }
  | { id: string; kind: 'meetup'; from: 'me' | 'seller'; time: string; location: string; status: MeetupStatus }
type Thread = { id: string; listingId: string; sellerId: string; items: ChatItem[] }
```
- About 10 seed listings (for example: Engineering Mechanics textbook `CIV 101`, Casio fx-991ES Plus `MATH 010`, TIP uniform set, lab gown + goggles `CHEM 001`, drafting set `ARCH 101`, Calculus textbook `MATH 020`, Accounting textbook `ACC 101` (CBA), Physics lab manual `PHYS 001`, a Data Structures book `CS 201`, a T-square plus triangles). Prices run from ₱150 to ₱2,500.
- `CATEGORIES = ['All','Textbooks','Calculators','Uniforms','Lab Gear','Drafting Tools','CBA Dept','Engineering Dept']`. A pill ending in "Dept" filters by `department`; other pills filter by `category`.
- `SUBJECT_CODES` holds about 12 codes for the Add Listing select.
- `MEETUP_SPOTS = ['Library Plaza','Main Lobby','Cafeteria Entrance','Engineering Building Steps','Gate 2 Security Post']`.
- 2 seed threads: one with a pending meetup card proposed by the seller, and one with plain messages only.
- Prices are shown with `₱` and `toLocaleString('en-PH')`.

## App state and navigation (`App.tsx`)
```ts
type Route =
  | { name: 'auth' } | { name: 'feed' } | { name: 'detail'; listingId: string }
  | { name: 'sell' } | { name: 'chats' } | { name: 'thread'; threadId: string }
```
- State: `user: { email; name } | null`, `route`, `listings`, `threads`, `toast: { message; variant } | null`.
- Handlers passed down as props: `login`, `navigate`, `addListing` (prepends the listing, goes to feed, shows a success toast), `openThreadForListing` (find or create the thread, then go to thread), `sendMessage(threadId, text)` (appends the message and schedules the scripted reply with `setTimeout`; timers are cleared on unmount), `proposeMeetup(threadId)`, `respondToMeetup(threadId, itemId, 'accepted' | 'declined')`.
- The tab bar shows on `feed`, `sell`, and `chats`. Active tab: feed and detail map to Home, sell to Sell, chats and thread to Chats.
- Each route change resets the scroll position of the column to the top.
- The kit `Toast` sits fixed above the tab bar and dismisses itself after 3s.

## Screens

### Layout shell
- Outer: `min-h-dvh bg-surface-hover flex justify-center`.
- Column: `relative w-full max-w-[390px] min-h-dvh bg-brand-tertiary flex flex-col`, plus `border-x border-border-secondary` on wider screens. The 390px width is the only arbitrary value, and it is a layout size, not a style token.
- Scrollable content gets bottom padding so it isn't hidden behind the tab bar or sticky CTA.
- `BottomTabBar`: `sticky bottom-0 bg-surface-bg border-t border-border-secondary`, 3 equal buttons, each a lucide icon (`Home`, `PlusCircle`, `MessageCircle`) over a `text-video-title` label. Active: `text-brand-primary`. Inactive: `text-text-secondary`. Each has an `aria-label` and `aria-current="page"` when active.

### 1. Auth
- Centered vertical stack on `bg-surface-bg`: `Wordmark` (large), a one-line tagline (`text-heading`), and campus-only safety subtext (`text-label-sm text-text-secondary`) with a `ShieldCheck` icon ("Only verified TIP students can buy, sell, and chat.").
- `InputField` labeled "TIP email" with placeholder `juan.delacruz@tip.edu.ph` and a `Mail` prefix icon. The description shows the validation error when there is one.
- `Button variant="primary"` full-width: "Continue with @tip.edu.ph Email". It validates with `/^[^\s@]+@tip\.edu\.ph$/i`. On success it logs in and navigates to the feed.
- Footer microcopy: "By continuing you agree to meet only at campus-approved spots."

### 2. Feed (Home)
- Sticky header (`bg-brand-tertiary`): row with `Wordmark` (small) and an initials `Avatar` for the user; below it, `SearchComponent` with placeholder "Search MATH 010, Calculators...".
- `CategoryPills`: `overflow-x-auto` row of `Button size="small"`, `variant={active ? 'primary' : 'neutral'}`, with the scrollbar hidden.
- Results line: `text-label-sm text-text-secondary` showing "{n} items near campus".
- Grid: `grid grid-cols-2 gap-lg px-xl`.
- Filtering: matches `title`, `courseCode`, `category`, and `description` against the trimmed search text (case-insensitive), combined with the active pill.
- Empty state: a `SearchX` icon, "No items match", and a neutral "Clear filters" button that resets both search and pill.
- `ProductCard`: a `<button>`, `bg-surface-bg rounded-corner-lg overflow-hidden text-left`, no shadow. Contents: 1:1 `img` (`aspect-square object-cover`, `loading="lazy"`, alt = title); then a `p-lg` body with price (`text-label font-semibold`), title (`text-label-sm line-clamp-2`), and `Badge variant="brand" label={courseCode}`. Clicking it opens the detail screen.

### 3. Product Detail
- Hero: a 1:1 image with floating `IconButton variant="neutral"` back (`ArrowLeft`) and share (`Share2`) buttons on top. Share is visual only.
- Content card (`bg-surface-bg rounded-corner-lg p-xl`, sections spaced `gap-xl`):
  - Title (`text-title`), price (`text-heading font-semibold`), a badge row: condition `Badge` (Like New → `success`, Good → `secondary`, Used → `default`), course code `Badge variant="brand"`, and category `Badge variant="default"`, plus "Posted {postedAt}" in `text-video-title text-text-secondary`.
  - Description under a "Description" label.
- `SellerTrustCard`: horizontal `bg-surface-bg rounded-corner-lg p-lg`. Contents: `Avatar type="initial" size="medium"`, name (`text-label`), program and year (`text-label-sm text-text-secondary`), and on the right a prominent verified mark: `ShieldCheck` in a `bg-success rounded-corner-full` circle with `text-on-reverse`, next to `Badge variant="success" label="Verified Student"`.
- `MeetupLocationBlock`: a "Preferred meetup" label plus a simple flat 2D map drawn in a fixed-height block (`h-32`) with `bg-brand-secondary rounded-corner-md`. A few `bg-surface-bg` path strips (absolutely positioned, `h-sm` / `w-sm`) suggest walkways, and a centered `MapPin` in `text-brand-primary` sits over a `bg-surface-bg rounded-corner-full` disc. Underneath: spot name (`text-label`) and "Inside TIP campus" (`text-label-sm text-text-secondary`).
- Sticky bottom CTA: `sticky bottom-0 bg-surface-bg border-t border-border-secondary p-lg`, full-width `Button variant="primary" iconStart={<MessageCircle/>}` "Message Seller", which calls `openThreadForListing`.

### 4. Add Listing (Sell)
- `ScreenHeader` titled "New listing" (no back button, since it's a tab), single column, form fields spaced `gap-lg` inside `bg-surface-bg rounded-corner-lg p-xl`.
- `ImageDropzone`: a `<label>` wrapping a hidden `<input type="file" accept="image/*">`, styled `border-2 border-dashed border-border-primary rounded-corner-lg bg-bg-faint`, with `ImagePlus` icon, "Add a photo", and "JPG or PNG, square works best". It supports drag and drop. Once an image is chosen it shows a 1:1 preview via `URL.createObjectURL` with an `IconButton` (`X`) to remove it, and the object URL is revoked when replaced or removed.
- `InputField` Title; `InputField` Price with prefix `₱` and `inputMode="numeric"` (only digits are kept); `SelectField` Category (the category list without the "All"/Dept pills); `SelectField` Subject code; `SelectField` Meetup spot; `TextareaField` Description (`rows={4}`).
- `PillToggle` for Condition (Like New / Good / Used): a `role="radiogroup"` container with `bg-input-bg rounded-corner-full p-xs`. The selected option is `bg-surface-bg text-text-primary rounded-corner-full`; the others are `text-text-secondary`. Arrow-key navigation is supported. Default: Good.
- Sticky bottom `Button variant="primary"` "Post listing", disabled until title, a price above 0, category, and subject are filled. If there's no photo, a seed photo for the chosen category is used.
- On submit: the listing is created with seller = the current user (verified), `postedAt: 'Just now'`. The form resets, the app navigates to the feed with the new item first, and a toast "Listing posted" (success) appears.

### 5a. Chats list
- `ScreenHeader` "Chats". Rows are `<button>`s on `bg-surface-bg`, separated by `border-b border-border-secondary`. Each row: seller `Avatar`, name plus a small listing thumbnail, listing title (`text-label-sm text-text-secondary`, truncated), and a preview of the last item ("Meetup proposed" for meetup cards).
- Empty state: `MessageCircle` icon with "No conversations yet. Message a seller from any listing."

### 5b. Chat thread
- Header: back `IconButton`, seller `Avatar`, name, and a small `ShieldCheck` verified icon. Under it, a listing summary strip (thumbnail, title, price) that opens the product detail.
- Timeline (`flex flex-col gap-md p-xl`, scrolls itself to the bottom when new items arrive): `ChatBubbles type={from==='me' ? 'user' : 'ai'}`, with your initials `Avatar size="small"` for your messages.
- `MeetupProposalCard` (inline, `bg-surface-bg rounded-corner-lg p-lg border border-border-secondary`): a "Meetup proposal" label with `CalendarClock`, the time (for example "Thu, 2:30 PM"), and the location with `MapPin`.
  - Pending and proposed by the seller: a `ButtonGroup` with `Button primary` "Accept" and `Button neutral` "Decline / Reschedule".
  - Pending and proposed by you: `Badge variant="warning" label="Awaiting response"`.
  - Accepted: `Badge variant="success" label="Accepted"` with a check, and the buttons are removed.
  - Declined: `Badge variant="danger" label="Declined"` plus a `Button subtle` "Propose new time" that calls `proposeMeetup`.
  - Responding also adds a short message from you ("See you there!" or "Can we pick another time?").
- Composer (sticky bottom, `bg-surface-bg border-t`): `IconButton variant="subtle"` (`CalendarPlus`) to propose a meetup, then `InputField` "Message…", then `IconButton variant="primary"` (`Send`), disabled when the field is empty. Enter sends.
- `proposeMeetup` adds a card from you with the next default slot (rotating through preset times) at the listing's meetup spot. About 1.5s later the simulated seller accepts it, so the full flow is visible.

## Imagery
- During implementation, invoke `make/unsplash` and search for each seed item (engineering textbook, scientific calculator, school uniform, lab goggles/coat, drafting tools, accounting book, physics lab, programming book, T-square). Store the image URLs with width/crop params (`w=600`, square crop) in `seed.ts`, plus one fallback image per category for listings posted without a photo.
- Every image has meaningful `alt` text and `object-cover`.

## Accessibility and quality
- Every icon-only button has an `aria-label`. Pills and tabs expose their selected state (`aria-pressed` / `aria-current`). The PillToggle uses `role="radio"` with `aria-checked`.
- Visible focus uses the kit components' built-in focus styles. Custom buttons use `focus-visible:outline-2 focus-visible:outline-brand-primary` with offset (the token-based focus rule).
- Tap targets are at least 40px. Text is never placed over images without a `bg-surface-bg` chip behind it.

## Verification
1. After the `package.json` change, confirm `lucide-react` resolves (`ls node_modules/lucide-react`). Run `pnpm install` if it doesn't.
2. Run `pnpm exec tsc --noEmit` (tsconfig present) and `pnpm build` once at the end, since this is a broad multi-file change. Fix any errors.
3. Check `figma logs` only if the preview shows a concrete failure.
4. Manual walkthrough in the preview:
   - A bad email shows the error; `@tip.edu.ph` logs in.
   - Search "MATH" narrows results; the "CBA Dept" pill filters; the empty state's "Clear filters" resets.
   - A card opens the detail screen; back returns to the feed; "Message Seller" opens the thread.
   - Sending a message makes a seller reply appear; Accept and Decline update the card; "Propose new time" adds a card that gets auto-accepted.
   - Posting a listing with and without a photo puts it first in the feed with a toast; the Post button stays disabled until required fields are filled.
   - The tab bar shows and hides on the right screens; the layout holds at 390px and stays centered on desktop.
   - Light and dark system themes both read correctly using tokens only.

## Out of scope
Real auth, a backend or persistence, image upload to a server, push notifications, routing with URLs, and the final logo/brand palette (pending your assets).
