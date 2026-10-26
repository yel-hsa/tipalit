# TIPalit Delivery Progress

## Current scope

Portfolio/demo prototype — fix blockers and core demo journeys only; defer production hardening and exhaustive edge cases.

- Branch: `milestone-0-preserve-and-stabilize`
- Base: `7e42332` (`Split the app into web, mobile, and shared service workspaces`)
- Preserve the existing monorepo and TIPalit visual identity; do not reorganize or redesign working functionality.
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
| `d83aff7` | Added real callable/Firestore emulator coverage for authoritative reports and moderation concurrency; added a no-write-by-default administrator-claim tool. |

Working tree checkpoint pending: trusted listing-media reservation/finalization/deletion, canonical photo metadata and thumbnails, durable cleanup, local rules/callable coverage, and emulator-only migration verification.

Machine-specific provider settings and `switch-provider.ps1` are intentionally ignored rather than shipped. Any real token previously stored in local `.claude` settings should be rotated outside this repository.

## Verified on 2026-10-26

The following commands passed from the repository root after the current media changes:

```text
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run test
git diff --check
```

Coverage confirmed:

- Shared services, actual web source, Expo mobile, and Cloud Functions typecheck.
- Vite emits student and admin pages; Functions compile; Expo exports web, iOS, and Android bundles.
- Function helper tests: 6/6 passed.
- Callable/emulator integration tests: 15/15 passed, including media create/edit/delete, idempotency, duplicate reservation, optimistic concurrency, cleanup expiration/retry/reference checks, and existing report/moderation flows.
- Shape tests: 17/17 passed.
- Firestore rules tests: 47/47 passed.
- Storage rules tests: 8/8 passed.
- Listing-photo migration fixture passed dry run, apply, and idempotent rerun against emulators, including dimensions, thumbnails, Storage objects, and mixed-array blocking.
- `git diff --check` passed; Git printed only LF-to-CRLF checkout warnings.

## Scope decisions and known non-blockers

- This is now a portfolio/demo prototype, not a production-readiness program.
- Use mock/emulator data when credentials or production infrastructure are unavailable.
- The shared web JavaScript chunk is approximately 951 kB minified and Expo web is approximately 1.7 MB. Builds pass; bundle optimization is deferred because it does not block the local demo.
- Firebase emulator output includes JDK `sun.misc.Unsafe` and Node `url.parse()` deprecation warnings. Tests pass; dependency-runtime cleanup is deferred.
- Member-status token-revocation failure testing, meetup contention, App Check, exhaustive cleanup edge cases, production migrations, deployment infrastructure, notifications, exchanges, advanced search, analytics, and privacy automation are explicitly deferred.
- No live migration, Firebase production mutation, role provisioning, push, deployment, or app-store action has occurred.

## Remaining prototype phases

1. Checkpoint the verified media/security working tree.
2. Verify and fix only blockers in the student journey: sign in → browse → create/edit listing → view listing → chat.
3. Verify and fix only blockers in basic report/listing/member moderation in the existing admin dashboard.
4. Apply focused responsive, loading/error/empty, accessibility, and TIPalit-brand consistency fixes on demonstrated screens.
5. Re-run typecheck, tests, builds, browser/device demo checks, and document launch steps.

## Exact next action

Review the current media/security diff for blocker-level issues, checkpoint it locally with required attribution, then run the existing student web and mobile demo journeys using mock/emulator data before making any broader UI changes.
