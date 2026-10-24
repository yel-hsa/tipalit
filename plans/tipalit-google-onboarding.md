# TIPalit: Google sign-in, first-run onboarding, UX fixes, and docs

## Goal

- Replace the TIP email form with **Continue with Google**. It sits on a swappable service layer, and a mock adapter enforces the `@tip.edu.ph` domain.
- Add a **full first-run flow**: intro → Google → profile setup (name, campus, program, year) → safety pledge → feed. Returning users skip straight to the feed.
- Make **campus** (TIP Manila / TIP Quezon City) a first-class scope for the feed, listings, and meetup spots.
- Apply the **UI/UX critique fixes** below and fill the essential product gaps.
- Hide all demo tooling behind a **reviewer mode flag**.
- Write a **`README.md`** covering the product, architecture, how to plug in a real backend, reviewer mode, and the critique log.

Out of scope: a real Google OAuth or backend integration (only the interface and a documented adapter contract), push notifications, and multi-campus chats.

## Constraints (unchanged)

- Styling comes only from `src/styles/global.css` tokens and the Astra kit (`@figma/astraui`). Components contain no hex values, pixel literals, or font families. Any new token goes into `global.css`.
- Icons come from `lucide-react`. The one exception is the Google "G" mark: Google's branding rules require it, so it ships as a static asset `src/assets/google-g.svg`, rendered with `<img>`. Its brand colors live in the SVG file, not in components. This exception is documented in the README.
- Default exports for components. Use double quotes for any string that contains an apostrophe.
- Invoke `make/use-design-system` before UI work. Invoke `make/unsplash` when picking the intro-slide photos.

## 1. Service layer + mock adapter

New folder `src/services/`:

- `types.ts`: domain types and service interfaces. Move the domain types out of `data/seed.ts` (`Listing`, `Thread`, `ChatItem`, `Seller`, …) and add `CampusId`, `Session`, `Profile`, `ListingStatus`.
  - `CampusId = 'manila' | 'qc'`. Labels: "TIP Manila", "TIP Quezon City".
  - `Session = { userId; email; name; initials; issuedAt }`
  - `Profile = { userId; name; campus; program; year; joinedAt; safetyAcceptedAt?; onboardedAt? }`
  - `Listing` gains `campus: CampusId` and `status: 'active' | 'sold'`.
  - `AuthResult = { ok: true; session } | { ok: false; reason: 'cancelled' | 'domain' | 'network'; email?: string }`
- Interfaces (all async, all returning Promises):
  - `AuthService`: `getSession()`, `signInWithGoogle()`, `signOut()`
  - `ProfileService`: `get(userId)`, `save(profile)`
  - `ListingService`: `list({ campus })` (active only), `listMine(userId)`, `create(draft, ctx)`, `update(id, patch)`, `setStatus(id, status)`, `remove(id)`
  - `ChatService`: `listThreads()`, `openThread(listingId)`, `sendMessage`, `proposeMeetup`, `respondToMeetup`, `completeMeetup`, `rate`, and `subscribe(listener) => unsubscribe` for incoming events (`typing`, `message`, `meetupUpdated`). This mirrors a realtime backend.
  - `PrefsService`: `get()`, `set()` for `{ theme, introSeen }`
- `index.ts` exports a single `services` object. It picks the adapter from `import.meta.env.VITE_DATA_ADAPTER` (only `'mock'` exists; unknown values fall back to mock with a console warning).
- `mock/`:
  - `storage.ts`: a versioned `localStorage` wrapper (`tipalit.v1.*` keys) with JSON parse guards. Corrupt data resets to seed.
  - `latency.ts`: `delay()` using 600 ms normally, or 2000 ms when the reviewer `slowNetwork` control is on.
  - `controls.ts`: a mutable `mockControls` object (`slowNetwork`, `failNextLoad`, `failNextPublish`, `sellerDeclines`, `googleFailure: 'none' | 'network' | 'cancel'`). One-shot flags auto-clear after they fire.
  - `auth.ts`: `signInWithGoogle()` calls a registered `pickAccount()` bridge (`mock/googleAccountPicker.ts`, a tiny promise/event bridge that the React chooser resolves).
    - It returns `cancelled` if the chooser is dismissed and `network` if `googleFailure` is set.
    - It returns `domain` if the email isn't `@tip.edu.ph` (case-insensitive, mirroring a server-side `hd` claim check). No session is created in that case.
    - On success it persists the session.
  - `listings.ts` and `chat.ts`: seeded from `data/seed.ts` and persisted. The simulated seller typing, replies, and meetup accept/decline move out of `App.tsx` into `chat.ts` and are emitted through `subscribe`.
