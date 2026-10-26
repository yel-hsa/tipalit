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
| `1cdf3f4` | Secured listing media for emulator demos: trusted reservation/finalization/deletion, canonical photo metadata and thumbnails, durable cleanup, local rules/callable coverage, and emulator-only migration verification. |
| `e45f895` | Completed the student and admin demo journeys: emulator connectors and lazy adapter initialization, mobile listing edit mode and owner-facing edit action, required moderation audit notes, trusted `removeListingAsAdmin`, and emulator-aware media URLs. |
| `09e7857` | Reconciled the handoff docs with the committed demo journeys. |
| `3bc0471` | Polished the admin console UI/UX: defined the six animation utilities the components already referenced, added a drawer exit animation, inline confirm states with aria-labels on destructive moderation actions, and clear-filters recovery in every section's empty state. |
| `6ac8808` | Gave `BottomSheet` the exit animation `SlideOver` already had, and fixed both overlays painting a stale exit frame when reopened. |
| `28d9a10` | Defined the admin shell's missing `w-sidebar`, `max-w-content`, and `skip-link` classes; the unpositioned skip link was rendering as a full-height flex child and collapsing the console layout. |
| `6110c7e` | Defined the admin console's nine missing design tokens (`text-cell`, `text-cell-strong`, `text-metric`, `text-section`, `text-th`, `text-page`, `gap-2xs`, `bg-scrim`, `text-on-scrim`) derived by a 30-agent workflow; all reuse existing type/space scales, cells stay 16px so the 84 cell usages are a no-op except weight emphasis. |
| `46d964b` | Replaced the Astra `SelectField` with an accessible local version: unique per-instance IDs via `useId` and a real accessible name, fixing the kit's hardcoded duplicate `select-list` IDs and unassociated label across the Reports filters and every multi-select screen. |
| `e110a52` | Made the admin data-table sticky header opaque: moved stickiness onto the `<th>` cells (works under `border-collapse`), gave them `bg-surface-bg` and `z-10`, and put the bottom border on the cells so scrolling rows no longer show through. |
| `b793458` | Standardized admin UI tokens from a 25-agent audit: added the missing `--warning-soft` token (warning badges had transparent backgrounds), gave EmptyState the standard card border, normalized section gaps and icon-chip tones, aligned badge variants, and replaced raw `text-white`/`bg-black/40` with `text-on-brand`/`bg-modal-scrim`. |

Machine-specific provider settings and `switch-provider.ps1` are intentionally ignored rather than shipped. Any real token previously stored in local `.claude` settings should be rotated outside this repository.

## Demo journey fixes (committed in `e45f895`)

The student, admin, emulator, and media-URL fixes that make the demo journeys runnable are committed in `e45f895`; the working tree is clean:

- Lazy shared-service adapter initialization, so host bootstraps configure the adapter before first use.
- Auth, Firestore, Functions, and Storage emulator connectors, plus web and Expo emulator opt-in environment variables.
- Mobile mock sign-in uses a normal student account instead of the administrator seed.
- Mobile listing edit mode and edit overlay; owner-facing **Edit listing** action on listing details.
- Required audit notes for report and member moderation.
- Trusted `removeListingAsAdmin` callable with shared Firebase/mock adapter methods; administrator listing removal routed through `services.admin.removeListing(...)`.
- Emulator-aware listing-media download URLs and configurable Functions Storage bucket selection.
- Callable coverage for administrator listing removal and emulator media URLs.

## Verified on 2026-10-26

The following commands passed from the repository root after the current changes:

```text
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run build
git diff --check
```

Coverage confirmed:

- Shared services, web, Expo mobile, and Cloud Functions typecheck.
- Function helper tests: 6/6 passed.
- Callable/emulator integration tests: 17/17 passed, including media create/edit/delete, idempotency, duplicate reservation, optimistic concurrency, cleanup expiration/retry/reference checks, administrator listing removal, emulator media URLs, and existing report/moderation flows.
- Shape tests: 17/17 passed.
- Firestore rules tests: 47/47 passed.
- Storage rules tests: 8/8 passed.
- Listing-photo migration fixture passed dry run, apply, and idempotent rerun against emulators, including dimensions, thumbnails, Storage objects, and mixed-array blocking.
- Vite emits student and admin pages; Functions compile; Expo exports web, iOS, and Android bundles.
- `git diff --check` passed; Git printed only LF-to-CRLF checkout warnings.

