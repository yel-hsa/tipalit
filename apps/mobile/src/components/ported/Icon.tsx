/**
 * Real vector icons port — uses lucide-react-native and react-native-svg
 * to render crisp, pixel-perfect vectors identical to lucide-react on web.
 */
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Flag,
  FlaskConical,
  Home,
  ImagePlus,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Megaphone,
  MessageCircle,
  Moon,
  Package,
  PackageOpen,
  PackageX,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  ScanSearch,
  Search,
  SearchX,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  TriangleAlert,
  User,
  UserPlus,
  UserRound,
  UserSearch,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import { colors } from '../../theme'

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-left-right'
  | 'calendar-check'
  | 'calendar-clock'
  | 'calendar-plus'
  | 'check'
  | 'check-circle-2'
  | 'chevron-down'
  | 'chevron-right'
  | 'clock'
  | 'external-link'
  | 'flag'
  | 'flask-conical'
  | 'home'
  | 'image-plus'
  | 'info'
  | 'key-round'
  | 'loader-2'
  | 'log-out'
  | 'map-pin'
  | 'megaphone'
  | 'message-circle'
  | 'moon'
  | 'package'
  | 'package-open'
  | 'package-x'
  | 'pencil'
  | 'plus'
  | 'plus-circle'
  | 'rotate-ccw'
  | 'scan-search'
  | 'search'
  | 'search-x'
  | 'send'
  | 'share'
  | 'share-2'
  | 'shield-alert'
  | 'shield-check'
  | 'sparkles'
  | 'star'
  | 'sun'
  | 'tag'
  | 'trash'
  | 'trash-2'
  | 'triangle-alert'
  | 'user'
  | 'user-plus'
  | 'user-round'
  | 'user-search'
  | 'wifi-off'
  | 'x'
  | 'alert-circle'
  | 'ban'
  | 'google'

const LUCIDE_ICONS: Record<Exclude<IconName, 'google'>, LucideIcon> = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-left-right': ArrowLeftRight,
  'calendar-check': CalendarCheck,
  'calendar-clock': CalendarClock,
  'calendar-plus': CalendarPlus,
  check: Check,
  'check-circle-2': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  clock: Clock,
  'external-link': ExternalLink,
  flag: Flag,
  'flask-conical': FlaskConical,
  home: Home,
  'image-plus': ImagePlus,
  info: Info,
  'key-round': KeyRound,
  'loader-2': Loader2,
  'log-out': LogOut,
  'map-pin': MapPin,
  megaphone: Megaphone,
  'message-circle': MessageCircle,
  moon: Moon,
  package: Package,
  'package-open': PackageOpen,
  'package-x': PackageX,
  pencil: Pencil,
  plus: Plus,
  'plus-circle': PlusCircle,
  'rotate-ccw': RotateCcw,
  'scan-search': ScanSearch,
  search: Search,
  'search-x': SearchX,
  send: Send,
  share: Share2,
  'share-2': Share2,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  tag: Tag,
  trash: Trash2,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  user: User,
  'user-plus': UserPlus,
  'user-round': UserRound,
  'user-search': UserSearch,
  'wifi-off': WifiOff,
  x: X,
  'alert-circle': AlertCircle,
  ban: Ban,
}

export function Icon({
  name,
  size = 16,
  color = '#1f1e1ce6',
  strokeWidth = 2,
  fill,
  style,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  fill?: string
  style?: StyleProp<ViewStyle | TextStyle>
}) {
  if (name === 'google') {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" style={style as StyleProp<ViewStyle>}>
        <Path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <Path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <Path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <Path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </Svg>
    )
  }

  const Component = LUCIDE_ICONS[name]
  if (!Component) {
    return null
  }

  // Default SVG fill to 'none' so vector paths render as crisp outlines matching web Lucide icons
  const iconFill = fill ?? (name === 'star' && color === colors.accent ? colors.accent : 'none')

  return (
    <Component
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={iconFill}
      style={style as StyleProp<ViewStyle>}
    />
  )
}
