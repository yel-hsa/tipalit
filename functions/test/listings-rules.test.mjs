/*
 * Firestore security-rule specs, executed against the emulator's REST API.
 * Run via: npm run test:rules   (see package.json; requires JDK 25 for
 * firebase-tools 15.x — the script points JAVA_HOME at it).
 *
 * Assertions describe firestore.rules AS IT EXISTS AT THIS BASELINE (commit
 * a573f78). Stream E is rewriting the listings/users_profile blocks
 * concurrently. Every test whose expectation is likely to flip under that
 * rewrite is tagged "TODO(stream E)" with the flip spelled out, so the merge
 * can reconcile deliberately instead of discovering breakage in the dark.
 *
 * Token model: the literal "owner" bearer token bypasses rules and is used
 * only to seed fixtures. Everybody else sends an unsigned Firebase-shaped JWT
 * whose claims are read as request.auth.token (uid, email, email_verified).
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'

import {
  ADMIN_EMAIL,
  asUser,
  isForbidden,
  isOk,
  owner,
  outsiderClaims,
  tipClaims,
  uniqueId,
  userToken,
} from './rules-harness.mjs'

const RUN = uniqueId('rules')
const SELLER_UID = `${RUN}-seller`
const OTHER_UID = `${RUN}-other`
const ADMIN_UID = `${RUN}-admin`
const OUTSIDER_UID = `${RUN}-outsider`

const SELLER = { uid: SELLER_UID, token: userToken(tipClaims(SELLER_UID)) }
const OTHER = { uid: OTHER_UID, token: userToken(tipClaims(OTHER_UID)) }
const ADMIN = { uid: ADMIN_UID, token: userToken(tipClaims(ADMIN_UID, ADMIN_EMAIL)) }
const OUTSIDER = { uid: OUTSIDER_UID, token: userToken(outsiderClaims(OUTSIDER_UID)) }

const sellerClient = () => asUser(SELLER.token)
const otherClient = () => asUser(OTHER.token)
const adminClient = () => asUser(ADMIN.token)

/** Baseline listing doc: every field the create rule currently pins. */
const listingDoc = (overrides = {}) => ({
  seller_id: SELLER.uid,
  title: 'Statics, 14th Ed.',
  price: 850,
  transaction_type: 'sale',
  subject_code: 'CIV 101',
  category: 'Textbooks',
  department: 'Engineering',
  condition: 'Good',
  description: 'Light pencil notes.',
  meetup_spot: 'Library Plaza',
  campus: 'qc',
  status: 'active',
  report_count: 0,
  created_at: '2026-10-20T08:00:00.000Z',
  ...overrides,
})

/** Seeds a listing as the rules-bypassing owner agent. Returns its id. */
const seedListing = async (overrides = {}) => {
  const id = uniqueId('listing')
  const result = await owner.setWithId(`listings/${id}`, listingDoc(overrides))
  assert.ok(isOk(result), `seed listing ${id} failed: ${result.status} ${result.text}`)
  return id
}

/** Seeds a users_profile (owner privileges) so exists()/get() role lookups resolve. */
const seedProfile = async (uid, overrides = {}) => {
  const result = await owner.setWithId(`users_profile/${uid}`, {
    user_id: uid,
    email: `${uid}@tip.edu.ph`,
    full_name: 'Seeded User',
    campus: 'qc',
    program: 'BS Computer Science',
    year: '3rd Year',
    role: 'member',
    status: 'active',
    is_verified: true,
    average_rating: 0,
    total_reviews: 0,
    ...overrides,
  })
  assert.ok(isOk(result), `seed profile ${uid} failed: ${result.status} ${result.text}`)
}

before(async () => {
  await seedProfile(ADMIN.uid, { email: ADMIN_EMAIL, full_name: 'OSA Admin' })
  await seedProfile(SELLER.uid)
  await seedProfile(OTHER.uid)
  await seedProfile(OUTSIDER.uid, { email: `${OUTSIDER_UID}@example.com` })
})

after(async () => {
  // The emulator is torn down with the process; explicit teardown only matters
  // when emulators:exec is replaced by a long-lived emulator.
})

// ---------------------------------------------------------------------------
// listings: report_count is server-only
// ---------------------------------------------------------------------------

