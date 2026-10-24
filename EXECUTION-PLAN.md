# TIPalit — Execution Plan

Repo `TIPalit_Handoff_Frontend`, baseline `a573f78`, project `tipalit-firebase`.

## 1. State of the live backend

**Proved**
- 10 composite indexes live (8 listings, 2 chats), `fieldOverrides` empty, `SPARSE_ALL`. Each carries an implicit trailing `__name__`.
- Live is **ahead of the file by one**: `listings campus:A, status:D, __name__:D`. No local index is missing from live. The raw-diff "6 missing" is explicit-vs-implicit `__name__`. That index is used by no current query.
- The feed query (`campus ==` + `status not-in`, no `orderBy`) **is served index-side** by live `campus:A/status:A` and `campus:A/status:D`. The plan's "not-in needs an index" blocker is false. Real blockers: unverified deployed rules, `createdAt`/`created_at` drift, and the second vocabulary `removed`.
- A real gap: `reviews (reviewee_id ASC, created_at DESC)` — used by `listReviews` (`src/services/firebase/chat.ts:336-340`), absent live and locally. That query fails today.
- Cloud Functions API `SERVICE_DISABLED`; `functions:list` 403s. IAM is fine — this is API enablement.
- `functions/` has no `node_modules`, no lockfile, no `lib/`; `functions/src/` holds only `index.ts`. `npm test` runs zero specs.
- The Firestore emulator runs **only** with `JAVA_HOME=C:/Program Files/Java/jdk-25` (default `java` is JDK 17; firebase-tools 15.11.0 refuses it).
- `npx --no-install tsc --noEmit` exits 0 — the only always-green gate.
- `firebase.json` has no `hosting` block. No Firebase path ships the frontend; there is no `firebase deploy --only hosting`.

**Unknown (uncertain)**
- **Whether deployed Firestore rules match local `firestore.rules`.** MCP did not connect; a REST read was blocked. This is the single most important unknown and gates every rules deploy.
- Whether any Function is deployed (API disabled). Inference: none ever has been; any would be in `us-central1` (`index.ts` sets no region).
- Whether running the emulator with `--only functions` succeeds (needs `npm install` + a tsc build first).

## 2. Index drift — do this before any index deploy

`firebase deploy --only firestore:indexes` today is **misleading and potentially destructive**: it diffs file against live, so it may propose deleting the live `campus/status/__name__:DESC` index while creating 11 other entries. Deletes of in-use indexes degrade queries. Before that command:

1. Append the drifted index to `firestore.indexes.json` (`campus ASC, status DESC, __name__ DESC`).
2. Add the real gap: `reviews (reviewee_id ASC, created_at DESC)`.
3. Leave the six unused Wave-4.2 indexes in place unless the feed shape is finalised.
4. Deploy, then `firebase firestore:indexes` and confirm count ≥ 10.

No packet in any wave requires an index deploy. This is hygiene.

## 3. Ordered checklist

### Wave 1 — rules + client correctness (apply next, no backend writes)

| id | one line | effort | files |
|---|---|---|---|
| I1 | Listings rules spec via `node --test` on the emulator REST API | M | `functions/test/listings-rules.test.mjs` (new) |
| I2 | One moderated vocabulary; `report_count` server-only on both branches | S | `firestore.rules` |
| I3 | Admin first sign-in creates `role:'member'`, no placeholder campus; mock parity | M | `firebase/auth.ts`, `mock/{auth,profiles,directory,accounts}.ts` |
| I4 | `program` before `department`, four places | XS | `firebase/profiles.ts`, `firebase/admin.ts` |
| I5 | `chat.rate`: reviewee = buyer when seller rates; rethrow | S | `firebase/chat.ts`, `mock/chat.ts` |
| I6 | `respondToMeetup`/`completeMeetup`/`openThread` throw | S | `firebase/chat.ts` |
| I7 | App chat handlers surface the real message | S | `App.tsx` |
| I8 | Migrate `removed → hidden`, then drop the vocabulary | M | `firestore.rules`, `firebase/listings.ts`, new script |
| I9 | **Deferred** to Wave 4 (mapping hidden→`sold` lies to the seller) | — | — |

Reviewer corrections already applied below: I3's mock edit is a real edit (stub helper + import), its onboarding assertion is Firebase-only; I6 hunk C's anchor is 8-space, no blank line; I2 ships before the migration, I8's rules edits after it reports 0.

### Wave 2 — moderation (blocked on API enablement)
2.0 Functions primitives (explicit region, admin-email set, reads-before-writes, `as const` actions, `actorName` dual-write, `subjectId` fallback). 2.1 resolveReport via the callable, keeping the pre-read. 2.2 delete seed fallbacks, throw instead of `[]`. The current `index.ts` has no `tx.get` sibling read, no `target_id`, no `settings/admin_stats` — the corrected diffs account for that.

