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
- Firestore rules tests: 48/48 passed.
- `git diff --check` passed before the validation commit.

## Open warnings and blockers

- The shared web JavaScript chunk is approximately 924.52 kB minified; route-level/code splitting remains required before release.
- A green Firestore rule test currently demonstrates that a query without a status filter can see a removed listing. This is a known security defect, not acceptable release behavior.
- Current rules do not consistently enforce active account status for existing sessions.
- Admin authority and privileged writes are not yet fully claim-based, Function-only, atomic, idempotent, and audited.
- Listing photos still require migration from inline/base64 data to Cloud Storage metadata and thumbnails.
- The desktop admin has known forbidden-sign-in, expiry-warning, semantic-style, and responsive-layout gaps.

## Exact next action

Begin Milestone 1 with emulator-first adversarial tests that fail for suspended-account access and removed-listing query leakage. Then tighten shared authorization/visibility helpers in Firestore rules without weakening owner/admin access, update indexes/adapters as required by query constraints, and rerun all rule, shape, typecheck, and production-build gates before committing the first security slice.
