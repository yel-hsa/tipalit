// core ui primitives

import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { colors, radius, typography } from '../../theme'
import { shadowModal, shadowRaised, shadowToast, typePx } from './tokens'
import { Icon } from './Icon'

// ---------------------------------------------------------------- Button ----
// kit: inline-flex items-center justify-center gap-2 rounded-full font-sans
//      leading-none; medium: h-10 px-4 py-2.5 text-base (subtle: px-3 py-1.5);
//      small: h-8 p-2 text-xs
// primary: bg-brand-primary text-white border border-brand-primary
// neutral: bg-transparent text-brand-primary border border-brand-primary
// subtle:  bg-transparent text-brand-primary border-none

type ButtonVariant = 'primary' | 'neutral' | 'subtle'
type ButtonSize = 'medium' | 'small'

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled,
  busy,
  iconStart,
  iconEnd,
  style,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  busy?: boolean
  iconStart?: React.ReactNode
  iconEnd?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const inactive = disabled || busy
  const small = size === 'small'
  const subtleMedium = size === 'medium' && variant === 'subtle'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        small ? styles.btnSmall : subtleMedium ? styles.btnMediumSubtle : styles.btnMedium,
        variant === 'primary' && styles.btnPrimary,
        variant === 'neutral' && styles.btnNeutral,
        inactive ? styles.btnDisabled : pressed ? styles.btnPressed : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#ffffff' : colors.brandPrimary} />
      ) : (
        <>
          {iconStart}
          <Text style={[small ? typePx.xs : typePx.base, styles.btnLabel, variant === 'primary' && styles.btnLabelPrimary]}>
            {label}
          </Text>
          {iconEnd}
        </>
      )}
    </Pressable>
  )
}

// ------------------------------------------------------------ IconButton ----
// kit: inline-flex items-center justify-center rounded-full; medium size-[40px]
// p-3; small size-[32px] p-2; primary bg-brand-primary text-white; neutral
// bg-transparent text-brand-primary border border-brand-primary; subtle
// bg-transparent text-text-secondary
export function IconButton({
  icon,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled,
  accessibilityLabel,
  style,
}: {
  icon: React.ReactNode
  onPress?: () => void
  variant?: ButtonVariant
  size?: 'medium' | 'small'
  disabled?: boolean
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconBtn,
        size === 'small' ? styles.iconBtnSmall : styles.iconBtnMedium,
        variant === 'primary' && styles.iconBtnPrimary,
        variant === 'neutral' && styles.iconBtnNeutral,
        disabled ? styles.btnDisabled : pressed ? styles.iconBtnPressed : null,
        style,
      ]}
    >
      {icon}
    </Pressable>
  )
}

