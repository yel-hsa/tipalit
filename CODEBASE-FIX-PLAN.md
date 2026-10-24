# TIPalit remediation plan

> Corrections applied after the reviewers ran: briefing bug #6 (`profiles.save` rejected by rules) is **false** — `program` is an allowed update key at `firestore.rules:59`. In its place, the real blocker on that path is bug **1.1**: an admin's first sign-in writes `role: 'admin'` on create, which `firestore.rules:53` pins to `'member'`, so the sign-in is denied. Verified in `src/services/firebase/auth.ts:141-171`. Correct addressed separately below.

## Verdict

Of the briefing's 12 bugs, **9 are real, 2 are half-real, and 1 is false**. False: the `profiles.save` update payload is *inside* the `firestore.rules` allowlist (`program` is at rules:59), so profile editing is not broken by rules. Half-real: the analytics "members=0" bug is real, but the briefing's fix (count() aggregates) would *introduce* a new bug because count() honours rules, so moderated listings and other reporters' reports are excluded; and "seller can revive a removed listing through the edit form" is wrong: no seller-facing writer touches `status` today, the escalation is latent in unwired `chat.setListingStatus`. Real: admin first sign-in denied (`role` not pinned to member), stale `department`-first reads, `removed` vs `hidden` vocabulary split, admin.ts doing client writes instead of the callable, the Function's cascade missing (`target.id` vs flat `target_id`, `subject_id` vs `subjectId`), fabricated seed reports in the Firebase adapter, seeded/unknown-report fabrication in resolveReport, timestamp field drift, per-category image fallback, chat error swallowing, and the rate() reviewee bug.

Reviewer objections that **materially change** a fix: (1) admin branch of the listings update rule drops the `report_count` guard; (2) the callable client returns a fabricated Report for a missing id (unconditional assignment makes `if (!report)` dead); (3) the analytics count() rewrite is rules-inexact; (4) truncating the `onReviewWritten` aggregate behind the early-exit makes `admin_stats` never increment on create; (5) the admin_stats reader can re-introduce the invalid-rating bug; (6) the `chat.rate` reviewee bug is the *opposite* of the specialist's diagnosis (chat *does* write `seller_id`; the bug fires when the seller rates); (7) the ErrorBoundary must sit *inside* TipalitApp keyed by route, not above it; (8) the useDialogFocus rewrite's Escape handler is dead code (`dialogEl` never assigned) so BottomSheet loses Escape; (9) Fix3's `is_verified` conjunct denies on legacy docs missing the field; (10) Fix2's mock stub (`campus: null`) resets the whole mock profiles store via `hasShape`. The plan below ships only corrected diffs.

---

## Wave 1 — unblock live Firebase sign-in and the feed (blocks a pilot; some data corruption)

These must land before a real pilot: admins cannot sign in, and the feed/seller edit of a listing writes a second status vocabulary.

**1.1 Admin first sign-in denied by `role` on create** (S) — `src/services/firebase/auth.ts:150-171`.
```ts
          } else {
            // Minimum rules-valid create: firestore.rules:53 pins role to
            // 'member'. Admins are recognised by token email (rules + getSession).
            // No campus/program/year: absence keeps isProfileComplete() false.
            await setDoc(
              userDocRef,
              {
                user_id: user.uid,
                email,
                full_name: nameFromUser(user),
                is_verified: true,
                role: "member",
                status: "active",
                joinedAt: new Date().toISOString(),
                created_at: serverTimestamp(),
              },
              { merge: true },
            )
          }
```
Mock parity: add the same shape (no `campus: null`, which `hasShape` rejects) to `src/services/mock/auth.ts` and dedupe `directory.listPeople` by userId; change `mock/accounts.ts:29-33` `requireAdmin` to `session.role === "admin" || roleForEmail(session.email) === "admin"`. Files: `firebase/auth.ts`, `mock/auth.ts`, `mock/accounts.ts`, `mock/directory.ts`.

**1.2 Read `program` before `department`** (S) — `src/services/firebase/profiles.ts:51,148` and `src/services/firebase/admin.ts:223,260`. Swap `data.department || data.program` → `data.program || data.department`. Keep writing both. Rules: no change.

