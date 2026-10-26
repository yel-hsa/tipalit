/**
 * 1:1 port of apps/web/screens/IntroScreen.tsx.
 *
 * Web JSX tree (element-for-element):
 *   div.flex.flex-1.flex-col.gap-xl.px-xl.pb-2xl.pt-xl
 *     div.flex.items-center.justify-between
 *       <Wordmark />
 *       <Button variant="subtle" size="small">Skip</Button>
 *     section (carousel, swipe + keyboard)
 *       div (translateX track, transition 300ms ease-out)
 *         per slide: div.flex.w-full.shrink-0.flex-col.gap-xl
 *           div.relative.aspect-intro(4/5).rounded-corner-lg.bg-accent-soft
 *             img (object-cover)
 *             span chip: absolute bottom-lg left-lg, rounded-full bg-surface-bg
 *               py-sm pl-sm pr-lg shadow-raised
 *               span.size-8.rounded-full.bg-accent.text-on-accent > Icon 16
 *               span.text-label-sm.text-text-primary {chip}
 *           div.flex.flex-col.gap-sm
 *             p.text-title.text-text-primary {title}
 *             p.text-label-sm.text-text-secondary {body}
 *     div.flex.items-center.justify-between.gap-xl
 *       div.flex.items-center.gap-sm (dots: h-sm pill; active w-2xl bg-brand-primary)
 *       p.sr-only aria-live "Slide N of 3"
 *       <Button variant="primary" iconEnd=ArrowRight 16>Next | Get started</Button>
 *
 * Deviations (documented):
 * - Web swipe uses pointer events; RN uses a horizontal paging FlatList with
 *   the same slide order/width and 300ms animated scrolling, plus the same
 *   SWIPE_THRESHOLD semantics via native paging.
 * - Keyboard arrow navigation (onKeyDown) has no touch equivalent; omitted.
 * - lucide icons render as glyphs via the shared Icon swap point (no new deps).
 * - sr-only live region becomes an accessibilityLiveRegion Text (visually hidden).
 */
import { useRef, useState } from 'react'
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { photo } from '@tipalit/services/seed'
import { Button, Icon, Wordmark } from '../components/ported'
import { colors, cornerPx, spacePx, typePx } from '../components/ported/tokens'
import { shadowRaised } from '../components/ported/tokens'

type Slide = { title: string; body: string; image: string; alt: string; icon: 'shield-check' | 'map-pin' | 'calendar-check'; chip: string }

const SLIDES: Slide[] = [
  {
    title: 'Verified TIP students only',
    body: 'Everyone signs in with a @tip.edu.ph Google account, so you know who you are dealing with.',
    image: photo('1774092137646-3f237fa563a3', 800, 1000),
    alt: 'Three smiling students holding up their ID badges',
    icon: 'shield-check',
    chip: '@tip.edu.ph verified',
  },
  {
    title: 'Meet at campus-approved spots',
    body: 'Hand-offs happen inside your campus, at spots chosen with safety in mind.',
    image: photo('1743611978899-516e7bad4ec9', 800, 1000),
    alt: 'Students walking along a tree-lined campus pathway',
    icon: 'map-pin',
    chip: 'Library Plaza',
  },
  {
    title: 'Chat, schedule, and rate meetups',
    body: 'Agree on a time in chat, meet up, then rate each other to keep the community honest.',
    image: photo('1714746643422-13a50361aa66', 800, 1000),
    alt: 'Two people shaking hands over a book on a table',
    icon: 'calendar-check',
    chip: 'Meetup accepted',
  },
]

