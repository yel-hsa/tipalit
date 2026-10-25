# TIPalit Delivery Progress

## Current milestone

Milestone 1 — Canonical domain, identity, media, and security foundation.

- Branch: `milestone-0-preserve-and-stabilize`
- Base: `7e42332` (`Split the app into web, mobile, and shared service workspaces`)
- Production deployment, live migrations, role provisioning, pushes, and app-store publication remain out of scope without explicit approval.

## Completed checkpoints

| Commit | Checkpoint |
| --- | --- |
| `35463a7` | Preserved the desktop admin console and its shared service contract. |
| `49cfcee` | Preserved mobile accessibility and moderation improvements. |
| `5108886` | Preserved mock administrator sign-in support on mobile. |
| `4337097` | Preserved Expo web export support and the lockfile update. |
| `49989ca` | Ignored local browser and Expo artifacts. |
| `f38f398` | Established explicit workspace typechecks/builds, multipage web output, Expo export, Functions validation, and CI production builds. |
| `60e621a` | Created the milestone progress ledger and recorded release blockers. |
| `e557a18` | Enforced active accounts in Firestore/Storage rules and made student listing queries positively prove public statuses. |

Machine-specific provider settings and `switch-provider.ps1` are intentionally ignored rather than shipped with the product. Any real token previously stored in local `.claude` settings should be rotated outside this repository.

## Verified on 2026-10-26

The following commands passed from the repository root:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run test
```

Coverage confirmed:

- Shared services, the actual web TS/TSX source, Expo mobile, and Cloud Functions typecheck successfully.
- Vite emits both `dist/index.html` and `dist/admin.html`.
- Functions compile successfully.
- Expo exports web, iOS, and Android bundles successfully.
- Function helper tests: 6/6 passed.
- Shape tests: 17/17 passed.
- Firestore rules tests: 61/61 passed for custom-claim authority, suspended administrators, active accounts, safe listing queries, denied direct privileged writes, and forged report submission.
- Storage rules loaded successfully in the Storage emulator with the installed JDK 25; the machine's default Java runtime is too old for the current Firebase CLI.
- `git diff --check` passed before each completed checkpoint.

## Open warnings and blockers

- The shared web JavaScript chunk is approximately 927.05 kB minified; route-level/code splitting remains required before release.
- Suspended accounts and suspended claimed administrators are denied protected Firestore/Storage access, and unfiltered student listing queries cannot expose moderated records.
- Admin authorization now uses trusted custom claims, while report resolution, member status, and meetup settings route through callable Functions. Safe custom-claim provisioning remains required; no real role has been provisioned.
- Report submission now routes through a callable with reason-code validation, server-derived metadata, deterministic document IDs, and per-account rate limiting.
- Callable emulator integration coverage for concurrent report resolution/submission and mutation/audit atomicity remains required beyond the current helper and rule suites.
- Listing photos still require migration from inline/base64 data to Cloud Storage metadata and thumbnails, plus adversarial Storage-rule tests.
- The desktop admin has known forbidden-sign-in, expiry-warning, semantic-style, and responsive-layout gaps.

## Exact next action

Checkpoint the current custom-claim, moderation, meetup-settings, and server-authored report callable slice after final diff review. Next, add callable-emulator concurrency/atomicity coverage and safe custom-claim provisioning tooling without assigning a real role, then begin the Storage media model and adversarial Storage-rule tests before UI work.