**1.3 `hidden` is the only moderated status; owner cannot write a status enum outside active/reserved/sold; report_count stays server-only** (M) — `firestore.rules`. Corrected rules (keeps `report_count` on BOTH branches):
```
    function isModeratedStatus(s) {
      return s == 'hidden';
    }

    match /listings/{listingId} {
      allow read: if isTipStudent() && (
        !isModeratedStatus(resource.data.status) ||
        resource.data.seller_id == request.auth.uid ||
        isAdmin()
      );
      allow create: if isTipStudent()
        && request.resource.data.seller_id == request.auth.uid
        && request.resource.data.report_count == 0
        && request.resource.data.status == 'active';
      allow update: if listingOwnerOrAdmin()
        && !request.resource.data.diff(resource.data).affectedKeys()
             .hasAny(['report_count'])
        && (
          isAdmin() ||
          (!isModeratedStatus(resource.data.status)
            && request.resource.data.status in ['active', 'reserved', 'sold'])
        );
      allow delete: if listingOwnerOrAdmin();
    }
```
Client polarity fix (the specialist got the sign inverted): drop `!== 'hidden' && !== 'removed'` → `status !== 'hidden'`. **Do not** change the feed `not-in ['hidden']` yet (see 1.7). Also fix `toListing` so a moderated doc never reads as `active` (specialist missed this): in `firebase/listings.ts:39`, keep unknown → `'active'` but gate the feed/`getMany` surface on status; safest minimal version is to add `'hidden'` handling to the STATUSES map by returning the raw string when it isn't one of the three and letting the UI badge it. uncertain: whether ProductCard tolerates a `'hidden'` badge; landing the migration (1.7) before exposing it is safer. Migration (one-off Admin SDK script in `functions/`): `db.collection('listings').where('status','==','removed').get()` → batch set `status: 'hidden'`.

**1.4 `chat.rate` reviewee is the seller when the seller rates** (S) — `src/services/firebase/chat.ts:294-329`. Corrected: chat DOES write `seller_id` (chat.ts:147), so the bug is the ternary. Compute before `updateDoc`, rethrow ServiceErrors unchanged.
```ts
          const chatData = chatSnap.exists() ? chatSnap.data() : {}
          const listingId = (chatData.listing_id || chatData.listingId || "") as string
          const buyerId = (chatData.buyer_id || chatData.buyerId || "") as string
          let sellerId = (chatData.seller_id || chatData.sellerId || "") as string
          if (!sellerId && listingId) {
            const listingSnap = await getDoc(doc(db, "listings", listingId))
            sellerId = (listingSnap.data()?.seller_id as string) || ""
          }
          const revieweeId = uid === sellerId ? buyerId : sellerId
          if (!revieweeId || revieweeId === uid) throw new ServiceError("invalid", "Couldn't finish the review.")
          // ... then updateDoc the message rating
        } catch (err) {
          // Keep a real ServiceError; map anything else to network.
          if (err instanceof ServiceError) throw err
          console.error("[TIPalit Firebase Chat] Rate review error:", err)
          throw new ServiceError("network", "Couldn't save your rating.")
        }
```

**1.5 Chat methods throw instead of swallow** (S) — `firebase/chat.ts` `openThread` (setDoc only), `respondToMeetup`, `completeMeetup`, `rate`. The three lint-clean additions:
```ts
        } catch (err) {
          console.error("[TIPalit Firebase Chat] Respond to meetup error:", err)
          throw new ServiceError("network", "Couldn't send your response.")
        }
```
(and identical shapes for completeMeetup / rating). Existing-thread lookup falls through: `await getDocs(q).catch(() => null)`; `if (snap && !snap.empty)`.

**1.6 App chat handlers show the real message** (S) — `src/App.tsx:859, 871, 903` (sendMessage at :831 and proposeMeetup at :844 keep bare catch; the reviewer is right that fix 2's first hunk is unreachable). `catch (error) { ... notify(errorMessage(error, "Couldn't send your response."), "error") }`.

**1.7 Migration + feed vocabulary drop** (S) — after 1.3's migration script has run and been verified: `where('status','not-in',['hidden','removed'])` → `where('status','not-in',['hidden'])` and drop the `'removed'` branch in `listMine`. Do **not** combine with the `status == 'active'` query (Wave 3) — that is a product change.

---

## Wave 2 — make moderation trustworthy (data integrity, Function + rules deploy)

**2.1 Route `AdminService.resolveReport` through the callable** (M) — `firebase/config.ts`, `firebase/admin.ts`, `firebase/index.ts`. Corrected: return the report only when the pre-read `snap.exists()`, let `not_found` surface, and preserve the not-configured branch.
```ts
import { httpsCallable, type FunctionsError } from "firebase/functions"
// config.ts
export const getFirebaseFunctions = (): Functions => {
  if (!functionsInstance) functionsInstance = getFunctions(getFirebaseApp())
  return functionsInstance
}
// admin.ts
    if (!isFirebaseConfigured()) throw new ServiceError("forbidden", "Only admins can do that.")
    const reportRef = doc(db, "reports", id)
    let data: Record<string, any>
    try {
      const snap = await getDoc(reportRef)
      if (!snap.exists()) throw new ServiceError("not_found", "This report no longer exists.")
      data = snap.data()
    } catch (err) {
      if (err instanceof ServiceError) throw err
      throw new ServiceError("network", "Couldn't update report. Check your connection.")
    }
    try {
      await httpsCallable(getFirebaseFunctions(), "resolveReport")({ reportId: id, action, note })
    } catch (err) {
      throw codeForCallableError(err)  // permission-denied/authenticated/not-found/invalid-argument
    }
    return buildReportFromDoc(id, data)   // the specialist's object literal
```
Keep the existing `import` line and add `getFirebaseFunctions` to it (reviewer: no duplicate binding). `auditActorName` helper for `listAudit:326` accepts camelCase, snake, and `resolution.byName` — but note the client's own `logAudit` already writes camelCase, so this only fixes Function-written rows (specialist's overclaim).