// ----------------------------------------------------------------- Badge ----
// kit: box-border flex items-center gap-[8px] overflow-hidden px-[8px]
// py-[6px] rounded-[8px] w-fit; label span font-medium text-label-sm
// leading-none. Web app overrides with its own soft-tone Badge (see Badge.tsx
// port below); this is the kit look for admin surfaces.
export function KitBadge({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'secondary'
}) {
  return (
    <View
      style={[
        styles.kitBadge,
        variant === 'default' && { backgroundColor: colors.brandTertiary },
        variant === 'success' && { backgroundColor: colors.success },
        variant === 'warning' && { backgroundColor: colors.warning },
        variant === 'danger' && { backgroundColor: colors.danger },
        variant === 'brand' && { backgroundColor: colors.brandPrimary },
        variant === 'secondary' && { backgroundColor: colors.brandSecondary },
      ]}
    >
      <Text
        style={[
          styles.kitBadgeLabel,
          variant === 'success' || variant === 'warning' || variant === 'danger'
            ? { color: colors.surfaceDarkest }
            : variant === 'brand'
              ? { color: '#ffffff' }
              : { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------- Avatar ----
// kit Avatar: small size-[24px] / medium size-[32px] / large size-[40px];
// circle rounded-[999px] / square rounded-[8px]; initial: bg-brand-primary,
// white text-label-sm font-medium centered; image variant has a 1px
// border-border-primary inset ring.
export function Avatar({
  initials,
  size = 'large',
  shape = 'circle',
  source,
}: {
  initials: string
  size?: 'small' | 'medium' | 'large'
  shape?: 'circle' | 'square'
  source?: { uri: string }
}) {
  const box = size === 'small' ? 24 : size === 'medium' ? 32 : 40
  return (
    <View
      style={[
        { width: box, height: box, overflow: 'hidden' },
        shape === 'circle' ? { borderRadius: 999 } : { borderRadius: 8 },
        source ? { backgroundColor: colors.bgSubtle } : { backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      {source ? (
        <RNImageBox source={source} />
      ) : (
        <Text style={[typography.labelSm, { color: '#ffffff', fontWeight: '500', lineHeight: undefined }]}>{initials}</Text>
      )}
    </View>
  )
}

function RNImageBox({ source }: { source: { uri: string } }) {
  const { Image } = require('react-native') as typeof import('react-native')
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 999, borderWidth: 1, borderColor: colors.border }]}>
      <Image source={source} style={[StyleSheet.absoluteFill]} accessibilityIgnoresInvertColors />
    </View>
  )
}

// ------------------------------------------------------------ InputField ----
// kit: label text-label-sm font-medium text-text-primary; wrapper flex
// items-center gap-2 bg-bg-subtle rounded-lg px-3 py-2.5 (12px/10px vertical
// via py-2.5 = 10px); input text-input-sm leading-none font-normal
// text-text-primary; placeholder text-text-secondary; hover/focus bg-bg-hover;
// disabled opacity-50.
export function InputField({
  value,
  onChange,
  placeholder = 'I am a placeholder...',
  label,
  description,
  prefix,
  suffix,
  disabled,
  secureTextEntry,
  keyboardType,
  maxLength,
  autoFocus,
  accessibilityLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  disabled?: boolean
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  maxLength?: number
  autoFocus?: boolean
  accessibilityLabel?: string
}) {
  return (
    <View style={styles.fieldCol}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputBox, disabled && styles.inputDisabled]}>
        {prefix}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoFocus={autoFocus}
          accessibilityLabel={accessibilityLabel ?? label}
          style={styles.inputText}
        />
        {suffix}
      </View>
      {description ? <Text style={styles.fieldDescription}>{description}</Text> : null}
    </View>
  )
}

// -------------------------------------------------------- TextareaField ----
// kit: bg-bg-subtle w-full rounded-lg px-3 py-2.5 text-input-sm font-normal;
// placeholder:text-text-secondary; focus/hover bg-bg-hover; disabled
// opacity-50.
export function TextareaField({
  value,
  onChange,
  placeholder = 'I am a placeholder...',
  label,
  description,
  disabled,
  rows = 3,
  maxLength,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
  disabled?: boolean
  rows?: number
  maxLength?: number
}) {
  return (
    <View style={styles.fieldCol}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputBox, styles.textareaBox, { height: rows * 36 }, disabled && styles.inputDisabled]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          editable={!disabled}
          multiline
          maxLength={maxLength}
          style={[styles.inputText, styles.textareaText]}
        />
      </View>
      {description ? <Text style={styles.fieldDescription}>{description}</Text> : null}
    </View>
  )
}

// ------------------------------------------------------------ RadioGroup ----
// kit: flex flex-col gap-3; row: flex gap-3 items-start; radio button size-5
// (20px) rounded-full border (selected border-brand-primary, else
// border-border-primary); inner dot size-2.5 (10px) bg-brand-primary; label
// text-label text-text-primary; description text-label-sm text-text-secondary.
export function RadioGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: string; label: string; description?: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.radioGroup}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: !!disabled }}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
            style={styles.radioRow}
          >
            <View
              style={[
                styles.radioCircle,
                selected ? { borderColor: colors.brandPrimary } : { borderColor: colors.border },
              ]}
            >
              {selected && <View style={styles.radioDot} />}
            </View>
            <View style={styles.radioTextCol}>
              <Text style={typography.label}>{option.label}</Text>
              {option.description ? <Text style={typography.labelSm}>{option.description}</Text> : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ------------------------------------------------------------- Checkbox ----
// kit: label flex gap-3 items-start; control button size-5 (20px) rounded
// mt-0.5 (2px) border; checked bg-brand-primary border-brand-primary with a
// 12px white check; unchecked bg-transparent border-border-primary; label
// text-label text-text-primary; description text-label-sm text-text-secondary;
// disabled opacity-50.
export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={[styles.checkboxRow, disabled && styles.inputDisabled]}
    >
      <View
        style={[
          styles.checkboxBox,
          checked
            ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
            : { backgroundColor: 'transparent', borderColor: colors.border },
        ]}
      >
        {checked && <Icon name="check" size={12} color="#ffffff" strokeWidth={3} />}
      </View>
      {(label || description) && (
        <View style={styles.radioTextCol}>
          {label ? <Text style={[typography.label, { color: colors.text }]}>{label}</Text> : null}
          {description ? <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{description}</Text> : null}
        </View>
      )}
    </Pressable>
  )
}

