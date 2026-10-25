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
| `7bb207f` | Moved administrator authority, report submission, moderation, account state, and meetup settings behind trusted callable Functions with atomic audit writes. |
| _pending commit_ | Added real callable/Firestore emulator coverage for authoritative reports, rate limits, threshold takedowns, duplicate submissions, reopen behavior, claimed-admin checks, concurrent sibling resolution, and audit atomicity; added a no-write-by-default administrator-claim tool. |

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
- Callable + Firestore emulator integration tests: 6/6 passed for authoritative report writes, duplicate/reopen behavior, rate limits, threshold takedowns, active claimed administrators, concurrent sibling resolution, moderation effects, and audit creation.
- Shape tests: 17/17 passed.
- Firestore rules tests: 44/44 passed for custom-claim authority, suspended administrators, active accounts, safe listing queries, denied direct privileged writes, and forged report submission.
- Storage rules loaded successfully in the Storage emulator with the installed JDK 25; the machine's default Java runtime is too old for the current Firebase CLI.
- `git diff --check` passed before each completed checkpoint.

## Open warnings and blockers

- The shared web JavaScript chunk is approximately 927.05 kB minified; route-level/code splitting remains required before release.
- Suspended accounts and suspended claimed administrators are denied protected Firestore/Storage access, and unfiltered student listing queries cannot expose moderated records.
- Admin authorization uses trusted custom claims, while report submission/resolution, member status, and meetup settings route through callable Functions. `scripts/firebase/set-admin-claim.mjs` now provides a credential-free dry run and requires explicit apply/project confirmation; no real role has been provisioned.
- Report submission routes through a callable with reason-code validation, server-derived metadata, deterministic document IDs, per-account rate limiting, and a runtime-tested reopen path that safely clears stale resolution data.
- Callable emulator integration now covers duplicate and concurrent report operations plus moderation/audit atomicity. Additional callable coverage for member-status token-revocation failure outcomes and meetup-setting contention remains pending.
- Listing photos still require migration from inline/base64 data to Cloud Storage metadata and thumbnails, plus adversarial Storage-rule tests.
- The desktop admin has known forbidden-sign-in, expiry-warning, semantic-style, and responsive-layout gaps.

## Exact next action

Define the canonical listing-photo metadata contract, add adversarial Storage-rule tests, and begin emulator-first media migration/thumbnail/orphan-cleanup tooling before UI work.