### Wave 3 — failure visibility
3.1/3.2 Marketplace loading/error via `overviewError`; `allSettled` in `fetchAdmin`. 3.3 analytics on `users_profile` with server-side `count()`/`average()`; `openReports` passed in. 3.4 `admin_stats` written before `onReviewWritten`'s early exit, `reviews_total` on create only (deletes still drift — points 7). 3.5 real per-member counts, campus null not `'qc'`.

### Wave 4 — polish (client only)
4.3 image whitelist → 4.1 `created_at` + `toIso` → 4.2 feed stage A (two equalities, index-free) then B (`orderBy`) → 4.4 reserved end-to-end → 4.5 ErrorBoundary → 4.6 dialog Escape stack → 4.7 reviewer-mode env gate → 4.8 session-generation guards → 4.9 status rollback re-read.

## 4. Wave 1 final code

### I1 — new `functions/test/listings-rules.test.mjs`
Node 24 built-in runner against the emulator REST API; no installs. Project `demo-tipalit`, base `http://127.0.0.1:8080/v1/projects/demo-tipalit/databases/(default)/documents`, `Authorization: Bearer owner`. Test names fixed: `seller-hidden-deny`, `seller-removed-deny`, `seller-report-count-deny`, `seller-edit-allow`, `legacy-missing-status-edit-allow`; `admin-hide-allow` and `admin-report-count-deny` stay `test.skip` until I2.

### I2 — `firestore.rules:80-103`, replace the whole `match /listings/{listingId}`

```
    match /listings/{listingId} {
      // 'hidden' is the only moderated status going forward; 'removed' is a
      // legacy value kept hidden/unwritable until the migration (I8) runs.
      function isModerated() {
        return resource.data.status == 'hidden' || resource.data.status == 'removed';
      }
      allow read: if isTipStudent() && (
        !isModerated() ||
        resource.data.seller_id == request.auth.uid ||
        isAdmin()
      );
      allow create: if isTipStudent()
        && request.resource.data.seller_id == request.auth.uid
        && request.resource.data.report_count == 0
        && request.resource.data.status == 'active';
      // report_count is server-only on BOTH branches. Sellers may only move a
      // live listing; admins may take one down or restore it.
      allow update: if listingOwnerOrAdmin()
        && !request.resource.data.diff(resource.data).affectedKeys()
             .hasAny(['report_count'])
        && (
          isAdmin()
          || (request.resource.data.status != 'hidden'
              && request.resource.data.status != 'removed')
        );
      allow delete: if listingOwnerOrAdmin();
    }
```

Do not apply the plan's `isModeratedStatus(s)` rename here — it drops `removed` from the read guard while `removed` docs still exist.

### I3 — admin first sign-in

`src/services/firebase/auth.ts:150-171` — replace the `else { … }` body:

```
        } else {
          // Minimum rules-valid create: firestore.rules:53 pins role to
          // 'member'. No campus/program/year keeps isProfileComplete() false,
          // so a first-time Firebase user still goes through onboarding.
          await setDoc(
            userDocRef,
            {
              user_id: user.uid,
              email,
              full_name: nameFromUser(user),
              is_verified: true,
              role: 'member',
              status: 'active',
              joinedAt: new Date().toISOString(),
              created_at: serverTimestamp(),
            },
            { merge: true },
          )
        }
```

Delete `const name = nameFromUser(user)` (:152). `role` at :140 stays.

`src/services/mock/profiles.ts` — after `loadStored` (:13):

```
/** Minimal sign-in profile: no campus, so onboarding still runs (I3 parity). */
export const writeProfileStub = (profile: Profile) => write('profiles', { ...loadStored(), [profile.userId]: profile })
```

`src/services/mock/auth.ts` — import `{ loadProfiles, writeProfileStub }`; after `const userId = userIdFor(email)` (:55):

```
      if (!loadProfiles()[userId]) {
        writeProfileStub({ userId, name, email, campus: null, program: '', year: '', joinedAt: new Date().toISOString() })
      }
```

`src/services/mock/directory.ts:39` — replace the return with a userId-deduped map:

```
  const byId = new Map<string, Person>()
  for (const person of [...seeded, ...Object.values(loadProfiles()).filter((profile) => profile.name.trim()).map(fromProfile)]) {
    byId.set(person.userId, person)
  }
  return [...byId.values()]
```

`src/services/mock/accounts.ts:31` — replace the role check:

```
  if (session.role === 'admin' || roleForEmail(session.email) === 'admin') return session
  throw new ServiceError('forbidden', 'Only admins can do that.')
```

