import { Toast, useTheme } from '@figma/astraui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { services, ServiceError } from '@tipalit/services'
import type {
  AccountStatus,
  AnalyticsOverview,
  AuditEntry,
  Listing,
  MemberSummary,
  Report,
  ReportAction,
  Session,
} from '@tipalit/services/types'
import AdminShell, { type AdminSection } from '../components/admin/AdminShell'
import ListingDrawer from '../components/admin/ListingDrawer'
import MemberDrawer from '../components/admin/MemberDrawer'
import ReportDrawer from '../components/admin/ReportDrawer'
import LoadError from '../components/LoadError'
import Skeleton from '../components/Skeleton'
import AuditSection from '../sections/AuditSection'
import DashboardSection from '../sections/DashboardSection'
import ListingsSection from '../sections/ListingsSection'
import MembersSection from '../sections/MembersSection'
import ReportsSection from '../sections/ReportsSection'

type ToastVariant = 'default' | 'success' | 'error' | 'warning'
type ToastState = { id: number; message: string; variant: ToastVariant }

type ConsoleData = {
  reports: Report[]
  members: MemberSummary[]
  listings: Listing[]
  audit: AuditEntry[]
  overview?: AnalyticsOverview
}

const EMPTY: ConsoleData = { reports: [], members: [], listings: [], audit: [] }

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ServiceError ? error.message : fallback

function ConsoleSkeleton() {
  return (
    <div role="status" aria-label="Loading admin data" className="flex flex-col gap-xl">
      <div className="grid grid-cols-4 gap-lg">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-32 rounded-corner-lg" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-lg">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-64 rounded-corner-lg" />
        ))}
      </div>
    </div>
  )
}

type AdminConsoleProps = {
  session: Session
  expiresAt: number | null
  onSignOut: () => void
}

