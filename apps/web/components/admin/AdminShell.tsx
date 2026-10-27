import { ClipboardList, LayoutDashboard, Package, ScrollText, Users, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Session, Theme } from '@tipalit/services/types'
import Badge from '../Badge'
import Wordmark from '../Wordmark'
import AccountMenu from './AccountMenu'

export type AdminSection = 'dashboard' | 'reports' | 'listings' | 'members' | 'audit'

type NavItem = { id: AdminSection; label: string; icon: LucideIcon; description: string }

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Marketplace health at a glance' },
  { id: 'reports', label: 'Moderation queue', icon: ClipboardList, description: 'Reports waiting on a decision' },
  { id: 'listings', label: 'Listings', icon: Package, description: 'Every listing on both campuses' },
  { id: 'members', label: 'Student directory', icon: Users, description: 'Accounts, trust, and access' },
  { id: 'audit', label: 'Audit log', icon: ScrollText, description: 'Every moderation action taken' },
]

type AdminShellProps = {
  section: AdminSection
  onSectionChange: (section: AdminSection) => void
  session: Session
  theme: Theme
  onToggleTheme: () => void
  onSignOut: () => void
  expiresAt: number | null
  // badge counts keyed by section
  counts: Partial<Record<AdminSection, number>>
  children: ReactNode
}

export default function AdminShell({
  section,
  onSectionChange,
  session,
  theme,
  onToggleTheme,
  onSignOut,
  expiresAt,
  counts,
  children,
}: AdminShellProps) {
  const current = NAV_ITEMS.find((item) => item.id === section) ?? NAV_ITEMS[0]

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg-faint/50">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <nav
        aria-label="Admin sections"
        className="flex w-sidebar shrink-0 flex-col border-r border-border-secondary/80 bg-surface-bg"
      >
        <div className="flex h-16 shrink-0 items-center border-b border-border-secondary/80 px-xl">
          <Wordmark />
        </div>

        <ul className="flex flex-1 flex-col gap-xs overflow-y-auto p-md">
          {NAV_ITEMS.map((item) => {
            const active = item.id === section
            const count = counts[item.id] ?? 0
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onSectionChange(item.id)}
                  className={`flex w-full items-center gap-md rounded-xl px-md py-sm text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                    active
                      ? 'bg-brand-primary text-on-brand shadow-xs font-medium'
                      : 'text-text-secondary hover:bg-surface-hover/80 hover:text-text-primary'
                  }`}
                >
                  <item.icon size={18} className="shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate text-cell-strong">{item.label}</span>
                  {count > 0 && (
                    <Badge
                      variant={active ? 'warning' : item.id === 'reports' ? 'danger' : 'default'}
                      label={count}
                      className="tabular-nums"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="shrink-0 border-t border-border-secondary/80 p-md">
          <AccountMenu
            session={session}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onSignOut={onSignOut}
            expiresAt={expiresAt}
          />
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-xl border-b border-border-secondary/80 bg-surface-bg/95 backdrop-blur-sm px-2xl">
          <div className="min-w-0">
            <h1 className="truncate text-section font-semibold text-text-primary">{current.label}</h1>
            <p className="truncate text-caption-sm text-text-secondary">{current.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-md">
            {counts.reports ? (
              <button
                type="button"
                onClick={() => onSectionChange('reports')}
                className="flex items-center gap-xs rounded-full bg-danger-soft border border-danger/20 px-md py-xs text-caption-sm font-semibold text-danger transition-all hover:bg-danger-soft/80 hover:scale-[1.02] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-danger motion-reduce:animate-none" aria-hidden="true" />
                {counts.reports} open {counts.reports === 1 ? 'report' : 'reports'}
              </button>
            ) : (
              <span className="flex items-center gap-xs text-caption-sm text-text-secondary">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Queue clear
              </span>
            )}
            <Badge variant="secondary" label="Office of Student Affairs" />
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto w-full max-w-content px-2xl py-xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
