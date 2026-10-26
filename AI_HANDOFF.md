# TIPalit AI Handoff — Demo Prototype Completion

## Objective

Complete TIPalit as a coherent **portfolio/demo prototype with a functional local Firebase backend**.

> **Operating rule:** Fix blockers and core demo journeys only; defer production hardening and exhaustive edge cases.

Preserve the current monorepo, working behavior, and TIPalit visual identity. Do not redesign, rewrite, or reorganize functionality that already works.

## Repository state

- Repository: `TIPalit_Handoff_Frontend`
- Active branch: `milestone-0-preserve-and-stabilize`
- Latest checkpoint: `e45f895 Complete the student and admin demo journeys`
- Main branch: `main`
- The student, admin, emulator, and media URL fixes are committed in `e45f895`; the working tree is clean. Do not reset or rewrite that commit.
- Read `CLAUDE.md`, `AGENTS.md`, `PROGRESS.md`, and the active plan at `C:\Users\LeeBonus\.claude\plans\plan-and-improve-the-inherited-jellyfish.md` before editing.

Start by reconciling state:

```text
git status --short
git diff --stat
git log -n 3 --oneline
git branch -a
```

## Product and architecture constraints

The repository is a pnpm monorepo:

- `apps/web` — Vite/React student web experience and desktop admin console.
- `apps/mobile` — Expo/React Native student app with a limited admin surface.
- `packages/services` — shared types, mock adapter, Firebase adapter, seed data, and host configuration.
- `functions` — Firebase callable and scheduled Functions.

Technical constraints:

- React 19, Vite 8, Tailwind CSS v4, Expo 58, React Native 0.88.
- TypeScript 5.7+ for web/shared code and TypeScript 6 for mobile.
- Import shared code through `@tipalit/services`; do not use relative cross-workspace imports.
- Never read `import.meta.env`, `window`, or `localStorage` inside `packages/services`.
- Install host values through `setPlatform`, `setFirebaseConfig`, `setFirebaseEmulatorConfig`, and `setDataAdapter`.
- Match surrounding naming, formatting, comment density, and architecture.
- Use double quotes for strings containing apostrophes, or escape apostrophes in single-quoted strings.
- Use targeted file reads/searches rather than dumping large files.

## Scope that must be completed

### 1. Student demo journey

Verify and fix only concrete blockers in:

```text
sign in → browse → create listing → edit listing → view listing → chat
```

Requirements:

- Mock data is the supported default when credentials are unavailable.
- Firebase emulator support must remain available through environment configuration.
- Verify the journey in the running web app.
- Verify the Expo/mobile implementation as far as the available local target permits; Expo web is acceptable for local browser validation, but document any native-only limitation honestly.
- Repair only blocking navigation, state, service, submission, or image behavior.
- Add only loading, error, and empty states encountered by this journey.

Current browser verification reached student profile setup using the seeded account:

```text
Bea Lim <bea.lim@tip.edu.ph>
Campus: TIP Manila
Program: BS Computer Science
Year level: 3rd year
```

Restart the browser journey from a clean state rather than assuming that browser session still exists.

### 2. Basic admin moderation

Verify locally with the seeded administrator:

```text
Office of Student Affairs <osa.admin@tip.edu.ph>
```

Required flows:

- View reports.
- Resolve or dismiss a report.
- View listings and remove a listing through the trusted administrator boundary.
- View members and suspend/reinstate a member with a required note.
- Confirm denied/non-admin users receive a clear state.

Do not add case management, bulk operations, appeals, or analytics expansion.

### 3. Focused presentation pass

Apply high-impact fixes only to screens used by the demonstrated journeys:

- No avoidable horizontal clipping at common phone and desktop widths.
- Clear loading, error, empty, and denied states.
- Visible form labels and understandable validation near the relevant control.
- Accessible button names, keyboard focus, and practical touch targets (approximately 44×44 px where applicable).
- Consistent TIPalit branding and controls.

