/*
 * Domain types and service contracts. Screens and App.tsx depend only on
 * these; a real backend plugs in by implementing the interfaces below.
 */

export type CampusId = 'manila' | 'qc'

export type Condition = 'New' | 'Like New' | 'Good' | 'Fair'
export type Category =
  | 'Textbooks'
  | 'Calculators'
  | 'Uniforms'
  | 'Lab Gear'
  | 'Drafting Tools'
  | 'Electronics'
  | 'School Supplies'
  | 'Others'
export type Department = 'Engineering' | 'CBA' | 'CS/IT' | 'Architecture'
export type ListingStatus = 'active' | 'reserved' | 'sold'
export type TransactionType = 'sale' | 'free' | 'trade'

export type Seller = {
  id: string
  name: string
  initials: string
  program: string
  year: string
  campus: CampusId
  verified: true
  /** Average stars received from completed exchanges; absent until the first review. */
  rating?: number
  /** Number of reviews behind `rating`. */
  reviews?: number
}

/** A completed-exchange review written by either side of a chat. */
export type Review = {
  id: string
  rating: number
  comment: string
  reviewerId: string
  revieweeId: string
  listingId: string
  threadId: string
  createdAt: string
}

export type Listing = {
  id: string
  title: string
  price: number
  transactionType: TransactionType
  courseCode: string
  category: Category
  department: Department
  condition: Condition
  description: string
  imageUrl: string
  imageUrls: string[]
  sellerId: string
  meetupSpot: string
  campus: CampusId
  status: ListingStatus
  /** ISO timestamp. Rendered relative ("2h ago") so persisted data ages correctly. */
  createdAt: string
}

/** What the Add/Edit listing form produces. */
export type ListingDraft = {
  title: string
  price: number
  transactionType: TransactionType
  category: Category
  courseCode: string
  meetupSpot: string
  condition: Condition
  description: string
  imageUrls: string[]
}

export type MeetupStatus = 'pending' | 'accepted' | 'declined'

export type ChatItem =
  | { id: string; kind: 'message'; from: 'me' | 'seller'; text: string }
  | {
      id: string
      kind: 'meetup'
      from: 'me' | 'seller'
      time: string
      location: string
      status: MeetupStatus
      completed?: boolean
      rating?: number
    }

export type MeetupItem = Extract<ChatItem, { kind: 'meetup' }>

export type Thread = { id: string; listingId: string; sellerId: string; items: ChatItem[] }

/** Server-issued. Admins are Office of Student Affairs staff; everyone else is a member. */
export type Role = 'member' | 'admin'
export type AccountStatus = 'active' | 'suspended'

export type Session = {
  userId: string
  email: string
  name: string
  initials: string
  issuedAt: string
  /** Missing on sessions issued before roles existed; treat as 'member'. */
  role?: Role
}

export type Profile = {
  userId: string
  name: string
  /** School email, saved at onboarding so admins can contact the member. */
  email?: string
  campus: CampusId | null
  program: string
  year: string
  joinedAt: string
  safetyAcceptedAt?: string
  onboardedAt?: string
}

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'cancelled' | 'domain' | 'unverified' | 'network' | 'suspended'; email?: string }

export type Theme = 'light' | 'dark'
export type Prefs = { theme: Theme; introSeen: boolean }

export type ChatEvent =
  | { type: 'typing'; threadId: string; typing: boolean }
  | { type: 'message'; threadId: string; item: ChatItem }
  | { type: 'meetupUpdated'; threadId: string; item: MeetupItem }

/** Approved hand-off spots per campus. Admins edit these; members pick from them. */
export type MeetupSpots = Record<CampusId, string[]>

export type ReportKind = 'listing' | 'user'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type ReportAction = 'remove_listing' | 'suspend_member' | 'dismiss'

/** What a member sends. The reporter comes from the session on the server. */
export type ReportInput = {
  id: string
  target: { kind: ReportKind; id: string }
  reason: string
  details: string
}

export type Report = {
  id: string
  target: { kind: ReportKind; id: string; label: string }
  /** The member responsible: the listing's seller, or the reported member. */
  subjectId: string
  subjectName: string
  campus: CampusId
  reason: string
  details: string
  reporterId: string
  reporterName: string
  createdAt: string
  status: ReportStatus
  resolution?: { action: ReportAction; note: string; byName: string; at: string }
}

export type MemberSummary = {
  userId: string
  name: string
  email: string
  campus: CampusId | null
  program: string
  year: string
  role: Role
  status: AccountStatus
  joinedAt: string | null
  activeListings: number
  openReports: number
}

export type AuditAction = 'report_dismissed' | 'listing_removed' | 'member_suspended' | 'member_reinstated' | 'spots_updated'

export type AuditEntry = {
  id: string
  at: string
  action: AuditAction
  actorName: string
  summary: string
  note?: string
}

export type PromotionType = 'sponsor' | 'perk'

