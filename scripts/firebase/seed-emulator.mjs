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
  'emulator-seed-app',
)
const auth = getAuth(app)
const db = getFirestore(app)

console.log(`[seed-emulator] Seeding emulator data for project: ${PROJECT_ID}...`)

async function upsertUser({ uid, email, displayName, password, claims }) {
  let user
  try {
    user = await auth.getUser(uid)
    await auth.updateUser(uid, {
      email,
      displayName,
      password,
      emailVerified: true,
    })
    console.log(`[seed-emulator] Updated auth user ${email} (${uid})`)
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      user = await auth.createUser({
        uid,
        email,
        displayName,
        password,
        emailVerified: true,
      })
      console.log(`[seed-emulator] Created auth user ${email} (${uid})`)
    } else {
      throw err
    }
  }

  if (claims) {
    await auth.setCustomUserClaims(uid, claims)
    console.log(`[seed-emulator] Set custom claims for ${uid}:`, claims)
  }
}

async function seed() {
  // 1. Auth Users
  await upsertUser({
    uid: 'admin_osa_001',
    email: 'osa.admin@tip.edu.ph',
    displayName: 'OSA Admin',
    password: 'Password123!',
    claims: { admin: true },
  })

  await upsertUser({
    uid: 'student_elena_001',
    email: 'elena.torres@tip.edu.ph',
    displayName: 'Elena Torres',
    password: 'Password123!',
    claims: { admin: false },
  })

  await upsertUser({
    uid: 'student_marcus_002',
    email: 'marcus.reyes@tip.edu.ph',
    displayName: 'Marcus Reyes',
    password: 'Password123!',
    claims: { admin: false },
  })

  // 2. Profiles in users_profile
  const now = new Date().toISOString()

  await db.collection('users_profile').doc('admin_osa_001').set({
    user_id: 'admin_osa_001',
    email: 'osa.admin@tip.edu.ph',
    full_name: 'OSA Admin',
    campus: 'qc',
    role: 'admin',
    status: 'active',
    is_verified: true,
    joinedAt: now,
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection('users_profile').doc('student_elena_001').set({
    user_id: 'student_elena_001',
    email: 'elena.torres@tip.edu.ph',
    full_name: 'Elena Torres',
    student_number: '2022-10492',
    campus: 'qc',
    department: 'CBEA',
    program: 'BS Accountancy',
    year: '3rd Year',
    year_level: '3rd Year',
    role: 'member',
    status: 'active',
    is_verified: true,
    bio: '3rd year BSA student at TIP Quezon City. Selling textbooks & uniforms.',
    contact_number: '09171234567',
    preferred_meetup_spots: ['Library 1st Floor Study Area', 'Student Plaza (Main Quad)'],
    joinedAt: now,
    safetyAcceptedAt: now,
    onboardedAt: now,
    total_reviews: 5,
    average_rating: 4.9,
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection('users_profile').doc('student_marcus_002').set({
    user_id: 'student_marcus_002',
    email: 'marcus.reyes@tip.edu.ph',
    full_name: 'Marcus Reyes',
    student_number: '2023-11842',
    campus: 'qc',
    department: 'CCE',
    program: 'BS Computer Science',
    year: '2nd Year',
    year_level: '2nd Year',
    role: 'member',
    status: 'active',
    is_verified: true,
    bio: '2nd year CS student at TIP Quezon City. Looking for textbooks and gear.',
    contact_number: '09181234567',
    preferred_meetup_spots: ['Student Plaza (Main Quad)', 'Engineering Lab B Lobby'],
    joinedAt: now,
    safetyAcceptedAt: now,
    onboardedAt: now,
    total_reviews: 3,
    average_rating: 4.8,
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  // 3. Meetup Spots Settings
  await db.collection('settings').doc('campus_meetup_spots').set({
    qc: [
      'Student Plaza (Main Quad)',
      'Library 1st Floor Study Area',
      'CBEA Building 4th Floor Stairs',
      'Engineering Lab B Lobby',
      'Campus Gate 2 Guard Post',
    ],
    manila: [
      'Main Building Lobby',
      'College Library Ground Floor',
      'Tech Hall Quadrangle',
      'Campus Gate 1 Security Desk',
    ],
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  // 4. Sample Marketplace Listings
  await db.collection('listings').doc('listing_book_001').set({
    id: 'listing_book_001',
    title: 'Cost Accounting & Control (Guerrero 2024)',
    description: 'Clean copy with minimal pencil highlights. Complete solutions manual included. Perfect for BSA majors.',
    price: 450,
    category: 'Textbooks',
    department: 'CBEA',
    subject_code: 'ACT101',
    course_code: 'ACT101',
    condition: 'like_new',
    transaction_type: 'sale',
    meetup_spot: 'Library 1st Floor Study Area',
    campus: 'qc',
    seller_id: 'student_elena_001',
    seller_name: 'Elena Torres',
    seller_initials: 'ET',
    seller_rating: 4.9,
    status: 'active',
    photos: [],
    image_ids: [],
    report_count: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection('listings').doc('listing_calc_002').set({
    id: 'listing_calc_002',
    title: 'Casio fx-991EX ClassWiz Calculator',
    description: 'Original solar powered scientific calculator, allowed in PRC board exams. Includes hard slide cover.',
    price: 950,
    category: 'Electronics',
    department: 'CCE',
    subject_code: 'MATH101',
    course_code: 'MATH101',
    condition: 'like_new',
    transaction_type: 'sale',
    meetup_spot: 'Student Plaza (Main Quad)',
    campus: 'qc',
    seller_id: 'student_elena_001',
    seller_name: 'Elena Torres',
    seller_initials: 'ET',
    seller_rating: 4.9,
    status: 'active',
    photos: [],
    image_ids: [],
    report_count: 0,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection('listings').doc('listing_flagged_003').set({
    id: 'listing_flagged_003',
    title: 'Midterm Exam Answers & Test Bank 2026',
    description: 'Leaked department test bank questions and answer key for midterm finals.',
    price: 2500,
    category: 'Others',
    department: 'CCE',
    subject_code: 'CS102',
    course_code: 'CS102',
    condition: 'fair',
    transaction_type: 'sale',
    meetup_spot: 'Campus Gate 2 Guard Post',
    campus: 'qc',
    seller_id: 'student_elena_001',
    seller_name: 'Elena Torres',
    seller_initials: 'ET',
    seller_rating: 4.9,
    status: 'active',
    photos: [],
    image_ids: [],
    report_count: 1,
    created_at: new Date(Date.now() - 900000).toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  // 5. Open Moderation Report for Admin Review Queue
  await db.collection('reports').doc('report_flagged_003').set({
    id: 'report_flagged_003',
    target_type: 'listing',
    target_id: 'listing_flagged_003',
    target: {
      kind: 'listing',
      id: 'listing_flagged_003',
      label: 'Midterm Exam Answers & Test Bank 2026',
    },
    subject_id: 'student_elena_001',
    subject_name: 'Elena Torres',
    subjectName: 'Elena Torres',
    reporter_id: 'student_marcus_002',
    reporter_name: 'Marcus Reyes',
    reporterName: 'Marcus Reyes',
    campus: 'qc',
    reason: 'Prohibited item',
    details: 'Selling unauthorized examination materials on campus.',
    status: 'open',
    created_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  // 6. Chat Thread
  await db.collection('chats').doc('chat_elena_marcus_001').set({
    listing_id: 'listing_book_001',
    listingId: 'listing_book_001',
    buyer_id: 'student_marcus_002',
    buyerId: 'student_marcus_002',
    seller_id: 'student_elena_001',
    sellerId: 'student_elena_001',
    last_message: 'Hi Elena! Is this textbook still available?',
    updated_at: new Date(Date.now() - 300000).toISOString(),
    created_at: FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection('chats').doc('chat_elena_marcus_001').collection('messages').doc('msg_001').set({
    chat_id: 'chat_elena_marcus_001',
    sender_id: 'student_marcus_002',
    content: 'Hi Elena! Is this textbook still available?',
    text: 'Hi Elena! Is this textbook still available?',
    message_type: 'text',
    is_read: true,
    created_at: new Date(Date.now() - 300000).toISOString(),
  }, { merge: true })

  console.log('[seed-emulator] Database seeded successfully!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('[seed-emulator] Error seeding database:', err)
  process.exit(1)
})
