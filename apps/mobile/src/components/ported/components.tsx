/**
 * Web shared components ported 1:1 from apps/web/components/*.tsx.
 * Each export names its web source file. All px values are the exact
 * translation of the Tailwind classes in the source.
 */
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import type { CampusId, Promotion } from '@tipalit/services/types'
import { colors, radius, typography } from '../../theme'
import { Badge, Button, IconButton, InputField, RadioGroup, Spinner } from './kit'
import { Icon, type IconName } from './Icon'
import { shadowRaised, touchTarget, typePx } from './tokens'

// ------------------------------------------------ apps/web ScreenHeader ----
// header: sticky top-0 z-20 bg-brand-tertiary px-xl(16) pt-xl(16) pb-lg(12)
// flex items-center gap-md(8); title text-title; subtitle text-label-sm mt-xs
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  trailing,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  trailing?: React.ReactNode
}) {
  return (
    <View style={styles.header}>
      {onBack && (
        <IconButton
          variant="neutral"
          accessibilityLabel="Back"
          onPress={onBack}
          icon={<Icon name="arrow-left" size={16} color={colors.brandPrimary} />}
        />
      )}
      <View style={styles.headerText}>
        <Text numberOfLines={1} style={[typography.title, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.labelSm, { color: colors.textSecondary, marginTop: 4 }]}>{subtitle}</Text>
        )}
      </View>
      {trailing}
    </View>
  )
}

// ------------------------------------------------- apps/web EmptyState ----
// flex flex-col items-center gap-md rounded-corner-lg border
// border-border-primary bg-surface-bg px-xl py-2xl text-center;
// icon block: size-20 (80) mb-sm; accent-soft circle inset; accent 24px dot
// -right-xs top-0; bg-hover 12px dot -left-xs bottom-sm; icon 32;
// title text-label font-semibold; body text-label-sm max-w-64 (256)
export function EmptyState({
  icon,
  title,
  body,
  action,
  style,
}: {
  icon: IconName
  title: string
  body: string
  action?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyArt}>
        <View style={styles.emptyArtSoft} />
        <View style={styles.emptyArtDot} />
        <View style={styles.emptyArtDot2} />
        <View style={styles.emptyArtIcon}>
          <Icon name={icon} size={32} color={colors.text} />
        </View>
      </View>
      <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>{title}</Text>
      <Text style={[typography.labelSm, { color: colors.textSecondary, maxWidth: 256, textAlign: 'center' }]}>{body}</Text>
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  )
}

// -------------------------------------------------- apps/web LoadError ----
// EmptyState icon=WifiOff title="Couldn't load {what}" body fixed copy;
// action Button primary small iconStart=RotateCcw 14, label "Retry"
export function LoadError({ what, onRetry, style }: { what: string; onRetry: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <EmptyState
      style={style}
      icon="wifi-off"
      title={`Couldn’t load ${what}`}
      body="Check your connection, then try again."
      action={
        <Button label="Retry" size="small" onPress={onRetry} iconStart={<Icon name="rotate-ccw" size={14} color="#ffffff" />} />
      }
    />
  )
}