- `data/seed.ts` keeps only seed content and constants. Changes:
  - Every listing and seller gets a campus; split the 15 listings about evenly.
  - `MEETUP_SPOTS` becomes `Record<CampusId, string[]>`. QC keeps the current five spots. Manila gets "Library Lobby", "Main Gate Security Post", "Canteen Entrance", "Student Lounge". These are placeholders, and the README flags them for confirmation with Student Affairs.
  - Add `PROGRAMS` (BS Civil, Computer, Electrical, Mechanical, Chemical, and Industrial Engineering; BS CS; BS IT; BS Accountancy; BS Business Administration; BS Architecture) and `YEAR_LEVELS` (1st–5th year).

`App.tsx` remains the state orchestrator but reads and writes only through `services`.
- Load data on entry to each tab, keeping the existing skeleton behavior.
- Mutations are optimistic with rollback and an error toast on failure. Publishing is the exception: it stays pessimistic, matching the current behavior where the form stays filled on failure.

## 2. Reviewer mode

`src/config/reviewer.ts`: `useReviewerMode()` returns `[enabled, setEnabled]`.
- It is enabled when `VITE_REVIEWER_MODE === 'true'`, or when the URL has `?reviewer=1`, which also persists in `sessionStorage`. `?reviewer=0` clears it.
- It also toggles when the user taps the app version line ("TIPalit v0.1.0") at the bottom of Profile 7 times, with a toast saying "Reviewer mode on" or "off". This makes it reachable inside the Figma preview, where URL params aren't practical.

When reviewer mode is **off**:
- The Profile header gear and the "Demo states" row are gone, and `DemoStatesPanel` isn't mounted.
- The Google chooser shows only one preset TIP account plus "Use another account".

When it's **on**, the panel includes:
- **Toggles**: slow network, fail next load, fail next publish, seller declines, empty inbox, empty inventory, and a Google failure segmented control (none / network / cancel).
- **Launchers**: the existing ones; "Domain error" now opens Auth showing the domain-rejected state for `juan.delacruz@gmail.com`; plus new "Replay intro" and "Replay onboarding" (clears `onboardedAt` and keeps the session).
- **Reset**: "Reset demo data" clears all `tipalit.v1.*` storage and reseeds.
- **Chooser**: the Google chooser also lists a preset personal Gmail account.

The Profile entry is a labelled row: a FlaskConical icon and the label "Reviewer tools", not a gear.

## 3. Routing and boot

Extend `Route` with `boot`, `intro`, `auth`, `onboarding` (`step: 'profile' | 'safety'`), and `editListing` (`listingId`).

On boot, show `BootScreen` (Wordmark + Spinner) while `getSession()`, `profile.get()`, and `prefs.get()` resolve. Then route as follows:
1. No session: go to `intro` if `!introSeen`, otherwise `auth`.
2. Session, but the profile is missing name/campus/program/year: go to `onboarding/profile`.
3. Profile complete, but there's no `safetyAcceptedAt`: go to `onboarding/safety`.
4. Otherwise: go to `feed`.

Other routing rules:
- `prefs.theme` is applied with `setTheme` during boot, and the Profile dark-mode switch persists it.
- The tab bar is hidden on boot, intro, auth, and onboarding.
- Signing out (now behind a confirm Modal) clears the session but keeps the profile, so the next login skips onboarding.

## 4. Screens

**IntroScreen** (new, `screens/IntroScreen.tsx`)
- Three slides:
  1. "Verified TIP students only"
  2. "Meet at campus-approved spots"
  3. "Chat, schedule, and rate meetups"
- Each slide has one Unsplash photo in a rounded tile with a token background fallback, plus a heading and one line of body text.
- Controls: Skip (top-right), dot indicators, and Next. On the last slide, Next becomes "Get started".
- Pointer swipe is supported. Slide transitions are disabled under `prefers-reduced-motion`.
- The slide region uses `aria-roledescription="carousel"`, and each slide has a "Slide n of 3" label.
- Skip and Get started both set `introSeen` and go to `auth`.

