# TIPalit onboarding briefing

## 1. What TIPalit is

A mobile-first C2C marketplace for TIP Manila and TIP Quezon City students: verified `@tip.edu.ph` Google sign-in, campus-scoped feeds of used academic goods (textbooks, calculators, uniforms, lab gear), in-app chat, in-person hand-off at admin-approved campus spots, ratings only after a meetup, and an Office of Student Affairs moderation console. It exists because Facebook groups bury listings and admit strangers, and Shopee/Lazada add shipping days; TIPalit's answer is gated identity plus zero shipping. The PRD (`PRD.pdf`, §2.1–2.6) is a course deliverable, so it mixes lean-canvas material with functional requirements. Shipped code supersedes it in places (conditions are New/Like New/Good/Fair, not the PRD's wording; no payment-method note, no price/condition filters, no paid boosts).

## 2. How to run it

- Toolchain: Node 22 + pnpm 10.34.3 (`.mise.toml`). Only `pnpm-lock.yaml` exists — use `corepack pnpm`.
- `corepack pnpm dev` → Vite binds `0.0.0.0:${PORT:-8443}`, `strictPort: true` (`vite.config.ts:33-46`), so an occupied port is a hard failure, not a fallback. `pnpm preview` reuses 8443 without strictPort and will collide with dev.
- **Adapter switch** (`src/services/index.ts`): `VITE_DATA_ADAPTER=firebase|mock` wins; otherwise Firebase is used if `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are both set; otherwise mock. Chosen once at module load, no runtime toggle. `README.md:72` claims unknown values "log a warning" — the code does no such thing.
- **Trap:** if your `.env` has real Firebase keys, you are writing to live Firestore without being asked. To stay local, always set `VITE_DATA_ADAPTER=mock`.
- Mock state lives in `localStorage` under `tipalit.v2.*` (`src/services/mock/storage.ts`). Bumping `VERSION` wipes testers' data; pictures are stored as data URLs, so a few uploads can hit the ~5MB origin quota.
- Reviewer mode: `?reviewer=1` (persists in sessionStorage), `VITE_REVIEWER_MODE=true`, or seven taps on the version line in Profile (`src/config/reviewer.ts`). Mock-only.
- No typecheck or test in the build: `build` is plain `vite build`; `tsconfig.json` has `noEmit`. Run `pnpm exec tsc --noEmit` yourself. No ESLint config exists despite `eslint-disable` comments in `App.tsx:469,478`. Not a git repository.
- `firebase.json` has **no `hosting` block**, so `README.md:125`'s `firebase deploy --only hosting` fails. Frontend shipping path is `.figma/make/deploy` (Figma Make hosting on `dist/`). Built site ships `<title>Figma Make App</title>`, a stale Markdown-viewer description, and `noindex` (`.figma/make/site.json`).
- `AGENTS.md` is a stale scaffold doc: it says the dev server is already running (false outside Figma Make), lists 7 files, and says nothing about Firebase, the mock layer, or `functions/`.

## 3. Architecture at a glance

```
main.tsx (StrictMode, ThemeProvider from @figma/astraui)
  └─ App.tsx  "TipalitApp" — ~25 useState, Route union, boot effect,
     per-tab loaders, optimistic mutations, overlays, demo harness
       ├─ PhoneShell (390px column, tab bar, aria-live toast slot)
       ├─ screens/*.tsx  (11 files) — props only, no context, no router
       └─ services (singleton)  ← picked at import
            ├─ firebase/* (13 modules) → Auth, Firestore, Storage
            └─ mock/*    (16 modules) → localStorage + fake latency
                 contract: src/services/types.ts
```

There is no React context, no router, no store. `Route` is a discriminated union in `App.tsx:68-80`; screens are picked by an if/else chain at `App.tsx:1060-1250`; `detail` and `editListing` carry their own `back: Route`, so history is one level deep and a browser refresh always returns to boot.

**Read these five first:**
1. `src/services/types.ts` — the contract: every entity and the 10 service interfaces plus optional `demo`. If you understand this file you understand the domain.
2. `src/App.tsx` (1355 lines) — the god component: boot, routing, all data loading, rollback logic, overlays, demo launchers.
3. `src/data/seed.ts` — campuses, categories, conditions, departments, subject codes, meetup spots, safety rules, test accounts, display helpers. Also imported by the *Firebase* adapter for fallbacks, which is a smell.
4. `src/screens/FeedScreen.tsx` + `src/screens/ChatThreadScreen.tsx` — the two busiest flows.
5. `firestore.rules` + `functions/src/index.ts` — the real trust boundary; much of the client UI is not it.

## 4. Domain model

- **Campus**: `'manila' | 'qc'`. Primary partition: feed, listings, meetup spots, new posts.
- **Session / Profile**: `Session` has userId/email/name/initials and optional `role` (missing = member). `Profile` adds campus, program, year, `safetyAcceptedAt`, `onboardedAt`. "Complete" = non-empty name + campus + program + year (`src/services/profile.ts:5`). Admin role is server-granted and cannot be changed in-app.
- **Listing**: title, price, `transactionType` sale|free|trade, courseCode, category (8 incl. Others), condition New|Like New|Good|Fair, description, `imageUrl` + `imageUrls[]`, sellerId, meetupSpot, campus, `status` active|reserved|sold. Department is *derived* from the course code by regex (`src/data/seed.ts:514`), never entered. `ListingDraft` deliberately omits department, campus, seller, status.
- **Thread**: one per (listing, buyer). `items[]` are either messages or `meetup` items `{time, location, status: pending|accepted|declined, completed?, rating?}`. Meetups are chat items, not a separate record.
- **Review**: written only via `chat.rate()`, which marks the meetup completed and stores 1–5 stars + comment. Seller aggregates are rollups (Firebase: Cloud Function; mock: computed on read).
- **Report**: target `listing|user`, fixed reason picker (`src/components/ReportModal.tsx:18-27`), status open|resolved|dismissed. Resolution action `remove_listing | suspend_member | dismiss` cascades to other open reports on the same target — **but only in the mock adapter and the unused Cloud Function** (see §7).
- **Suspension** is soft: sign-in refused, listings hidden from feed, chats retained. Admins cannot be suspended.
- **Audit log**: closed set of actions — report_dismissed, listing_removed, member_suspended, member_reinstated, spots_updated.
- `Seller.verified` is a literal `true` — there is no verification pipeline to find.

## 5. Screens and flows

| Screen | Purpose | Key dependencies |
|---|---|---|
| `BootScreen` | Splash while session/prefs/spots load; no timeout | `services.auth.getSession`, `prefs`, `settings` |
| `IntroScreen` | 3-slide first-run carousel, gated by `prefs.introSeen` | prefs |
| `AuthScreen` | Google only; inline domain/network/suspended errors; no branch for `'unverified'` | `AuthService` |
| `OnboardingScreen` | Step 1 profile form, step 2 four-rule safety pledge | `ProfileService`, `ProfileFields` validate |
| `FeedScreen` | 6-card pages, search, category/dept pills, sponsor banner | `ListingService.list`, `PromotionService` |
| `ProductDetailScreen` | Photo carousel, trust card, owner status actions, Message Seller | listings cache in App |
| `AddListingScreen` | Create+edit in one component; photos downscaled to 900px JPEG data URLs | `ListingService`, `ImageDropzone` |
| `ChatListScreen` | Inbox | `ChatService.listThreads` |
| `ChatThreadScreen` | Messages, typing indicator, meetup proposal card | chat + `MeetupProposalCard` |
| `ProfileScreen` | Stats, active/sold tabs, perks, dark mode, reviewer toggle | multiple |
| `AdminScreen` | Overview tiles + Reports/Members/Spots/Log tabs | `AdminService` |

Journeys: **Onboard** intro → Google → profile → pledge → feed. **Buy** feed → detail → Message Seller → chat → propose spot/day/hour → accept → Mark done → rate. **Sell** Sell tab → form → detail (Edit/Mark sold/available/Delete). **Moderate** report → admin queue → Remove listing / Suspend member / Dismiss (+note) → audit entry.

Quirks worth knowing: `onboardedAt` is written but never read — the pledge is the real gate (`App.tsx:134-138`). The chats-tab dot means "a seller-proposed meetup is pending", not unread messages (`src/components/BottomTabBar.tsx:9-10`). Profile's inventory tabs filter only active and sold, so a `reserved` listing vanishes from the owner's own inventory, and `chatService.setListingStatus` (the only path to `reserved`) has zero callers.

## 6. Data & backend

**Service seam.** `src/services/index.ts` exports one `services` object; screens import nothing else from data. Errors are `ServiceError` with codes network|storage|not_found|unauthenticated|forbidden|invalid (`src/services/errors.ts`).

**Mock** (`src/services/mock/`): a full offline backend — 600ms simulated latency (2000ms under slowNetwork), simulated seller typing/replies, meetup auto-accept/decline after 1.5s, one-shot failure flags (`failNextLoad`, `failNextPublish`), and a React-bridged fake Google chooser. Only the mock provides `services.demo`; all reviewer tooling is gated on it.

**Firebase** (`src/services/firebase/`): Google popup with `hd:'tip.edu.ph'`; realtime `onSnapshot` chat; Storage uploads.

**Firestore collections**: `users_profile`, `listings`, `chats` (+ `messages` subcollection), `reviews`, `reports`, `promotions`, `settings` (singleton `meetup_spots`), `promotion_clicks`, `audit_log`, `analytics_events`. Note the README calls the settings doc `meetup_spots`; the code uses collection `settings` doc `meetup_spots`.

**Security model** (`firestore.rules`): every rule requires `isTipStudent()` = email matches `.*@tip[.]edu[.]ph$` **and** `email_verified == true`. `isAdmin()` = token email `osa.admin@tip.edu.ph` OR `users_profile/{uid}.role == 'admin'`; owners cannot write `role` or `status`, so it can't be self-escalated. Owner listing updates forbid touching `report_count` and forbid status `'hidden'`.

**Cloud Functions** (`functions/src/index.ts`, three exports): `onReportCreated` increments the listing's `report_count` and flips it to `hidden` at 5; `onReviewWritten` maintains `average_rating`/`total_reviews` transactionally; `resolveReport` is an onCall admin action that closes sibling reports and writes `audit_log`.

**Storage** (`storage.rules`): `item_photos/{uid}/{listingId}/{fileName}`, readable by any TIP student, writable only by owner, image/jpeg|png|webp, <5MB; `promo_assets/` admin-write.

## 7. The things that will bite you (ranked)

1. **The client never calls `resolveReport`.** `src/services/firebase/admin.ts` resolves reports with direct Firestore writes, so sibling-report cascade and the Function's `hidden` status are bypassed; the client marks listings `'removed'` instead of `'hidden'`. Two moderation vocabularies exist; only `'hidden'` is blocked for sellers, so a seller can revive a `'removed'` listing.
2. **Firebase mode fabricates data.** `firebase/admin.ts` falls back to seeded reports/audit when Firestore is empty or errors; a production admin console can show fake "Reported Item" reports. It also returns `activeListings: 0, openReports: 0` for every member (`:228-229`).
3. **Firebase analytics reads the wrong collection.** `src/services/firebase/analytics.ts:23` queries `'users'`; profiles live in `'users_profile'`, so the Members tile is always 0 — and the same function `getDocs`es all listings/reports/reviews just to count them.
4. **Firebase chat swallows errors.** `respondToMeetup`, `completeMeetup`, `rate` (`firebase/chat.ts:253-331`) `console.error` and return void, so App's rollback + error toast never fires. `openThread` returns a synthetic thread id when the write fails; the next message fails against a nonexistent doc.
5. **Live feed query and indexes disagree.** `firebase/listings.ts:70-82` uses `status not-in ['hidden','removed']` + campus equality; `firestore.indexes.json` declares campus+status pairs and campus+category/department+createdAt orderings the client never issues.
6. **Live listings sort on a field never written.** Create writes `created_at` and `server_timestamp` (`firebase/listings.ts:144-145`) but `toListing` and both sort paths read `data.createdAt` — live listings tie on identical fallback timestamps.
7. **`App.tsx` races.** `load()` guards only four setters (`App.tsx:418-454`); `fetchThreads`, `fetchAdmin`, `cacheListings`, `ensureSellers` run uncancelled and repopulate state after sign-out. Rollback closures capture render-time `userId`/`feed`, so a stale snapshot can clobber newer state.
8. **Profile save is rejected by the rules.** `firebase/profiles.ts:73-83` writes `program`, which is not in the allowed update key list in `firestore.rules:57-60`; editing an existing profile fails in Firebase mode.
9. **Firebase onboarding is latent-broken.** `firebase/auth.ts:150-171` creates a profile with campus `'qc'` and department `'General'`, which makes `isProfileComplete()` true immediately — a first-time Firebase user may skip profile setup entirely. Uncertain: nothing clears those placeholders, but this path was not exercised.
10. **Audit log field mismatch.** The Function writes `actor_name` (snake); `AdminScreen.tsx:263` renders `entry.actorName`, so Function-written audit rows show a blank actor. Severity: cosmetic but confusing during demos.
11. **Mock hides live gaps.** Mock has no `hidden`/`removed` state, no report auto-hide, no suspension filter parity with Firebase feed queries, and simulated sellers — the demo is far more complete than production.
12. **Accessibility holes in dialogs.** `useDialogFocus` traps within `[role=dialog]`'s body; `ReportModal` lacks `aria-modal`/Escape; `BottomSheet` doesn't inert the background and its Escape handler fires even when the child passed a no-op `onClose` mid-save.

Also: no error boundary anywhere (`src/main.tsx`); `?reviewer=1` enables demo tooling in any build; `guidelines/Guidelines.md` tells you to read `guidelines/setup.md` and install `@figma/astraui-kit` — neither exists (the package is `@figma/astraui`).

## 8. Top open questions / risks

1. **Which backend is authoritative?** The client-side admin writes, the unused `resolveReport`, and the divergent `hidden`/`removed` states must be reconciled; pick one moderation path.
2. **Is multi-photo shipped and supported?** Detail renders a carousel for `imageUrls.length > 1`, but firebase update replaces `image_ids` wholesale without deleting orphaned Storage files, and INFO.md describes a single optional photo. Docs disagree with code.
3. **Fix or retire the Firebase fallback-to-seed pattern** (`admin.ts` listReports/listAudit). It is a correctness and credibility risk in any demo on live data.
4. **`profiles.save` vs rules, and the `'qc'` default profile.** Both will silently eat a real user's first session; needs fixing before a live pilot.
5. **PRD backlog or dead code?** Price-range filter, condition filter, payment-method note, featured boost (`is_boosted` exists, unwritable UI), separate Perks tab — none are scheduled anywhere except the PRD.
6. **Ownership ambiguity on listings.** No rule prevents a seller changing `seller_id` or `campus`; `status: 'reserved'` is unreachable from the UI. Decide whether these are invariants worth enforcing.
7. **Production readiness gates**: add typecheck and a test runner to CI (none exist), add an error boundary, add Hosting config or document Figma Make as the only deploy, and set a real title/description in `.figma/make/site.json`.
8. **Privacy**: student PII in Firestore, no account deletion or data export, no auth logout-all. Relevant for a PH-school product.

=== SURFACE ===
{"counts":{"screens":11,"components":40,"serviceModules":35,"firestoreCollections":10,"cloudFunctions":3},"entryPoints":[{"path":"src/main.tsx","why":"React mount: StrictMode + ThemeProvider wraps App"},{"path":"src/App.tsx","why":"Single controller: Route union, all app state, boot effect, data loading, optimistic mutations, overlays, demo harness"},{"path":"src/services/index.ts","why":"The one adapter switch (mock vs firebase), resolved once at module import"},{"path":"src/services/types.ts","why":"The domain contract: every entity and all service interfaces"},{"path":"functions/src/index.ts","why":"All server-side logic: report auto-hide, rating aggregates, resolveReport callable"},{"path":"firestore.rules","why":"The real authorization boundary (isTipStudent, isAdmin, field allowlists)"},{"path":"vite.config.ts","why":"Build/dev config plus four custom Figma Make plugins that rewrite index.html"}],"readOrder":["src/services/types.ts","src/data/seed.ts","src/App.tsx","src/services/index.ts","src/services/mock/listings.ts","src/services/mock/chat.ts","src/services/firebase/auth.ts","src/services/firebase/listings.ts","src/services/firebase/chat.ts","src/services/firebase/admin.ts","firestore.rules","functions/src/index.ts","src/screens/FeedScreen.tsx","src/screens/ProductDetailScreen.tsx","src/screens/ChatThreadScreen.tsx","src/screens/AddListingScreen.tsx","src/screens/ProfileScreen.tsx","src/screens/AdminScreen.tsx","src/styles/global.css","src/components/BottomSheet.tsx","src/components/useDialogFocus.ts","src/config/reviewer.ts","firebase.json","vite.config.ts","README.md","INFO.md"]}