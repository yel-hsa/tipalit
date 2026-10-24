# TIPalit

A mobile-first campus marketplace for students of the Technological Institute of the Philippines (TIP). Students buy and sell textbooks, calculators, uniforms, lab gear, and drafting tools with other verified students, then meet at campus-approved spots to hand items over.

TIPalit ships with two swappable adapters behind the same service layer:

- **Firebase adapter** (production): Google sign-in, Cloud Firestore, Cloud Storage for listings photos, and Cloud Functions for rating aggregates and report auto-flagging. Selected automatically when the Firebase env vars are set, or forced with `VITE_DATA_ADAPTER=firebase`.
- **Mock adapter** (demo): everything saves to `localStorage`, so sessions, listings, chats, and the theme are still there after a refresh. Forced with `VITE_DATA_ADAPTER=mock`.

See section 5 for backend setup and env vars.

## 1. Product overview

- **Verified members only.** Sign-in uses Google and accepts only `@tip.edu.ph` accounts.
- **Campus scoping.** Each member picks TIP Manila or TIP Quezon City. The feed, new listings, and meetup spots follow that campus.
- **Safe hand-offs.** Meetups are proposed in chat at approved spots, accepted or declined, marked done, and rated.
- **Moderation.** Office of Student Affairs staff sign in with an admin role and get an Admin tab. There they review member reports, remove listings, suspend or reinstate members, edit each campus's meetup spots, see a log of every admin action, and watch marketplace totals (members, active listings, exchanges, average rating, open reports).
- **Monetization.** Sponsor banners on the feed and a Student perks list on Profile, driven by a `promotions` collection (campus-filtered); clicks are tracked for sponsor reporting.

## 2. Screens and flows

| Screen | File |
|---|---|
| Boot (session restore) | `src/screens/BootScreen.tsx` |
| Intro carousel (3 slides) | `src/screens/IntroScreen.tsx` |
| Sign in with Google | `src/screens/AuthScreen.tsx` |
| Onboarding: profile and safety pledge | `src/screens/OnboardingScreen.tsx` |
| Feed (Home tab) | `src/screens/FeedScreen.tsx` |
| Product detail | `src/screens/ProductDetailScreen.tsx` |
| Add / edit listing (Sell tab) | `src/screens/AddListingScreen.tsx` |
| Chat list (Chats tab) | `src/screens/ChatListScreen.tsx` |
| Chat thread | `src/screens/ChatThreadScreen.tsx` |
| Profile (Profile tab) | `src/screens/ProfileScreen.tsx` |
| Admin console (Admin tab, admins only) | `src/screens/AdminScreen.tsx`, `src/components/admin/*` |

**First run:** intro → Continue with Google → account chooser → profile setup (name, campus, program, year) → safety pledge → feed, with a welcome toast.

**Returning user:** boot restores the session and goes straight to the feed. A refresh during onboarding resumes at the step you were on.

**Buy:** feed → detail → Message Seller → chat → propose a meetup (spot + time) → seller accepts or declines → Mark done → rate (1–5 stars + comment). The rating writes a review record and updates the seller's public star score on their card and in chat.

**Sell:** Sell tab → post → own listing detail → Edit / Mark as sold / Mark as available / Delete (with confirmation).

**Report:** listing detail or chat header → Report → reason + details → saved through `ReportService` → appears in the admin queue.

**Moderate (admin):** sign in as `osa.admin@tip.edu.ph` → lands on Admin → Reports → open a report → View listing / View member → choose Remove listing, Suspend member, or Dismiss report (with an optional note) → the report closes, and so do other open reports the same decision settles → the action is written to the Log.

Routing is an in-memory `Route` union in `src/App.tsx`. The tab bar shows only on Feed, Sell, Chats, Profile, and (for admins) Admin.

## 3. Architecture

```
src/
  App.tsx               Routing, app state, optimistic mutations, overlays
  config/reviewer.ts    Reviewer-mode flag (useReviewerMode)
  data/seed.ts          Seed content and display constants (campuses, spots, programs)
  services/
    types.ts            Domain types and service interfaces (the adapter contract)
    index.ts            Picks the adapter (VITE_DATA_ADAPTER, or auto-detect)
    profile.ts          Profile helpers (completeness, initials)
    errors.ts           ServiceError with a code: network | storage | not_found | unauthenticated
    ids.ts              Client-generated ids for optimistic items
    mock/               localStorage-backed adapter with simulated latency and seller activity
    firebase/           Google Auth, Firestore, Cloud Storage, feature modules
  screens/              One file per screen
  components/           Shared UI built from the Astra kit and tokens
  styles/global.css     Design tokens (the only place values live)
```

