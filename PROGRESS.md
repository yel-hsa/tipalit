# TIPalit Delivery Progress

## Current milestone

Milestone 0 — Preserve work and establish truthful safety rails.

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
- Shape tests: 17/17 passed.
- Firestore rules tests: 54/54 passed after the first Milestone 1 security slice.
- Storage rules loaded successfully in the Storage emulator with the installed JDK 25; the machine's default JDK 17 is too old for the current Firebase CLI.
- `git diff --check` passed before each completed checkpoint.

## Open warnings and blockers

- The shared web JavaScript chunk is approximately 924.52 kB minified; route-level/code splitting remains required before release.
- Suspended accounts are now denied protected Firestore/Storage access, and unfiltered student listing queries can no longer expose moderated records.
- Admin authority still supports the preserved email/profile-role compatibility path; trusted custom claims and callable role provisioning remain required.
- Listing photos still require migration from inline/base64 data to Cloud Storage metadata and thumbnails.
- The desktop admin has known forbidden-sign-in, expiry-warning, semantic-style, and responsive-layout gaps.

## Exact next action

Continue Milestone 1 by moving administrator authority to trusted custom claims and routing moderation/account actions through authorized callable Functions. Add emulator tests for role escalation, suspended-admin access, direct privileged writes, atomic moderation/audit behavior, and forged report metadata before changing the UI or extracting `apps/admin`.