// ----------------------------------------------------------------- Modal ----
// kit Modal: scrim fixed inset-0 (bg-modal-scrim); panel bg-surface-bg
// rounded-2xl (16px) shadow-xl max-h-[90vh]; small w-[360px]; header px-6 py-5
// border-b border-border-secondary with text-heading title and a size-6 close;
// body px-6 py-6; footer px-6 py-5 border-t, justify-end gap-3.
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'small',
  footer,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: 'small' | 'medium' | 'large'
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  if (!isOpen) return null
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.modalScrim }]} onPress={onClose} />
      <View style={[styles.modalPanel, size === 'small' && { width: 360 }, size === 'medium' && { width: 480 }, size === 'large' && { width: 640 }]}>
        <View style={styles.modalHeader}>
          <Text style={typography.heading}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onPressClose(onClose)} hitSlop={8} style={styles.modalClose}>
            <Icon name="x" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.modalBody}>{children}</View>
        {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
      </View>
    </View>
  )
}

const onPressClose = (onClose: () => void) => onClose

// ------------------------------------------------------------------ Tabs ----
// kit Tabs: tablist flex border-b border-border-secondary; tab px-4 py-2.5
// text-label-sm font-medium; active text-brand-primary + 2px bottom bar
// bg-brand-primary; inactive text-text-secondary; panel pt-4.
export function Tabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[]
  activeTab: string
  onChange: (id: string) => void
}) {
  const active = tabs.find((t) => t.id === activeTab)
  return (
    <View style={styles.tabsCol}>
      <View style={styles.tablist}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(tab.id)}
              style={styles.tab}
            >
              <Text style={[typography.labelSm, { color: isActive ? colors.brandPrimary : colors.textSecondary }]}>{tab.label}</Text>
              {isActive && <View style={styles.tabBar} />}
            </Pressable>
          )
        })}
      </View>
      <View style={styles.tabPanel}>{active?.content}</View>
    </View>
  )
}