Screens and `App.tsx` import only from `services` (`services/types` for types). Nothing in the UI touches storage or Firestore directly.

**Adapter selection:** `VITE_DATA_ADAPTER` (`firebase` or `mock`) wins. Otherwise the app uses Firebase when `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are both set, and falls back to mock. Unknown values log a warning and fall back to the mock adapter.

**Storage keys** (mock adapter): `tipalit.v2.session`, `tipalit.v2.prefs`, `tipalit.v2.profiles`, `tipalit.v2.listings`, `tipalit.v2.threads.<userId>`, `tipalit.v2.reviews`, `tipalit.v2.reports`, `tipalit.v2.accounts` (suspensions), `tipalit.v2.audit`, `tipalit.v2.spots`, `tipalit.v2.promotions`, `tipalit.v2.promotionClicks`, `tipalit.v2.analyticsEvents`. Each record is shape-checked on read, and corrupt data is reseeded. Bumping `VERSION` in `mock/storage.ts` deletes records from older versions at startup.

**Firestore collections** (Firebase adapter): `users_profile` (profile + server-maintained `average_rating` / `total_reviews` / `report_count` / `status`), `listings`, `chats` (+ per-thread `messages`, meetups live on listing items), `reviews`, `reports`, `meetup_spots`, `promotions`, `promotion_clicks`, `analytics_events`, `audit_log`. Security rules in `firestore.rules`, composite indexes in `firestore.indexes.json`; both deploy with the Firebase CLI (section 5).

**Server-side logic** (`functions/src/index.ts`):
- `onReviewWritten` recalculates `average_rating` and `total_reviews` on the seller's profile inside a transaction — client writes to those fields are forbidden by the rules.
- `onReportCreated` increments the subject member's `report_count` and auto-hides their listings once the count reaches the threshold.
- `resolveReport` is a callable that admins use to settle a report; it also closes sibling reports the same decision covers and writes a `audit_log` entry.

**Mutations:** chat sends, meetup responses, ratings, mark-as-sold, and deletes are optimistic. If the call fails they roll back and show an error toast. Publishing and saving a listing wait for the server, so the form keeps its values if the call fails.

## 4. Production backend (Firebase)

The Firebase adapter is implemented and selected automatically once the env vars exist. `.env` holds the live web SDK config (never commit it) and is loaded by Vite at dev time and at build time.

| Env var | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web SDK key (auto-selects the Firebase adapter) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firestore / Functions project |
| `VITE_FIREBASE_STORAGE_BUCKET` | Listing photos |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender id |
| `VITE_FIREBASE_APP_ID` | Web app id |
| `VITE_DATA_ADAPTER` | Force `firebase` or `mock` (overrides auto-detect) |
| `VITE_REVIEWER_MODE` | Ship demo tooling (normally leave unset; `?reviewer=1` also works) |

Interfaces that changed with the PRD (services/types.ts is the contract): `ChatService.listReviews(userId)` powers seller reputation; `PromotionService.list(campus)` + `trackClick(id)` power sponsor banners; `AnalyticsService.getOverview()` powers the admin Marketplace panel and `track(name, params)` the funnel events (`listing_view`, `chat_started`, `message_sent`, `promo_click`).

Everything needed on the Firebase side — Auth providers and authorized domains, rules, indexes, Functions, seeding — is in **section 5**.

## 5. Deploying the Firebase backend

Prereqs: Node 22 + pnpm (see `.mise.toml`), a Firebase project with Blaze (Cloud Functions), and the CLI: `npm i -g firebase-tools` then `npx firebase login`.

1. **Auth.** Console → Authentication → enable the **Google** provider. Add every preview domain (e.g. `localhost`, `<project>.web.app`, the Figma preview domain) to **Authorized domains** — sign-in fails with `auth/configuration-not-found` until this is done. Restrict the Google provider to `@tip.edu.ph` if you want console-side enforcement; the app also checks the domain.
2. **Firestore.** Console → Firestore Database → create it in production mode. Deploy rules and indexes:
   ```sh
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
3. **Storage.** Console → Storage → create the default bucket, then:
   ```sh
   npx firebase deploy --only storage
   ```
4. **Functions.** The three triggers/callables above build from `functions/`:
   ```sh
   npx firebase deploy --only functions
   ```