export type Promotion = {
  id: string
  title: string
  description: string
  imageUrl?: string
  destinationUrl: string
  sponsorName: string
  type: PromotionType
  campus: CampusId | 'all'
  active: boolean
}

export type AnalyticsOverview = {
  members: number
  activeListings: number
  openReports: number
  completedExchanges: number
  averageRating: number
}

export interface PromotionService {
  list(query: { campus: CampusId }): Promise<Promotion[]>
  trackClick(id: string): Promise<void>
}

export interface AnalyticsService {
  getOverview(): Promise<AnalyticsOverview>
  track(event: string, properties?: Record<string, string | number | boolean>): Promise<void>
}

export interface AuthService {
  getSession(): Promise<Session | null>
  signInWithGoogle(): Promise<AuthResult>
  signOut(): Promise<void>
}

export interface ProfileService {
  get(userId: string): Promise<Profile | null>
  save(profile: Profile): Promise<Profile>
  /** Public seller cards for the given user ids (unknown ids are skipped). */
  getSellers(ids: string[]): Promise<Seller[]>
}

export interface ListingService {
  /** Active listings on one campus, newest first. */
  list(query: { campus: CampusId }): Promise<Listing[]>
  /** Every listing the user owns, active and sold. */
  listMine(userId: string): Promise<Listing[]>
  /** Lookup by id for threads; deleted listings are simply missing. */
  getMany(ids: string[]): Promise<Listing[]>
  create(draft: ListingDraft, ctx: { userId: string; campus: CampusId }): Promise<Listing>
  update(id: string, patch: ListingDraft): Promise<Listing>
  setStatus(id: string, status: ListingStatus): Promise<Listing>
  remove(id: string): Promise<void>
}

export interface ChatService {
  listThreads(): Promise<Thread[]>
  openThread(listing: Pick<Listing, 'id' | 'sellerId'>): Promise<Thread>
  /** Ids are generated by the client so optimistic items can be reconciled. */
  sendMessage(threadId: string, message: { id: string; text: string }): Promise<ChatItem>
  proposeMeetup(threadId: string, proposal: { id: string; location: string; time: string }): Promise<MeetupItem>
  respondToMeetup(
    threadId: string,
    itemId: string,
    status: 'accepted' | 'declined',
    reply: { id: string; text: string },
  ): Promise<void>
  completeMeetup(threadId: string, itemId: string): Promise<void>
  rate(threadId: string, itemId: string, rating: number, comment: string): Promise<void>
  /** Reviews received by a user, newest first (feeds the public seller card). */
  listReviews(userId: string): Promise<Review[]>
  setListingStatus(threadId: string, status: Extract<ListingStatus, 'reserved' | 'sold'>): Promise<void>
  /** Realtime events (typing, incoming messages, meetup updates). Returns an unsubscribe function. */
  subscribe(listener: (event: ChatEvent) => void): () => void
}

export interface PrefsService {
  get(): Promise<Prefs>
  set(patch: Partial<Prefs>): Promise<Prefs>
}

export interface ReportService {
  /** Members file reports from listing detail and chat. */
  submit(input: ReportInput): Promise<Report>
}

export interface SettingsService {
  getMeetupSpots(): Promise<MeetupSpots>
}

/**
 * Admin-only. Every call must be authorised on the server from the session's
 * role; the client only hides the Admin tab from members. Calls from
 * non-admins fail with a ServiceError coded 'forbidden'.
 */
export interface AdminService {
  /** Every report on both campuses, newest first. */
  listReports(): Promise<Report[]>
  /** Applies the action. Resolving one report also closes other open reports on the same target. */
  resolveReport(id: string, action: ReportAction, note: string): Promise<Report>
  listMembers(): Promise<MemberSummary[]>
  setMemberStatus(userId: string, status: AccountStatus, note: string): Promise<MemberSummary>
  saveMeetupSpots(campus: CampusId, spots: string[]): Promise<MeetupSpots>
  /** Newest first. */
  listAudit(): Promise<AuditEntry[]>
}

export type GoogleAccount = { name: string; email: string }

/** Reviewer-only knobs. Only the mock adapter provides these. */
export type DemoControls = {
  slowNetwork: boolean
  failNextLoad: boolean
  failNextPublish: boolean
  sellerDeclines: boolean
  googleFailure: 'none' | 'network' | 'cancel'
}

export interface DemoService {
  getControls(): DemoControls
  setControl<K extends keyof DemoControls>(key: K, value: DemoControls[K]): void
  /** Clears every stored record and reseeds. */
  reset(): Promise<void>
  /** The mock Google sign-in asks this picker (the chooser sheet) for an account. */
  registerAccountPicker(picker: (() => Promise<GoogleAccount | null>) | null): void
}

export type Services = {
  auth: AuthService
  profiles: ProfileService
  listings: ListingService
  chat: ChatService
  prefs: PrefsService
  reports: ReportService
  settings: SettingsService
  admin: AdminService
  promotions: PromotionService
  analytics: AnalyticsService
  /** Present only for the mock adapter. */
  demo?: DemoService
}
