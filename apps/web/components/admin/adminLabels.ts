import { Ban, MapPin, PackageX, RotateCcw, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { AuditAction, Report, ReportAction } from '@tipalit/services/types'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'secondary'

export const KIND_LABEL: Record<Report['target']['kind'], string> = {
  listing: 'Listing',
  user: 'Member',
}

export const reportBadge = (report: Report): { label: string; variant: BadgeVariant } => {
  if (report.status === 'open') return { label: 'Open', variant: 'warning' }
  switch (report.resolution?.action) {
    case 'remove_listing':
      return { label: 'Listing removed', variant: 'danger' }
    case 'suspend_member':
      return { label: 'Member suspended', variant: 'danger' }
    default:
      return { label: 'Dismissed', variant: 'default' }
  }
}

export const ACTION_COPY: Record<ReportAction, { label: string; description: string }> = {
  remove_listing: {
    label: 'Remove listing',
    description: 'Takes it off the feed for good. Chats about it stay, marked \u201cListing removed\u201d.',
  },
  suspend_member: {
    label: 'Suspend member',
    description: "Hides all their listings and blocks sign-in until an admin reinstates them.",
  },
  dismiss: {
    label: 'Dismiss report',
    description: 'No rule was broken. The report is closed and nothing changes for the member.',
  },
}

export const AUDIT_ICON: Record<AuditAction, LucideIcon> = {
  report_dismissed: ShieldCheck,
  listing_removed: PackageX,
  member_suspended: Ban,
  member_reinstated: RotateCcw,
  spots_updated: MapPin,
}
