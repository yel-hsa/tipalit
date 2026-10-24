import type {
  AuditEntry,
  CampusId,
  Category,
  Condition,
  Department,
  GoogleAccount,
  Listing,
  Profile,
  Promotion,
  Report,
  Review,
  Seller,
  Thread,
} from '../services/types'

/*
 * Seed content and display constants. Domain types live in services/types.ts;
 * the mock adapter copies this data into localStorage on first run.
 */

export const CAMPUSES: { id: CampusId; label: string; area: string }[] = [
  { id: 'manila', label: 'TIP Manila', area: 'Quiapo, Manila' },
  { id: 'qc', label: 'TIP Quezon City', area: 'Cubao, Quezon City' },
]

export const campusLabel = (id: CampusId) => CAMPUSES.find((campus) => campus.id === id)?.label ?? 'TIP'

/*
 * Admin accounts. In production the role is a server-side claim on the
 * session; the mock adapter grants it to these emails.
 */
export const ADMIN_ACCOUNT: GoogleAccount = { name: 'Office of Student Affairs', email: 'osa.admin@tip.edu.ph' }
export const ADMIN_EMAILS = [ADMIN_ACCOUNT.email]

/** Accounts offered by the mock Google chooser. Reviewer mode adds the extras. */
export const GOOGLE_TEST_ACCOUNTS: GoogleAccount[] = [{ name: 'Bea Lim', email: 'bea.lim@tip.edu.ph' }, ADMIN_ACCOUNT]
export const REVIEWER_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  { name: 'Marco Tan', email: 'marco.tan@tip.edu.ph' },
  { name: 'Juan Dela Cruz', email: 'juan.delacruz@gmail.com' },
]