## Browser verification performed

Student web journey verified end-to-end in the running Vite app with mock data: sign in → browse feed → create listing → edit listing → view listing detail → chat.

Admin moderation verified locally with the seeded administrator: view reports, resolve/dismiss a report with a required note, view listings and remove one through the trusted callable, view members and suspend/reinstate with a required note, and confirm non-admin users get a clear denied state.

Desktop layout verified by DOM measurement at 1440×900 (bounding boxes and `scrollWidth` only, no screenshots):

| Screen | Shell / main width | Horizontal overflow | Overflowing elements |
| --- | --- | --- | --- |
| Feed | 390 px phone shell, centered | none | 0 |
| Listing detail | 390 px phone shell, centered | none | 0 |
| Edit listing | 390 px phone shell, centered | none | 0 |
| Chats | 390 px phone shell, centered | none | 0 |
| Admin console | 778 px main, no clipping | none | 0 |

The student web app is constrained by `PhoneShell` to a 390 px centered frame at desktop widths; the admin console uses the full desktop width.

Mobile: Expo web export builds and the mock journey is the supported local path. Native Expo Firebase authentication still uses a web-oriented popup implementation, so native OAuth is not a supported demo path.

## Scope decisions and known non-blockers

- This is a portfolio/demo prototype, not a production-readiness program.
- Use mock/emulator data when credentials or production infrastructure are unavailable.
- The shared web JavaScript chunk is approximately 952 kB minified and the Expo web bundle is approximately 1.8 MB. Builds pass; bundle optimization is deferred because it does not block the local demo.
- Firebase emulator output includes JDK `sun.misc.Unsafe` and Node `url.parse()` deprecation warnings. Tests pass; dependency-runtime cleanup is deferred.
- Member-status token-revocation failure testing, meetup contention, App Check, exhaustive cleanup edge cases, production migrations, deployment infrastructure, notifications, exchanges, advanced search, analytics, and privacy automation are explicitly deferred.
- No live migration, Firebase production mutation, role provisioning, push, deployment, or app-store action has occurred.

## Local launch

From the repository root:

```text
corepack pnpm dev          # web on http://127.0.0.1:8443/
corepack pnpm dev:mobile   # Metro; scan the QR code with Expo Go
```

The desktop admin console is served at `http://127.0.0.1:8443/admin.html`.

Mock is the default when Firebase configuration is absent. Emulator clients are enabled with the existing host flags; see `apps/web/bootstrap.ts` and `apps/mobile/src/bootstrap.ts` for the exact variables.

Seeded demo accounts:

```text
Student: Bea Lim <bea.lim@tip.edu.ph> — TIP Manila, BS Computer Science, 3rd year
Admin:   Office of Student Affairs <osa.admin@tip.edu.ph>
```

## Admin console polish (committed in `3bc0471`)

Verified in the running app with DOM assertions (no layout screenshots):

- All six animation utilities resolve to real keyframes with the intended durations; `.stagger` produces cascading delays of 0–196 ms across eight member rows.
- Drawer exit animation runs `tip-drawer-out` and unmounts after 200 ms; `prefers-reduced-motion` skips the delay and closes immediately.
- Drawer focus trap: `aria-modal="true"`, focus lands inside the dialog, three sibling regions become `inert`, and the destructive action renders in danger red against a neutral Cancel.
- Empty-state recovery restores all 17 rows and clears the search box; the Clear filters button then disappears.
- No horizontal overflow at 1536×770 (`document.scrollWidth === window.innerWidth === 1536`).
- Both overlays verified in the running app: `SlideOver` plays `tip-drawer-in` (260 ms) and `tip-drawer-out` (200 ms); `BottomSheet` plays `tip-sheet-in` (200 ms) and `tip-sheet-out` (180 ms) with the scrim fading in and out. Each unmounts after its exit and replays the entrance on reopen.

The Astra `SelectField` duplicate-ID / missing-accessible-name defect is fixed in `46d964b` by a local accessible replacement; see the section below.

## Admin design tokens (committed in `6110c7e`)

