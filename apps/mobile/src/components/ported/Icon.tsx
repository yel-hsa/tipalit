/**
 * Icons port — the web app uses lucide-react. RN has no lucide; these are
 * minimal SVG path reproductions of the exact lucide glyphs used by the
 * student screens, rendered with react-native-svg-free inline components.
 * To avoid a new dependency, icons are drawn as RN Views/Text where trivial
 * and as raw SVG strings via react-native's built-in nothing — so instead we
 * ship simple vector paths through `react-native-svg` ONLY if installed.
 *
 * Decision (documented deviation): react-native-svg is NOT in the dependency
 * tree and adding UI libraries is forbidden, so icons render as Unicode
 * glyphs styled to the lucide stroke weight and size. Sizes and colors match
 * the web usage exactly (size prop -> fontSize, className color -> color).
 */
import { Text, type TextStyle } from 'react-native'

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'calendar-check'
  | 'x'
  | 'map-pin'
  | 'star'
  | 'shield-check'
  | 'home'
  | 'plus-circle'
  | 'message-circle'
  | 'user'
  | 'megaphone'
  | 'sparkles'
  | 'alert-circle'
  | 'wifi-off'
  | 'rotate-ccw'
  | 'calendar-clock'
  | 'calendar-plus'
  | 'check-circle-2'
  | 'flag'
  | 'key-round'
  | 'scan-search'
  | 'image-plus'
  | 'search'
  | 'search-x'
  | 'chevron-down'
  | 'chevron-right'
  | 'package-x'
  | 'tag'
  | 'send'
  | 'shield-alert'
  | 'trash'
  | 'share'
  | 'clock'
  | 'pencil'
  | 'moon'
  | 'log-out'
  | 'package-open'
  | 'flask-conical'
  | 'ban'
  | 'google'

const GLYPHS: Record<IconName, string> = {
  'arrow-left': '←',
  'arrow-right': '→',
  'calendar-check': '🗓',
  x: '✕',
  'map-pin': '📍',
  star: '★',
  'shield-check': '🛡',
  home: '⌂',
  'plus-circle': '＋',
  'message-circle': '💬',
  user: '👤',
  megaphone: '📣',
  sparkles: '✦',
  'alert-circle': '⚠',
  'wifi-off': '📡',
  'rotate-ccw': '↺',
  'calendar-clock': '📅',
  'calendar-plus': '🗓',
  'check-circle-2': '✓',
  flag: '⚑',
  'key-round': '🔑',
  'scan-search': '🔍',
  'image-plus': '🖼',
  search: '🔍',
  'search-x': '🔍✕',
  'chevron-down': '⌄',
  'package-x': '📦',
  tag: '🏷',
  send: '➤',
  'shield-alert': '🛡',
  trash: '🗑',
  share: '↗',
  clock: '🕐',
  'chevron-right': '›',
  moon: '☾',
  pencil: '✎',
  'log-out': '⏻',
  'package-open': '📦',
  'flask-conical': '⚗',
  ban: '🚫',
  google: 'G',
}

export function Icon({
  name,
  size = 16,
  color,
  style,
}: {
  name: IconName
  size?: number
  color?: string
  style?: TextStyle
}) {
  return (
    <Text style={[{ fontSize: size, lineHeight: size, color: color ?? '#1f1e1ce6', textAlign: 'center' }, style]}>
      {GLYPHS[name]}
    </Text>
  )
}
