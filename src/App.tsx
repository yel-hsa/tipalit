import { Button, ThemeProvider, Toast, useTheme } from '@figma/astraui'
import { ArrowLeft, PackageX } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import BottomTabBar, { type Tab } from './components/BottomTabBar'
import DemoStatesPanel, {
  UI_FLAGS_OFF,
  type DemoLauncher,
  type ReviewerFlags,
  type UiFlags,
} from './components/DemoStatesPanel'
import EmptyState from './components/EmptyState'
import GoogleAccountChooser from './components/GoogleAccountChooser'
import MeetupPickerSheet from './components/MeetupPickerSheet'
import PhoneShell, { type ToastOffset } from './components/PhoneShell'
import { draftFromProfile, type ProfileDraft } from './components/ProfileFields'
import RateModal from './components/RateModal'
import ReportModal, { type ReportTarget } from './components/ReportModal'
import { useReviewerMode } from './config/reviewer'
import {
  campusLabel,
  GOOGLE_TEST_ACCOUNTS,
  MEETUP_SPOTS,
  priceLabel,
  REVIEWER_GOOGLE_ACCOUNTS,
  SELLERS,
  threadNeedsReply,
} from './data/seed'
import AddListingScreen from './screens/AddListingScreen'
import AuthScreen from './screens/AuthScreen'
import BootScreen from './screens/BootScreen'
import ChatListScreen from './screens/ChatListScreen'
import ChatThreadScreen from './screens/ChatThreadScreen'
import FeedScreen from './screens/FeedScreen'
import IntroScreen from './screens/IntroScreen'
import OnboardingScreen, { type OnboardingStep } from './screens/OnboardingScreen'
import ProductDetailScreen from './screens/ProductDetailScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen, { type AdminTab } from './screens/AdminScreen'
import { services, ServiceError } from './services'
import { createId } from './services/ids'
import { firstNameOf, initialsOf, isProfileComplete } from './services/profile'
import type {
  AccountStatus,
  AuditEntry,
  AuthResult,
  CampusId,
  ChatItem,
  DemoControls,
  GoogleAccount,
  Listing,
  ListingDraft,
  ListingStatus,
  MeetupItem,
  MeetupSpots,
  MemberSummary,
  AnalyticsOverview,
  Profile,
  Promotion,
  Report,
  ReportAction,
  Role,
  Seller,
  Session,
  Thread,
  Theme,
} from './services/types'

type Route =
  | { name: 'boot' }
  | { name: 'intro' }
  | { name: 'auth' }
  | { name: 'onboarding'; step: OnboardingStep }
  | { name: 'feed' }
  | { name: 'detail'; listingId: string; back: Route }
  | { name: 'sell' }
  | { name: 'editListing'; listingId: string; back: Route }
  | { name: 'chats' }
  | { name: 'thread'; threadId: string }
  | { name: 'profile' }
  | { name: 'admin' }

type ToastVariant = 'default' | 'success' | 'error' | 'warning'
type ToastState = { id: number; message: string; variant: ToastVariant }

type LoadKey = 'feed' | 'chats' | 'profile' | 'admin'
type LoadStatus = 'loading' | 'error' | 'ready'

type AdminData = { reports: Report[]; members: MemberSummary[]; audit: AuditEntry[] }
const EMPTY_ADMIN: AdminData = { reports: [], members: [], audit: [] }
const DEFAULT_SPOTS: MeetupSpots = { qc: MEETUP_SPOTS.qc, manila: MEETUP_SPOTS.manila }

// null ids are the demo preview with no data behind it
type RateTarget = { threadId: string | null; itemId: string | null; sellerId: string }

// one-shot props for the screen a reviewer launcher jumps to; cleared on the next navigation
type ScreenInit = { nonce: number; feedQuery?: string; rejectedEmail?: string; sellValidate?: boolean }

const DEFAULT_CONTROLS: DemoControls = {
  slowNetwork: false,
  failNextLoad: false,
  failNextPublish: false,
  sellerDeclines: false,
  googleFailure: 'none',
}

const TAB_FOR_ROUTE: Partial<Record<Route['name'], Tab>> = {
  feed: 'home',
  sell: 'sell',
  chats: 'chats',
  profile: 'profile',
  admin: 'admin',
}

const TOAST_OFFSET: Partial<Record<Route['name'], ToastOffset>> = {
  boot: 'none',
  intro: 'none',
  auth: 'none',
  onboarding: 'none',
  editListing: 'none',
  thread: 'composer',
  detail: 'cta',
}

const ROUTE_FOR_TAB: Record<Tab, Route> = {
  home: { name: 'feed' },
  sell: { name: 'sell' },
  chats: { name: 'chats' },
  profile: { name: 'profile' },
  admin: { name: 'admin' },
}

const errorMessage = (error: unknown, fallback: string) => (error instanceof ServiceError ? error.message : fallback)

const routeAfterSignIn = (profile: Profile | null, role: Role = 'member'): Route => {
  if (!isProfileComplete(profile)) return { name: 'onboarding', step: 'profile' }
  if (!profile.safetyAcceptedAt) return { name: 'onboarding', step: 'safety' }
  return role === 'admin' ? { name: 'admin' } : { name: 'feed' }
}

const replaceById = <T extends { id: string }>(items: T[], next: T) =>
  items.map((item) => (item.id === next.id ? next : item))

const upsertFirst = <T extends { id: string }>(items: T[], next: T) =>
  items.some((item) => item.id === next.id) ? replaceById(items, next) : [next, ...items]

