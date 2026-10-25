# Project Progress & State Tracker

This file serves as the ground-truth state anchor across Claude Code sessions, restarts, and `/clear` invocations.

---

## 1. Active Plan & Roadmap
- **Active Plan File:** `.claude/plans/what-do-u-suggest-typed-allen.md`
- **Current Milestone:** Phase 2 Hardening Complete -> Phase 3 Production Deployment & CORS

---

## 2. Git & Branch State
- **Primary Branch (`master`):** At commit `0096196` (*"Record the rules deploy and the blocked Storage CORS step"*).
- **Last Auto-Sync:** 2026-10-25 07:35:38
- **Working Tree:** Clean.
- **Verification Status (re-run 2026-10-25 against `9963790`):**
  - `npm run typecheck` -> PASS (clean `tsc --noEmit`)
  - `npm run test:shapes` -> PASS (17/17 tests passing)
  - `npm run test:rules` -> PASS (48/48 tests passing, Firestore emulator)
  - `npm run build` -> PASS (production bundle built in 953ms; chunk-size warning only)

---

### Recent Commits (Auto-Synced)
- **0096196** *(2026-10-25 15:35)*: Record the rules deploy and the blocked Storage CORS step
- **9a84caa** *(2026-10-25 15:35)*: Add the Storage CORS policy for local dev and hosting origins
- **43bdcfa** *(2026-10-25 15:32)*: Record the rules-test pass in PROGRESS.md
- **64caa2c** *(2026-10-25 14:28)*: chore: automate PROGRESS.md updates via git hooks and sync-progress script
- **9963790** *(2026-10-25 12:42)*: Fix the inert background: it was inerting the dialogs too

---

## 3. Completed Streams Archive
- **Wave 1 Merged (`13485db`):** Live-data shape tolerance, auth provisioning, on-read rating aggregation, client-side moderation, 45-test security rules suite.
- **Feed Listing Query Rule Fixed (`c7914c1`):** Split Firestore listings `read` into `get` and `list` so campus feed queries load without 403.
- **Stream G — Error Boundaries (`1f29407`):** Inner per-screen boundary in `src/App.tsx`, outer last-resort boundary in `src/main.tsx`.
- **Stream H — Dialog A11y & Inert (`0a8f942`, `9963790`):** `useDialogFocus` handles Escape stack, canClose predicate, sibling inerting without trapping modals.
- **Stream I — Session Race Guards (`dd5b720`):** `isLatest()` predicate guarding async writes across tabs, sellers, listing cache, admin data, and realtime subscription.
- **Stream J — Reserved Status, Dead Code & CI (`166380e`):** Wired `reserved` status in `ProductDetailScreen.tsx`, removed dead `listReviews`, added `.github/workflows/ci.yml`.

---

## 4. Immediate Next Steps (To Execute on Resume)
1. **RESOLVED — Storage dropped, photos inline:** Cloud Storage requires the Blaze plan, which `tipalit-firebase` is not on (and the bucket was never provisioned). `listings.ts` no longer uploads: the downscaled JPEG data URLs from `AddListingScreen` (`MAX_PHOTO_EDGE=900`, quality 0.82, max 5) are written straight into `image_ids`. `storage.ts` is now unused by the listings path. `cors.json` (`9a84caa`) stays committed for a future Blaze migration.
2. **DONE — Deploy Firestore Rules:** `firebase deploy --only firestore:rules --project tipalit-firebase` succeeded; rules compiled and released to `cloud.firestore`.
3. **Verify Live App Flow:** Sign in as student, verify feed loads, publish a listing with photos, and test chat. Watch the Firestore 1 MiB document limit — 5 photos at ~120 KB base64 is ~800 KB, close to the ceiling.
4. **Future (Blaze only):** re-enable `uploadListingImage` in `listings.ts`, create the bucket, apply `cors.json`.