**2.2 Fix the Function's cascade, subjectId, and audit** (S) — `functions/src/index.ts:97-146`. Use `tx.get` for the sibling reads, both shapes, guard ids, dual-field audit:
```ts
    const report = reportSnap.data()!
    const targetKind = report.target?.kind ?? report.target_type
    const targetId = report.target?.id ?? report.target_id
    const subjectId = report.subjectId ?? report.subject_id
    // ... resolve action ...
    const siblings = await Promise.all([
      tx.get(db.collection('reports').where('target.id', '==', targetId).where('status', '==', 'open')),
      tx.get(db.collection('reports').where('target_id', '==', targetId).where('status', '==', 'open')),
    ])
    // dedupe by doc id, skip reportId, tx.set status resolved
    if (action === 'remove_listing' && targetKind === 'listing' && targetId) {
      tx.set(db.collection('listings').doc(targetId), { status: 'hidden', hidden_reason: 'reports' }, { merge: true })
    }
    if (action === 'suspend_member' && subjectId) {
      tx.set(db.collection('users_profile').doc(subjectId), { status: 'suspended', updated_at: at }, { merge: true })
    }
    const auditAction = action === 'remove_listing' ? 'listing_removed'
      : action === 'suspend_member' ? 'member_suspended' : 'report_dismissed'
    tx.set(db.collection('audit_log').doc(), {
      at, actorName, actor_name: actorName, action: auditAction,
      summary: `${actorName} resolved a report (${action}).`, note, report_id: reportId,
    })
```
Do **not** add `FieldValue.serverTimestamp()` (it fights the `at` string the reader sorts on; and `FieldValue` is imported but on the admin SDK path `FieldValue.serverTimestamp()` is the right constant — leave it out to keep one ordering key). uncertain: `tx.get` inside `runTransaction` is supported on the Node admin SDK but returns a `Transaction.Get` promise, do not `await Promise.all` of *two* `tx.get` — sequential is safer. Mock: no change needed (mock/admin.ts:46-51 already cascades); document the divergence is now closed.

**2.3 Delete seeded-report/audit fallbacks and mask fewer errors** (S) — `firebase/admin.ts` (imports, three catches). Throw `ServiceError('network', …)` from `listReports`, `listMembers`, `listAudit`; empty collection returns `[]`. Add `toServiceError` (Wave 3) here for `setMemberStatus` / `saveMeetupSpots`.

---

## Wave 3 — make failures visible and the admin usable (deployable after 2.3)

**3.1 AdminScreen Marketplace: real loading/error/empty states** (S) — `AdminScreen.tsx:297-320`. Reviewer: `LoadError` has no `compact` prop — use `className`; clear `overviewError` on success and in `clearData`.
```tsx
            <section aria-labelledby="market-title" className="flex flex-col gap-md">
              <p id="market-title" role="heading" aria-level={2} className="text-label font-semibold text-text-primary">Marketplace</p>
              {overviewError ? (
                <LoadError what="marketplace totals" onRetry={onRetryOverview} className="py-md" />
              ) : !overview ? (
                <div className="grid grid-cols-3 gap-md" aria-hidden="true">
                  {[0, 1, 2].map((key) => (<Skeleton key={key} className="h-20 rounded-corner-lg" />))}
                </div>
              ) : ( /* existing Stat grid + rating row */ null )}
            </section>
```

**3.2 App.tsx admin load: allSettled so one failure doesn't blank the tab** (S) — `App.tsx:394-414`. Split core (`reports`, `members`, `audit`) from `analytics`, make `overview: AnalyticsOverview | null`, clear `overviewError` in `clearData` (:218-231) and on success.

