// mobile design tokens


export const fontFamily = 'Instrument Sans'

export const colors = {
  // brand
  brandPrimary: '#2b2a28', // --brand-primary
  brandHover: '#3c3b39', // --brand-hover
  brandDark: '#1c1b1a', // --brand-dark
  brandSecondary: '#545350', // --brand-secondary
  brandTertiary: '#f3f2ee', // --brand-tertiary
  brandMuted: '#8a8780', // --brand-muted

  // legacy aliases (old green theme key names, kept so existing screens typecheck)
  muted: '#8a8780', // same value as brandMuted (--brand-muted)

  // accent (gold)
  accent: '#f9c80e', // --accent
  accentSoft: '#fdf3c4', // --accent-soft
  onAccent: '#1e1e1e', // --on-accent

  // surfaces
  bg: '#ffffff', // --surface-bg
  surface: '#ffffff', // --surface-bg
  surfaceSecondary: '#ffffff80', // --surface-secondary-bg
  surfaceHover: '#e9e7e1', // --surface-hover
  surfaceDark: '#262523', // --surface-dark
  surfaceDarkHover: '#33322f', // --surface-dark-hover
  surfaceDarkest: '#1c1b1a', // --surface-darkest

  // text
  text: '#1f1e1ce6', // --text-primary
  textSecondary: '#1f1e1c94', // --text-secondary
  textTertiary: '#1f1e1c57', // --text-tertiary
  onBrand: '#ffffff', // --on-brand
  onReverse: '#1e1e1e', // --on-reverse

  // borders & fills
  border: '#1f1e1c26', // --border-primary
  borderSecondary: '#1f1e1c12', // --border-secondary
  borderSelected: '#2b2a28', // --border-selected
  inputBg: '#1f1e1c0d', // --input-bg
  bgFaint: '#1f1e1c06', // --bg-faint
  bgSubtle: '#1f1e1c0d', // --bg-subtle
  bgHover: '#1f1e1c14', // --bg-hover

  // status
  success: '#3cc774', // --success
  successSoft: '#3cc77414', // --success-soft
  warning: '#f5a524', // --warning
  warningSoft: '#f5a5241f', // --warning-soft
  danger: '#e5484d', // --danger
  dangerSoft: '#e5484d14', // --danger-soft

  // overlays
  modalScrim: '#1c1b1a80', // --modal-scrim
  overlayControl: '#1c1b1aa6', // --overlay-control
  onOverlay: '#ffffff', // --on-overlay
} as const

// --corner-*: 4 / 8 / 16 / 999px
export const radius = { sm: 4, md: 8, lg: 16, pill: 999 } as const

/**
 * --space-*: xs 4 / sm 6 / md 8 / lg 12 / xl 16 / xxl 24.
 * Legacy helper: old code called space(n) = n*4. Mapping through the new
 * scale: n=1 -> xs(4), n=2 -> lg(12) [was 8; closest step up], n=3 -> xl(16),
 * n=4 -> xxl(24), n>=5 -> n*4 raw. Prefer the named scale in new code.
 */
export const spacing = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 24 } as const

export const space = (n: number): number => {
  switch (n) {
    case 1:
      return spacing.xs
    case 2:
      return spacing.lg
    case 3:
      return spacing.xl
    case 4:
      return spacing.xxl
    default:
      return n * 4
  }
}

// --type-* sizes/weights, as spreadable TextStyle objects. lineHeight = 1.4x.
const lh = (size: number) => Math.round(size * 1.4 * 10) / 10

export const typography = {
  title: { fontFamily, fontSize: 24, fontWeight: '600', lineHeight: lh(24) }, // --type-title
  heading: { fontFamily, fontSize: 20, fontWeight: '500', lineHeight: lh(20) }, // --type-heading
  section: { fontFamily, fontSize: 20, fontWeight: '500', lineHeight: lh(20) }, // --type-caption
  label: { fontFamily, fontSize: 16, fontWeight: '500', lineHeight: lh(16) }, // --type-label
  labelSm: { fontFamily, fontSize: 14, fontWeight: '500', lineHeight: lh(14) }, // --type-label-sm
  input: { fontFamily, fontSize: 16, fontWeight: '400', lineHeight: lh(16) }, // --type-input
  inputSm: { fontFamily, fontSize: 14, fontWeight: '500', lineHeight: lh(14) }, // --type-input-sm
  meta: { fontFamily, fontSize: 12, fontWeight: '400', lineHeight: lh(12) }, // --type-meta
  cell: { fontFamily, fontSize: 16, fontWeight: '400', lineHeight: lh(16) },
  cellStrong: { fontFamily, fontSize: 16, fontWeight: '600', lineHeight: lh(16) },
  metric: { fontFamily, fontSize: 24, fontWeight: '600', lineHeight: lh(24) },
  page: { fontFamily, fontSize: 24, fontWeight: '600', lineHeight: lh(24) },
} as const