export const photo = (id: string, width = 600, height = width) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`

export const CATEGORY_LIST: Category[] = [
  'Textbooks',
  'Calculators',
  'Uniforms',
  'Lab Gear',
  'Drafting Tools',
  'Electronics',
  'School Supplies',
  'Others',
]

export const CONDITIONS: Condition[] = ['New', 'Like New', 'Good', 'Fair']

export const CATEGORIES = ['All', ...CATEGORY_LIST, 'CBA Dept', 'Engineering Dept'] as const

export const DEPARTMENTS: Department[] = ['Engineering', 'CBA', 'CS/IT', 'Architecture']

export const SUBJECT_CODES = [
  'MATH 010',
  'MATH 020',
  'CIV 101',
  'CHEM 001',
  'PHYS 001',
  'ARCH 101',
  'ARCH 102',
  'ACC 101',
  'BUS 101',
  'CS 201',
  'CPE 101',
  'GEN ED',
]

/*
 * Campus-approved meetup spots. The Manila names are placeholders until
 * Student Affairs confirms them (see README, "Open questions").
 */
export const MEETUP_SPOTS: Record<CampusId, string[]> = {
  qc: ['Library Plaza', 'Main Lobby', 'Cafeteria Entrance', 'Engineering Building Steps', 'Gate 2 Security Post'],
  manila: ['Library Lobby', 'Main Gate Security Post', 'Canteen Entrance', 'Student Lounge'],
}

export const PROGRAMS = [
  'BS Civil Engineering',
  'BS Computer Engineering',
  'BS Electrical Engineering',
  'BS Mechanical Engineering',
  'BS Chemical Engineering',
  'BS Industrial Engineering',
  'BS Computer Science',
  'BS Information Technology',
  'BS Accountancy',
  'BS Business Administration',
  'BS Architecture',
]

export const YEAR_LEVELS = ['1st year', '2nd year', '3rd year', '4th year', '5th year']

export const SAFETY_RULES = [
  {
    id: 'spots',
    title: 'Meet only at approved spots',
    body: 'Use the campus-approved spots on your campus, during school hours.',
  },
  { id: 'inspect', title: 'Inspect before you pay', body: 'Check the item works and matches the listing before handing over cash.' },
  { id: 'otp', title: 'Never share passwords or OTPs', body: 'No buyer or seller ever needs your login, GCash PIN, or one-time codes.' },
  { id: 'report', title: 'Report suspicious users', body: 'Flag listings or people that feel off. Reports are reviewed within 24 hours.' },
]

export const SELLER_REPLIES = [
  'Sure! It is still available.',
  'I can bring it tomorrow if that works for you.',
  'Sounds good, see you on campus!',
]

export const CATEGORY_FALLBACK_IMAGES: Record<Category, string> = {
  Textbooks: photo('1497633762265-9d179a990aa6'),
  Calculators: photo('1709880945165-d2208c6ad2ec'),
  Uniforms: photo('1720514496161-914011a9ee02'),
  'Lab Gear': photo('1617155093730-a8bf47be792d'),
  'Drafting Tools': photo('1741181296065-8ab8a9883ffe'),
  Electronics: photo('1588501530754-3d0d7d40218d'),
  'School Supplies': photo('1503676260728-1c00da094a0b'),
  Others: photo('1516035069371-29a1b244cc32'),
}

/*
 * Sponsors and student perks (PRD monetization). `campus: 'all'` runs on both
 * feeds; the mock adapter serves these to the Perks tab and sponsor banners.
 */
export const SEED_PROMOTIONS: Promotion[] = [
  {
    id: 'p1',
    title: '20% off engineering supplies',
    description: 'Show your TIP ID at checkout and get 20% off drafting and lab supplies.',
    imageUrl: photo('1581094794329-c8112a89af12'),
    destinationUrl: 'https://example.com/national-bookstore',
    sponsorName: 'National Book Store',
    type: 'sponsor',
    campus: 'all',
    active: true,
  },
  {
    id: 'p2',
    title: 'Free printing quota',
    description: 'First 50 pages free each month for verified TIPalit members.',
    imageUrl: photo('1503676260728-1c00da094a0b'),
    destinationUrl: 'https://example.com/tip-library',
    sponsorName: 'TIP Library',
    type: 'perk',
    campus: 'manila',
    active: true,
  },
  {
    id: 'p3',
    title: 'Calculator battery bundles',
    description: 'Buy two, get one free on calculator batteries for exam season.',
    imageUrl: photo('1709880945165-d2208c6ad2ec'),
    destinationUrl: 'https://example.com/echostore',
    sponsorName: 'EchoStore Cubao',
    type: 'sponsor',
    campus: 'qc',
    active: true,
  },
  {
    id: 'p4',
    title: 'Student ride discount',
    description: 'P50 off your first three rides to campus with a student account.',
    destinationUrl: 'https://example.com/rides',
    sponsorName: 'CampusRides',
    type: 'perk',
    campus: 'all',
    active: true,
  },
]

export const SELLERS: Seller[] = [
  { id: 's1', name: 'Miguel Santos', initials: 'MS', program: 'BS Civil Engineering', year: '3rd year', campus: 'qc', verified: true, rating: 4.8, reviews: 12 },
  { id: 's2', name: 'Andrea Reyes', initials: 'AR', program: 'BS Computer Engineering', year: '2nd year', campus: 'qc', verified: true, rating: 5, reviews: 7 },
  { id: 's3', name: 'Carla Mendoza', initials: 'CM', program: 'BS Accountancy', year: '4th year', campus: 'manila', verified: true, rating: 4.5, reviews: 9 },
  { id: 's4', name: 'Paolo Garcia', initials: 'PG', program: 'BS Architecture', year: '3rd year', campus: 'manila', verified: true, rating: 4.2, reviews: 5 },
  { id: 's5', name: 'Jasmine Cruz', initials: 'JC', program: 'BS Computer Science', year: '2nd year', campus: 'qc', verified: true, rating: 4.9, reviews: 3 },
  { id: 's6', name: 'Ramon Villanueva', initials: 'RV', program: 'BS Chemical Engineering', year: '3rd year', campus: 'manila', verified: true },
]

/** Seed reviews behind the seller aggregates above. Buyers write to sellers. */
export const SEED_REVIEWS: Review[] = [
  { id: 'rv1', rating: 5, comment: 'Meetup was on time and the calculator worked perfectly. Smooth exchange!', reviewerId: 'buyer_demo', revieweeId: 's1', listingId: 'l1', threadId: 't1', createdAt: new Date('2026-09-14T10:00:00Z').toISOString() },
  { id: 'rv2', rating: 5, comment: 'Very responsive and easy to talk to. Recommended seller.', reviewerId: 'buyer_demo', revieweeId: 's1', listingId: 'l2', threadId: 't1', createdAt: new Date('2026-09-27T14:30:00Z').toISOString() },
  { id: 'rv3', rating: 4, comment: 'Item as described. Met at the library lobby, quick handover.', reviewerId: 'buyer_demo', revieweeId: 's2', listingId: 'l3', threadId: 't2', createdAt: new Date('2026-10-05T09:15:00Z').toISOString() },
  { id: 'rv4', rating: 5, comment: 'Bought her review book, barely used as promised. Thanks!', reviewerId: 'buyer_demo', revieweeId: 's3', listingId: 'l5', threadId: 't3', createdAt: new Date('2026-10-11T16:45:00Z').toISOString() },
  { id: 'rv5', rating: 5, comment: 'Great drafting kit, complete pens, case intact just as listed.', reviewerId: 'buyer_demo', revieweeId: 's4', listingId: 'l7', threadId: 't4', createdAt: new Date('2026-10-15T11:20:00Z').toISOString() },
  { id: 'rv6', rating: 3, comment: 'Handover took a bit of rescheduling but the item was fine.', reviewerId: 'buyer_demo', revieweeId: 's4', listingId: 'l8', threadId: 't4', createdAt: new Date('2026-10-18T13:05:00Z').toISOString() },
  { id: 'rv7', rating: 5, comment: 'Free readings compilation, super generous. Thanks po!', reviewerId: 'buyer_demo', revieweeId: 's5', listingId: 'l16', threadId: 't5', createdAt: new Date('2026-10-20T08:40:00Z').toISOString() },
  { id: 'rv8', rating: 5, comment: 'Reliable seller, exact change and easy meetup.', reviewerId: 'buyer_demo', revieweeId: 's5', listingId: 'l6', threadId: 't5', createdAt: new Date('2026-10-21T17:55:00Z').toISOString() },
  { id: 'rv9', rating: 4, comment: 'Good condition uniform set, sizes matched the description.', reviewerId: 'buyer_demo', revieweeId: 's3', listingId: 'l9', threadId: 't6', createdAt: new Date('2026-10-22T10:25:00Z').toISOString() },
]

type SeedListing = Omit<Listing, 'campus' | 'status' | 'createdAt' | 'transactionType' | 'imageUrls'> & {
  hoursAgo: number
  transactionType?: Listing['transactionType']
  imageUrls?: string[]
  status?: Listing['status']
}

const SEED_LISTING_DATA: SeedListing[] = [
  {
    id: 'l1',
    title: 'Engineering Mechanics: Statics, 14th Ed.',
    price: 850,
    courseCode: 'CIV 101',
    category: 'Textbooks',
    department: 'Engineering',
    condition: 'Good',
    description:
      'Hibbeler, 14th edition. Light pencil notes on chapters 2 to 4, no torn pages. Perfect for first-term Statics.',
    imageUrl: photo('1642952469120-eed4b65104be'),
    sellerId: 's1',
    meetupSpot: 'Library Plaza',
    hoursAgo: 2,
  },
  {
    id: 'l2',
    title: 'Casio fx-991ES Plus Scientific Calculator',
    price: 650,
    courseCode: 'MATH 010',
    category: 'Calculators',
    department: 'Engineering',
    condition: 'Like New',
    description:
      'Used for one term only. Comes with the hard cover and a fresh battery. Board-exam approved model.',
    imageUrl: photo('1648201637025-1c77b9be3013'),
    sellerId: 's2',
    meetupSpot: 'Main Lobby',
    hoursAgo: 4,
  },
  {
    id: 'l3',
    title: 'TIP Uniform Set, Polo + Slacks (Medium)',
    price: 500,
    courseCode: 'GEN ED',
    category: 'Uniforms',
    department: 'CBA',
    condition: 'Good',
    description:
      'Official polo with embroidered logo and matching slacks. Washed and pressed, no stains. Fits 5\u20196" to 5\u20199".',
    imageUrl: photo('1671438118097-479e63198629'),
    sellerId: 's3',
    meetupSpot: 'Canteen Entrance',
    hoursAgo: 5,
  },
  {
    id: 'l4',
    title: 'Lab Gown + Safety Goggles Bundle',
    price: 380,
    courseCode: 'CHEM 001',
    category: 'Lab Gear',
    department: 'Engineering',
    condition: 'Good',
    description:
      'Long-sleeve lab gown (Large) with anti-fog goggles. Required for Chemistry lab, so you can skip the bookstore line.',
    imageUrl: photo('1617155093730-a8bf47be792d'),
    sellerId: 's6',
    meetupSpot: 'Student Lounge',
    hoursAgo: 26,
  },
  {
    id: 'l5',
    title: 'Complete Drafting Set with Technical Pens',
    price: 2500,
    courseCode: 'ARCH 101',
    category: 'Drafting Tools',
    department: 'Architecture',
    condition: 'Like New',
    description:
      'Compass set, 3 technical pens (0.2, 0.3, 0.5), lead holder and eraser shield in the original case.',
    imageUrl: photo('1764948620396-45f5b5fdd73e'),
    sellerId: 's4',
    meetupSpot: 'Library Lobby',
    hoursAgo: 26,
  },
  {
    id: 'l6',
    title: 'Calculus: Early Transcendentals (Stewart)',
    price: 950,
    courseCode: 'MATH 020',
    category: 'Textbooks',
    department: 'Engineering',
    condition: 'Fair',
    description:
      'Cover has some wear but every page is intact. Highlighted key theorems that helped me pass Calc 2.',
    imageUrl: photo('1708011271935-3e109df56fe0'),
    sellerId: 's1',
    meetupSpot: 'Main Lobby',
    hoursAgo: 50,
  },
  {
    id: 'l7',
    title: 'Financial Accounting Vol. 1 (Valix)',
    price: 450,
    courseCode: 'ACC 101',
    category: 'Textbooks',
    department: 'CBA',
    condition: 'Good',
    description: 'Latest edition. A few erasable pencil notes on chapters 3 to 5. Answer key not included.',
    imageUrl: photo('1642043175009-5997b3a078d8'),
    sellerId: 's3',
    meetupSpot: 'Library Lobby',
    hoursAgo: 50,
  },
  {
    id: 'l8',
    title: 'Physics Lab Manual + Vernier Caliper',
    price: 300,
    courseCode: 'PHYS 001',
    category: 'Lab Gear',
    department: 'Engineering',
    condition: 'Good',
    description: 'Unanswered lab manual plus a working stainless vernier caliper. Great for Physics 1 experiments.',
    imageUrl: photo('1778867127717-8e55e8e9dea4'),
    sellerId: 's6',
    meetupSpot: 'Student Lounge',
    hoursAgo: 74,
  },
  {
    id: 'l9',
    title: 'Data Structures & Algorithms in Java',
    price: 700,
    courseCode: 'CS 201',
    category: 'Textbooks',
    department: 'CS/IT',
    condition: 'Like New',
    description: 'Goodrich & Tamassia. Bought it new last term and barely opened it. No writing inside.',
    imageUrl: photo('1672309558498-cfcc89afff25'),
    sellerId: 's5',
    meetupSpot: 'Gate 2 Security Post',
    hoursAgo: 74,
  },
  {
    id: 'l10',
    title: 'T-Square + 45\u00b0 and 30-60\u00b0 Triangles',
    price: 150,
    courseCode: 'ARCH 102',
    category: 'Drafting Tools',
    department: 'Architecture',
    condition: 'Fair',
    description: '24-inch T-square with both triangles. Some scratches, edges are still straight and true.',
    imageUrl: photo('1760030428004-60a033044f81'),
    sellerId: 's4',
    meetupSpot: 'Main Gate Security Post',
    hoursAgo: 98,
  },
  {
    id: 'l11',
    title: 'Casio fx-82MS Calculator',
    price: 250,
    courseCode: 'BUS 101',
    category: 'Calculators',
    department: 'CBA',
    condition: 'Fair',
    description: 'Reliable basic scientific calculator. Works perfectly, minor scuffs on the case.',
    imageUrl: photo('1626266061368-46a8f578ddd6'),
    sellerId: 's5',
    meetupSpot: 'Main Lobby',
    hoursAgo: 122,
  },
  {
    id: 'l12',
    title: 'Molecular Model Kit (Organic Chem)',
    price: 420,
    courseCode: 'CHEM 001',
    category: 'Lab Gear',
    department: 'Engineering',
    condition: 'Like New',
    description: 'Complete atom and bond set in the original box. Makes stereochemistry so much easier to picture.',
    imageUrl: photo('1603126857599-f6e157fa2fe6'),
    sellerId: 's6',
    meetupSpot: 'Canteen Entrance',
    hoursAgo: 146,
  },
  {
    id: 'l13',
    title: 'Arduino Uno Starter Kit + Breadboard',
    price: 1200,
    courseCode: 'CPE 101',
    category: 'Lab Gear',
    department: 'CS/IT',
    condition: 'Good',
    description: 'Uno board, breadboard, jumper wires, LEDs and sensors. Everything you need for the CPE 101 projects.',
    imageUrl: photo('1555664424-778a1e5e1b48'),
    sellerId: 's2',
    meetupSpot: 'Gate 2 Security Post',
    hoursAgo: 170,
  },
  {
    id: 'l14',
    title: 'Casio fx-570ES Plus Calculator',
    price: 550,
    courseCode: 'MATH 020',
    category: 'Calculators',
    department: 'Engineering',
    condition: 'Good',
    description: 'Solves equations and integrals. Small scratch on the screen cover, display is perfectly clear.',
    imageUrl: photo('1574607383077-47ddc2dc51c4'),
    sellerId: 's1',
    meetupSpot: 'Library Plaza',
    hoursAgo: 170,
  },
  {
    id: 'l15',
    title: 'A3 Grid Paper Pad + Mechanical Pencils',
    price: 180,
    courseCode: 'ARCH 101',
    category: 'Drafting Tools',
    department: 'Architecture',
    condition: 'Like New',
    description: 'Half-used A3 grid pad plus 0.3 and 0.5 mechanical pencils. Good for sketch plates and quick studies.',
    imageUrl: photo('1588343823210-663b8e34d258'),
    sellerId: 's4',
    meetupSpot: 'Library Lobby',
    hoursAgo: 340,
  },
  {
    id: 'l16',
    title: 'Free: ENGL 2 Essay Readings Compilation',
    price: 0,
    transactionType: 'free',
    courseCode: 'GEN ED',
    category: 'School Supplies',
    department: 'CBA',
    condition: 'Fair',
    description:
      'Photocopied compilation of the ENGL 2 readings, free to anyone who needs it. Meet me at the cafeteria and it is yours.',
    imageUrls: [photo('1544716278-5b3fb3349d21'), photo('1516035069371-29a1b244cc32')],
    imageUrl: photo('1544716278-5b3fb3349d21'),
    sellerId: 's5',
    meetupSpot: 'Cafeteria Entrance',
    hoursAgo: 6,
  },
  {
    id: 'l17',
    title: 'Trade: Scientific Calculator for Drafting Pencils',
    price: 0,
    transactionType: 'trade',
    courseCode: 'MATH 010',
    category: 'Calculators',
    department: 'Architecture',
    condition: 'Good',
    description:
      'Will trade my spare Casio fx-82MS for a set of 0.3 and 0.5 drafting pencils plus a lead holder. Open to similar offers.',
    imageUrl: photo('1626266061368-46a8f578ddd6'),
    sellerId: 's4',
    meetupSpot: 'Main Gate Security Post',
    hoursAgo: 12,
    status: 'reserved',
  },
]

const HOUR_MS = 60 * 60 * 1000

/** Listings are dated relative to the moment they are seeded, then persisted. */
export const buildSeedListings = (now = Date.now()): Listing[] =>
  SEED_LISTING_DATA.map(({ hoursAgo, status, ...listing }) => ({
    ...listing,
    transactionType: listing.transactionType ?? 'sale',
    imageUrls: listing.imageUrls ?? [listing.imageUrl],
    campus: SELLERS.find((seller) => seller.id === listing.sellerId)?.campus ?? 'qc',
    status: status ?? 'active',
    createdAt: new Date(now - hoursAgo * HOUR_MS).toISOString(),
  }))

export const SEED_THREADS: Thread[] = [
  {
    id: 't1',
    listingId: 'l2',
    sellerId: 's2',
    items: [
      { id: 't1-1', kind: 'message', from: 'me', text: 'Hi! Is the fx-991ES still available?' },
      { id: 't1-2', kind: 'message', from: 'seller', text: 'Yes! Barely used, and it comes with the cover.' },
      { id: 't1-3', kind: 'meetup', from: 'seller', time: 'Thu, 2:30 PM', location: 'Main Lobby', status: 'pending' },
    ],
  },
  {
    id: 't2',
    listingId: 'l7',
    sellerId: 's3',
    items: [
      { id: 't2-1', kind: 'message', from: 'me', text: 'Hello po, are there any highlights or notes inside?' },
      { id: 't2-2', kind: 'message', from: 'seller', text: 'A few pencil notes on chapters 3 to 5, all erasable.' },
      { id: 't2-3', kind: 'message', from: 'me', text: "Great, I'll think about it!" },
    ],
  },
  {
    id: 't3',
    listingId: 'l5',
    sellerId: 's4',
    items: [
      { id: 't3-1', kind: 'message', from: 'me', text: 'Hi Paolo, is the drafting set complete?' },
      { id: 't3-2', kind: 'message', from: 'seller', text: 'Yes, all pens work and the case is intact.' },
      { id: 't3-3', kind: 'meetup', from: 'me', time: 'Today, 3:00 PM', location: 'Library Lobby', status: 'accepted' },
      { id: 't3-4', kind: 'message', from: 'seller', text: 'Today, 3:00 PM works. See you at Library Lobby!' },
    ],
  },
]

/** A seller proposed a meetup that the buyer has not answered yet. */
export const threadNeedsReply = (thread: Thread) =>
  thread.items.some((item) => item.kind === 'meetup' && item.from === 'seller' && item.status === 'pending')

export const departmentFor = (courseCode: string): Department => {
  if (/^(ACC|BUS)/.test(courseCode)) return 'CBA'
  if (/^(CS|CPE)/.test(courseCode)) return 'CS/IT'
  if (/^ARCH/.test(courseCode)) return 'Architecture'
  return 'Engineering'
}

const MINUTE_MS = 60 * 1000

export const isFresh = (iso: string, now = Date.now()) => now - new Date(iso).getTime() < HOUR_MS

export const timeAgo = (iso: string, now = Date.now()) => {
  const elapsed = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(elapsed / MINUTE_MS)
  const hours = Math.floor(elapsed / HOUR_MS)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 2) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 28) return `${Math.floor(days / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export const formatMonthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

export const formatPrice = (value: number) => `\u20b1${value.toLocaleString('en-PH')}`

/** Feed/detail price text: free and trade listings have no peso amount. */
export const priceLabel = (listing: Pick<Listing, 'transactionType' | 'price'>) =>
  listing.transactionType === 'free' ? 'Free' : listing.transactionType === 'trade' ? 'Trade' : formatPrice(listing.price)

export const CONDITION_BADGE: Record<Condition, 'success' | 'secondary' | 'default'> = {
  New: 'success',
  'Like New': 'success',
  Good: 'default',
  Fair: 'secondary',
}

export const STATUS_BADGE: Partial<Record<Listing['status'], { label: string; variant: 'danger' | 'warning' }>> = {
  reserved: { label: 'Reserved', variant: 'warning' },
  sold: { label: 'Sold', variant: 'danger' },
}

/** Staff profiles exist before first sign-in, so admins skip student onboarding. */
export const SEED_ADMIN_PROFILES = (now = Date.now()): Profile[] => [
  {
    userId: 'u_osa_admin',
    name: ADMIN_ACCOUNT.name,
    email: ADMIN_ACCOUNT.email,
    campus: 'qc',
    program: 'Office of Student Affairs',
    year: 'Staff',
    joinedAt: new Date(now - 120 * 24 * HOUR_MS).toISOString(),
    safetyAcceptedAt: new Date(now - 120 * 24 * HOUR_MS).toISOString(),
    onboardedAt: new Date(now - 120 * 24 * HOUR_MS).toISOString(),
  },
]

/** A few reports so the admin queue has something to review on first run. */
export const buildSeedReports = (now = Date.now()): Report[] => [
  {
    id: 'r1',
    target: { kind: 'listing', id: 'l13', label: 'Arduino Uno Starter Kit + Breadboard' },
    subjectId: 's2',
    subjectName: 'Andrea Reyes',
    campus: 'qc',
    reason: 'Misleading photos or description',
    details: 'The photo shows a genuine Uno, but the seller said in chat it is a clone board.',
    reporterId: 's5',
    reporterName: 'Jasmine Cruz',
    createdAt: new Date(now - 3 * HOUR_MS).toISOString(),
    status: 'open',
  },
  {
    id: 'r2',
    target: { kind: 'user', id: 's6', label: 'Ramon Villanueva' },
    subjectId: 's6',
    subjectName: 'Ramon Villanueva',
    campus: 'manila',
    reason: 'No-show at meetup',
    details: 'Agreed on Library Lobby at 1 PM, waited 40 minutes. Second time this week.',
    reporterId: 's3',
    reporterName: 'Carla Mendoza',
    createdAt: new Date(now - 9 * HOUR_MS).toISOString(),
    status: 'open',
  },
  {
    id: 'r3',
    target: { kind: 'listing', id: 'l2', label: 'Casio fx-991ES Plus Scientific Calculator' },
    subjectId: 's2',
    subjectName: 'Andrea Reyes',
    campus: 'qc',
    reason: 'Scam or suspicious price',
    details: '',
    reporterId: 's1',
    reporterName: 'Miguel Santos',
    createdAt: new Date(now - 30 * HOUR_MS).toISOString(),
    status: 'open',
  },
  {
    id: 'r4',
    target: { kind: 'listing', id: 'l4', label: 'Lab Gown + Safety Goggles Bundle' },
    subjectId: 's6',
    subjectName: 'Ramon Villanueva',
    campus: 'manila',
    reason: 'Already sold',
    details: 'Seller told me it was sold but the listing is still up.',
    reporterId: 's4',
    reporterName: 'Paolo Garcia',
    createdAt: new Date(now - 52 * HOUR_MS).toISOString(),
    status: 'dismissed',
    resolution: {
      action: 'dismiss',
      note: 'Checked with the seller: the buyer backed out, so the item is available again.',
      byName: ADMIN_ACCOUNT.name,
      at: new Date(now - 48 * HOUR_MS).toISOString(),
    },
  },
]

export const buildSeedAudit = (now = Date.now()): AuditEntry[] => [
  {
    id: 'a1',
    at: new Date(now - 48 * HOUR_MS).toISOString(),
    action: 'report_dismissed',
    actorName: ADMIN_ACCOUNT.name,
    summary: 'Dismissed a report on \u201cLab Gown + Safety Goggles Bundle\u201d',
    note: 'Checked with the seller: the buyer backed out, so the item is available again.',
  },
]