For visual changes, **run the app and verify them in the browser before claiming completion**. Prefer DOM/accessibility snapshots and measurements; use screenshots selectively when checking layout, spacing, color, or responsive presentation.

## Visual identity to preserve

Do not replace the existing marketplace identity.

- TIP yellow: `#f9c80e`
- Charcoal: `#2b2a28`
- Warm neutral: `#f3f2ee`
- White surfaces
- Instrument Sans
- Rounded cards, sheets, and pills
- Lucide-compatible icons
- Photo-led marketplace cards

No broad redesign and no new design-system package.

## Implementation committed in `e45f895` to preserve and verify

That commit includes these intended changes:

- Lazy shared-service adapter initialization so host bootstraps configure the adapter before first use.
- Auth, Firestore, Functions, and Storage emulator connectors.
- Web and Expo emulator opt-in environment variables.
- Mobile mock sign-in using a normal student account rather than the administrator seed.
- Mobile listing edit mode and edit overlay.
- Owner-facing **Edit listing** action on listing details.
- Required audit notes for report and member moderation.
- Trusted `removeListingAsAdmin` callable plus shared Firebase/mock adapter methods.
- Administrator listing removal routed through `services.admin.removeListing(...)`.
- Emulator-aware listing-media download URLs.
- Configurable Functions Storage bucket selection.
- Callable coverage for administrator listing removal and emulator media URLs.

Primary changed files include:

```text
apps/mobile/src/AppShell.tsx
apps/mobile/src/bootstrap.ts
apps/mobile/src/screens/ListingDetailScreen.tsx
apps/mobile/src/screens/SellScreen.tsx
apps/mobile/src/screens/SignInScreen.tsx
apps/web/bootstrap.ts
apps/web/components/admin/MemberDrawer.tsx
apps/web/components/admin/MemberSheet.tsx
apps/web/components/admin/ReportDrawer.tsx
apps/web/components/admin/ReportReviewSheet.tsx
apps/web/screens/AdminConsole.tsx
apps/web/vite-env.d.ts
functions/src/index.ts
functions/src/listing-media.ts
functions/src/media-cleanup.ts
functions/test/callables.test.mjs
functions/test/run-callables.mjs
packages/services/firebase/admin-callables.ts
packages/services/firebase/admin.ts
packages/services/firebase/config.ts
packages/services/index.ts
packages/services/mock/admin.ts
packages/services/types.ts
```

Review the actual diff before editing; this list is orientation, not a substitute for inspection.

## Security and Firebase invariants

Do not weaken these guarantees:

- A verified `@tip.edu.ph` email alone is insufficient; the user also needs an active `users_profile` record.
- Administrator authorization derives only from `token.claims.admin === true`.
- Email allowlists and profile role fields are not privileged authorization sources.
- Suspended claimed administrators lose privileged access.
- Privileged operations stay behind trusted callable Functions.
- Listing-media Storage paths remain operation-scoped and immutable:

```text
item_photos/{ownerId}/{listingId}/{operationId}/{fileName}
```

- Canonical media metadata, server-side byte verification, deterministic thumbnails, `listing_version` conflict protection, and durable cleanup jobs must remain intact.
- Keep mock and Firebase adapter contracts aligned.
- Do not bypass Firestore or Storage rules for client behavior.

## Explicitly deferred work

Do **not** implement any of the following:

- Exchanges, offers, authoritative meetup transactions, or review expansion.
- Push notifications or notification infrastructure.
- Advanced search, saved searches, recommendations, or liquidity features.
- Analytics expansion.
- Privacy automation, data retention, export, or deletion workflows.
- App Check.
- Production observability or exhaustive edge-case suites.
- Production migrations.
- Deployment infrastructure.
- Production role provisioning.
- App-store preparation or publication.
- Repository-wide reorganization.
- Admin-app extraction.
- Full redesign.
- Bundle optimization solely to remove existing non-blocking size warnings.

## Safety and outward-action constraints

