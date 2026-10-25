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
const SUSPENDED_UID = `${RUN}-suspended`
const SUSPENDED_ADMIN_UID = `${RUN}-suspended-admin`

const SELLER = { uid: SELLER_UID, token: userToken(tipClaims(SELLER_UID)) }
const OTHER = { uid: OTHER_UID, token: userToken(tipClaims(OTHER_UID)) }
const ADMIN = { uid: ADMIN_UID, token: userToken(tipClaims(ADMIN_UID, ADMIN_EMAIL, { admin: true })) }
const OUTSIDER = { uid: OUTSIDER_UID, token: userToken(outsiderClaims(OUTSIDER_UID)) }
const SUSPENDED = { uid: SUSPENDED_UID, token: userToken(tipClaims(SUSPENDED_UID)) }
const SUSPENDED_ADMIN = {
  uid: SUSPENDED_ADMIN_UID,
  token: userToken(tipClaims(SUSPENDED_ADMIN_UID, `${SUSPENDED_ADMIN_UID}@tip.edu.ph`, { admin: true })),
}
const UNCLAIMED_ADMIN = { uid: ADMIN_UID, token: userToken(tipClaims(ADMIN_UID, ADMIN_EMAIL)) }

const sellerClient = () => asUser(SELLER.token)
const otherClient = () => asUser(OTHER.token)
const adminClient = () => asUser(ADMIN.token)
const suspendedClient = () => asUser(SUSPENDED.token)

const publicFeedQuery = (campus) => ({
  where: {
    compositeFilter: {
      op: 'AND',
      filters: [
        { fieldFilter: { field: { fieldPath: 'campus' }, op: 'EQUAL', value: { stringValue: campus } } },
        {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'IN',
            value: {
              arrayValue: {
                values: [{ stringValue: 'active' }, { stringValue: 'reserved' }, { stringValue: 'sold' }],
              },
            },
          },
        },
      ],
    },
  },
})

// every field the create rule pins
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

// owner token bypasses rules, so seeds never trip them
const seedListing = async (overrides = {}) => {
  const id = uniqueId('listing')
  const result = await owner.setWithId(`listings/${id}`, listingDoc(overrides))
  assert.ok(isOk(result), `seed listing ${id} failed: ${result.status} ${result.text}`)
  return id
}

// rules resolve roles via get(), so profiles must exist before the tests run
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
  await seedProfile(SUSPENDED.uid, { status: 'suspended' })
  await seedProfile(SUSPENDED_ADMIN.uid, { status: 'suspended', role: 'admin' })
})

after(async () => {
  // emulators:exec tears the emulator down with the process
})