function TipalitApp() {
  const { setTheme } = useTheme()
  const [reviewerMode, setReviewerMode] = useReviewerMode()

  const [route, setRoute] = useState<Route>({ name: 'boot' })
  const [bootNonce, setBootNonce] = useState(0)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [feed, setFeed] = useState<Listing[]>([])
  const [mine, setMine] = useState<Listing[]>([])
  const [listingsById, setListingsById] = useState<Record<string, Listing>>({})
  const [threads, setThreads] = useState<Thread[]>([])
  const [sellers, setSellers] = useState<Record<string, Seller>>({})
  const [typingThreadId, setTypingThreadId] = useState<string | null>(null)
  const [spots, setSpots] = useState<MeetupSpots>(DEFAULT_SPOTS)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [overview, setOverview] = useState<AnalyticsOverview | undefined>(undefined)
  const [adminData, setAdminData] = useState<AdminData>(EMPTY_ADMIN)
  const [adminTab, setAdminTab] = useState<AdminTab>('reports')

  const [loads, setLoads] = useState<Partial<Record<LoadKey, LoadStatus>>>({})
  const loadsRef = useRef(loads)
  loadsRef.current = loads
  const loadRequest = useRef<Record<LoadKey, number>>({ feed: 0, chats: 0, profile: 0, admin: 0 })
  const [feedVersion, setFeedVersion] = useState(0)

  const [toast, setToast] = useState<ToastState | null>(null)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [rateTarget, setRateTarget] = useState<RateTarget | null>(null)
  const [pickerThreadId, setPickerThreadId] = useState<string | null>(null)
  const [screenInit, setScreenInit] = useState<ScreenInit | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoVersion, setDemoVersion] = useState(0)
  const [controls, setControls] = useState<DemoControls>(() => services.demo?.getControls() ?? DEFAULT_CONTROLS)
  const [uiFlags, setUiFlags] = useState<UiFlags>(UI_FLAGS_OFF)
  const [chooserOpen, setChooserOpen] = useState(false)
  const chooserResolve = useRef<((account: GoogleAccount | null) => void) | null>(null)

  const counters = useRef({ toast: 0, init: 0 })
  const messageToastThread = useRef<string | null>(null)
  const openingThread = useRef(false)
  const sellersRef = useRef(sellers)
  sellersRef.current = sellers
  const profileRef = useRef(profile)
  profileRef.current = profile
  const sessionRef = useRef(session)
  sessionRef.current = session

  const notify = useCallback((message: string, variant: ToastVariant = 'default') => {
    setToast({ id: ++counters.current.toast, message, variant })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  // runs before child effects, so the chat thread can still scroll itself to the bottom
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    messageToastThread.current = null
  }, [route])

  const navigate = (next: Route) => {
    if (screenInit) setScreenInit(null)
    if (next.name === 'detail') void services.analytics?.track('listing_view', { listing_id: next.listingId })
    setRoute(next)
  }

  const clearData = () => {
    // invalidate every in-flight load so it cannot repopulate state after sign-out
    loadRequest.current = {
      feed: loadRequest.current.feed + 1,
      chats: loadRequest.current.chats + 1,
      profile: loadRequest.current.profile + 1,
      admin: loadRequest.current.admin + 1,
    }
    setFeed([])
    setMine([])
    setListingsById({})
    setThreads([])
    setTypingThreadId(null)
    setLoads({})
    setAdminData(EMPTY_ADMIN)
    setAdminTab('reports')
    setPickerThreadId(null)
    setRateTarget(null)
    setReportTarget(null)
    setDemoOpen(false)
  }

  const enter = (nextSession: Session, nextProfile: Profile | null) => {
    setSession(nextSession)
    setProfile(nextProfile)
    navigate(routeAfterSignIn(nextProfile, nextSession.role))
  }

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      try {
        const [storedSession, prefs, storedSpots] = await Promise.all([
          services.auth.getSession(),
          services.prefs.get(),
          services.settings.getMeetupSpots().catch(() => null),
        ])
        if (cancelled) return
        setTheme(prefs.theme)
        if (storedSpots) setSpots(storedSpots)
        if (!storedSession) {
          setRoute(prefs.introSeen ? { name: 'auth' } : { name: 'intro' })
          return
        }
        const storedProfile = await services.profiles.get(storedSession.userId)
        if (cancelled) return
        setSession(storedSession)
        setProfile(storedProfile)
        setRoute(routeAfterSignIn(storedProfile, storedSession.role))
      } catch {
        if (!cancelled) setRoute({ name: 'auth' })
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [bootNonce, setTheme])

  useEffect(() => {
    const demo = services.demo
    if (!demo) return
    demo.registerAccountPicker(
      () =>
        new Promise<GoogleAccount | null>((resolve) => {
          chooserResolve.current = resolve
          setChooserOpen(true)
        }),
    )
    return () => demo.registerAccountPicker(null)
  }, [])

  const closeChooser = (account: GoogleAccount | null) => {
    setChooserOpen(false)
    chooserResolve.current?.(account)
    chooserResolve.current = null
  }

  useEffect(
    () =>
      services.chat.subscribe((event) => {
        if (!sessionRef.current) return
        if (event.type === 'typing') {
          setTypingThreadId((current) =>
            event.typing ? event.threadId : current === event.threadId ? null : current,
          )
          return
        }
        setThreads((current) =>
          current.map((thread) => {
            if (thread.id !== event.threadId) return thread
            if (event.type === 'message') {
              if (thread.items.some((item) => item.id === event.item.id)) return thread
              return { ...thread, items: [...thread.items, event.item] }
            }
            return { ...thread, items: replaceById(thread.items, event.item) }
          }),
        )
        if (event.type === 'meetupUpdated') {
          if (event.item.status === 'accepted') notify('Meetup accepted', 'success')
          else if (event.item.status === 'declined') notify('Meetup declined', 'warning')
        }
      }),
    [notify],
  )

  const userId = session?.userId ?? ''
  const me: Seller | null =
    session && isProfileComplete(profile)
      ? {
          id: userId,
          name: profile.name,
          initials: initialsOf(profile.name),
          program: profile.program,
          year: profile.year,
          campus: profile.campus,
          verified: true,
        }
      : null

  const getListing = (id: string): Listing | undefined => listingsById[id]
  const getSeller = (id: string): Seller =>
    (id === userId && me) ||
    sellers[id] ||
    SELLERS.find((seller) => seller.id === id) || {
      id,
      name: 'TIP Student',
      initials: 'TS',
      program: 'Verified student',
      year: '',
      campus: me?.campus ?? 'qc',
      verified: true,
    }

  const cacheListings = (items: Listing[], isLatest: () => boolean = () => true) => {
    if (items.length === 0 || !isLatest()) return
    setListingsById((current) => {
      const next = { ...current }
      items.forEach((listing) => {
        next[listing.id] = listing
      })
      return next
    })
  }

  const ensureSellers = async (ids: string[], isLatest: () => boolean = () => true) => {
    const missing = [...new Set(ids)].filter((id) => id !== userId && !sellersRef.current[id])
    if (missing.length === 0) return
    try {
      const found = await services.profiles.getSellers(missing)
      if (!isLatest()) return
      setSellers((current) => {
        const next = { ...current }
        found.forEach((seller) => {
          next[seller.id] = seller
        })
        return next
      })
    } catch {
      // seller cards fall back to a generic verified student
    }
  }

  const fetchThreads = async (isLatest: () => boolean = () => true) => {
    const list = await services.chat.listThreads()
    if (!isLatest()) return list
    setThreads(list)
    const listingIds = [...new Set(list.map((thread) => thread.listingId))]
    const [threadListings] = await Promise.all([
      services.listings.getMany(listingIds),
      ensureSellers(list.map((thread) => thread.sellerId), isLatest),
    ])
    cacheListings(threadListings, isLatest)
    return list
  }

  const fetchAdmin = async (isLatest: () => boolean = () => true) => {
    const [reports, members, audit, overview] = await Promise.all([
      services.admin.listReports(),
      services.admin.listMembers(),
      services.admin.listAudit(),
      services.analytics.getOverview().catch(() => undefined),
    ])
    if (!isLatest()) return
    const listingIds = [...new Set(reports.filter((r) => r.target.kind === 'listing').map((r) => r.target.id))]
    const [found] = await Promise.all([
      services.listings.getMany(listingIds),
      ensureSellers(members.map((m) => m.userId), isLatest),
    ])
    if (!isLatest()) return
    // forget reported listings the server no longer has, so the review sheet knows they're gone
    setListingsById((current) => {
      const next = { ...current }
      listingIds.forEach((id) => delete next[id])
      found.forEach((listing) => {
        next[listing.id] = listing
      })
      return next
    })
    setAdminData({ reports, members, audit })
    setOverview(overview)
  }

  const load = async (key: LoadKey) => {
    const current = profileRef.current
    if (!session || !isProfileComplete(current)) return
    const request = ++loadRequest.current[key]
    const isLatest = () => loadRequest.current[key] === request
    setLoads((all) => ({ ...all, [key]: 'loading' }))
    try {
      if (key === 'feed') {
        const [items, banners] = await Promise.all([
          services.listings.list({ campus: current.campus }),
          services.promotions.list({ campus: current.campus }),
        ])
        if (!isLatest()) return
        setFeed(items)
        setPromotions(banners)
        cacheListings(items, isLatest)
        await ensureSellers(items.map((listing) => listing.sellerId), isLatest)
      } else if (key === 'chats') {
        await fetchThreads(isLatest)
      } else if (key === 'admin') {
        await fetchAdmin(isLatest)
      } else {
        const items = await services.listings.listMine(session.userId)
        if (!isLatest()) return
        setMine(items)
        cacheListings(items, isLatest)
        // threads only feed the activity count; never let them fail the tab
        await fetchThreads(isLatest).catch((err) => {
          console.error('[TIPalit] Threads load failed:', err)
        })
      }
      if (isLatest()) setLoads((all) => ({ ...all, [key]: 'ready' }))
    } catch (err) {
      console.error('[TIPalit] Tab load failed:', key, err)
      if (isLatest()) setLoads((all) => ({ ...all, [key]: 'error' }))
    }
  }

  const loadKey: LoadKey | null =
    route.name === 'feed' || route.name === 'chats' || route.name === 'profile' || route.name === 'admin'
      ? route.name
      : null

  // skeletons on the first visit to each tab, or on every visit with "Slow network"
  useEffect(() => {
    if (!loadKey || !session) return
    const status = loadsRef.current[loadKey]
    if (status === 'loading') return
    if (status === 'ready' && !controls.slowNetwork) return
    load(loadKey)
    // `route` is included so "Slow network" re-runs the load on every visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey, route, session, feedVersion])

  const isLoading = (key: LoadKey) => !loads[key] || loads[key] === 'loading'
  const hasError = (key: LoadKey) => loads[key] === 'error'

  const isAdmin = session?.role === 'admin'
  const ready = !!session && isProfileComplete(profile) && !!profile.safetyAcceptedAt

  // admins get the open-report dot on their tab even before they visit it
  useEffect(() => {
    if (isAdmin && ready && route.name !== 'admin' && !loadsRef.current.admin) load('admin')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, ready])

  const finishIntro = () => {
    services.prefs.set({ introSeen: true }).catch(() => undefined)
    navigate(session && isProfileComplete(profile) ? { name: 'feed' } : { name: 'auth' })
  }

  const signIn = async (): Promise<AuthResult> => {
    const result = await services.auth.signInWithGoogle()
    if (!result.ok) return result
    let storedProfile: Profile | null = null
    try {
      storedProfile = await services.profiles.get(result.session.userId)
    } catch {
      // treated as a first sign-in; onboarding saves a fresh profile
    }
    clearData()
    enter(result.session, storedProfile)
    if (isProfileComplete(storedProfile) && storedProfile.safetyAcceptedAt) {
      notify(`Welcome back, ${firstNameOf(storedProfile.name)}`)
    }
    return result
  }

  const signOut = async () => {
    try {
      await services.auth.signOut()
    } catch {
      // the local session is dropped either way
    }
    setSession(null)
    setProfile(null)
    clearData()
    navigate({ name: 'auth' })
    notify('Signed out')
  }

  const saveProfile = async (next: Profile, failure: string) => {
    try {
      const saved = await services.profiles.save(next)
      setProfile(saved)
      return saved
    } catch (error) {
      notify(errorMessage(error, failure), 'error')
      return null
    }
  }

  const saveOnboardingProfile = async (draft: ProfileDraft) => {
    if (!session || !draft.campus) return false
    const saved = await saveProfile(
      {
        ...(profile ?? { userId: session.userId, joinedAt: new Date().toISOString() }),
        name: draft.name,
        email: session.email,
        campus: draft.campus,
        program: draft.program,
        year: draft.year,
      },
      "Couldn't save your profile. Try again.",
    )
    if (!saved) return false
    navigate({ name: 'onboarding', step: 'safety' })
    return true
  }

  const finishOnboarding = async () => {
    if (!profile) return false
    const now = new Date().toISOString()
    const saved = await saveProfile(
      { ...profile, safetyAcceptedAt: now, onboardedAt: now },
      "Couldn't finish setup. Try again.",
    )
    if (!saved) return false
    navigate({ name: 'feed' })
    notify(`Welcome to TIPalit, ${firstNameOf(saved.name)}!`, 'success')
    return true
  }

  const editProfile = async (draft: ProfileDraft) => {
    if (!profile || !draft.campus) return false
    const campusChanged = draft.campus !== profile.campus
    const saved = await saveProfile(
      { ...profile, name: draft.name, campus: draft.campus, program: draft.program, year: draft.year },
      "Couldn't save changes. Try again.",
    )
    if (!saved) return false
    if (campusChanged) {
      // the feed reloads (with skeletons) and resets its filters on the next visit
      setFeed([])
      setLoads((all) => ({ ...all, feed: undefined }))
      setFeedVersion((v) => v + 1)
      notify(`Switched to ${campusLabel(draft.campus)}`, 'success')
    } else {
      notify('Profile updated', 'success')
    }
    return true
  }

  const changeTheme = (theme: Theme) => {
    services.prefs.set({ theme }).catch(() => undefined)
  }

  const applyListing = (listing: Listing) => {
    cacheListings([listing])
    const inFeed = listing.status === 'active' && listing.campus === profileRef.current?.campus
    setFeed((current) =>
      inFeed ? upsertFirst(current, listing) : current.filter((item) => item.id !== listing.id),
    )
    if (listing.sellerId === userId) setMine((current) => upsertFirst(current, listing))
  }

  const snapshotListings = () => {
    const snapshot = { feed, mine, listingsById }
    return () => {
      setFeed(snapshot.feed)
      setMine(snapshot.mine)
      setListingsById(snapshot.listingsById)
    }
  }

  const createListing = async (draft: ListingDraft) => {
    if (!session || !isProfileComplete(profile)) return false
    try {
      const listing = await services.listings.create(draft, { userId: session.userId, campus: profile.campus })
      applyListing(listing)
      navigate({ name: 'feed' })
      notify('Listing published!', 'success')
      return true
    } catch (error) {
      notify(errorMessage(error, "Couldn't publish. Check your connection."), 'error')
      return false
    }
  }

  const updateListing = async (id: string, draft: ListingDraft, back: Route) => {
    try {
      const listing = await services.listings.update(id, draft)
      applyListing(listing)
      navigate({ name: 'detail', listingId: id, back })
      notify('Changes saved', 'success')
      return true
    } catch (error) {
      notify(errorMessage(error, "Couldn't save changes. Check your connection."), 'error')
      return false
    }
  }

  const setListingStatus = async (listing: Listing, status: ListingStatus) => {
    if (listing.status === status) return
    const rollback = snapshotListings()
    applyListing({ ...listing, status })
    const message =
      status === 'sold'
        ? 'Marked as sold'
        : status === 'reserved'
          ? 'Marked as reserved'
          : 'Listed as available again'
    notify(message, 'success')
    try {
      applyListing(await services.listings.setStatus(listing.id, status))
    } catch (error) {
      rollback()
      notify(errorMessage(error, "Couldn't update the listing."), 'error')
    }
  }

  const deleteListing = async (listing: Listing, back: Route) => {
    const rollback = snapshotListings()
    setFeed((current) => current.filter((item) => item.id !== listing.id))
    setMine((current) => current.filter((item) => item.id !== listing.id))
    setListingsById((current) => {
      const next = { ...current }
      delete next[listing.id]
      return next
    })
    navigate(back)
    notify('Listing deleted')
    try {
      await services.listings.remove(listing.id)
    } catch (error) {
      rollback()
      notify(errorMessage(error, "Couldn't delete the listing."), 'error')
    }
  }

  const shareListing = async (listing: Listing) => {
    const text = `${listing.title}, ${priceLabel(listing)} on TIPalit (${campusLabel(listing.campus)})`
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text })
      } catch {
        // closing the share sheet is not an error
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      notify('Listing details copied')
    } catch {
      notify("Couldn't copy the listing details.", 'error')
    }
  }

  const submitReport = async (target: ReportTarget, reason: string, details: string) => {
    const done = () => {
      setReportTarget(null)
      notify("Report sent. We'll review it within 24 hours.", 'success')
      return true
    }
    // the reviewer preview has no real listing or member behind it
    if (!target.id) return done()
    try {
      await services.reports.submit({ id: createId('r'), target: { kind: target.kind, id: target.id }, reason, details })
      // admins see the new report the next time the queue loads
      setLoads((all) => ({ ...all, admin: undefined }))
      return done()
    } catch (error) {
      notify(errorMessage(error, "Couldn't send the report. Try again."), 'error')
      return false
    }
  }

  const refreshAdmin = async () => {
    try {
      await fetchAdmin()
    } catch {
      // the current view stays; the next visit reloads
      setLoads((all) => ({ ...all, admin: undefined }))
    }
  }

  const dropListing = (listingId: string) => {
    setFeed((current) => current.filter((item) => item.id !== listingId))
    setMine((current) => current.filter((item) => item.id !== listingId))
    setListingsById((current) => {
      const next = { ...current }
      delete next[listingId]
      return next
    })
  }

  const resolveReport = async (reportId: string, action: ReportAction, note: string) => {
    const report = adminData.reports.find((item) => item.id === reportId)
    try {
      await services.admin.resolveReport(reportId, action, note)
    } catch (error) {
      notify(errorMessage(error, "Couldn't apply that decision. Try again."), 'error')
      return false
    }
    if (report && action === 'remove_listing') dropListing(report.target.id)
    if (report && action === 'suspend_member') {
      setFeed((current) => current.filter((item) => item.sellerId !== report.subjectId))
    }
    notify(
      action === 'remove_listing'
        ? 'Listing removed'
        : action === 'suspend_member'
          ? `${report?.subjectName ?? 'Member'} suspended`
          : 'Report dismissed',
      'success',
    )
    await refreshAdmin()
    return true
  }

  const setMemberStatus = async (userId: string, status: AccountStatus, note: string) => {
    let member: MemberSummary
    try {
      member = await services.admin.setMemberStatus(userId, status, note)
    } catch (error) {
      notify(errorMessage(error, "Couldn't update the account. Try again."), 'error')
      return false
    }
    if (status === 'suspended') setFeed((current) => current.filter((item) => item.sellerId !== userId))
    // reinstated listings come back on the next feed load
    else setLoads((all) => ({ ...all, feed: undefined }))
    notify(`${member.name} ${status === 'suspended' ? 'suspended' : 'reinstated'}`, 'success')
    await refreshAdmin()
    return true
  }

  const saveSpots = async (campus: CampusId, list: string[]) => {
    try {
      setSpots(await services.admin.saveMeetupSpots(campus, list))
    } catch (error) {
      notify(errorMessage(error, "Couldn't save the meetup spots. Try again."), 'error')
      return false
    }
    notify('Meetup spots updated', 'success')
    await refreshAdmin()
    return true
  }

  const patchThread = (threadId: string, change: (thread: Thread) => Thread) => {
    setThreads((current) => current.map((thread) => (thread.id === threadId ? change(thread) : thread)))
  }
  const appendItem = (threadId: string, item: ChatItem) =>
    patchThread(threadId, (thread) => ({ ...thread, items: [...thread.items, item] }))
  const removeItem = (threadId: string, itemId: string) =>
    patchThread(threadId, (thread) => ({ ...thread, items: thread.items.filter((item) => item.id !== itemId) }))
  const patchMeetup = (threadId: string, itemId: string, patch: Partial<MeetupItem>) =>
    patchThread(threadId, (thread) => ({
      ...thread,
      items: thread.items.map((item) => (item.id === itemId && item.kind === 'meetup' ? { ...item, ...patch } : item)),
    }))
  const snapshotThread = (threadId: string) => {
    const snapshot = threads.find((thread) => thread.id === threadId)
    return () => {
      if (snapshot) patchThread(threadId, () => snapshot)
    }
  }

  const openThreadForListing = async (listing: Listing) => {
    if (openingThread.current) return
    openingThread.current = true
    void services.analytics?.track('chat_started', { listing_id: listing.id })
    try {
      const thread = await services.chat.openThread(listing)
      setThreads((current) => upsertFirst(current, thread))
      navigate({ name: 'thread', threadId: thread.id })
    } catch (error) {
      notify(errorMessage(error, "Couldn't open the chat. Try again."), 'error')
    } finally {
      openingThread.current = false
    }
  }

  const sendMessage = async (threadId: string, text: string) => {
    const id = createId('m')
    appendItem(threadId, { id, kind: 'message', from: 'me', text })
    // only the first message of a visit gets a toast, so a normal conversation isn't noisy
    if (messageToastThread.current !== threadId) {
      messageToastThread.current = threadId
      notify('Message sent')
    }
    void services.analytics?.track('message_sent', { thread_id: threadId })
    try {
      await services.chat.sendMessage(threadId, { id, text })
    } catch {
      removeItem(threadId, id)
      notify('Message not sent', 'error')
    }
  }

  const proposeMeetup = async (threadId: string, { location, time }: { location: string; time: string }) => {
    const id = createId('mt')
    appendItem(threadId, { id, kind: 'meetup', from: 'me', time, location, status: 'pending' })
    setPickerThreadId(null)
    notify('Meetup proposal sent')
    try {
      await services.chat.proposeMeetup(threadId, { id, location, time })
    } catch {
      removeItem(threadId, id)
      notify("Couldn't send the proposal.", 'error')
    }
  }

  const respondToMeetup = async (threadId: string, itemId: string, status: 'accepted' | 'declined') => {
    const rollback = snapshotThread(threadId)
    const reply = { id: createId('m'), text: status === 'accepted' ? 'See you there!' : 'Can we pick another time?' }
    patchMeetup(threadId, itemId, { status })
    appendItem(threadId, { id: reply.id, kind: 'message', from: 'me', text: reply.text })
    if (status === 'accepted') notify('Meetup accepted', 'success')
    else notify('Meetup declined', 'warning')
    try {
      await services.chat.respondToMeetup(threadId, itemId, status, reply)
    } catch {
      rollback()
      notify("Couldn't send your response.", 'error')
    }
  }

  const completeMeetup = async (thread: Thread, itemId: string) => {
    const rollback = snapshotThread(thread.id)
    patchMeetup(thread.id, itemId, { completed: true })
    setRateTarget({ threadId: thread.id, itemId, sellerId: thread.sellerId })
    try {
      await services.chat.completeMeetup(thread.id, itemId)
    } catch {
      rollback()
      setRateTarget(null)
      notify("Couldn't mark the meetup done.", 'error')
    }
  }

  const submitRating = async (target: RateTarget, rating: number, comment: string) => {
    setRateTarget(null)
    notify(`Thanks for rating ${firstNameOf(getSeller(target.sellerId).name)}!`, 'success')
    const { threadId, itemId } = target
    if (!threadId || !itemId) return
    const rollback = snapshotThread(threadId)
    patchMeetup(threadId, itemId, { completed: true, rating })
    try {
      await services.chat.rate(threadId, itemId, rating, comment)
      // re-pull the seller card so detail/thread stars reflect the new review
      const [refreshed] = await services.profiles.getSellers([target.sellerId])
      if (refreshed?.rating != null) {
        setSellers((current) => ({ ...current, [target.sellerId]: refreshed }))
      } else {
        // new accounts have no live aggregate, so fold the rating into the cached card
        setSellers((current) => {
          const seller = current[target.sellerId]
          if (!seller) return current
          const count = (seller.reviews ?? 0) + 1
          const average = ((seller.rating ?? 0) * (seller.reviews ?? 0) + rating) / count
          return { ...current, [target.sellerId]: { ...seller, rating: Math.round(average * 10) / 10, reviews: count } }
        })
      }
    } catch {
      rollback()
      notify("Couldn't save your rating.", 'error')
    }
  }

  const openPromotion = (promotion: Promotion) => {
    void services.promotions.trackClick(promotion.id)
    void services.analytics?.track('promo_click', { promo_id: promotion.id, sponsor: promotion.sponsorName })
    window.open(promotion.destinationUrl, '_blank', 'noopener,noreferrer')
  }

  const reviewerFlags: ReviewerFlags = { ...controls, ...uiFlags }

  const openReviewerTools = () => {
    // one-shot mock flags clear themselves, so re-read them before showing the switches
    if (services.demo) setControls(services.demo.getControls())
    setDemoVersion((v) => v + 1)
    setDemoOpen(true)
  }

  const changeFlag = <K extends keyof ReviewerFlags>(key: K, value: ReviewerFlags[K]) => {
    if (key === 'emptyInbox' || key === 'emptyInventory') {
      setUiFlags((current) => ({ ...current, [key]: value }))
      return
    }
    const controlKey = key as keyof DemoControls
    services.demo?.setControl(controlKey, value as DemoControls[typeof controlKey])
    setControls((current) => ({ ...current, [controlKey]: value }))
  }

  const toggleReviewerMode = () => {
    const next = !reviewerMode
    setReviewerMode(next)
    if (!next) setDemoOpen(false)
    notify(next ? 'Reviewer mode on' : 'Reviewer mode off')
  }

  const resetDemo = async () => {
    if (!services.demo) return
    await services.demo.reset()
    setControls(services.demo.getControls())
    setUiFlags(UI_FLAGS_OFF)
    setSession(null)
    setProfile(null)
    setSellers({})
    setSpots(DEFAULT_SPOTS)
    clearData()
    setTheme('light')
    setRoute({ name: 'boot' })
    setBootNonce((n) => n + 1)
    notify('Demo data reset. Starting fresh.')
  }

  const launch = async (launcher: DemoLauncher) => {
    setDemoOpen(false)
    const nonce = ++counters.current.init
    const withThreads = async () => {
      if (threads.length > 0) return threads
      try {
        return await fetchThreads()
      } catch {
        notify("Couldn't load chats.", 'error')
        return []
      }
    }

    switch (launcher) {
      case 'feedLoading':
        setLoads((all) => ({ ...all, feed: undefined }))
        setFeedVersion((v) => v + 1)
        navigate({ name: 'feed' })
        break
      case 'emptySearch':
        setRoute({ name: 'feed' })
        setScreenInit({ nonce, feedQuery: 'MATH 999' })
        break
      case 'domainError':
        await signOut()
        setRoute({ name: 'auth' })
        setScreenInit({ nonce, rejectedEmail: 'juan.delacruz@gmail.com' })
        break
      case 'formValidation':
        setRoute({ name: 'sell' })
        setScreenInit({ nonce, sellValidate: true })
        break
      case 'report': {
        const listing = feed[0] ?? Object.values(listingsById)[0]
        setReportTarget({
          kind: 'listing',
          id: listing?.id ?? '',
          name: listing?.title ?? 'Casio fx-991ES Plus Scientific Calculator',
        })
        break
      }
      case 'rate': {
        const list = await withThreads()
        for (const thread of list) {
          const meetup = thread.items.find((item) => item.kind === 'meetup' && item.status === 'accepted')
          if (meetup) {
            setRateTarget({ threadId: thread.id, itemId: meetup.id, sellerId: thread.sellerId })
            return
          }
        }
        setRateTarget({ threadId: null, itemId: null, sellerId: list[0]?.sellerId ?? SELLERS[0].id })
        break
      }
      case 'picker': {
        const list = await withThreads()
        if (list[0]) {
          navigate({ name: 'thread', threadId: list[0].id })
          setPickerThreadId(list[0].id)
        }
        break
      }
      case 'replayIntro':
        navigate({ name: 'intro' })
        break
      case 'replayOnboarding':
        if (profile) {
          const saved = await saveProfile(
            { ...profile, safetyAcceptedAt: undefined, onboardedAt: undefined },
            "Couldn't restart onboarding.",
          )
          if (saved) navigate({ name: 'onboarding', step: 'profile' })
        }
        break
    }
  }

  const visibleThreads = uiFlags.emptyInbox ? [] : threads
  const myListings = uiFlags.emptyInventory ? [] : mine
  const completedMeetups = threads.reduce(
    (count, thread) => count + thread.items.filter((item) => item.kind === 'meetup' && item.completed).length,
    0,
  )

  const missing = (title: string, body: string, back: Route, backLabel: string) => (
    <div className="flex flex-1 flex-col justify-center px-xl py-2xl">
      <EmptyState
        icon={PackageX}
        title={title}
        body={body}
        action={
          <Button variant="primary" size="small" iconStart={<ArrowLeft size={14} />} onClick={() => navigate(back)} className="touch-hit">
            {backLabel}
          </Button>
        }
      />
    </div>
  )

  let screen = <BootScreen />

  if (route.name === 'intro') {
    screen = <IntroScreen onDone={finishIntro} />
  } else if (route.name === 'auth' || (route.name !== 'boot' && !session)) {
    screen = (
      <AuthScreen
        key={screenInit?.nonce}
        onSignIn={signIn}
        initialRejectedEmail={screenInit?.rejectedEmail}
      />
    )
  } else if (route.name === 'onboarding' && session) {
    screen = (
      <OnboardingScreen
        key={session.userId}
        step={route.step}
        email={session.email}
        initialDraft={draftFromProfile(profile, session.name)}
        onSaveProfile={saveOnboardingProfile}
        onFinish={finishOnboarding}
        onBack={() => navigate({ name: 'onboarding', step: 'profile' })}
        onSignOut={signOut}
      />
    )
  } else if (session && isProfileComplete(profile) && route.name !== 'boot' && route.name !== 'onboarding') {
    const campus = campusLabel(profile.campus)

    if (route.name === 'feed') {
      screen = (
        <FeedScreen
          key={`${feedVersion}-${screenInit?.nonce ?? ''}`}
          userName={profile.name}
          userInitials={initialsOf(profile.name)}
          campusLabel={campus}
          listings={feed}
          promotions={promotions}
          loading={isLoading('feed')}
          error={hasError('feed')}
          onRetry={() => load('feed')}
          initialQuery={screenInit?.feedQuery}
          onOpen={(listingId) => navigate({ name: 'detail', listingId, back: route })}
          onSell={() => navigate({ name: 'sell' })}
          onOpenProfile={() => navigate({ name: 'profile' })}
          onOpenPromotion={openPromotion}
        />
      )
    } else if (route.name === 'detail') {
      const listing = getListing(route.listingId)
      screen = listing
        ? (
          <ProductDetailScreen
            key={listing.id}
            listing={listing}
            seller={getSeller(listing.sellerId)}
            isOwn={listing.sellerId === userId}
            campusLabel={campusLabel(listing.campus)}
            onBack={() => navigate(route.back)}
            onMessage={() => openThreadForListing(listing)}
            onShare={() => shareListing(listing)}
            onReport={() => setReportTarget({ kind: 'listing', id: listing.id, name: listing.title })}
            onEdit={() => navigate({ name: 'editListing', listingId: listing.id, back: route.back })}
            onSetStatus={(status) => setListingStatus(listing, status)}
            onDelete={() => deleteListing(listing, route.back)}
          />
        )
        : missing('This listing is no longer available', 'The seller may have removed it.', route.back, 'Go back')
    } else if (route.name === 'sell') {
      screen = (
        <AddListingScreen
          key={screenInit?.nonce}
          mode="create"
          spots={spots[profile.campus]}
          campusLabel={campus}
          onSubmit={createListing}
          autoValidate={screenInit?.sellValidate}
        />
      )
    } else if (route.name === 'editListing') {
      const listing = getListing(route.listingId)
      const detail: Route = { name: 'detail', listingId: route.listingId, back: route.back }
      screen = listing
        ? (
          <AddListingScreen
            key={listing.id}
            mode="edit"
            initial={{
              title: listing.title,
              price: listing.price,
              category: listing.category,
              courseCode: listing.courseCode,
              meetupSpot: listing.meetupSpot,
              condition: listing.condition,
              description: listing.description,
              transactionType: listing.transactionType,
              imageUrls: listing.imageUrls,
            }}
            spots={spots[listing.campus]}
            campusLabel={campusLabel(listing.campus)}
            onSubmit={(draft) => updateListing(listing.id, draft, route.back)}
            onBack={() => navigate(detail)}
          />
        )
        : missing('This listing is no longer available', 'It may have been deleted.', route.back, 'Go back')
    } else if (route.name === 'chats') {
      screen = (
        <ChatListScreen
          threads={visibleThreads}
          loading={isLoading('chats')}
          error={hasError('chats')}
          onRetry={() => load('chats')}
          getListing={getListing}
          getSeller={getSeller}
          onOpen={(threadId) => navigate({ name: 'thread', threadId })}
          onBrowse={() => navigate({ name: 'feed' })}
        />
      )
    } else if (route.name === 'thread') {
      const thread = threads.find((t) => t.id === route.threadId)
      if (thread) {
        const listing = getListing(thread.listingId)
        const seller = getSeller(thread.sellerId)
        screen = (
          <ChatThreadScreen
            thread={thread}
            listing={listing}
            seller={seller}
            userInitials={initialsOf(profile.name)}
            sellerTyping={typingThreadId === thread.id}
            onBack={() => navigate({ name: 'chats' })}
            onOpenListing={() => listing && navigate({ name: 'detail', listingId: listing.id, back: route })}
            onSend={(text) => sendMessage(thread.id, text)}
            onPropose={() => setPickerThreadId(thread.id)}
            onRespond={(itemId, status) => respondToMeetup(thread.id, itemId, status)}
            onComplete={(itemId) => completeMeetup(thread, itemId)}
            onRate={(itemId) => setRateTarget({ threadId: thread.id, itemId, sellerId: thread.sellerId })}
            onReport={() => setReportTarget({ kind: 'user', id: seller.id, name: seller.name })}
          />
        )
      } else {
        screen = missing('This conversation is no longer available', 'It may have been removed.', { name: 'chats' }, 'Back to chats')
      }
    } else if (route.name === 'profile') {
      screen = (
        <ProfileScreen
          profile={profile}
          email={session.email}
          initials={initialsOf(profile.name)}
          myListings={myListings}
          threadCount={visibleThreads.length}
          completedMeetups={completedMeetups}
          promotions={promotions}
          loading={isLoading('profile')}
          error={hasError('profile')}
          reviewerMode={reviewerMode}
          isAdmin={isAdmin}
          onRetry={() => load('profile')}
          onOpenListing={(listingId) => navigate({ name: 'detail', listingId, back: route })}
          onOpenPromotion={openPromotion}
          onSell={() => navigate({ name: 'sell' })}
          onSaveProfile={editProfile}
          onThemeChange={changeTheme}
          onOpenReviewerTools={openReviewerTools}
          onToggleReviewerMode={toggleReviewerMode}
          onSignOut={signOut}
        />
      )
    } else if (route.name === 'admin') {
      screen = isAdmin ? (
        <AdminScreen
          reports={adminData.reports}
          members={adminData.members}
          audit={adminData.audit}
          spots={spots}
          overview={overview}
          loading={isLoading('admin')}
          error={hasError('admin')}
          onRetry={() => load('admin')}
          initialTab={adminTab}
          onTabChange={setAdminTab}
          listingAvailable={(id) => !!listingsById[id]}
          onResolveReport={resolveReport}
          onSetMemberStatus={setMemberStatus}
          onSaveSpots={saveSpots}
          onViewListing={(listingId) => navigate({ name: 'detail', listingId, back: route })}
        />
      ) : (
        missing('Admins only', 'This area is for Office of Student Affairs staff.', { name: 'feed' }, 'Go to Home')
      )
    }
  }

  const pickerThread = pickerThreadId ? threads.find((t) => t.id === pickerThreadId) : undefined
  const pickerListing = pickerThread ? getListing(pickerThread.listingId) : undefined
  const pickerCampus = pickerListing?.campus ?? (isProfileComplete(profile) ? profile.campus : 'qc')
  const rateThread = rateTarget?.threadId ? threads.find((t) => t.id === rateTarget.threadId) : undefined

  const activeTab = TAB_FOR_ROUTE[route.name]
  const showTabs = ready && !!activeTab
  const chatsUnread = !uiFlags.emptyInbox && threads.some(threadNeedsReply)
  const adminAlert = isAdmin && adminData.reports.some((report) => report.status === 'open')
  const chooserAccounts = reviewerMode ? [...GOOGLE_TEST_ACCOUNTS, ...REVIEWER_GOOGLE_ACCOUNTS] : GOOGLE_TEST_ACCOUNTS

  return (
    <PhoneShell
      tabBar={
        showTabs && activeTab ? (
          <BottomTabBar
            active={activeTab}
            onSelect={(tab) => navigate(ROUTE_FOR_TAB[tab])}
            chatsUnread={chatsUnread}
            showAdmin={isAdmin}
            adminAlert={adminAlert}
          />
        ) : undefined
      }
      toastOffset={TOAST_OFFSET[route.name] ?? 'tabs'}
      toast={
        toast ? (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            progress={100}
            showCancel={false}
            onDismiss={() => setToast(null)}
          />
        ) : undefined
      }
      overlay={
        <>
          {services.demo && (
            <GoogleAccountChooser
              key={chooserOpen ? 'open' : 'closed'}
              isOpen={chooserOpen}
              accounts={chooserAccounts}
              onSelect={(account) => closeChooser(account)}
              onClose={() => closeChooser(null)}
            />
          )}

          {pickerThread && (
            <MeetupPickerSheet
              key={pickerThread.id}
              isOpen
              onClose={() => setPickerThreadId(null)}
              spots={spots[pickerCampus]}
              campusLabel={campusLabel(pickerCampus)}
              defaultLocation={pickerListing?.meetupSpot ?? spots[pickerCampus][0]}
              onSubmit={(proposal) => proposeMeetup(pickerThread.id, proposal)}
            />
          )}

          {reportTarget && (
            <ReportModal
              isOpen
              target={reportTarget}
              onClose={() => setReportTarget(null)}
              onSubmit={(reason, details) => submitReport(reportTarget, reason, details)}
            />
          )}

          {rateTarget && (
            <RateModal
              isOpen
              seller={getSeller(rateTarget.sellerId)}
              listingTitle={rateThread ? getListing(rateThread.listingId)?.title : undefined}
              onClose={() => setRateTarget(null)}
              onSubmit={(rating, comment) => submitRating(rateTarget, rating, comment)}
            />
          )}

          {reviewerMode && services.demo && (
            <DemoStatesPanel
              isOpen={demoOpen}
              onClose={() => setDemoOpen(false)}
              flags={reviewerFlags}
              version={demoVersion}
              onChange={changeFlag}
              onLaunch={launch}
              onReset={resetDemo}
            />
          )}
        </>
      }
    >
      {screen}
    </PhoneShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <TipalitApp />
    </ThemeProvider>
  )
}
