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
  // absent until the first review
  rating?: number
  reviews?: number
}

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

export type ListingPhoto = {
  id: string
  storagePath: string
  downloadUrl: string
  thumbnailPath?: string
  thumbnailUrl?: string
  width: number
  height: number
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  sortOrder: number
  schemaVersion: 1
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
  photos?: ListingPhoto[]
  listingVersion?: number
  imageUrl: string
  imageUrls: string[]
  sellerId: string
  meetupSpot: string
  campus: CampusId
  status: ListingStatus
  // iso timestamp, rendered relative so persisted data ages correctly
  createdAt: string
}

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

export type Role = 'member' | 'admin'
export type AccountStatus = 'active' | 'suspended'

export type Session = {
  userId: string
  email: string
  name: string
  initials: string
  issuedAt: string
  // missing on sessions issued before roles existed; treat as 'member'
  role?: Role
}

export type Profile = {
  userId: string
  name: string
  // saved at onboarding so admins can contact the member
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

export type MeetupSpots = Record<CampusId, string[]>

export type ReportKind = 'listing' | 'user'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type ReportAction = 'remove_listing' | 'suspend_member' | 'dismiss'

export type ReportInput = {
  id: string
  target: { kind: ReportKind; id: string }
  reason: string
  details: string
}

export type Report = {
  id: string
  target: { kind: ReportKind; id: string; label: string }
  // the listing's seller, or the reported member
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
  // absent until the member's first review
  rating?: number
  reviews?: number
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
  // unknown ids are skipped
  getSellers(ids: string[]): Promise<Seller[]>
}

export interface ListingService {
  // newest first
  list(query: { campus: CampusId }): Promise<Listing[]>
  listMine(userId: string): Promise<Listing[]>
  // deleted listings are simply missing
  getMany(ids: string[]): Promise<Listing[]>
  create(draft: ListingDraft, ctx: { userId: string; campus: CampusId }): Promise<Listing>
  update(id: string, patch: ListingDraft): Promise<Listing>
  setStatus(id: string, status: ListingStatus): Promise<Listing>
  remove(id: string): Promise<void>
}

export interface ChatService {
  listThreads(): Promise<Thread[]>
  openThread(listing: Pick<Listing, 'id' | 'sellerId'>): Promise<Thread>
  // ids are generated by the client so optimistic items can be reconciled
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
  setListingStatus(threadId: string, status: Extract<ListingStatus, 'reserved' | 'sold'>): Promise<void>
  // returns an unsubscribe function
  subscribe(listener: (event: ChatEvent) => void): () => void
}

export interface PrefsService {
  get(): Promise<Prefs>
  set(patch: Partial<Prefs>): Promise<Prefs>
}

export interface ReportService {
  submit(input: ReportInput): Promise<Report>
}

export interface SettingsService {
  getMeetupSpots(): Promise<MeetupSpots>
}

// server must authorise every call from the session role; the client only hides the admin tab
export interface AdminService {
  // newest first
  listReports(): Promise<Report[]>
  // resolving one report also closes other open reports on the same target
  resolveReport(id: string, action: ReportAction, note: string): Promise<Report>
  listMembers(): Promise<MemberSummary[]>
  // every listing across both campuses, including reserved and sold; newest first
  listListings(): Promise<Listing[]>
  // removes a listing through the trusted administrator boundary
  removeListing(id: string, note: string): Promise<void>
  setMemberStatus(userId: string, status: AccountStatus, note: string): Promise<MemberSummary>
  saveMeetupSpots(campus: CampusId, spots: string[]): Promise<MeetupSpots>
  // newest first
  listAudit(): Promise<AuditEntry[]>
}

export type GoogleAccount = { name: string; email: string }

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
  reset(): Promise<void>
  // the mock google sign-in asks this picker for an account
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
  // mock adapter only
  demo?: DemoService
}