// ------------------------------------------------ apps/web InlineAlert ----
// flex flex-col gap-md rounded-corner-md p-md; danger bg-danger-soft else
// bg-accent-soft; row flex items-start gap-sm text-label-sm text-text-primary;
// icon 16 mt-xs shrink-0 (danger: text-danger)
export function InlineAlert({
  tone = 'danger',
  icon = 'alert-circle',
  children,
  action,
}: {
  tone?: 'danger' | 'info'
  icon?: IconName
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const danger = tone === 'danger'
  return (
    <View style={[styles.alert, { backgroundColor: danger ? colors.dangerSoft : colors.accentSoft }]}>
      <View style={styles.alertRow}>
        <View style={styles.alertIcon}>
          <Icon name={icon} size={16} color={danger ? colors.danger : colors.text} />
        </View>
        <Text style={[typography.labelSm, { color: colors.text, flex: 1 }]}>{children}</Text>
      </View>
      {action && <View style={styles.alertAction}>{action}</View>}
    </View>
  )
}

// -------------------------------------------------- apps/web FormField ----
// -mx-sm flex flex-col gap-xs rounded-corner-md px-sm; error: bg-danger-soft
// py-sm; error row: flex items-center gap-xs text-label-sm text-danger with
// AlertCircle 16
export function FormField({
  error,
  children,
}: {
  error?: string
  children: React.ReactNode
}) {
  return (
    <View style={[styles.formField, error ? styles.formFieldError : null]}>
      {children}
      {error && (
        <View style={styles.formErrorRow}>
          <Icon name="alert-circle" size={16} color={colors.danger} />
          <Text style={[typography.labelSm, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  )
}

// ------------------------------------------------ apps/web ProductCard ----
// Pressable flex flex-col overflow-hidden rounded-corner-lg bg-surface-bg;
// image aspect-square bg-bg-subtle; price chip absolute bottom-md left-md
// rounded-full bg-accent px-md py-xs text-label-sm font-semibold text-on-accent;
// reserved chip top-md centered bg-surface-bg text-caption-sm font-semibold;
// new chip right-md top-md bg-surface-bg px-sm py-xs text-caption-sm;
// body flex-1 gap-sm p-lg; title text-label-sm 2 lines; spot row gap-xs
// text-caption-sm text-text-secondary with MapPin 12; footer mt-auto pt-xs
// justify-between: Badge default courseCode + timeAgo text-caption-sm
// text-text-tertiary
export function ProductCard({
  listing,
  onOpen,
  priceLabel,
  timeAgo,
  isFresh,
}: {
  listing: { title: string; imageUrl: string; status: string; courseCode: string; meetupSpot: string; createdAt: unknown }
  onOpen: () => void
  priceLabel: (l: never) => string
  timeAgo: (d: never) => string
  isFresh: (d: never) => boolean
}) {
  const reserved = listing.status === 'reserved'
  const listingAny = listing as never
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${priceLabel(listingAny)}${reserved ? ', reserved' : ''}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
    >
      <View style={styles.productMedia}>
        <Image source={{ uri: listing.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
        {reserved && <View style={styles.productMediaDim} />}
        <View style={styles.productPrice}>
          <Text style={[typography.labelSm, { color: colors.onAccent, fontWeight: '600', lineHeight: undefined }]}>
            {priceLabel(listingAny)}
          </Text>
        </View>
        {reserved && (
          <View style={styles.productReserved}>
            <Text style={[typography.meta, { color: colors.text, fontWeight: '600', lineHeight: undefined }]}>Reserved</Text>
          </View>
        )}
        {isFresh(listingAny) && !reserved && (
          <View style={styles.productNew}>
            <Text style={[typography.meta, { color: colors.text, lineHeight: undefined }]}>New</Text>
          </View>
        )}
      </View>
      <View style={styles.productBody}>
        <Text numberOfLines={2} style={[typography.labelSm, { color: colors.text }]}>
          {listing.title}
        </Text>
        <View style={styles.productSpot}>
          <Icon name="map-pin" size={12} color={colors.textSecondary} />
          <Text numberOfLines={1} style={[typography.meta, { color: colors.textSecondary, flex: 1 }]}>
            {listing.meetupSpot}
          </Text>
        </View>
        <View style={styles.productFooter}>
          <Badge label={listing.courseCode} />
          <Text numberOfLines={1} style={[typography.meta, { color: colors.textTertiary }]}>
            {timeAgo(listingAny)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

// --------------------------------------------- apps/web CategoryPills ----
// flex gap-md overflow-x-auto -mx-xl px-xl py-sm; per category a kit Button
// small, primary when active else neutral
export function CategoryPills({
  categories,
  active,
  onChange,
}: {
  categories: readonly string[]
  active: string
  onChange: (category: string) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="toolbar"
      accessibilityLabel="Filter by category"
      contentContainerStyle={styles.pillsRow}
      style={styles.pillsScrollWide}
    >
      {categories.map((category) => (
        <Button
          key={category}
          label={category}
          size="small"
          variant={category === active ? 'primary' : 'neutral'}
          onPress={() => onChange(category)}
        />
      ))}
    </ScrollView>
  )
}

// ------------------------------------------------ apps/web FilterPills ----
// flex gap-md overflow-x-auto py-xs
export function FilterPills<T extends string>({
  label,
  options,
  active,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="toolbar"
      accessibilityLabel={label}
      contentContainerStyle={styles.pillsRow}
    >
      {options.map((option) => (
        <Button
          key={option.id}
          label={option.label}
          size="small"
          variant={option.id === active ? 'primary' : 'neutral'}
          onPress={() => onChange(option.id)}
        />
      ))}
    </ScrollView>
  )
}

// --------------------------------------------- apps/web BottomTabBar ----
// nav sticky bottom-0 border-t border-border-secondary bg-surface-bg px-md
// pb-lg pt-sm; row of Pressable flex-1 min-h-touch flex-col items-center
// justify-center gap-xs rounded-corner-md py-xs; active icon chip
// rounded-full px-lg py-xs bg-brand-primary (icon on-brand); label
// text-caption-sm, active font-semibold; unread dot size-2 bg-danger
// ring-2 ring-surface-bg at right-md top-xs of the chip
export type Tab = 'home' | 'sell' | 'chats' | 'profile' | 'admin'

export function BottomTabBar({
  active,
  onSelect,
  chatsUnread,
  showAdmin,
  adminAlert,
}: {
  active: Tab
  onSelect: (tab: Tab) => void
  chatsUnread?: boolean
  showAdmin?: boolean
  adminAlert?: boolean
}) {
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'sell', label: 'Sell', icon: 'plus-circle' },
    { id: 'chats', label: 'Chats', icon: 'message-circle' },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ]
  if (showAdmin) tabs.push({ id: 'admin', label: 'Admin', icon: 'shield-check' })
  return (
    <View accessibilityRole="tablist" style={styles.tabBar}>
      <View style={styles.tabBarRow}>
        {tabs.map(({ id, label, icon }) => {
          const isActive = id === active
          const showDot = (id === 'chats' && chatsUnread) || (id === 'admin' && adminAlert)
          const dotLabel = id === 'admin' ? 'open reports' : 'new meetup request'
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={showDot ? `${label}, ${dotLabel}` : label}
              onPress={() => onSelect(id)}
              style={[styles.tabItem, { backgroundColor: isActive ? 'transparent' : 'transparent' }]}
            >
              <View style={[styles.tabChip, isActive && styles.tabChipActive]}>
                <Icon name={icon} size={20} color={isActive ? colors.onBrand : colors.textSecondary} />
                {showDot && <View style={styles.tabDot} />}
              </View>
              <Text style={[typography.meta, { color: isActive ? colors.text : colors.textSecondary, fontWeight: isActive ? '600' : '400', lineHeight: undefined }]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ---------------------------------------------- apps/web BottomSheet ----
// scrim bg-modal-scrim; panel bottom-0 w-full max-w-phone rounded-t-corner-lg
// bg-surface-bg shadow-raised; grabber h-1 w-10 rounded-full bg-border-primary
// pt-md centered; header px-xl pb-lg pt-md with text-heading title + subtle
// small IconButton X; body px-xl pb-lg scrollable; footer border-t px-xl
// pb-xl pt-lg
export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!isOpen) return null
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.modalScrim }]} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetGrabberWrap}>
          <View style={styles.sheetGrabber} />
        </View>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
            {subtitle && (
              <Text style={[typography.labelSm, { color: colors.textSecondary, marginTop: 4 }]}>{subtitle}</Text>
            )}
          </View>
          <IconButton
            variant="subtle"
            size="small"
            accessibilityLabel="Close"
            onPress={onClose}
            icon={<Icon name="x" size={16} color={colors.textSecondary} />}
          />
        </View>
        <ScrollView style={styles.sheetBody} contentContainerStyle={{ paddingBottom: 12 }}>
          {children}
        </ScrollView>
        {footer && <View style={styles.sheetFooter}>{footer}</View>}
      </View>
    </View>
  )
}

// --------------------------------------------- apps/web ConfirmModal ----
// kit Modal size small (360px, clamped by --modal-width on web), body
// text-label-sm text-text-secondary; footer subtle Cancel + primary confirm
export function ConfirmModal({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmIcon,
  pending,
  onConfirm,
  onClose,
}: {
  isOpen: boolean
  title: string
  body: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmIcon?: React.ReactNode
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <View style={isOpen ? StyleSheet.absoluteFill : { display: 'none' }} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.modalScrim }]} onPress={pending ? undefined : onClose} />
      <View style={styles.confirmPanel}>
        <View style={styles.modalHeader}>
          <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8} style={styles.modalClose}>
            <Text style={styles.modalCloseGlyph}>×</Text>
          </Pressable>
        </View>
        <View style={styles.modalBody}>
          <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{body}</Text>
        </View>
        <View style={styles.modalFooter}>
          <Button label={cancelLabel} variant="subtle" onPress={onClose} disabled={pending} />
          <Button
            label={confirmLabel}
            variant="primary"
            onPress={onConfirm}
            disabled={pending}
            busy={pending}
            iconStart={pending ? <Spinner color="#ffffff" /> : confirmIcon}
          />
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------- apps/web SelectField ----
// trigger: bg-bg-subtle rounded-lg px-3 py-2.5 flex items-center gap-2;
// value text-input-sm leading-none (selected: text-text-primary else
// text-text-secondary); chevron 16 text-text-secondary; listbox: mt-1
// bg-surface-bg border border-border-primary rounded-lg; option px-3 py-2
// text-input-sm; selected: bg-brand-tertiary text-brand-primary font-medium
export function SelectField({
  options,
  value = '',
  onChange,
  placeholder = 'Select an option',
  label,
  description,
  disabled,
}: {
  options: { value: string; label: string }[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
  disabled?: boolean
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <View style={styles.fieldCol}>
      {label ? <Text style={[typography.labelSm, { color: colors.text, fontWeight: '500' }]}>{label}</Text> : null}
      <View style={styles.selectStack}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: option.value === value }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.selectOption,
              option.value === value && styles.selectOptionActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.inputSm,
                option.value === value
                  ? { color: colors.brandPrimary, fontWeight: '500', lineHeight: undefined }
                  : { color: colors.text, lineHeight: undefined },
              ]}
            >
              {option.value === value ? option.label : selected ? option.label : option.label}
            </Text>
          </Pressable>
        ))}
        {options.length === 0 && (
          <Text style={[typography.inputSm, { color: colors.textSecondary }]}>{placeholder}</Text>
        )}
      </View>
      {description ? <Text style={[typography.meta, { color: colors.textSecondary }]}>{description}</Text> : null}
    </View>
  )
}