5. **Seed.** Sign in once as each email in `ADMIN_EMAILS` (`data/seed.ts` — currently `osa.admin@tip.edu.ph`) so their profile and admin role exist; the app grants the role from that list at sign-in. Edit the first-run meetup spots, then let an admin save them once from the Admin → Spots tab to write `meetup_spots`. Promotions: add documents to the `promotions` collection (`type` `banner` | `perk`, `title`, `sponsorName`, `destinationUrl`, `campus` `manila` | `qc` | `all`, optional `imageUrl` and `description`; set `active: false` to pause one) — the feed banner, Profile perks, and click tracking pick them up with no code change. Until the collection has documents, both adapters fall back to the seeded sponsors in `data/seed.ts`.
6. **Frontend.** Build and host:
   ```sh
   corepack pnpm build
   npx firebase deploy --only hosting   # after enabling Hosting, or use any static host on dist/
   ```

Local development without touching the live project: `VITE_DATA_ADAPTER=mock corepack pnpm dev`, or the Firebase emulator suite (`npx firebase emulators:start`; `firebase.json` already wires Functions, Firestore, and Storage ports).

## 6. Design system

- **Components:** `@figma/astraui` (Button, IconButton, InputField, SelectField, TextareaField, RadioGroup, Checkbox, Tabs, Modal, Toast, Badge, Avatar). Icons come from `lucide-react`.
- **Local extension:** `components/SwitchRow.tsx` replaces the kit's `SwitchField`. The kit version has a fixed 360 px width that overflows the cards, is uncontrolled, and has no switch role or accessible name. `SwitchRow` uses the same anatomy, but it fills its container, is controlled, has `role="switch"`, and the whole row is the tap target.
- **Dark-mode controls:** the kit draws neutral and subtle button labels, icons, outlines, and focus rings with `--brand-primary`, which is tuned as a fill under white text and disappears on dark surfaces. Under `.dark`, `global.css` points those parts at `--control-fg` and `--control-border`. Buttons that float over photos use `OVERLAY_CONTROL` (`components/overlayControl.ts`), which pairs a dark scrim with a white icon.
- **Tokens:** `src/styles/global.css` holds every color, spacing, radius, type size, elevation, and layout value. Each one has light and dark values, and they reach Tailwind through `@theme inline` (`bg-surface-bg`, `p-xl`, `rounded-corner-lg`, `text-label-sm`, `shadow-raised`, and so on).
- **Rule:** components contain no hex values, pixel literals, or font families. To restyle, edit the variables in `global.css` and nothing else. Spacing and radius overrides are stubbed at the end of `:root`.
- **Typography:** Instrument Sans (`--font-family-base`) is the only font face.
- **Exception:** Google's branding rules require the Google "G" mark, so it ships as `src/assets/google-g.svg`. Its brand colors live in that file only.

## 7. Reviewer mode

Reviewer mode shows demo tooling. It is hidden from regular users. Any of these turns it on:

- `VITE_REVIEWER_MODE=true` at build time
- `?reviewer=1` in the URL. This lasts for the browser session; `?reviewer=0` turns it off.
- Tapping **TIPalit v0.1.0** at the bottom of Profile seven times. This toggles it and shows a toast; use it in the Figma preview.

When it is on, Profile shows a **Reviewer tools** row, and the Google chooser adds a second TIP account and a personal Gmail account.

| Toggle | Effect |
|---|---|
| Slow network | Every call takes about 2 s, and tabs show skeletons on every visit |
| Fail next load | The next Feed, Chats, or Profile load fails, then Retry succeeds |
| Fail next publish | The next Post listing or Save changes fails |
| Seller declines meetups | Simulated sellers decline proposals |
| Empty inbox / Empty inventory | Hides chats or your listings |
| Google sign-in failure | None, Network, or Cancel |

| Launcher | Opens |
|---|---|
| Feed loading | Feed skeletons |
| Empty search | Feed searched for "MATH 999" |
| Domain error | Signs out and shows the rejected `juan.delacruz@gmail.com` state |
| Form validation | Sell form with errors shown |
| Report / Rate modal, Meetup picker | That overlay |
| Replay intro / Replay onboarding | The first-run screens. Your session is kept. |

**Reset demo data** clears every `tipalit.v1.*` record and restarts from the intro.

## 8. Accessibility