export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const listRef = useRef<FlatList<Slide>>(null)
  const last = index === SLIDES.length - 1

  const go = (next: number) => {
    const target = Math.max(0, Math.min(SLIDES.length - 1, next))
    listRef.current?.scrollToIndex({ index: target, animated: true })
  }

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width
    if (width > 0) setIndex(Math.min(SLIDES.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)))
  }

  return (
    <View style={styles.screen}>
      {/* div.flex.items-center.justify-between */}
      <View style={styles.topBar}>
        <Wordmark />
        <Button variant="subtle" size="small" label="Skip" onPress={onDone} />
      </View>

      {/* section carousel */}
      <View style={styles.carouselSection}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(slide) => slide.title}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={styles.carousel}
          renderItem={({ item, index: slideIndex }) => {
            return (
              // div.flex.w-full.shrink-0.flex-col.gap-xl
              <View style={styles.slide} accessibilityLabel={`Slide ${slideIndex + 1} of ${SLIDES.length}`}>
                {/* div.relative.aspect-intro.w-full.overflow-hidden.rounded-corner-lg.bg-accent-soft */}
                <View style={styles.photoWrap}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.photo}
                    resizeMode="cover"
                    accessibilityLabel={item.alt}
                    accessibilityIgnoresInvertColors
                  />
                  {/* chip span */}
                  <View style={styles.chip}>
                    <View style={styles.chipIconWrap}>
                      <Icon name={item.icon} size={16} color={colors.onAccent} />
                    </View>
                    <Text style={styles.chipLabel}>{item.chip}</Text>
                  </View>
                </View>
                {/* div.flex.flex-col.gap-sm */}
                <View style={styles.slideBody}>
                  <Text style={styles.slideTitle} accessibilityRole="header">
                    {item.title}
                  </Text>
                  <Text style={styles.slideBodyText}>{item.body}</Text>
                </View>
              </View>
            )
          }}
        />
      </View>

      {/* div.flex.items-center.justify-between.gap-xl */}
      <View style={styles.footer}>
        <View style={styles.dots} accessibilityElementsHidden>
          {SLIDES.map((slide, slideIndex) => (
            <View
              key={slide.title}
              style={[styles.dot, slideIndex === index && styles.dotActive]}
            />
          ))}
        </View>
        <Text style={styles.liveRegion} accessibilityLiveRegion="polite">
          Slide {index + 1} of {SLIDES.length}
        </Text>
        <Button
          variant="primary"
          label={last ? 'Get started' : 'Next'}
          iconEnd={<Icon name="arrow-right" size={16} color="#ffffff" />}
          onPress={() => (last ? onDone() : go(index + 1))}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // div.flex.flex-1.flex-col.gap-xl.px-xl.pb-2xl.pt-xl
  screen: {
    flex: 1,
    flexDirection: 'column',
    gap: spacePx.xl,
    paddingHorizontal: spacePx.xl,
    paddingBottom: spacePx['2xl'],
    paddingTop: spacePx.xl,
  },
  // div.flex.items-center.justify-between
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // section.flex-1.overflow-hidden.rounded-corner-lg
  carouselSection: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: cornerPx.lg,
  },
  carousel: { flex: 1 },
  // div.flex.w-full.shrink-0.flex-col.gap-xl
  slide: {
    width: '100%',
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'column',
    gap: spacePx.xl,
  },
  // div.relative.aspect-intro.w-full.overflow-hidden.rounded-corner-lg.bg-accent-soft
  photoWrap: {
    width: '100%',
    aspectRatio: 4 / 5, // --aspect-intro: 4 / 5
    overflow: 'hidden',
    borderRadius: cornerPx.lg,
    backgroundColor: colors.accentSoft,
  },
  // img.size-full.object-cover
  photo: { width: '100%', height: '100%' },
  // span.absolute.bottom-lg.left-lg.flex.items-center.gap-sm.rounded-corner-full
  //   .bg-surface-bg.py-sm.pl-sm.pr-lg.shadow-raised
  chip: {
    position: 'absolute',
    bottom: spacePx.lg,
    left: spacePx.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacePx.sm,
    backgroundColor: colors.surface,
    borderRadius: cornerPx.full,
    paddingTop: spacePx.sm,
    paddingBottom: spacePx.sm,
    paddingLeft: spacePx.sm,
    paddingRight: spacePx.lg,
    ...shadowRaised,
  },
  // span.flex.size-8.items-center.justify-center.rounded-corner-full.bg-accent.text-on-accent
  chipIconWrap: {
    width: 32, // size-8 = 2rem = 32px
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cornerPx.full,
    backgroundColor: colors.accent,
  },
  // span.text-label-sm.text-text-primary
  chipLabel: {
    ...typePx.labelSm,
    color: colors.text,
  },
  // div.flex.flex-col.gap-sm
  slideBody: {
    flexDirection: 'column',
    gap: spacePx.sm,
  },
  // p.text-title.text-text-primary
  slideTitle: {
    ...typePx.title,
    color: colors.text,
  },
  // p.text-label-sm.text-text-secondary
  slideBodyText: {
    ...typePx.labelSm,
    color: colors.textSecondary,
  },
  // div.flex.items-center.justify-between.gap-xl
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacePx.xl,
  },
  // div.flex.items-center.gap-sm
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacePx.sm,
  },
  // span.h-sm.rounded-corner-full (inactive: w-sm bg-border-primary)
  dot: {
    height: spacePx.sm,
    width: spacePx.sm,
    borderRadius: cornerPx.full,
    backgroundColor: colors.border,
  },
  // active: w-2xl bg-brand-primary
  dotActive: {
    width: spacePx['2xl'],
    backgroundColor: colors.brandPrimary,
  },
  // p.sr-only — visually hidden but exposed to accessibility
  liveRegion: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
})