**AuthScreen** (rewrite)
- Wordmark, headline, and a short trust line. The cramped 3-column value grid is removed because the intro now carries that message.
- One full-width neutral `Button` with the Google "G" and the label "Continue with Google". A helper line underneath: "Use your @tip.edu.ph Google account."
- States:
  - **pending**: "Signing in…" with a spinner.
  - **domain**: an inline alert: "{email} isn't a TIP account. Sign in with your @tip.edu.ph Google account." plus a "Try another account" action.
  - **network**: "Couldn't reach Google. Check your connection and try again."
  - **cancelled**: silent, back to idle.
- Footer: "By continuing you agree to TIPalit's community rules", which opens the safety rules sheet (read-only).

**GoogleAccountChooser** (new mock UI, `components/GoogleAccountChooser.tsx`)
- A `BottomSheet` titled "Choose an account", with the subtitle "to continue to TIPalit".
- Rows: Avatar + name + email for each preset, then "Use another account", which expands inline name + email `InputField`s and a Continue button (basic email-format validation).
- Closing the sheet resolves the bridge with `null` (cancelled).
- A small footnote reads "Demo sign-in · no Google data is used", so the mock is never mistaken for real Google.

**OnboardingScreen** (new, `screens/OnboardingScreen.tsx`) with a shared `components/ProfileFields.tsx`
- The header shows "Step 1 of 2" / "Step 2 of 2" with a token-styled progress bar, and focus moves to the step heading when the step changes.
- **Step 1, "Set up your profile"**:
  - Fields: name `InputField` (prefilled from Google), campus `RadioGroup` (Manila / QC), program `SelectField`, and year `SelectField`. All are required, with inline errors on Continue.
  - Back signs out (after confirmation) and returns to auth.
  - Continue saves a partial profile, so a refresh resumes here or at Step 2.
- **Step 2, "Campus safety pledge"**:
  - Four rules: meet only at approved spots on your campus during school hours; inspect before you pay; never share passwords or OTPs; report suspicious users.
  - A required `Checkbox` reading "I agree to follow these rules". The primary button stays enabled; tapping it without the box checked shows an inline error.
  - "Finish" saves `safetyAcceptedAt` and `onboardedAt`, goes to the feed, and shows the toast "Welcome to TIPalit, {first name}!"
  - Back returns to Step 1 with the values kept.

**FeedScreen**
- Only listings from `profile.campus` with status active are shown.
- The header shows a campus Badge (for example "TIP Quezon City") under the greeting.
- The empty-search copy mentions the campus.
- New **load error** state: an EmptyState with "Couldn't load listings" and a Retry button (triggered by `failNextLoad`). The same pattern applies to Chats and Profile.

**ProductDetailScreen**
- Shows the listing's campus in the meetup block.
- **Own listing**: the disabled "This is your listing" button is replaced by "Edit" (neutral) and "Mark as sold" (primary). A sold listing shows a "Sold" badge and "Mark as available" instead. A Trash IconButton in the header opens a delete confirm Modal; after deleting, the user returns to the previous tab with the toast "Listing deleted".
- **Other's listing**: if it has gone sold while open (stale), show a "Sold" badge and a disabled CTA reading "No longer available".
- **Share**: uses `navigator.share` when available, with the title, price, and "on TIPalit". Otherwise it copies that text summary, with the toast "Listing details copied". It no longer copies the app-root URL.

**AddListingScreen**
- Supports `mode: 'create' | 'edit'` and an `initial` draft. Edit mode uses the title "Edit listing" and the CTA "Save changes", and returns to the detail screen.
- The meetup spot options come from the user's campus. The campus is stamped on create.

**MeetupPickerSheet**
- Offers the spots of the listing's campus.

**ChatThreadScreen**
- If the listing is sold, an info banner reads "This item has been marked sold". Messaging still works.

**ProfileScreen**
- The identity card shows name, email, program · year, a campus badge, and "Member since {Month YYYY}" from `joinedAt`, replacing the placeholder "this term".
- "Edit profile" opens a `BottomSheet` with the same `ProfileFields`. Changing campus opens a confirm Modal: "Your feed will switch to {campus}. Existing listings stay on their original campus."
- My listings uses a `SegmentedControl` (Active / Sold), and each row shows a campus badge when it differs from the current campus.
- The Reviewer tools row appears only in reviewer mode.
- Sign out goes through a confirm Modal. The version line sits at the bottom (the reviewer toggle target).