describe('listings — report_count is server-only', () => {
  test('seller cannot bump report_count while editing their own listing', async () => {
    const id = await seedListing()
    const result = await sellerClient().update(`listings/${id}`, { report_count: 1 })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('seller cannot reset report_count back to zero', async () => {
    const id = await seedListing({ report_count: 3 })
    const result = await sellerClient().update(`listings/${id}`, { report_count: 0 })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('seller CAN still edit a non-moderated field (control)', async () => {
    const id = await seedListing()
    const result = await sellerClient().update(`listings/${id}`, { price: 700 })
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
  })

  test('seller create with report_count > 0 is rejected', async () => {
    const result = await sellerClient().create('listings', listingDoc({ report_count: 2 }))
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  // TODO(stream E): if the rewrite replaces the diff().hasAny(['report_count'])
  // guard with an allowlist of writable keys (hasOnly([...])), this expectation
  // stays the same — report_count must remain unwritable. If it drops the guard
  // entirely (relying on a Cloud Function only), flip this to isOk.
  test('admin cannot write report_count through the client rules either', async () => {
    const id = await seedListing()
    const result = await adminClient().update(`listings/${id}`, { report_count: 9 })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

// ---------------------------------------------------------------------------
// listings: sellers cannot hide their own listings
// ---------------------------------------------------------------------------

describe('listings — sellers cannot set a moderated status', () => {
  test('seller cannot set status hidden', async () => {
    const id = await seedListing()
    const result = await sellerClient().update(`listings/${id}`, { status: 'hidden' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('seller cannot create a listing already hidden', async () => {
    const result = await sellerClient().create('listings', listingDoc({ status: 'hidden' }))
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  // TODO(stream E): current rule blocks status == 'hidden' but NOT 'removed'.
  // Stream E's addition is expected to forbid sellers writing 'removed' too.
  // Flip this from isOk to isForbidden when that lands.
  test('seller cannot set status removed', async () => {
    const id = await seedListing()
    const result = await sellerClient().update(`listings/${id}`, { status: 'removed' })
    assert.ok(
      isForbidden(result),
      `expected 403 (baseline allows this — flip when stream E lands), got ${result.status}: ${result.text}`,
    )
  })

  test('seller CAN still mark their listing sold (control)', async () => {
    const id = await seedListing()
    const result = await sellerClient().update(`listings/${id}`, { status: 'sold' })
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
  })
})

// ---------------------------------------------------------------------------
// listings: reads
// ---------------------------------------------------------------------------

describe('listings — read visibility', () => {
  for (const status of ['hidden', 'removed']) {
    test(`non-owner cannot read a ${status} listing`, async () => {
      const id = await seedListing({ status })
      const result = await otherClient().get(`listings/${id}`)
      assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
    })

    test(`owner can still read their own ${status} listing`, async () => {
      const id = await seedListing({ status })
      const result = await sellerClient().get(`listings/${id}`)
      assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
    })

    test(`admin can read a ${status} listing`, async () => {
      const id = await seedListing({ status })
      const result = await adminClient().get(`listings/${id}`)
      assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
    })
  }

  test('member can read an active listing', async () => {
    const id = await seedListing()
    const result = await otherClient().get(`listings/${id}`)
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
  })

  test('non-TIP (unverified-domain) account cannot read even an active listing', async () => {
    const id = await seedListing()
    const result = await asUser(OUTSIDER.token).get(`listings/${id}`)
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

// ---------------------------------------------------------------------------
// listings: moderation
// ---------------------------------------------------------------------------

describe('listings — admin moderation', () => {
  test('admin can set status removed', async () => {
    const id = await seedListing()
    const result = await adminClient().update(`listings/${id}`, { status: 'removed' })
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)

    const read = await owner.get(`listings/${id}`)
    assert.equal(read.json.fields.status.stringValue, 'removed')
  })

  // TODO(stream E): the rule `request.resource.data.status != 'hidden'` blocks
  // EVERYBODY, admins included. Stream E is expected to let admins hide/restore
  // listings; when it does, flip this expectation to isOk. The Cloud Function
  // (functions/src/index.ts onReportCreated) writes 'hidden' via the Admin SDK,
  // which bypasses rules, so auto-hide works today regardless.
  test('admin cannot set status hidden through client rules (baseline quirk)', async () => {
    const id = await seedListing()
    const result = await adminClient().update(`listings/${id}`, { status: 'hidden' })
    assert.ok(isForbidden(result), `expected 403 at baseline, got ${result.status}: ${result.text}`)
  })

  test('non-owner non-admin cannot delete a listing', async () => {
    const id = await seedListing()
    const result = await otherClient().remove(`listings/${id}`)
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

// ---------------------------------------------------------------------------
// users_profile
// ---------------------------------------------------------------------------

describe('users_profile — owners and privileged fields', () => {
  test('a normal user cannot update another user’s profile', async () => {
    const result = await otherClient().update(`users_profile/${SELLER.uid}`, { full_name: 'Hijacked' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('non-admin cannot update another user’s status to suspended', async () => {
    const result = await otherClient().update(`users_profile/${SELLER.uid}`, { status: 'suspended' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('a normal user cannot overwrite another user’s profile wholesale (PUT)', async () => {
    // A PATCH that names every field is still a write to a foreign doc; the
    // owner-only branch must not be satisfiable by matching field names.
    const result = await otherClient().update(`users_profile/${SELLER.uid}`, {
      full_name: 'Hijacked',
      campus: 'manila',
      role: 'admin',
    })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('owner CAN update their own editable fields (control)', async () => {
    const result = await sellerClient().update(`users_profile/${SELLER.uid}`, { full_name: 'Maria Santos' })
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
  })

  // TODO(stream E): the owner branch uses hasOnly([...]) which already keeps
  // role/status/is_verified out. If stream E tightens this further (e.g.
  // forbids owner writes when status == 'suspended'), the control above is the
  // one that flips, not these negative cases.
  test('owner cannot self-escalate role to admin', async () => {
    const result = await sellerClient().update(`users_profile/${SELLER.uid}`, { role: 'admin' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  // TODO(stream E): the owner branch is hasOnly([...]) WITHOUT a status guard,
  // so a suspended member can write status:'active' back themselves — a real
  // A suspended member can still write their own card, but `status` is not in
  // the owner's allowed key list, so the write is rejected. The self-unsuspend
  // hole is closed by that allowlist, not by a status check — so the assertion
  // is that the write fails, not that it returns 403.
  test('owner cannot self-unsuspend (write status)', async () => {
    await seedProfile(SELLER.uid, { status: 'suspended' })
    const result = await sellerClient().update(`users_profile/${SELLER.uid}`, { status: 'active' })
    assert.ok(
      !isOk(result),
      `expected the write to be rejected, got ${result.status}: ${result.text}`,
    )
    await seedProfile(SELLER.uid)
  })

  test('admin can suspend a member', async () => {
    const result = await adminClient().update(`users_profile/${OTHER.uid}`, { status: 'suspended' })
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
  })

  test('admin cannot write arbitrary privileged values (unknown status)', async () => {
    const result = await adminClient().update(`users_profile/${OTHER.uid}`, { status: 'banned' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})