### I4 — four one-line swaps (all verified present)
- `firebase/profiles.ts:51` → `program: data.program || data.department || '',`
- `firebase/profiles.ts:148` → `program: data.program || data.department || 'Student',`
- `firebase/admin.ts:223` → `program: data.program || data.department || 'Student',`
- `firebase/admin.ts:260` → `program: data.program || data.department || '',`

### I5 — `firebase/chat.ts:305-329`, replace through the `catch`

```
          const chatSnap = await getDoc(doc(db, 'chats', threadId))
          const chatData = chatSnap.exists() ? chatSnap.data() : {}
          const listingId = (chatData.listing_id || chatData.listingId || '') as string
          const buyerId = (chatData.buyer_id || chatData.buyerId || '') as string
          let sellerId = (chatData.seller_id || chatData.sellerId || '') as string
          if (!sellerId && listingId) {
            const listingSnap = await getDoc(doc(db, 'listings', listingId))
            sellerId = (listingSnap.data()?.seller_id as string) || ''
          }
          const revieweeId = uid === sellerId ? buyerId : sellerId
          if (!revieweeId || revieweeId === uid) throw new ServiceError('invalid', "Couldn't finish the review.")

          const reviewDocRef = doc(collection(db, 'reviews'))
          await setDoc(reviewDocRef, {
            chat_id: threadId,
            listing_id: listingId,
            meetup_message_id: itemId,
            reviewer_id: uid,
            reviewee_id: revieweeId,
            rating,
            comment: comment || '',
            rating_comment: comment || '',
            created_at: new Date().toISOString(),
          })
        } catch (err) {
          if (err instanceof ServiceError) throw err
          console.error('[TIPalit Firebase Chat] Rate review error:', err)
          throw new ServiceError('network', "Couldn't save your rating.")
        }
```

`src/services/mock/chat.ts:148` — replace the single `revieweeId` line:

```
      const sellerId = listing?.sellerId ?? thread.sellerId
      const revieweeId = session.userId === sellerId ? thread.buyerId : sellerId
      if (revieweeId === session.userId) throw new ServiceError('invalid', "Couldn't finish the review.")
```

### I6 — `firebase/chat.ts`
`:267-269` and `:281-283` — add `if (err instanceof ServiceError) throw err` before the `console.error`, and `throw new ServiceError('network', "Couldn't send your response.")` / `"Couldn't mark the meetup done."` after it. `:131-132` — corrected anchor, 8-space indent, no blank line:

```
        const snap = await getDocs(q).catch(() => null)
        if (snap && !snap.empty) {
```

`:159-167` —

```
      } catch (err) {
        if (err instanceof ServiceError) throw err
        console.error('[TIPalit Firebase Chat] Error opening thread:', err)
        throw new ServiceError('network', "Couldn't open the chat.")
      }
```

### I7 — `App.tsx` :859, :871, :903
Each `catch {` → `catch (error) {`; the literal message becomes `notify(errorMessage(error, "<same string>"), 'error')`. Leave `sendMessage` (:830-835) and `proposeMeetup` (:843-848) alone.

### I8 — strictly ordered
1. New `functions/migrate-removed-to-hidden.mjs`, operator-run once.
2. `listings.ts` `not-in ['hidden']`; `listMine` drops only `hidden`.
3. After two consecutive runs report 0, drop `removed` from `isModerated()` and the seller check.

## 5. Verification matrix

| Wave | Local today | Live / post-deploy only |
|---|---|---|
| 1 | `tsc --noEmit`; I1 spec on the emulator (JDK-25 override, confirmed); mock walks for I3–I7 | I3 onboarding path on Firebase; I5 live rating flow |
| 2 | — | All of it: `functions:list` 403s; emulator needs install + build |
| 3 | `tsc`; mock walks for 3.1/3.2/3.5 | 3.3 live counts; 3.4 emulator-or-deploy |
| 4 | `tsc`, `vite build`, mock walks | 4.2 suspended-seller filter (needs deployed rules to allow cross-user `users_profile` reads — uncertain); 4.8 latency races |

Emulator (verified working):

```
JAVA_HOME='/c/Program Files/Java/jdk-25' PATH='/c/Program Files/Java/jdk-25/bin:'$PATH \
  npx --no-install firebase emulators:exec --only firestore --project demo-tipalit \
  'node --test functions/test/*.test.mjs'
```

## 6. Open decisions

1. Get the deployed rules (MCP `get_security_rules` or console) before any rules deploy.
2. Index file: adopt the drifted `__name__:DESC` index or delete it live? Add the `reviews` composite either way.
3. Enable `cloudfunctions.googleapis.com` + `run.googleapis.com` now, or postpone Waves 2/3.4?
4. Run the `removed → hidden` migration in Wave 1, or keep both vocabularies one release? I2 assumes Wave 1.
5. I9: leave `toListing` as-is (open item) or map hidden→`sold`? Recommendation: leave it.