## 5. UI/UX critique: fixes to apply (also logged in the README)

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | The gear icon on Profile opens demo states, not settings | High | Remove it; use a labelled "Reviewer tools" row, shown in reviewer mode only |
| 2 | Own-listing detail ends at a disabled button; no edit, sold, or delete | High | Add Edit, Mark as sold/available, and Delete with confirm |
| 3 | Refreshing loses the session, listings, chats, and theme | High | Persist through the mock adapter and prefs |
| 4 | No error state when data fails to load | High | Error EmptyState with Retry on Feed, Chats, and Profile |
| 5 | Share copies the app root URL, which is misleading | Medium | Web Share API, with a text-summary fallback |
| 6 | Profile identity uses placeholders ("Member since this term"; no program, year, or campus) | Medium | Data from onboarding; Edit profile sheet |
| 7 | Auth overclaims ("No outsiders, no scams") and has a cramped 3-column value grid at 12 px | Medium | Honest copy; value points moved to the intro carousel |
| 8 | Sign out is instant, with no confirmation | Low | Confirm Modal |
| 9 | `text-video-title` (a video-kit token name) is used as the app caption style | Low | Add a semantic `--text-caption-sm` utility in `global.css` (same values) and replace all uses |
| 10 | Toast offsets use raw Tailwind spacing (`bottom-24`/`bottom-20`) | Low | Add `--toast-offset-tabs/-composer/-cta` tokens in `global.css`, used by PhoneShell |
| 11 | Meetup spots ignore the campus | Medium | Campus-specific spot lists |

## 6. Documentation: `README.md` (repo root)

Sections:
1. Product overview
2. Screen map and user flows (first run, returning user, buy → chat → meetup → rate, sell → edit → mark sold)
3. Architecture: folder tree, the services layer, the adapter selection env var, and storage keys
4. Connecting a real backend: the adapter contract per interface, Google OAuth requirements (`hd=tip.edu.ph` hint plus a **server-side** domain check on the ID token, since the client check is only UX), and realtime chat via `subscribe`
5. Design system: the token file, the no-hardcoding rule, the Google mark exception, and how to restyle
6. Reviewer mode: how to enable it, each toggle and launcher
7. Accessibility notes
8. The UX critique log (the table above, with status)
9. Known limitations and open questions (Manila meetup spot names to confirm, real auth not implemented)
10. Scripts

## 7. Edge cases

- A non-TIP Google account never gets a session.
- Signing in again with the domain-rejected account shows the error again, and "Try another account" reopens the chooser.
- If the chooser is closed mid-sign-in, the button returns to idle with no toast.
- Refreshing mid-onboarding resumes at the correct step with saved values.
- A corrupt or old-version storage blob resets to seed without crashing.
- Switching campus re-runs the feed load (skeleton) and resets the search and category filters.
- If a listing is deleted while a thread references it, the thread still renders using the existing `listing` undefined path, with the text "Listing removed".
- Optimistic chat send failure: the bubble is removed and a toast reads "Message not sent". The mock fails only via the reviewer `failNextLoad`, which is scoped to loads, so sends don't fail in practice. The rollback path is still implemented.
- Pending mock seller replies are cancelled on sign-out and reset (the adapter clears its timers).

## 8. Implementation order

1. Types and services: `types.ts`, mock adapter, storage, controls, and the seed campus split.
2. `reviewer.ts`; rework `DemoStatesPanel`.
3. Boot routing in `App.tsx`; migrate App to `services`.
4. IntroScreen, AuthScreen, GoogleAccountChooser, `google-g.svg`.
5. OnboardingScreen and ProfileFields.
6. Campus scoping (Feed, AddListing, MeetupPicker, Detail).
7. Own-listing management and edit mode; the Profile segmented list, edit sheet, and confirmations.
8. Token additions (caption-sm, toast offsets); replace uses.
9. README.md.

## 9. Verification

- `pnpm exec tsc --noEmit -p tsconfig.json` and `pnpm build` must both pass.
- `rg -n "#[0-9a-fA-F]{3,8}\b|[0-9]+px|font-family" src --glob '!src/styles/global.css' --glob '!*.svg'` must return nothing in components.
- `rg -n "text-video-title|bottom-24|bottom-20" src` must return nothing.
- Manual pass in the preview:
  - First run: intro → chooser → domain rejection with a Gmail account (reviewer mode) → TIP account → Step 1 validation → Step 2 pledge error → feed welcome.
  - Refresh: still signed in on the feed. Sign out and back in: onboarding is skipped.
  - Switch campus: the feed changes and the meetup spots change.
  - Own listing: edit, then mark as sold (gone from the feed, shown under Sold), then delete.
  - Reviewer mode via 7 taps; each toggle and launcher works. With reviewer mode off, no demo UI is visible anywhere.
  - Dark mode persists across refresh.