**3.3 Analytics: real members count, drop zero-swallow** (M) — supersede the specialist plan. Reviewer: count() honours rules. Corrected: keep `count()` only for `users_profile` (simple readable rule, rules:47); use `getDocs`+`status` filter for listings/reports *from the admin's own readable set* (that's what the admin sees anyway) or, better, `settings/admin_stats` maintained counters (3.4). For the pilot: members via `getCountFromServer`, activeListings/completedExchanges via `getDocs(query(collection(db,'listings'), where('campus','==',campus)))` filtered in memory (admin can read all), openReports from the already-fetched `reports` list (pass it in — this *also* fixes the "two disagreeing counts" the reviewer flagged). Remove the `catch → zeros`; let the App wrap it.

**3.4 `admin_stats` rating: increment, not "if (!before) return"** (S) — `functions/src/index.ts:39-69`. The early-exit at :43 fires on every create, so the specialist's appended block never runs. Corrected placement **before** the early exit:
```ts
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!after) return
  const rating = Number(after.rating)
  if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
    const prev = before && Number.isFinite(Number(before.rating)) ? Number(before.rating) : null
    await db.collection('settings').doc('admin_stats').set(
      { reviews_sum: FieldValue.increment(prev === null ? rating : rating - prev) },
      { merge: true },
    )
  }
  if (before?.rating === after.rating) return   // existing per-profile aggregate stays below
```
`reviews_total` is only incremented on create, filtered by the same guard (fixes reviewer 5/6). Backfill: one-off sum of existing reviews.

**3.5 `listMembers` real per-member counts** (M) — reviewer: the diff's diff counted `reserved`. Final: `where('status','==','active')` only (mock parity, mock/admin.ts:36).

---

## Wave 4 — polish and hardening (independent; any time)

**4.1 Listing `created_at` canonical + `toIso`, backfill looped with `startAfter`** (M) — `firebase/listings.ts`. Use the duck-typed branch only in the migration (functions/ has no `firebase` package).