export default function AdminConsole({ session, expiresAt, onSignOut }: AdminConsoleProps) {
  const { theme, toggleTheme } = useTheme()

  const [section, setSection] = useState<AdminSection>('dashboard')
  const [data, setData] = useState<ConsoleData>(EMPTY)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [toast, setToast] = useState<ToastState | null>(null)

  const [reportId, setReportId] = useState<string | null>(null)
  const [listingId, setListingId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)

  const toastCount = useRef(0)
  const request = useRef(0)

  const notify = useCallback((message: string, variant: ToastVariant = 'default') => {
    setToast({ id: ++toastCount.current, message, variant })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const fetchAll = useCallback(async (showSpinner: boolean) => {
    const current = ++request.current
    const isLatest = () => request.current === current
    if (showSpinner) setStatus('loading')
    try {
      const [reports, members, listings, audit, overview] = await Promise.all([
        services.admin.listReports(),
        services.admin.listMembers(),
        services.admin.listListings(),
        services.admin.listAudit(),
        services.analytics.getOverview().catch(() => undefined),
      ])
      if (!isLatest()) return
      setData({ reports, members, listings, audit, overview })
      setStatus('ready')
    } catch {
      if (!isLatest()) return
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void fetchAll(true)
  }, [fetchAll])

  const refresh = () => fetchAll(false)

  const resolveReport = async (id: string, action: ReportAction, note: string) => {
    const report = data.reports.find((item) => item.id === id)
    try {
      await services.admin.resolveReport(id, action, note)
    } catch (error) {
      notify(errorMessage(error, "Couldn't apply that decision. Try again."), 'error')
      return false
    }
    notify(
      action === 'remove_listing'
        ? 'Listing removed'
        : action === 'suspend_member'
          ? `${report?.subjectName ?? 'Member'} suspended`
          : 'Report dismissed',
      'success',
    )
    await refresh()
    return true
  }

  const setMemberStatus = async (userId: string, next: AccountStatus, note: string) => {
    let member: MemberSummary
    try {
      member = await services.admin.setMemberStatus(userId, next, note)
    } catch (error) {
      notify(errorMessage(error, "Couldn't update the account. Try again."), 'error')
      return false
    }
    notify(`${member.name} ${next === 'suspended' ? 'suspended' : 'reinstated'}`, 'success')
    await refresh()
    return true
  }

  const removeListing = async (id: string) => {
    try {
      await services.admin.removeListing(
        id,
        'Removed from the administrator listing review.',
      )
    } catch (error) {
      notify(errorMessage(error, "Couldn't remove the listing. Try again."), 'error')
      return false
    }
    notify('Listing removed', 'success')
    await refresh()
    return true
  }

  const memberById = (id: string) => data.members.find((member) => member.userId === id)
  const listingById = (id: string) => data.listings.find((listing) => listing.id === id)
  const openReports = data.reports.filter((report) => report.status === 'open')

  const selectedReport = reportId ? data.reports.find((report) => report.id === reportId) : undefined
  const selectedListing = listingId ? listingById(listingId) : undefined
  const selectedMember = memberId ? memberById(memberId) : undefined

  const counts: Partial<Record<AdminSection, number>> = {
    reports: openReports.length,
  }

  const related = (report: Report) => ({
    sameListing: openReports.filter(
      (other) => other.id !== report.id && other.target.kind === 'listing' && other.target.id === report.target.id,
    ).length,
    sameMember: openReports.filter((other) => other.id !== report.id && other.subjectId === report.subjectId).length,
  })

  const body =
    status === 'loading' ? (
      <ConsoleSkeleton />
    ) : status === 'error' ? (
      <LoadError what="admin data" onRetry={() => void fetchAll(true)} />
    ) : section === 'dashboard' ? (
      <DashboardSection
        overview={data.overview}
        reports={data.reports}
        members={data.members}
        listings={data.listings}
        audit={data.audit}
        onGoTo={setSection}
        onOpenReport={setReportId}
      />
    ) : section === 'reports' ? (
      <ReportsSection
        reports={data.reports}
        members={data.members}
        listingsById={Object.fromEntries(data.listings.map((listing) => [listing.id, listing]))}
        onOpen={setReportId}
        onQuickAction={(id, action) =>
          resolveReport(id, action, 'Resolved from the report queue.')
        }
      />
    ) : section === 'listings' ? (
      <ListingsSection listings={data.listings} members={data.members} onOpen={setListingId} />
    ) : section === 'members' ? (
      <MembersSection
        members={data.members}
        onOpen={setMemberId}
        onToggleStatus={(userId, next) =>
          setMemberStatus(
            userId,
            next,
            next === 'suspended'
              ? 'Suspended from the member queue.'
              : 'Reinstated from the member queue.',
          )
        }
      />
    ) : (
      <AuditSection audit={data.audit} />
    )

  return (
    <>
      <AdminShell
        section={section}
        onSectionChange={setSection}
        session={session}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={onSignOut}
        expiresAt={expiresAt}
        counts={counts}
      >
        {/* keyed on section so switching tabs replays the entrance instead of swapping instantly */}
        <div key={section} className="animate-fade-in">
          {body}
        </div>
      </AdminShell>

      {selectedReport && (
        <ReportDrawer
          key={selectedReport.id}
          report={selectedReport}
          subject={memberById(selectedReport.subjectId)}
          listing={
            selectedReport.target.kind === 'listing' ? listingById(selectedReport.target.id) : undefined
          }
          related={related(selectedReport)}
          onClose={() => setReportId(null)}
          onResolve={async (action, note) => {
            const done = await resolveReport(selectedReport.id, action, note)
            if (done) setReportId(null)
            return done
          }}
          onViewListing={() => {
            setReportId(null)
            setListingId(selectedReport.target.id)
          }}
          onViewMember={
            memberById(selectedReport.subjectId)
              ? () => {
                  setReportId(null)
                  setMemberId(selectedReport.subjectId)
                }
              : undefined
          }
        />
      )}

      {selectedListing && (
        <ListingDrawer
          key={selectedListing.id}
          listing={selectedListing}
          seller={memberById(selectedListing.sellerId)}
          openReports={
            openReports.filter(
              (report) => report.target.kind === 'listing' && report.target.id === selectedListing.id,
            ).length
          }
          onClose={() => setListingId(null)}
          onRemove={async () => {
            const done = await removeListing(selectedListing.id)
            if (done) setListingId(null)
            return done
          }}
          onViewSeller={
            memberById(selectedListing.sellerId)
              ? () => {
                  setListingId(null)
                  setMemberId(selectedListing.sellerId)
                }
              : undefined
          }
        />
      )}

      {selectedMember && (
        <MemberDrawer
          key={selectedMember.userId}
          member={selectedMember}
          openReports={openReports.filter((report) => report.subjectId === selectedMember.userId)}
          onClose={() => setMemberId(null)}
          onSetStatus={(next, note) => setMemberStatus(selectedMember.userId, next, note)}
          onOpenReport={(id) => {
            setMemberId(null)
            setReportId(id)
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-xl left-1/2 z-[60] -translate-x-1/2">
          <div className="pointer-events-auto animate-toast-in">
            <Toast
              key={toast.id}
              message={toast.message}
              variant={toast.variant}
              progress={100}
              showCancel={false}
              onDismiss={() => setToast(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}