- Touch targets are at least 44 px (`--touch-target`, through the `touch-hit` utility).
- Forms check fields on submit, move focus to the first invalid field, and link each error with `aria-describedby`.
- Modals and sheets trap focus, close on Esc, and give focus back when they close. Toasts are announced through a persistent live region.
- The intro carousel uses carousel/slide roles and works with the arrow keys. Motion is turned off under `prefers-reduced-motion`.

## 9. UX critique log

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | The Profile gear opened demo states, not settings | High | Fixed: a labelled Reviewer tools row, shown in reviewer mode only |
| 2 | Own-listing detail ended at a disabled button | High | Fixed: Edit, Mark as sold/available, Delete with confirmation |
| 3 | A refresh lost the session, data, and theme | High | Fixed: saved through the adapter |
| 4 | No state for failed loads | High | Fixed: error state with Retry on Feed, Chats, and Profile |
| 5 | Share copied the app root URL | Medium | Fixed: Web Share API, with a copied text summary as the fallback |
| 6 | Profile showed placeholder identity details | Medium | Fixed: real onboarding data and an Edit profile sheet |
| 7 | Auth overclaimed safety and had a cramped value grid | Medium | Fixed: honest copy; the value points moved to the intro |
| 8 | Sign out happened instantly | Low | Fixed: confirmation modal |
| 9 | A video-kit token was used for captions | Low | Fixed: semantic `text-caption-sm` |
| 10 | Toast offsets used raw spacing | Low | Fixed: `--toast-offset-*` tokens |
| 11 | Meetup spots ignored the campus | Medium | Fixed: a spot list for each campus |
| 12 | Neutral and subtle buttons were nearly invisible in dark mode (dark charcoal on dark surfaces), including Back, Edit profile, Sign out, Continue with Google, and Community rules | High | Fixed: `--control-fg` / `--control-border` tokens applied under `.dark` |
| 13 | Back, Report, and Share over the listing photo had grey icons on dark circles | High | Fixed: overlay scrim with a white icon in both themes |
| 14 | The Dark mode switch overflowed its card and had no accessible name or role | High | Fixed: `SwitchRow` (full width, controlled, `role="switch"`, whole row tappable) |
| 15 | The feed avatar looked tappable but did nothing | Medium | Fixed: it opens Profile |
| 16 | Focus rings were dark-on-dark in dark mode | Medium | Fixed: the ring uses `--control-fg` with a `--surface-bg` offset |
| 17 | The chat header's verified shield disappeared in dark mode | Low | Fixed by #12 |
| 18 | Reports were acknowledged but saved nowhere, though the pledge promises review within 24 hours | High | Fixed: `ReportService`, plus an admin review queue |
| 19 | No one could act on bad actors (remove listings, suspend accounts) | High | Fixed: Admin console with an audit log |
| 20 | Meetup spots were hard-coded, so changing them needed a release | Medium | Fixed: admins edit spots for each campus |
| 21 | The kit Tabs' active underline disappeared in dark mode | Low | Fixed: it uses `--control-fg` under `.dark` |

## 10. Known limitations and open questions

- The TIP Manila meetup spot names (`MEETUP_SPOTS.manila` in `data/seed.ts`) are placeholders. Confirm them with Student Affairs.
- Admins can now edit meetup spots in the app; `MEETUP_SPOTS` is only the first-run default.
- Admin roles are granted from the `ADMIN_EMAILS` list in `data/seed.ts` at sign-in. They can't be granted or revoked in the app — that stays a server/claim concern on purpose.
- Suspended members aren't notified in the app. They see the reason at their next sign-in. Email notifications belong on the server.
- The `promotions` collection is managed directly in the Firestore console; there is no admin UI for sponsors yet.
- Analytics events are stored in `analytics_events` via the adapter; wiring them to a dashboard (or GA4) is a follow-up.
- The production build warns that the main JS chunk is ~1 MB. Consider route-level code splitting with `React.lazy` before scale.
- Chats are scoped to one user on one device. Each campus is a separate market.

## 11. Scripts

```sh
corepack pnpm dev       # Vite dev server (loads .env; set VITE_DATA_ADAPTER=mock for local demo)
corepack pnpm build     # Production build
corepack pnpm preview   # Serve the production build
corepack pnpm format    # oxfmt
corepack pnpm exec tsc --noEmit -p tsconfig.json   # Typecheck
```

Validation status: `tsc --noEmit` and `pnpm build` pass; the full user journey (sign-in → onboarding → browse → chat → meetup accept/complete → rate → perks → admin console) was walked end-to-end in a browser with the mock adapter with zero console errors.
