import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..')
const require = createRequire(path.join(REPO_ROOT, 'functions', 'package.json'))

const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-tipalit'
process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

const app = initializeApp(
  { credential: applicationDefault(), projectId: PROJECT_ID },
  'emulator-e2e-test-app',
)
const auth = getAuth(app)
const db = getFirestore(app)

let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failedTests++
    throw new Error(message)
  } else {
    console.log(`  ✅ PASS: ${message}`)
    passedTests++
  }
}

async function runTests() {
  console.log(`\n========================================`)
  console.log(`🧪 TIPalit Firebase Emulator E2E Suite`)
  console.log(`   Project: ${PROJECT_ID}`)
  console.log(`========================================\n`)

  // Test 1: Auth & Custom Claims
  console.log(`[TEST 1] Verifying Firebase Auth Users & Role Claims...`)
  const adminUser = await auth.getUser('admin_osa_001')
  assert(adminUser.email === 'osa.admin@tip.edu.ph', 'Admin user exists with correct email')
  assert(adminUser.customClaims?.admin === true, 'Admin user has custom claim { admin: true }')

  const studentElena = await auth.getUser('student_elena_001')
  assert(studentElena.email === 'elena.torres@tip.edu.ph', 'Elena Torres student auth exists')

  const studentMarcus = await auth.getUser('student_marcus_002')
  assert(studentMarcus.email === 'marcus.reyes@tip.edu.ph', 'Marcus Reyes student auth exists')

  // Test 2: Users Profiles
  console.log(`\n[TEST 2] Verifying User Profile Documents...`)
  const elenaProfile = await db.collection('users_profile').doc('student_elena_001').get()
  assert(elenaProfile.exists, 'Elena profile document exists in users_profile')
  assert(elenaProfile.data()?.status === 'active', 'Elena account status is active')
  assert(elenaProfile.data()?.campus === 'qc', 'Elena campus is qc')

  const marcusProfile = await db.collection('users_profile').doc('student_marcus_002').get()
  assert(marcusProfile.exists, 'Marcus profile document exists in users_profile')
  assert(marcusProfile.data()?.status === 'active', 'Marcus account status is active')
  assert(marcusProfile.data()?.campus === 'qc', 'Marcus campus is qc')

  // Test 3: Admin Moderation & Public Feed Exclusion Workflow
  console.log(`\n[TEST 3] Testing Admin Moderation Workflow & Public Feed Exclusion...`)
  
  // 3a. Admin signs in and resolves the open report on listing_flagged_003
  const loginRes = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'osa.admin@tip.edu.ph', password: 'Password123!', returnSecureToken: true })
  })
  const loginData = await loginRes.json()
  assert(Boolean(loginData.idToken), 'Admin successfully logged in and received ID token')

  const resolveRes = await fetch('http://127.0.0.1:5001/demo-tipalit/us-central1/resolveReport', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + loginData.idToken
    },
    body: JSON.stringify({
      data: {
        reportId: 'report_flagged_003',
        action: 'remove_listing',
        note: 'E2E test: Unauthorized midterm test materials.'
      }
    })
  })
  const resolveData = await resolveRes.json()
  assert(resolveRes.status === 200, 'Cloud Function resolveReport returned 200 OK')
  assert(resolveData?.result?.report?.status === 'resolved', 'Report status changed to resolved')

  const flaggedListing = (await db.collection('listings').doc('listing_flagged_003').get()).data()
  assert(flaggedListing?.status === 'removed', 'Target listing status changed to removed')

  // 3b. Verify Public Feed Query (QC Campus) excludes the removed listing
  const feedSnap = await db.collection('listings')
    .where('campus', '==', 'qc')
    .where('status', 'in', ['active', 'reserved', 'sold'])
    .get()
  const activeIds = feedSnap.docs.map(d => d.id)
  console.log(`  Found ${activeIds.length} active/visible listings:`, activeIds)
  assert(activeIds.includes('listing_book_001'), 'Cost Accounting textbook is present in feed')
  assert(activeIds.includes('listing_calc_002'), 'Casio Calculator is present in feed')
  assert(!activeIds.includes('listing_flagged_003'), 'Moderated Exam Answers listing is NOT in public feed')

  // Test 4: Chat Thread & Message Real-time Delivery
  console.log(`\n[TEST 4] Testing Chat Messages & Round-Trip Persistence...`)
  const chatRef = db.collection('chats').doc('chat_elena_marcus_001')
  const chatSnap = await chatRef.get()
  assert(chatSnap.exists, 'Chat thread chat_elena_marcus_001 exists')
  assert(chatSnap.data()?.buyer_id === 'student_marcus_002', 'Buyer ID is student_marcus_002')
  assert(chatSnap.data()?.seller_id === 'student_elena_001', 'Seller ID is student_elena_001')

  const testMsgId = `msg_e2e_${Date.now()}`
  await chatRef.collection('messages').doc(testMsgId).set({
    chat_id: 'chat_elena_marcus_001',
    sender_id: 'student_marcus_002',
    content: 'E2E automated test message: Campus meetup confirmed at Library Plaza!',
    text: 'E2E automated test message: Campus meetup confirmed at Library Plaza!',
    message_type: 'text',
    is_read: false,
    created_at: new Date().toISOString(),
  })
  const writtenMsg = await chatRef.collection('messages').doc(testMsgId).get()
  assert(writtenMsg.exists, 'New chat message written successfully to subcollection')
  assert(writtenMsg.data()?.sender_id === 'student_marcus_002', 'Sender ID preserved on written message')

  // Test 5: Firestore Trigger - onReviewWritten
  console.log(`\n[TEST 5] Testing Cloud Function onReviewWritten Trigger...`)
  const beforeProfile = (await db.collection('users_profile').doc('student_elena_001').get()).data()
  const beforeCount = beforeProfile?.total_reviews ?? 0
  const revId = `rev_e2e_${Date.now()}`
  await db.collection('reviews').doc(revId).set({
    reviewer_id: 'student_marcus_002',
    reviewee_id: 'student_elena_001',
    rating: 5,
    comment: 'Great transaction, book was in perfect condition!',
    listing_id: 'listing_book_001',
    created_at: new Date().toISOString(),
  })
  console.log(`  Wrote review ${revId} with rating 5. Awaiting Cloud Function onReviewWritten trigger...`)
  let afterCount = beforeCount
  for (let attempt = 0; attempt < 16; attempt++) {
    await new Promise((r) => setTimeout(r, 500))
    const snap = await db.collection('users_profile').doc('student_elena_001').get()
    afterCount = snap.data()?.total_reviews ?? 0
    if (afterCount > beforeCount) break
  }
  console.log(`  Reviews count before: ${beforeCount}, after: ${afterCount}`)
  assert(afterCount === beforeCount + 1, 'Cloud Function onReviewWritten triggered and incremented total_reviews')

  // Test 6: Audit Log Integrity
  console.log(`\n[TEST 6] Verifying Admin Audit Log Immutability...`)
  const auditSnap = await db.collection('audit_log').get()
  console.log(`  Total audit events recorded: ${auditSnap.size}`)
  assert(auditSnap.size > 0, 'Audit log entries exist from admin moderation action')
  const reportAudits = auditSnap.docs.filter(d => d.data()?.action === 'listing_removed')
  assert(reportAudits.length > 0, 'Listing removed audit log entry exists')

  // Test 7: Campus Meetup Spots Settings
  console.log(`\n[TEST 7] Verifying Campus Meetup Spots Settings...`)
  const spotsSnap = await db.collection('settings').doc('campus_meetup_spots').get()
  assert(spotsSnap.exists, 'Campus meetup spots settings exist')
  const spotsData = spotsSnap.data()
  assert(Array.isArray(spotsData?.qc) && spotsData.qc.length >= 4, 'QC meetup spots configured (>4 spots)')
  assert(Array.isArray(spotsData?.manila) && spotsData.manila.length >= 3, 'Manila meetup spots configured (>3 spots)')

  console.log(`\n========================================`)
  console.log(`🎉 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log(`========================================\n`)
  process.exit(failedTests > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('\n❌ Unhandled error during E2E test suite:', err)
  process.exit(1)
})