describe('administrator claims', () => {
  test('allowlisted email without an admin claim has no privileged access', async () => {
    const result = await asUser(UNCLAIMED_ADMIN.token).query('audit_log', {})
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('member cannot self-grant an administrator role', async () => {
    const result = await sellerClient().update(`users_profile/${SELLER.uid}`, { role: 'admin' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('suspended administrator claim cannot read privileged collections', async () => {
    const result = await asUser(SUSPENDED_ADMIN.token).query('audit_log', {})
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

describe('listings — active-account enforcement', () => {
  test('suspended account cannot read an active listing', async () => {
    const id = await seedListing()
    const result = await suspendedClient().get(`listings/${id}`)
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('suspended account cannot query the public feed', async () => {
    await seedListing({ campus: 'qc' })
    const result = await suspendedClient().query('listings', publicFeedQuery('qc'))
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('suspended account cannot create a listing', async () => {
    const result = await suspendedClient().create(
      'listings',
      listingDoc({ seller_id: SUSPENDED.uid }),
    )
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('suspended account cannot edit its profile card', async () => {
    const result = await suspendedClient().update(`users_profile/${SUSPENDED.uid}`, {
      full_name: 'Still Suspended',
    })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

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

  test('admin cannot write report_count through the client rules either', async () => {
    const id = await seedListing()
    const result = await adminClient().update(`listings/${id}`, { report_count: 9 })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

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

describe('listings — feed query shape', () => {
  test('member can run the feed query (campus + public statuses)', async () => {
    await seedListing({ campus: 'qc', status: 'active' })
    const result = await otherClient().query('listings', publicFeedQuery('qc'))
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
  })

  test('member cannot run a plain campus query', async () => {
    await seedListing({ campus: 'qc', status: 'active' })
    const result = await otherClient().query('listings', {
      where: {
        fieldFilter: { field: { fieldPath: 'campus' }, op: 'EQUAL', value: { stringValue: 'qc' } },
      },
    })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('owner can query all of their listings, including moderated records', async () => {
    const hiddenId = await seedListing({ campus: 'qc', status: 'hidden' })
    const result = await sellerClient().query('listings', {
      where: {
        fieldFilter: {
          field: { fieldPath: 'seller_id' },
          op: 'EQUAL',
          value: { stringValue: SELLER.uid },
        },
      },
    })
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
    assert.ok(result.text.includes(hiddenId), `expected owner query to include ${hiddenId}`)
  })

  test('admin can query all listings, including moderated records', async () => {
    const removedId = await seedListing({ campus: 'qc', status: 'removed' })
    const result = await adminClient().query('listings', {})
    assert.ok(isOk(result), `expected 200, got ${result.status}: ${result.text}`)
    assert.ok(result.text.includes(removedId), `expected admin query to include ${removedId}`)
  })

  test('a query without the status filter cannot see a removed listing', async () => {
    const id = await seedListing({ campus: 'qc', status: 'removed' })
    const result = await otherClient().query('listings', {
      where: {
        fieldFilter: { field: { fieldPath: 'campus' }, op: 'EQUAL', value: { stringValue: 'qc' } },
      },
    })
    assert.ok(
      isForbidden(result) && !result.text.includes(id),
      `expected 403 without listing ${id}, got ${result.status}: ${result.text}`,
    )
  })
})

describe('listings — admin moderation', () => {
  test('admin cannot set status removed through client rules', async () => {
    const id = await seedListing()
    const result = await adminClient().update(`listings/${id}`, { status: 'removed' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('admin cannot set status hidden through client rules', async () => {
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

describe('privileged collections — client writes are denied', () => {
  test('member cannot submit a forged report directly', async () => {
    const result = await otherClient().createWithId('reports', uniqueId('forged-report'), {
      reporter_id: OTHER.uid,
      target_type: 'listing',
      target_id: 'forged-listing',
      subject_id: ADMIN.uid,
      status: 'open',
    })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('admin cannot resolve a report directly', async () => {
    const id = uniqueId('report')
    const seeded = await owner.setWithId(`reports/${id}`, {
      reporter_id: OTHER.uid,
      target_id: 'listing-1',
      target: { kind: 'listing', id: 'listing-1', label: 'Listing' },
      status: 'open',
    })
    assert.ok(isOk(seeded), `seed report failed: ${seeded.status} ${seeded.text}`)
    const result = await adminClient().update(`reports/${id}`, { status: 'resolved' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('admin cannot forge an audit event directly', async () => {
    const result = await adminClient().create('audit_log', {
      at: new Date().toISOString(),
      action: 'member_suspended',
      actorName: 'Forged Admin',
      summary: 'Forged event',
    })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('admin cannot update meetup settings directly', async () => {
    const result = await adminClient().createWithId('settings', uniqueId('meetup-spots'), {
      qc: ['Forged location'],
    })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})

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
    // naming every field must not satisfy the owner-only branch
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

  test('owner cannot self-escalate role to admin', async () => {
    const result = await sellerClient().update(`users_profile/${SELLER.uid}`, { role: 'admin' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  // self-unsuspend is closed by the owner key allowlist, not a status check,
  // so the write is rejected rather than returning 403
  test('owner cannot self-unsuspend (write status)', async () => {
    await seedProfile(SELLER.uid, { status: 'suspended' })
    const result = await sellerClient().update(`users_profile/${SELLER.uid}`, { status: 'active' })
    assert.ok(
      !isOk(result),
      `expected the write to be rejected, got ${result.status}: ${result.text}`,
    )
    await seedProfile(SELLER.uid)
  })

  test('admin cannot suspend a member through client rules', async () => {
    const result = await adminClient().update(`users_profile/${OTHER.uid}`, { status: 'suspended' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })

  test('admin cannot write arbitrary privileged values (unknown status)', async () => {
    const result = await adminClient().update(`users_profile/${OTHER.uid}`, { status: 'banned' })
    assert.ok(isForbidden(result), `expected 403, got ${result.status}: ${result.text}`)
  })
})