// ----------------------------------------------------------------- Toast ----
// kit Toast: h-[34px] rounded-[10.737px] pl-[10.159px] pr-[6.772px] gap-[6.772px]
// bg-brand-primary (default) with progress bar bg-brand-dark; message
// text-video-title (12px semibold) white; cancel chip h-[20.317px] px-[6.772px]
// rounded-[4.13px] bg-toast-cancel.
export function Toast({
  message,
  onCancel,
  variant = 'default',
}: {
  message: string
  onCancel?: () => void
  variant?: 'default' | 'success' | 'error' | 'warning'
}) {
  const bg =
    variant === 'success' ? colors.success : variant === 'error' ? colors.danger : variant === 'warning' ? colors.warning : colors.brandPrimary
  return (
    <View style={[styles.toast, { backgroundColor: bg }]}>
      <Text style={styles.toastMessage}>{message}</Text>
      {onCancel ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} style={styles.toastCancel}>
          <Text style={styles.toastCancelText}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// ------------------------------------------------- web-app shared pieces ----

// apps/web/components/Badge.tsx — soft tint + dark text pill
export function Badge({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'brand'
}) {
  const tone: Record<string, { bg: string; fg: string }> = {
    default: { bg: colors.bgSubtle, fg: colors.textSecondary },
    secondary: { bg: colors.bgSubtle, fg: colors.textSecondary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    brand: { bg: colors.accentSoft, fg: colors.brandPrimary },
  }
  return (
    <View style={[styles.badge, { backgroundColor: tone[variant].bg }]}>
      <Text style={[styles.badgeLabel, { color: tone[variant].fg }]}>{label}</Text>
    </View>
  )
}

// apps/web/components/Spinner.tsx — Loader2 16px animate-spin
export function Spinner({ size = 16, color = colors.text }: { size?: number; color?: string }) {
  return <ActivityIndicator size={size <= 16 ? 'small' : 'large'} color={color} />
}

// apps/web/components/Pressable.tsx — role=button wrapper
export function WebPressable({
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  onPress: () => void
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.webPressed, style]}
    >
      {children}
    </Pressable>
  )
}

export const textStyles: Record<string, TextStyle> = {
  title: typography.title,
  heading: typography.heading,
  label: typography.label,
  labelSm: typography.labelSm,
  captionSm: typography.meta,
}

export const viewStyles: Record<string, ViewStyle> = {
  raised: shadowRaised,
  modal: shadowModal,
}

const styles = StyleSheet.create({
  // Button: rounded-full = 999; medium h-40 px-16 py-10; small h-32 p-8;
  // medium subtle px-12 py-6
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
  },
  btnMedium: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 10 },
  btnMediumSubtle: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 6 },
  btnSmall: { minHeight: 32, paddingHorizontal: 8, paddingVertical: 8 },
  btnPrimary: { backgroundColor: colors.brandPrimary, borderWidth: 1, borderColor: colors.brandPrimary },
  btnNeutral: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.brandPrimary },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  iconBtnPressed: { opacity: 0.82, transform: [{ scale: 0.92 }] },
  btnLabel: { color: colors.brandPrimary, lineHeight: undefined },
  btnLabelPrimary: { color: '#ffffff' },
  // IconButton
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  iconBtnMedium: { width: 40, height: 40, padding: 12 },
  iconBtnSmall: { width: 32, height: 32, padding: 8 },
  iconBtnPrimary: { backgroundColor: colors.brandPrimary },
  iconBtnNeutral: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.brandPrimary },
  iconBtnSubtle: { backgroundColor: 'transparent' },
  // KitBadge: px-8 py-6 rounded-8, label 14/500 leading-none
  kitBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  kitBadgeLabel: { fontSize: 14, fontWeight: '500', lineHeight: 14 },
  // fields
  fieldCol: { gap: 6 },
  fieldLabel: { ...typography.labelSm, color: colors.text },
  fieldDescription: { ...typography.meta, color: colors.textSecondary },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md, // rounded-lg in kit = --radius-lg 0.5rem = 8px
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: { opacity: 0.5 },
  inputText: { ...typography.inputSm, flex: 1, color: colors.text, lineHeight: 14, padding: 0 },
  textareaBox: { alignItems: 'stretch' },
  textareaText: { textAlignVertical: 'top' },
  // RadioGroup: gap-3 = 12; row gap-3; circle 20px; dot 10px
  radioGroup: { gap: 12 },
  radioRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.brandPrimary },
  radioTextCol: { flex: 1, gap: 4, minWidth: 0 },
  // Checkbox: row gap-12 items-start; box 20px radius-4 (rounded, not full)
  // mt-2; check 12px white
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCheck: { fontSize: 12, lineHeight: 12, color: '#ffffff', fontWeight: '700' },
  // Modal: rounded-2xl = 16; header px-24 py-20; body px-24 py-24; footer px-24 py-20 gap-12
  modalPanel: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadowModal,
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
  // Tabs: px-16 py-10; bar h-2
  tabsCol: {},
  tablist: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderSecondary },
  tab: { paddingHorizontal: 16, paddingVertical: 10, position: 'relative' },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.brandPrimary },
  tabPanel: { paddingTop: 16 },
  // Toast: h-34 rounded-10.737 pl-10.159 pr-6.772 gap-6.772
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.772,
    minHeight: 34,
    overflow: 'hidden',
    paddingLeft: 10.159,
    paddingRight: 6.772,
    paddingVertical: 6.772,
    borderRadius: 10.737,
    ...shadowToast,
  },
  toastMessage: { fontSize: 12, fontWeight: '600', color: '#ffffff', flexShrink: 1 },
  toastCancel: {
    minHeight: 20.317,
    paddingHorizontal: 6.772,
    paddingVertical: 3.386,
    borderRadius: 4.13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastCancelText: { fontSize: 12, fontWeight: '450' as unknown as TextStyle['fontWeight'], color: '#ffffff' },
  // web Badge: rounded-full px-sm(6) py-xs(4) text-caption-sm(12) font-semibold
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 },
  badgeLabel: { fontSize: 12, fontWeight: '600', lineHeight: undefined },
  webPressed: { opacity: 0.9 },
})