// ----------------------------------------------- apps/web SwitchRow ----
// Pressable min-h-touch flex items-center gap-lg rounded-corner-md; icon chip
// size-10 rounded-full bg-bg-subtle; label text-label; description
// text-label-sm; switch h-6 w-10 rounded-full p-xs (track off
// --switch-track-off #1f1e1c29, on brand-primary); thumb size-4 shadow-raised
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.switchRow}
    >
      {icon && (
        <View style={styles.switchIconChip}>
          {icon}
        </View>
      )}
      <View style={styles.switchTextCol}>
        <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
        {description && <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{description}</Text>}
      </View>
      <Switch
        value={checked}
        onValueChange={onChange}
        trackColor={{ false: '#1f1e1c29', true: colors.brandPrimary }}
        thumbColor="#ffffff"
        style={styles.switchControl}
      />
    </Pressable>
  )
}

// ------------------------------------------------- apps/web Wordmark ----
// sm: flex items-center gap-md; logo size-9 (36) rounded-corner-md overflow
// hidden, img object-cover scale-125; word text-heading font-semibold.
// lg: flex-col items-center gap-lg; logo size-20 (80) rounded-corner-lg;
// word text-title.
export function Wordmark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const large = size === 'lg'
  const logo = require('../../../assets/tipalit-logo.png') as number
  return (
    <View style={large ? styles.wordmarkLg : styles.wordmarkSm}>
      <View style={[large ? styles.wordmarkLogoLg : styles.wordmarkLogoSm, { overflow: 'hidden' }]}>
        <Image source={logo} style={styles.wordmarkImg} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <Text style={[large ? typography.title : typography.heading, { color: colors.text, fontWeight: large ? '600' : '600' }]}>
        TIPalit
      </Text>
    </View>
  )
}

// ------------------------------------------------ apps/web Skeleton ----
// animate-shimmer rounded-corner-md bg-bg-hover; variants reproduce the
// exact wrapper structures
export function Skeleton({ width, height, style }: { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, { width, height }, style]} />
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.pcsCard}>
      <Skeleton style={styles.pcsPhoto} />
      <View style={styles.pcsBody}>
        <Skeleton height={16} style={{ width: '100%' }} />
        <Skeleton height={16} style={{ width: '66%' }} />
        <Skeleton height={12} style={{ width: '50%' }} />
        <View style={styles.pcsFooter}>
          <Skeleton width={64} height={20} style={{ borderRadius: 999 }} />
          <Skeleton width={32} height={12} />
        </View>
      </View>
    </View>
  )
}