The Figma Make export referenced nine utility classes that were never defined, so they silently did nothing across 97 usages in 20 files. A 30-agent workflow (six evidence lenses, three independent proposals, a three-judge panel, then two adversarial verifiers per token) derived each value from the repo's own type/space scales and the Astra kit. The regression verifiers overrode the judges' winning 14px `text-cell` to keep cells at the inherited 16px — the 84 cell usages are a strict no-op except for the intended weight emphasis.

Final mapping (all reuse existing tokens; no new values, no palette change):

| Class | Value | Renders |
| --- | --- | --- |
| `text-cell` | `--type-label-size` / 1.4 / 400 | 16px/400 (no-op) |
| `text-cell-strong` | `--type-label-size` / 1.4 / 600 | 16px/600 |
| `text-metric` | `--type-title-size` / 1.4 / 600 | 24px/600 |
| `text-section` | `--type-heading-size` / 1.4 / 500 | 20px/500 |
| `text-th` | `--type-meta-size` / normal / 500 | 12px/500 |
| `text-page` | `--type-title-size` / 1.4 / 600 | 24px/600 |
| `gap-2xs` | `--space-xs` | 4px |
| `bg-scrim` | `--overlay-control-bg` | dark scrim |
| `text-on-scrim` | `--on-overlay` | white |

Verified: typecheck, tests, and build pass; all nine classes generate in the built CSS; DOM assertions on the running console confirm `text-cell` 16/400, `text-cell-strong` 16/600, `text-metric` 24/600, `text-section` 20/500, `text-th` 12/500, `text-page` 24/600, `gap-2xs` 4px, `bg-scrim` #1c1b1aa6, `text-on-scrim` white.

## Accessible SelectField (committed in `46d964b`)

The Astra kit's `SelectField` hardcoded `id="select-list"` / `aria-controls="select-list"` and rendered its label as an unassociated `<span>`, so the three Reports filters produced duplicate IDs and the comboboxes had no accessible name. The kit accepts no `id`/`aria-*` passthrough, so the fix is a local drop-in replacement (`apps/web/components/SelectField.tsx`) that mirrors the kit's visuals and full keyboard interaction but generates unique IDs via `useId` and wires `aria-labelledby` / `aria-controls` / `aria-activedescendant` correctly. The three consumers (`Toolbar`, `AddListingScreen`, `ProfileFields`) now import it.

Verified in the browser on the Moderation queue: three comboboxes each get a unique `aria-labelledby`, accessible names resolve to Status / Target / Campus, and there are zero duplicate IDs in the DOM. Typecheck, tests, and build pass.

## UI/UX consistency audit (committed in `e110a52` + `b793458`)

A 25-agent audit (4 auditors across sticky/tables, badges/status, spacing/alignment, and token-parity lenses; a synthesizer; then 2 QA lenses per proposed fix) cataloged 34 findings. 8 tokenized fixes passed both QA lenses and are applied; all keep the existing design language intact and use existing tokens.

Applied: the sticky-header opaque fix (`e110a52`); the missing `--warning-soft` token (warning badges rendered with no background); EmptyState card border; Dashboard section-gap and icon-chip tone normalization; Audit row-padding alignment; member-badge variant alignment; and `text-white`/`bg-black/40` → `text-on-brand`/`bg-modal-scrim`. Browser-verified; typecheck, tests, and build pass.

Two proposed fixes were rejected by QA and deferred: the Dashboard Panel-header `px-xl→px-lg` change would misalign the header from its `p-xl` body, and the "Needs attention" row-density change rested on a wrong premise (the compact preview density appears intentional).

Open decision items (need the user; none are safe to auto-apply):
- Mobile palette diverges from web (green `#1f6f4a` vs gold `#f9c80e`) — recoloring mobile conflicts with "keep palette intact".
- Border-radius scales share names but not values (web 4/8/16/999 vs mobile 8/12/18/999).
- Mobile spacing/typography scales are structurally different (space(n)=n*4, no Instrument Sans).
- 'Sold' status renders as three different badge variants across surfaces (admin-neutral vs student-danger).
- Badge success/danger soft-tint pairs fall short of 4.5:1 contrast in light theme.
- AuditSection day headings use the table-header type token; icon tiles use two shape/size combos; shell header insets differ; Toolbar uses fragile baseline nudges; no table-level loading skeleton.

## Exact next action

None required for the agreed demo scope. The remaining work is explicitly deferred production hardening listed above; any deployment, push, live Firebase change, or role provisioning needs explicit approval first.
