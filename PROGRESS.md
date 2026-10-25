# Project Progress & State Tracker

This file serves as the ground-truth state anchor across Claude Code sessions, restarts, and `/clear` invocations.

---

## 1. Active Plan & Roadmap
- **Active Plan File:** `.claude/plans/what-do-u-suggest-typed-allen.md`
- **Current Milestone:** Phase 2 Hardening Complete -> Phase 3 Production Deployment & CORS

---

## 2. Git & Branch State
- **Primary Branch (`master`):** At commit `9a84caa` (*"Add the Storage CORS policy for local dev and hosting origins"*).
- **Last Auto-Sync:** 2026-10-25 07:35:37
- **Working Tree:** Clean.
- **Verification Status (re-run 2026-10-25 against `9963790`):**
  - `npm run typecheck` -> PASS (clean `tsc --noEmit`)
  - `npm run test:shapes` -> PASS (17/17 tests passing)
  - `npm run test:rules` -> PASS (48/48 tests passing, Firestore emulator)
  - `npm run build` -> PASS (production bundle built in 953ms; chunk-size warning only)

---

### Recent Commits (Auto-Synced)
- **9a84caa** *(2026-10-25 15:35)*: Add the Storage CORS policy for local dev and hosting origins
- **43bdcfa** *(2026-10-25 15:32)*: Record the rules-test pass in PROGRESS.md
- **64caa2c** *(2026-10-25 14:28)*: chore: automate PROGRESS.md updates via git hooks and sync-progress script
- **9963790** *(2026-10-25 12:42)*: Fix the inert background: it was inerting the dialogs too
- **166380e** *(2026-10-25 12:30)*: Wire up the reserved status, drop listReviews, add CI

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
1. **BLOCKED — Apply Firebase Storage CORS:** `cors.json` is committed (`9a84caa`), but the bucket does not exist under the active gcloud account. `tipalit-firebase.firebasestorage.app`, `tipalit-firebase.appspot.com`, `tipalit-campus.appspot.com`, and `tipalit-campus.firebasestorage.app` all return 404, and `leebonus2004@gmail.com` lacks `storage.buckets.list` on project `tipalit-firebase`. Firebase CLI is logged in as `yelhsasunob@gmail.com` (the project owner) but gcloud has no credentials for it. **Next action:** either `gcloud auth login yelhsasunob@gmail.com` then `gcloud storage buckets update gs://<bucket> --cors-file=cors.json`, or create the default bucket in the Firebase console (Storage → Get started), then re-run the update.
2. **DONE — Deploy Firestore Rules:** `firebase deploy --only firestore:rules --project tipalit-firebase` succeeded; rules compiled and released to `cloud.firestore`.
3. **Verify Live App Flow:** Sign in as student, verify feed loads, upload product image, and test chat. (Image upload depends on step 1.)
