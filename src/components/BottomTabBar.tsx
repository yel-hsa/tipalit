import { Home, MessageCircle, PlusCircle, ShieldCheck, User } from 'lucide-react'
import Pressable from './Pressable'

export type Tab = 'home' | 'sell' | 'chats' | 'profile' | 'admin'

type BottomTabBarProps = {
  active: Tab
  onSelect: (tab: Tab) => void
  // dot on chats when a seller is waiting on a reply
  chatsUnread?: boolean
  // admin tab only exists for admin sessions
  showAdmin?: boolean
  // dot on admin while reports are open
  adminAlert?: boolean
}

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'sell', label: 'Sell', icon: PlusCircle },
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
]
const ADMIN_TAB = { id: 'admin' as const, label: 'Admin', icon: ShieldCheck }

export default function BottomTabBar({ active, onSelect, chatsUnread, showAdmin, adminAlert }: BottomTabBarProps) {
  const tabs = showAdmin ? [...TABS, ADMIN_TAB] : TABS
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-20 border-t border-border-secondary bg-surface-bg px-md pb-lg pt-sm"
    >
      <div className="flex">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          const showDot = (id === 'chats' && chatsUnread) || (id === 'admin' && adminAlert)
          const dotLabel = id === 'admin' ? 'open reports' : 'new meetup request'
          return (
            <Pressable
              key={id}
              onPress={() => onSelect(id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={showDot ? `${label}, ${dotLabel}` : label}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-xs rounded-corner-md py-xs ${
                isActive ? 'text-text-primary' : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <span
                className={`relative flex items-center justify-center rounded-corner-full px-lg py-xs ${
                  isActive ? 'bg-brand-primary text-on-brand' : ''
                }`}
              >
                <Icon size={20} aria-hidden="true" />
                {showDot && (
                  <span
                    aria-hidden="true"
                    className="absolute right-md top-xs size-2 rounded-corner-full bg-danger ring-2 ring-surface-bg"
                  />
                )}
              </span>
              <span className={`text-caption-sm ${isActive ? 'font-semibold' : ''}`}>{label}</span>
            </Pressable>
          )
        })}
      </div>
    </nav>
  )
}