Do not perform any outward-facing or live action without the user's explicit approval at that point:

- No deployment.
- No push to a remote.
- No production Firebase mutation.
- No live migration.
- No custom-claim or real role provisioning.
- No push delivery.
- No app-store publication.

Additional preservation rules:

- Do not delete branches, worktrees, stashes, or inherited files without preservation checks and explicit confirmation.
- Do not apply or drop the obsolete shared stash without explicit confirmation.
- Do not cherry-pick old worktree commits already present in `master`.
- Do not ship `switch-provider.ps1` or machine-local `.claude` provider settings.
- Never reproduce secrets or token values. Any real token previously stored in ignored local settings must be rotated outside the repository.

## Latest validation result

The following checks passed on 2026-10-26 after the current implementation changes:

```text
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run build
git diff --check
```

Confirmed results:

- All services, web, mobile, and Functions typechecks passed.
- Function helper tests: 6/6.
- Callable/emulator integration tests: 17/17.
- Shape tests: 17/17.
- Firestore rules tests: 47/47.
- Storage rules tests: 8/8.
- Emulator media migration fixture passed dry run, apply, and idempotent rerun.
- Vite web, Functions, Expo web, Expo iOS, and Expo Android builds passed.

Known non-blocking warnings:

- Vite shared chunk is approximately 952 kB minified.
- Expo web bundle is approximately 1.8 MB.
- Firebase emulator dependencies print JDK `sun.misc.Unsafe` and Node `url.parse()` deprecation warnings.
- Git may print LF-to-CRLF checkout warnings.

Document these warnings; do not expand scope to optimize or replace dependencies unless one becomes a blocker.

## Task sequence (complete)

All steps below were completed and committed in `e45f895`:

1. Inspected and preserved the then-uncommitted diff.
2. Completed browser verification of the student journey.
3. Fixed only blockers found in that journey.
4. Verified the mobile edit overlay and mock journey on the Expo web target.
5. Completed browser verification of admin report, listing, and member moderation.
6. Fixed only blockers found in those admin flows.
7. Checked the demonstrated screens at common phone and desktop widths.
8. Applied only focused responsive, state, accessibility, and branding fixes supported by observed defects.
9. Re-ran final validation:

   ```text
   corepack pnpm run typecheck
   corepack pnpm run test
   corepack pnpm run build
   git diff --check
   ```

10. Updated `PROGRESS.md` with the checkpoint, completed fixes, verification performed, test counts, build status, known warnings, launch instructions, and next action.
11. Created the local checkpoint commit after the journey and final checks passed.

`corepack pnpm run typecheck` was re-confirmed green at `e45f895` on 2026-10-26.

## Local launch commands

From the repository root:

```text
corepack pnpm dev
corepack pnpm dev:mobile
```

Web defaults to:

```text
http://127.0.0.1:8443/
```

The desktop admin entry is emitted as `admin.html`; verify its actual development URL in the running Vite app.

Mock is the default when Firebase configuration is absent. Emulator clients can be enabled with the existing host environment flags; inspect `apps/web/bootstrap.ts` and `apps/mobile/src/bootstrap.ts` for the exact variables rather than inventing new ones.

## Known limitation to document honestly

Native Expo Firebase authentication still uses a web-oriented popup implementation. The supported local mobile demo path is the mock adapter unless native OAuth is added later. Native OAuth is outside this reduced scope unless it blocks the agreed mock demo.

## Completion criteria

The handoff is complete only when:

- A reviewer can demonstrate the student journey with seeded mock/emulator data without changing code.
- Basic report/listing/member moderation works locally for the seeded administrator.
- Demonstrated screens have no observed blocker-level responsive or accessibility defect.
- Loading/error/empty/denied states encountered in the demo are understandable.
- Typecheck, tests, builds, and `git diff --check` pass.
- `PROGRESS.md` truthfully records what was verified and what remains deferred.
- No live or outward-facing action occurred.

