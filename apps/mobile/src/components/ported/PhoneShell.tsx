/**
 * PhoneShell port — apps/web/components/PhoneShell.tsx.
 * Web renders the app inside a 390px centered frame on a bg-surface-hover
 * page; on mobile the full screen IS the phone, so the shell's inner
 * background (bg-brand-tertiary) and column layout apply to the screen
 * container. The outer page background and max-width centering have no
 * mobile equivalent.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '../../theme'

export default function PhoneShell({
  children,
  overlay,
  tabBar,
  style,
}: {
  children: React.ReactNode
  overlay?: React.ReactNode
  tabBar?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.shell, style]}>
      <View style={styles.main}>
        <View style={styles.content}>{children}</View>
        {overlay}
      </View>
      {tabBar}
    </View>
  )
}

const styles = {
  shell: { flex: 1, backgroundColor: colors.brandTertiary } as const, // bg-brand-tertiary
  main: { flex: 1, flexDirection: 'column' } as const,
  content: { flex: 1 } as const,
}