export function ChatRowSkeleton() {
  return (
    <View style={styles.crsRow}>
      <Skeleton width={40} height={40} style={{ borderRadius: 999 }} />
      <View style={styles.crsCol}>
        <Skeleton height={16} style={{ width: '50%' }} />
        <Skeleton height={12} style={{ width: '75%' }} />
        <Skeleton height={12} style={{ width: '66%' }} />
      </View>
      <Skeleton width={48} height={48} />
    </View>
  )
}

export function ProfileSkeleton() {
  return (
    <View style={styles.psWrap}>
      <View style={styles.psGrid}>
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={80} style={{ borderRadius: radius.lg, flex: 1 }} />
        ))}
      </View>
      <View style={styles.psCard}>
        <Skeleton height={16} width={112} />
        {[0, 1].map((key) => (
          <View key={key} style={styles.psRow}>
            <Skeleton width={56} height={56} />
            <View style={styles.psRowCol}>
              <Skeleton height={16} style={{ width: '75%' }} />
              <Skeleton height={12} style={{ width: '33%' }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ------------------------------------------- apps/web MessageBubble ----
// flex max-w-4/5 items-end gap-sm; fromMe: flex-row-reverse self-end;
// bubble rounded-corner-lg px-lg py-md text-label-sm whitespace-pre-wrap;
// mine: rounded-br-corner-sm bg-brand-primary text-on-brand; theirs:
// rounded-bl-corner-sm border border-border-secondary bg-surface-bg
export function MessageBubble({ text, fromMe, initials }: { text: string; fromMe: boolean; initials: string }) {
  return (
    <View style={[styles.bubbleRow, fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      <AvatarInitials initials={initials} size={24} />
      <View style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[typography.labelSm, { color: fromMe ? colors.onBrand : colors.text }]}>{text}</Text>
      </View>
    </View>
  )
}

// kit Avatar type="initial" — bg-brand-primary, white text-label-sm centered
export function AvatarInitials({ initials, size }: { initials: string; size: number }) {
  return (
    <View style={[styles.avatarInit, { width: size, height: size }]}>
      <Text style={[typography.labelSm, { color: '#ffffff', lineHeight: undefined }]}>{initials}</Text>
    </View>
  )
}

// ------------------------------------------ apps/web SellerTrustCard ----
// section flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl;
// header row gap-lg: Avatar large (40) initial; name text-label; program
// text-label-sm; rating row mt-xs gap-xs text-label-sm with Star 12
// fill-accent; reviews text-caption-sm; Badge success "Verified";
// trust strip: rounded-corner-md bg-bg-faint p-md gap-md; chip size-8
// rounded-full bg-success text-on-reverse ShieldCheck 16; lines label-sm /
// caption-sm
export function SellerTrustCard({
  seller,
}: {
  seller: { initials: string; name: string; program: string; year?: string; rating?: number; reviews?: number }
}) {
  return (
    <View style={styles.trustCard}>
      <View style={styles.trustHeader}>
        <AvatarInitials initials={seller.initials} size={40} />
        <View style={styles.trustHeaderText}>
          <Text numberOfLines={1} style={[typography.label, { color: colors.text }]}>
            {seller.name}
          </Text>
          <Text numberOfLines={1} style={[typography.labelSm, { color: colors.textSecondary }]}>
            {seller.program}
            {seller.year ? ` · ${seller.year}` : ''}
          </Text>
          {seller.rating ? (
            <View style={styles.trustRating}>
              <Icon name="star" size={12} color={colors.accent} />
              <Text style={[typography.labelSm, { color: colors.text }]}>{seller.rating.toFixed(1)}</Text>
              <Text style={[typography.meta, { color: colors.textSecondary }]}>
                ({seller.reviews ?? 0} review{(seller.reviews ?? 0) === 1 ? '' : 's'})
              </Text>
            </View>
          ) : (
            <View style={styles.trustRating}>
              <Icon name="star" size={12} color={colors.textSecondary} />
              <Text style={[typography.meta, { color: colors.textSecondary }]}>No reviews yet</Text>
            </View>
          )}
        </View>
        <Badge variant="success" label="Verified" />
      </View>
      <View style={styles.trustStrip}>
        <View style={styles.trustChip}>
          <Icon name="shield-check" size={16} color={colors.onReverse} />
        </View>
        <View style={styles.trustStripText}>
          <Text style={[typography.labelSm, { color: colors.text }]}>Verified TIP Student</Text>
          <Text style={[typography.meta, { color: colors.textSecondary }]}>Signed in with a @tip.edu.ph Google account</Text>
        </View>
      </View>
    </View>
  )
}

// ------------------------------------------ apps/web SafetyRulesList ----
// ol flex flex-col gap-lg; li flex items-start gap-lg; chip size-10
// rounded-full bg-accent-soft text-text-primary icon 20; title text-label;
// body text-label-sm
export function SafetyRulesList({
  rules,
}: {
  rules: { id: string; title: string; body: string }[]
}) {
  const iconFor: Record<string, IconName> = {
    spots: 'map-pin',
    inspect: 'scan-search',
    otp: 'key-round',
    report: 'flag',
  }
  return (
    <View style={styles.rulesList}>
      {rules.map((rule, index) => (
        <View key={rule.id} style={styles.ruleRow}>
          <View style={styles.ruleChip}>
            <Icon name={iconFor[rule.id] ?? 'flag'} size={20} color={colors.text} />
          </View>
          <View style={styles.ruleText}>
            <Text style={[typography.label, { color: colors.text }]}>
              <Text style={styles.srOnly}>Rule {index + 1}: </Text>
              {rule.title}
            </Text>
            <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{rule.body}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

// ------------------------------------------- apps/web SponsorBanner ----
// mx-xl mt-xl flex items-center gap-lg rounded-corner-lg bg-surface-bg p-lg;
// thumb size-14 (56) rounded-corner-md; kind text-caption-sm font-semibold
// uppercase tracking-wide text-text-tertiary; title text-label-sm; sponsor
// text-caption-sm; CTA chip rounded-full bg-accent-soft px-md py-xs
// text-caption-sm font-semibold
export function SponsorBanner({
  promotions,
  index = 0,
  onOpen,
}: {
  promotions: Promotion[]
  // which card renders when several are passed
  index?: number
  onOpen: (promotion: Promotion) => void
}) {
  const promotion = promotions[index]
  if (!promotion) return null
  const kindLabel = promotion.type === 'perk' ? 'Student perk' : 'Sponsored'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kindLabel}: ${promotion.title} by ${promotion.sponsorName}`}
      onPress={() => onOpen(promotion)}
      style={({ pressed }) => [styles.sponsor, pressed && styles.pressed]}
    >
      {promotion.imageUrl ? (
        <Image source={{ uri: promotion.imageUrl }} style={styles.sponsorImg} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.sponsorIconChip}>
          <Icon name={promotion.type === 'perk' ? 'sparkles' : 'megaphone'} size={22} color={colors.text} />
        </View>
      )}
      <View style={styles.sponsorText}>
        <Text style={[typography.meta, { color: colors.textTertiary, fontWeight: '600', lineHeight: undefined }]}>{kindLabel}</Text>
        <Text numberOfLines={1} style={[typography.labelSm, { color: colors.text }]}>
          {promotion.title}
        </Text>
        <Text numberOfLines={1} style={[typography.meta, { color: colors.textSecondary }]}>
          {promotion.sponsorName}
        </Text>
      </View>
      <View style={styles.sponsorCta}>
        <Text style={[typography.meta, { color: colors.text, fontWeight: '600', lineHeight: undefined }]}>
          {promotion.type === 'perk' ? 'Claim' : 'View'}
        </Text>
      </View>
    </Pressable>
  )
}

// ---------------------------------------------- apps/web StarRating ----
// readOnly: span flex items-center gap-xs, stars 14 fill-accent /
// text-text-tertiary. interactive: radiogroup of IconButtons size-touch
// with Star 28; caption min-h-5 text-label-sm
export const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

export function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
}) {
  if (readOnly) {
    return (
      <View
        accessibilityLabel={`${value} out of 5 stars`}
        style={styles.starsReadOnly}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon key={n} name="star" size={14} color={n <= value ? colors.accent : colors.textTertiary} />
        ))}
      </View>
    )
  }
  return (
    <View style={styles.starsCol}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Rating" style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === n }}
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}, ${RATING_LABELS[n - 1]}`}
            onPress={() => onChange?.(n)}
            style={styles.starHit}
          >
            <Icon name="star" size={28} color={n <= value ? colors.accent : colors.textTertiary} />
          </Pressable>
        ))}
      </View>
      <Text style={[typography.labelSm, { color: colors.textSecondary, minHeight: 20, textAlign: 'center' }]}>
        {value > 0 ? RATING_LABELS[value - 1] : 'Tap a star to rate'}
      </Text>
    </View>
  )
}

// --------------------------------------- apps/web MeetupLocationBlock ----
// section flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl; heading
// text-label font-semibold; map h-32 (128) rounded-corner-md bg-brand-tertiary
// with 4 bg-hover blocks + 3 surface-bg roads + centered accent pin chip
// size-10 border-2 border-surface-bg; footer row gap-md: chip size-10
// rounded-full bg-accent-soft MapPin 16; spot text-label; sub text-label-sm
export function MeetupLocationBlock({ spot, campusLabel }: { spot: string; campusLabel: string }) {
  return (
    <View style={styles.meetupCard}>
      <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>Preferred meetup</Text>
      <View style={styles.meetupMap}>
        <View style={styles.mapBlock1} />
        <View style={styles.mapBlock2} />
        <View style={styles.mapBlock3} />
        <View style={styles.mapBlock4} />
        <View style={styles.mapRoadH} />
        <View style={styles.mapRoadV1} />
        <View style={styles.mapRoadV2} />
        <View style={styles.mapPinWrap}>
          <View style={styles.mapPin}>
            <Icon name="map-pin" size={20} color={colors.onAccent} />
          </View>
        </View>
      </View>
      <View style={styles.meetupFooter}>
        <View style={styles.meetupChip}>
          <Icon name="map-pin" size={16} color={colors.text} />
        </View>
        <View style={styles.meetupFooterText}>
          <Text style={[typography.label, { color: colors.text }]}>{spot}</Text>
          <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
            Inside {campusLabel} · campus-approved spot
          </Text>
        </View>
      </View>
    </View>
  )
}

// ------------------------------------- apps/web MeetupProposalCard ----
// w-full max-w-72 (288) rounded-corner-lg border border-border-secondary
// bg-surface-bg; body p-lg gap-md; header row justify-between gap-md:
// CalendarClock 16 + text-label-sm text-text-secondary; badges per status;
// time text-label font-semibold; location row gap-xs text-label-sm with
// MapPin 14; action buttons per status (kit small); completed strip
// bg-success-soft px-lg py-md with CheckCircle2 16 text-success
export function MeetupProposalCard({
  item,
  onRespond,
  onProposeNew,
  onComplete,
  onRate,
}: {
  item: {
    from: 'me' | 'them'
    status: 'pending' | 'accepted' | 'declined'
    completed?: boolean
    rating?: number
    time: string
    location: string
  }
  onRespond: (status: 'accepted' | 'declined') => void
  onProposeNew: () => void
  onComplete: () => void
  onRate: () => void
}) {
  const fromMe = item.from === 'me'
  return (
    <View style={[styles.meetupProposal, fromMe ? styles.selfEnd : styles.selfStart]}>
      <View style={styles.meetupProposalBody}>
        <View style={styles.meetupProposalHeader}>
          <View style={styles.meetupProposalKind}>
            <Icon name="calendar-clock" size={16} color={colors.textSecondary} />
            <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
              {fromMe ? 'You proposed' : 'Meetup proposal'}
            </Text>
          </View>
          {item.completed && <Badge variant="success" label="Completed" />}
          {!item.completed && item.status === 'accepted' && <Badge variant="success" label="Accepted" />}
          {item.status === 'declined' && <Badge variant="danger" label="Declined" />}
          {item.status === 'pending' && fromMe && <Badge variant="warning" label="Awaiting response" />}
        </View>
        <View style={styles.meetupProposalTime}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>{item.time}</Text>
          <View style={styles.meetupProposalLoc}>
            <Icon name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{item.location}</Text>
          </View>
        </View>
        {item.status === 'pending' && !fromMe && (
          <View style={styles.meetupActions}>
            <Button label="Reschedule" variant="neutral" size="small" onPress={() => onRespond('declined')} />
            <Button label="Accept" variant="primary" size="small" onPress={() => onRespond('accepted')} />
          </View>
        )}
        {item.status === 'declined' && (
          <Button
            label="Propose new time"
            variant="subtle"
            size="small"
            onPress={onProposeNew}
            iconStart={<Icon name="calendar-plus" size={16} color={colors.brandPrimary} />}
          />
        )}
        {item.status === 'accepted' && !item.completed && (
          <Button
            label="Mark as completed"
            variant="neutral"
            size="small"
            onPress={onComplete}
            iconStart={<Icon name="check-circle-2" size={16} color={colors.brandPrimary} />}
          />
        )}
      </View>
      {item.completed && (
        <View style={styles.meetupDoneStrip}>
          <View style={styles.meetupDoneText}>
            <Icon name="check-circle-2" size={16} color={colors.success} />
            <Text style={[typography.labelSm, { color: colors.text }]}>
              {item.rating ? `You rated ${item.rating}/5` : 'Meetup done'}
            </Text>
          </View>
          {item.rating ? (
            <StarRating value={item.rating} readOnly />
          ) : (
            <Button
              label="Rate now"
              variant="subtle"
              size="small"
              onPress={onRate}
              iconStart={<Icon name="star" size={14} color={colors.brandPrimary} />}
            />
          )}
        </View>
      )}
    </View>
  )
}

// ------------------------------------------- apps/web ImageDropzone ----
// previews grid grid-cols-3 gap-sm; tile aspect-square rounded-corner-lg
// bg-bg-subtle overflow hidden; cover chip absolute left-xs top-xs
// rounded-corner-sm bg-scrim px-xs py-1 text-caption-sm font-semibold
// text-on-scrim; remove IconButton subtle small overlay-control at right-xs
// top-xs; add tile: aspect-square dashed border-2 border-border-primary
// bg-bg-faint rounded-corner-lg with ImagePlus 24 + counter text-caption-sm;
// empty dropzone: dashed border-2 rounded-corner-lg px-xl py-2xl with accent
// chip size-12 ImagePlus 24, "Add photos" text-label, hint text-label-sm
export function ImageDropzone({
  previewUrls,
  maxPhotos,
  onRemove,
  onAdd,
}: {
  previewUrls: string[]
  maxPhotos: number
  onRemove: (index: number) => void
  onAdd: () => void
}) {
  const full = previewUrls.length >= maxPhotos
  if (previewUrls.length > 0) {
    return (
      <View style={styles.dropGrid}>
        {previewUrls.map((url, index) => (
          <View key={`${index}-${url}`} style={styles.dropTile}>
            <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
            {index === 0 && previewUrls.length > 1 && (
              <View style={styles.dropCoverChip}>
                <Text style={styles.dropCoverText}>Cover</Text>
              </View>
            )}
            <View style={styles.dropRemoveWrap}>
              <IconButton
                variant="subtle"
                size="small"
                icon={<Icon name="x" size={16} color="#ffffff" />}
                accessibilityLabel={index === 0 ? 'Remove cover photo' : `Remove photo ${index + 1}`}
                onPress={() => onRemove(index)}
                style={styles.overlayControl}
              />
            </View>
          </View>
        ))}
        {!full && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add photo ${previewUrls.length + 1} of ${maxPhotos}`}
            onPress={onAdd}
            style={styles.dropAddTile}
          >
            <Icon name="image-plus" size={24} color={colors.textSecondary} />
            <Text style={[typography.meta, { color: colors.textSecondary }]}>
              {previewUrls.length + 1}/{maxPhotos}
            </Text>
          </Pressable>
        )}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add photos"
      onPress={onAdd}
      style={({ pressed }) => [styles.dropEmpty, pressed && styles.dropEmptyPressed]}
    >
      <View style={styles.dropEmptyChip}>
        <Icon name="image-plus" size={24} color={colors.onAccent} />
      </View>
      <Text style={[typography.label, { color: colors.text }]}>Add photos</Text>
      <Text style={[typography.labelSm, { color: colors.textSecondary, textAlign: 'center' }]}>
        Tap to browse or drop images. First photo is the cover, up to {maxPhotos}.
      </Text>
    </Pressable>
  )
}

// ----------------------------------------- apps/web ProfileFields ----
// flex flex-col gap-lg; name InputField label "Full name" description
// "Shown to buyers and sellers."; campus RadioGroup with label "Campus";
// program/year SelectFields in a 2-col grid (single column on phone width
// is identical: the web grid is 2 cols inside the 390px frame)
export function ProfileFields({
  campuses,
  programs,
  yearLevels,
  value,
  errors,
  disabled,
  onChange,
}: {
  campuses: { id: string; label: string; area: string }[]
  programs: readonly string[]
  yearLevels: readonly string[]
  value: { name: string; campus: CampusId | ''; program: string; year: string }
  errors: Partial<Record<'name' | 'campus' | 'program' | 'year', string>>
  disabled?: boolean
  onChange: (patch: Partial<{ name: string; campus: CampusId | ''; program: string; year: string }>) => void
}) {
  return (
    <View style={styles.profileFields}>
      <FormField error={errors.name}>
        <InputField
          label="Full name"
          description="Shown to buyers and sellers."
          maxLength={60}
          value={value.name}
          onChange={(name) => onChange({ name })}
          disabled={disabled}
        />
      </FormField>
      <FormField error={errors.campus}>
        <Text style={[typography.labelSm, { color: colors.text }]}>Campus</Text>
        <RadioGroup
          options={campuses.map((campus) => ({ value: campus.id, label: campus.label, description: campus.area }))}
          value={value.campus}
          disabled={disabled}
          onChange={(campus) => onChange({ campus: campus as CampusId | '' })}
        />
      </FormField>
      <View style={styles.profileGrid}>
        <FormField error={errors.program}>
          <SelectField
            label="Program"
            placeholder="Choose"
            options={programs.map((p) => ({ value: p, label: p }))}
            value={value.program}
            disabled={disabled}
            onChange={(program) => onChange({ program })}
          />
        </FormField>
        <FormField error={errors.year}>
          <SelectField
            label="Year level"
            placeholder="Choose"
            options={yearLevels.map((y) => ({ value: y, label: y }))}
            value={value.year}
            disabled={disabled}
            onChange={(year) => onChange({ year })}
          />
        </FormField>
      </View>
    </View>
  )
}

// keep the unused import referenced for type stability
export const __tokens = { touchTarget, typePx }

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  // ScreenHeader: px-16 pt-16 pb-12 gap-8, bg-brand-tertiary
  header: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: { flex: 1, minWidth: 0 },
  // EmptyState: gap-8 radius-16 border px-16 py-24
  empty: {
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyArt: { width: 80, height: 80, marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
  emptyArtSoft: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: colors.accentSoft },
  emptyArtDot: { position: 'absolute', top: 0, right: -4, width: 24, height: 24, borderRadius: 999, backgroundColor: colors.accent },
  emptyArtDot2: { position: 'absolute', left: -4, bottom: 6, width: 12, height: 12, borderRadius: 999, backgroundColor: colors.bgHover },
  emptyArtIcon: { alignItems: 'center', justifyContent: 'center' },
  emptyAction: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  // InlineAlert: gap-8 radius-8 p-8; row gap-6; icon mt-4
  alert: { gap: 8, borderRadius: radius.md, padding: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  alertIcon: { marginTop: 4 },
  alertAction: { flexDirection: 'row', justifyContent: 'flex-end' },
  // FormField: -mx-6 px-6 gap-4 radius-8; error bg-danger-soft py-6
  formField: { marginHorizontal: -6, paddingHorizontal: 6, gap: 4, borderRadius: radius.md },
  formFieldError: { backgroundColor: colors.dangerSoft, paddingVertical: 6 },
  formErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // ProductCard
  productCard: { flexDirection: 'column', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface },
  productMedia: { aspectRatio: 1, backgroundColor: colors.bgSubtle },
  productMediaDim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.3)' },
  productPrice: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productReserved: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productNew: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  productBody: { flex: 1, gap: 6, padding: 12 },
  productSpot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, paddingTop: 4 },
  // pills
  pillsRow: { gap: 8, alignItems: 'center' },
  pillsScrollWide: { alignSelf: 'stretch' },
  // BottomTabBar: border-t px-8 pb-12 pt-6; item min-h-44 py-4 gap-4; chip px-12 py-4; dot 8
  tabBar: { borderTopWidth: 1, borderTopColor: colors.borderSecondary, backgroundColor: colors.surface, paddingHorizontal: 8, paddingBottom: 12, paddingTop: 6 },
  tabBarRow: { flexDirection: 'row' },
  tabItem: { minHeight: touchTarget, flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.md, paddingVertical: 4 },
  tabChip: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  tabChipActive: { backgroundColor: colors.brandPrimary },
  tabDot: { position: 'absolute', right: 8, top: 4, width: 8, height: 8, borderRadius: 999, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface },
  // BottomSheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadowRaised,
  },
  sheetGrabberWrap: { paddingTop: 8, alignItems: 'center' },
  sheetGrabber: { height: 4, width: 40, borderRadius: 999, backgroundColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  sheetHeaderText: { minWidth: 0, flex: 1 },
  sheetBody: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  sheetFooter: { borderTopWidth: 1, borderTopColor: colors.borderSecondary, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12 },
  // ConfirmModal panel: web clamps to --modal-width = phone - 2*16 = 358
  confirmPanel: {
    position: 'absolute',
    alignSelf: 'center',
    top: '20%' as unknown as never,
    width: 358,
    maxWidth: 358,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadowRaised,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
  },
  modalClose: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  modalCloseGlyph: { fontSize: 16, color: colors.textSecondary, lineHeight: 20 },
  modalBody: { paddingHorizontal: 24, paddingVertical: 24 },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
  },
  // SelectField
  fieldCol: { gap: 6 },
  selectStack: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 0,
  },
  selectOption: { paddingVertical: 8, paddingHorizontal: 0 },
  selectOptionActive: { backgroundColor: colors.brandTertiary, marginHorizontal: -12, paddingHorizontal: 12, borderRadius: radius.md },
  // SwitchRow: min-h-44 gap-12 radius-8
  switchRow: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md },
  switchIconChip: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  switchTextCol: { flex: 1, minWidth: 0, gap: 4 },
  switchControl: { transform: [{ scale: 0.8 }] },
  // Wordmark
  wordmarkSm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmarkLg: { flexDirection: 'column', alignItems: 'center', gap: 12 },
  wordmarkLogoSm: { width: 36, height: 36, borderRadius: radius.md },
  wordmarkLogoLg: { width: 80, height: 80, borderRadius: radius.lg },
  wordmarkImg: { width: '125%', height: '125%', marginLeft: '-12.5%', marginTop: '-12.5%' },
  // Skeleton
  skeleton: { backgroundColor: colors.bgHover, borderRadius: radius.md },
  pcsCard: { flexDirection: 'column', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface },
  pcsPhoto: { aspectRatio: 1, borderRadius: 0, width: '100%' },
  pcsBody: { gap: 6, padding: 12 },
  pcsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  crsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary, padding: 12 },
  crsCol: { flex: 1, minWidth: 0, gap: 6 },
  psWrap: { gap: 16 },
  psGrid: { flexDirection: 'row', gap: 8 },
  psCard: { gap: 8, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16 },
  psRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  psRowCol: { flex: 1, gap: 6 },
  // MessageBubble: max-w-4/5 gap-6; bubble px-12 py-8 radius-16
  bubbleRow: { maxWidth: '80%', flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleRowMe: { flexDirection: 'row-reverse', alignSelf: 'flex-end' },
  bubbleRowThem: { alignSelf: 'flex-start' },
  bubble: { borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { borderBottomRightRadius: radius.sm, backgroundColor: colors.brandPrimary },
  bubbleThem: { borderBottomLeftRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSecondary, backgroundColor: colors.surface },
  avatarInit: { borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // SellerTrustCard: gap-12 radius-16 p-16; strip radius-8 bg-bg-faint p-8 gap-8; chip 32
  trustCard: { gap: 12, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16 },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustHeaderText: { flex: 1, minWidth: 0 },
  trustRating: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, backgroundColor: colors.bgFaint, padding: 8 },
  trustChip: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  trustStripText: { minWidth: 0 },
  // SafetyRulesList: gap-12; row gap-12; chip 40
  rulesList: { gap: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ruleChip: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleText: { flex: 1, minWidth: 0 },
  srOnly: { fontSize: 1, color: 'transparent', lineHeight: 1 },
  // SponsorBanner: mx-16 mt-16 gap-12 radius-16 p-12; thumb 56
  sponsor: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 12,
  },
  sponsorImg: { width: 56, height: 56, borderRadius: radius.md, flexShrink: 0 },
  sponsorIconChip: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sponsorText: { flex: 1, minWidth: 0 },
  sponsorCta: { borderRadius: 999, backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 4 },
  // StarRating
  starsReadOnly: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starsCol: { alignItems: 'center', gap: 4 },
  starsRow: { flexDirection: 'row' },
  starHit: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  // MeetupLocationBlock: gap-12 radius-16 p-16; map h-128 radius-8
  meetupCard: { gap: 12, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16 },
  meetupMap: { height: 128, borderRadius: radius.md, backgroundColor: colors.brandTertiary, overflow: 'hidden' },
  mapBlock1: { position: 'absolute', left: 8, top: 8, height: 32, width: 64, borderRadius: radius.sm, backgroundColor: colors.bgHover },
  mapBlock2: { position: 'absolute', right: 8, top: 8, height: 40, width: 48, borderRadius: radius.sm, backgroundColor: colors.bgHover },
  mapBlock3: { position: 'absolute', left: 8, bottom: 8, height: 24, width: 48, borderRadius: radius.sm, backgroundColor: colors.bgHover },
  mapBlock4: { position: 'absolute', right: 8, bottom: 8, height: 32, width: 80, borderRadius: radius.sm, backgroundColor: colors.bgHover },
  mapRoadH: { position: 'absolute', left: 0, right: 0, top: '50%' as unknown as never, height: 6, marginTop: -3, backgroundColor: colors.surface },
  mapRoadV1: { position: 'absolute', top: 0, bottom: 0, left: '33.33%' as unknown as never, width: 6, backgroundColor: colors.surface },
  mapRoadV2: { position: 'absolute', top: 0, bottom: 0, right: '25%' as unknown as never, width: 6, backgroundColor: colors.surface },
  mapPinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  mapPin: { width: 40, height: 40, borderRadius: 999, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  meetupFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetupChip: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  meetupFooterText: { minWidth: 0 },
  // MeetupProposalCard: max-w-288 radius-16 border; body p-12 gap-8; strip px-12 py-8
  meetupProposal: { width: 288, maxWidth: 288, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSecondary, backgroundColor: colors.surface, overflow: 'hidden' },
  selfEnd: { alignSelf: 'flex-end' },
  selfStart: { alignSelf: 'flex-start' },
  meetupProposalBody: { gap: 8, padding: 12 },
  meetupProposalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meetupProposalKind: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meetupProposalTime: { gap: 4 },
  meetupProposalLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meetupActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  meetupDoneStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.successSoft, paddingHorizontal: 12, paddingVertical: 8 },
  meetupDoneText: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // ImageDropzone: grid-cols-3 gap-6; tile radius-16; cover chip radius-4
  dropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dropTile: { width: '31.5%' as unknown as never, aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.bgSubtle, overflow: 'hidden' },
  dropCoverChip: { position: 'absolute', left: 4, top: 4, borderRadius: radius.sm, backgroundColor: colors.modalScrim, paddingHorizontal: 4, paddingVertical: 4 },
  dropCoverText: { fontSize: 12, fontWeight: '600', color: '#ffffff', lineHeight: undefined },
  dropRemoveWrap: { position: 'absolute', right: 4, top: 4 },
  overlayControl: { backgroundColor: colors.overlayControl },
  dropAddTile: {
    width: '31.5%' as unknown as never,
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bgFaint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dropEmpty: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bgFaint,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  dropEmptyPressed: { backgroundColor: colors.bgSubtle },
  dropEmptyChip: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  // ProfileFields: gap-12; grid 2 cols gap-12
  profileFields: { gap: 12 },
  profileGrid: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
})