**4.2 Feed: `status == 'active'` + `orderBy('created_at','desc')` + index; two-stage** (M) — stage A ships status filter with the existing client sort; stage B adds orderBy after the index shows Enabled. Also add the missing suspended-seller filter (reviewer: mock has it, Firebase doesn't). Remove the false "not-in needs an index" claim.

**4.3 Image fallback via `resolveImages`** (S) — validate category against a whitelist before indexing `CATEGORY_FALLBACK_IMAGES` (reviewer: `'CBA Dept'` yields `undefined`).

**4.4 `reserved` end-to-end seller-side** (M) — `ProductDetailScreen` Reserve button (match the actual single-button footer; widen to `flex flex-col`), `ProfileScreen` Active tab `status !== 'sold'` **with a new `liveCount` variable** (reviewer: it doesn't exist), ChatThreadScreen reserved banner gated on `!sold`, `ChatListScreen` prefix. Delete `chat.setListingStatus` (zero callers — correct reason; drop the specialist's false `listing_status` claim).

**4.5 ErrorBoundary inside TipalitApp, keyed by route** (S) — reviewer: boundary above TipalitApp never resets. `main.tsx` outer boundary is a last resort (no resetKey); inner `<ErrorBoundary key={route.name} what="This screen">{screen}</ErrorBoundary>` **inside** PhoneShell, and move `ThemeProvider` to `main.tsx`.

**4.6 useDialogFocus: rewrite the Escape effect correctly** (M) — the specialist's `dialogEl` is never assigned. Corrected: assign inside the mount effect and use a `useRef` for the topmost dialog; BottomSheet must not delete its Escape until (a) lands.
```ts
      const dialogEl = bodyRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || busyRef.current) return
        if (dialogEl && dialogEl !== topDialogRef.current) return
        event.preventDefault()
        escapeRef.current?.()
      }
```
Also: `aria-disabled` gets a `data-dialog-close` marker on ReportModal/RateModal's Cancel/Skip (the specialist left them unmarked).

**4.7 Reviewer gating via `import.meta.env.DEV`** (S) — `reviewer.ts`, `App.tsx:148/1262/1334`, `ProfileScreen` tap. Note `vite preview` is a prod build: the README's Figma-preview workflow needs `VITE_REVIEWER_MODE=true pnpm build`. Add `tsc --noEmit` to verify (package.json build is `vite build` only).

**4.8 Session guard: capture gen at function top, not call site** (M) — reviewer: `refreshAdmin(sessionRef.current)` evaluates at call time. Use `const gen = sessionRef.current` as the *first* line inside `fetchThreads`/`fetchAdmin`/`cacheListings`/`ensureSellers`; add `sellers`/`promotions`/`overview` to `clearData`.

**4.9 Rollback: prefer server-truth re-read** (S) — `setListingStatus` rollback should `getMany([id])` rather than apply the stale snapshot; implement the "was-absent → remove from cache" branch.

---

## Deploy checklist

1. **Emulator first.** `cd functions && pnpm emulators:exec -- "pnpm test:rules"` (rules-unit-testing is a devDependency). Cover: seller writes `hidden` → DENY; seller un-hides → DENY; seller writes `removed` → DENY; seller normal edit and active→sold → ALLOW; seller writes `report_count` → DENY; osa.admin sets hidden then active → ALLOW; osa.admin writes `report_count` → DENY (regression guard); admin `setMemberStatus` on a legacy doc with **no `is_verified`** → ALLOW (legacy-doc regression).
2. **Order of operations (strict):** (a) run migration `removed → hidden`; (b) deploy `firestore:rules` alone; (c) deploy `functions` (the Function writes `hidden`, which the new rules already permit, and the SDK bypasses rules anyway — so functions-before-rules is also safe; rules-before-client is **not** optional); (d) only then ship the client bundle that calls the callable and drops `removed` from its filter. If the client with the callable ships before functions, every resolve fails with the network-mapped error — acceptable degradation, no data loss; if the client drops `removed` before the migration, moderated docs leak into the feed.
3. `firebase deploy --only firestore:indexes` is **not** required for 1.3–1.7 or 2.x. It *is* required for 4.2's `orderBy('created_at')` — deploy and wait for Enabled.
4. Rollback: redeploy the previous `firestore.rules`; the Function's `'hidden'` writes remain valid under the old rules (they are server writes).

## Verification (no test suite)

**Wave 1.** Fresh project: sign in with `osa.admin@tip.edu.ph` → no permission-denied, lands on onboarding (fresh admin); sign in as a member → onboarding, then edit Program only → reload → new program shown. Seller edits a listing → succeeds. Report a listing 5× → gone from feed, seller sees no edit. As seller, set status `'reserved'` → allowed. Rate a completed exchange **as the seller** → reviews doc has `reviewee_id == buyer`, not self. (Mock: delete `tipalit.v1.profiles` and sign in → same.)

**Wave 2.** Seed two open reports on one listing (one flat `target_id`, one nested). Admin → Remove listing → listing `status == 'hidden'`, both reports `resolved`, one new audit row with a non-blank actor. Resolve a deleted report → "This report no longer exists." (sheet stays open). Non-admin calls the callable from console → "Only admins can do that."

**Wave 3.** Emulator: 2 active + 1 sold → Active 2 / Exchanges 1; create a `users_profile` → members +1. Deny analytics read → Marketplace shows error+Retry while Reports/Members/Log still render (tab does not go to LoadError). Write reviews 4★ and 5★ → Avg 4.5; change one to 3★ → 4.0.

**Wave 4.** Create two listings in the same second → order is `created_at` desc then `__name__` (deterministic but unasserted); backfill paginated log shows every page. Crash a screen (throw in FeedScreen), navigate away → fallback clears without reload. Keyboard-only through all 6 dialogs → Escape closes BottomSheet.

**Tests worth adding first** (rules-unit-testing already installed): (1) listings update rules matrix above; (2) `getSession`/`saveProfile` round-trip against the emulator; (3) the `resolveReport` callable's input validation; (4) `toIso`/`resolveImages` unit tests.

## Do not fix

- **`profiles.save` "fails because rules forbid `program`"** — false; `program` is allowed (rules:59). Only the read-preference change in 1.2 is real.
- **The mock's synchronous admin/profiles behaviour and mock-only seed data** — deliberate; seeds belong in the mock store.
- **`setStatus` writing only active/reserved/sold** — correct by design; the rules already pin it.
- **`isAdmin()` trusting profile `role`** — sound today (role is unwritable by clients); keep the Fix3 comment only, do not add the `is_verified` conjunct (breaks legacy docs).
- **`vite preview` losing the 7-tap toggle** — intended consequence of the prod gate; document, don't work around.
- **`reviews_total`/`total_reviews` float drift and delete-reconciliation** — out of scope for a pilot; note for a later scheduled job.
- **Reviewer nits dismissed:** `FieldValue.serverTimestamp()` in the audit doc (rejected outright above), `compact` prop on LoadError (trivial, use `className`), `stronger` error codes for the callable (`forbidden`/`not_found` mapping is enough), `inert` walk correctness (defer; the Tab trap already prevents keyboard escape and the stacked-dialog scroll bug is fixed by the counter), `ReportModal` hard-coded `id` (real but belongs with its own PR).