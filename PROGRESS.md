# Project Progress & State Tracker

This file serves as the ground-truth state anchor across Claude Code sessions, restarts, and `/clear` invocations.

---

## 1. Active Plan & Roadmap
- **Active Plan File:** `.claude/plans/what-do-u-suggest-typed-allen.md`
- **Current Milestone:** Phase 2 Hardening Complete -> Phase 3 Production Deployment & CORS

---

## 2. Git & Branch State
- **Primary Branch (`master`):** At commit `64caa2c` (*"chore: automate PROGRESS.md updates via git hooks and sync-progress script"*).
- **Last Auto-Sync:** 2026-10-25 06:29:07
- **Working Tree:** Clean.
- **Verification Status (re-run 2026-10-25 against `9963790`):**
  - `npm run typecheck` -> PASS (clean `tsc --noEmit`)
  - `npm run test:shapes` -> PASS (17/17 tests passing)
  - `npm run test:rules` -> PASS (48/48 tests passing, Firestore emulator)
  - `npm run build` -> PASS (production bundle built in 953ms; chunk-size warning only)

---

### Recent Commits (Auto-Synced)
- **64caa2c** *(2026-10-25 14:28)*: chore: automate PROGRESS.md updates via git hooks and sync-progress script
- **9963790** *(2026-10-25 12:42)*: Fix the inert background: it was inerting the dialogs too
- **166380e** *(2026-10-25 12:30)*: Wire up the reserved status, drop listReviews, add CI
- **0a8f942** *(2026-10-25 12:29)*: Let the dialog hook own Escape, with a stack and an inert background
- **dd5b720** *(2026-10-25 12:28)*: Guard every async write against stale requests and sign-out

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
1. **Apply Firebase Storage CORS:** Apply `cors.json` to bucket `tipalit-firebase.firebasestorage.app` via GCS JSON API (allowing localhost:5301, localhost:8443, localhost:5173, and production web.app domains).
2. **Deploy Firestore Rules:** Run `firebase deploy --only firestore:rules --project tipalit-firebase` to push the new feed listing rules to live production.
3. **Verify Live App Flow:** Sign in as student, verify feed loads, upload product image, and test chat.
