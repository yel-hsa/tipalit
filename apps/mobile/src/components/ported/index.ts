/**
 * Ported shared-component layer — 1:1 ports of the web student app's shared
 * components (apps/web/components/*) plus the Astra kit primitives it uses.
 * Screen agents: import from here, not from ../ui (the legacy green-theme
 * primitives stay only until every screen is ported).
 */
export * from './tokens'
export * from './kit'
export * from './Icon'
export { Checkbox } from './kit'
export { default as PhoneShell } from './PhoneShell'
export {
  ScreenHeader,
  EmptyState,
  LoadError,
  InlineAlert,
  FormField,
  ProductCard,
  CategoryPills,
  FilterPills,
  BottomTabBar,
  BottomSheet,
  ConfirmModal,
  SelectField,
  SwitchRow,
  Wordmark,
  Skeleton,
  ProductCardSkeleton,
  ChatRowSkeleton,
  ProfileSkeleton,
  MessageBubble,
  AvatarInitials,
  SellerTrustCard,
  SafetyRulesList,
  SponsorBanner,
  StarRating,
  RATING_LABELS,
  MeetupLocationBlock,
  MeetupProposalCard,
  ImageDropzone,
  ProfileFields,
} from './components'
export { MeetupPickerSheet } from './chat'
export { RateModal, ReportModal, type ReportTarget } from './modals'
export { default as EditProfileSheet } from './EditProfileSheet'
export type { ProfileDraft, ProfileErrors, ProfileFieldKey } from './EditProfileSheet'
export { draftFromProfile, validateProfile, PROFILE_FIELD_ORDER } from './EditProfileSheet'
