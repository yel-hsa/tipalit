/**
 * Tailwind-value cheat-sheet — the exact px values behind every web utility a
 * screen port will encounter. Source of truth: apps/web/styles/global.css and
 * node_modules/@figma/astraui/dist/styles.css. Screen agents: use these values
 * verbatim; do not approximate.
 *
 * Spacing and radius are re-exported from ../theme so there is one import site.
 */
import { colors, radius, spacing, typography } from '../../theme'

export { colors, radius, spacing, typography }

// --space-* (astraui styles.css :root)
export const spacePx = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
} as const

// --corner-* (astraui styles.css :root)
export const cornerPx = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 999,
} as const

// Tailwind default scale (spacing = 0.25rem = 4px per unit) as used by the kit
export const tw = (units: number) => units * 4

// Type utilities rendered by the kit (font-size / line-height / weight)
export const typePx = {
  title: { fontSize: 24, lineHeight: 33.6, fontWeight: '600' }, // text-title
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '500' }, // text-heading
  caption: { fontSize: 20, lineHeight: 28, fontWeight: '600' }, // text-caption
  label: { fontSize: 16, lineHeight: 22.4, fontWeight: '500' }, // text-label
  labelSm: { fontSize: 14, lineHeight: 19.6, fontWeight: '500' }, // text-label-sm
  input: { fontSize: 16, lineHeight: 22.4, fontWeight: '400' }, // text-input
  inputSm: { fontSize: 14, lineHeight: 19.6, fontWeight: '500' }, // text-input-sm
  meta: { fontSize: 12, lineHeight: undefined, fontWeight: '400' }, // text-caption-sm (line-height normal)
  videoTitle: { fontSize: 12, lineHeight: undefined, fontWeight: '600' }, // text-video-title
  base: { fontSize: 16, lineHeight: 24, fontWeight: '400' }, // text-base (kit buttons)
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '400' }, // text-xs (kit small buttons)
} as const

// --elevation-raised: 0 4px 6px -1px #0000001a
export const shadowRaised = {
  shadowColor: '#000000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 6,
  elevation: 2,
} as const

// kit Modal shadow: shadow-xl (tailwind) — 0 25px 50px -12px rgba(0,0,0,0.25)
export const shadowModal = {
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowOffset: { width: 0, height: 25 },
  shadowRadius: 50,
  elevation: 12,
} as const

// kit Toast shadow
export const shadowToast = {
  shadowColor: '#000000',
  shadowOpacity: 0.3,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2.5,
  elevation: 2,
} as const

// --modal-scrim
export const scrimColor = colors.modalScrim // #1c1b1a80

// --touch-target
export const touchTarget = 44

// --layout-phone
export const phoneWidth = 390
