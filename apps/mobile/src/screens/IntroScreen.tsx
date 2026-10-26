import { useRef, useState } from 'react'
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { photo } from '@tipalit/services/seed'
import { colors, radius, typography, space } from '../theme'
import { Button, Screen } from '../components/ui'

// mirrors apps/web/screens/IntroScreen.tsx — same slides, copy, 4/5 photo
// aspect, gold chip, dot indicators and Next/Get started button.
type Slide = { title: string; body: string; image: string; chip: string }

const SLIDES: Slide[] = [
  {
    title: 'Verified TIP students only',
    body: 'Everyone signs in with a @tip.edu.ph Google account, so you know who you are dealing with.',
    image: photo('1774092137646-3f237fa563a3', 800, 1000),
    chip: '@tip.edu.ph verified',
  },
  {
    title: 'Meet at campus-approved spots',
    body: 'Hand-offs happen inside your campus, at spots chosen with safety in mind.',
    image: photo('1743611978899-516e7bad4ec9', 800, 1000),
    chip: 'Library Plaza',
  },
  {
    title: 'Chat, schedule, and rate meetups',
    body: 'Agree on a time in chat, meet up, then rate each other to keep the community honest.',
    image: photo('1714746643422-13a50361aa66', 800, 1000),
    chip: 'Meetup accepted',
  },
]

export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const listRef = useRef<FlatList<Slide>>(null)
  const last = index === SLIDES.length - 1

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width
    if (width > 0) setIndex(Math.min(SLIDES.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)))
  }

  const go = (next: number) => {
    const target = Math.max(0, Math.min(SLIDES.length - 1, next))
    listRef.current?.scrollToIndex({ index: target, animated: true })
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>TIPalit</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip intro" onPress={onDone} hitSlop={8}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.carousel}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.photoWrap}>
              <Image source={{ uri: item.image }} style={styles.photo} accessibilityIgnoresInvertColors />
              <View style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={styles.chipLabel}>{item.chip}</Text>
              </View>
            </View>
            <View style={styles.slideBody}>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideText}>{item.body}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, slideIndex) => (
            <View key={slide.title} style={[styles.dot, slideIndex === index && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.nextWrap}>
          <Button label={last ? 'Get started' : 'Next'} onPress={() => (last ? onDone() : go(index + 1))} />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { padding: space(5), gap: space(5) },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { ...typography.metric, color: colors.brandPrimary, letterSpacing: -0.5 },
  skip: { ...typography.labelSm, color: colors.textSecondary },
  carousel: { flex: 1 },
  slide: { flex: 1, gap: space(4) },
  photoWrap: {
    flex: 1,
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
  },
  photo: { width: '100%', height: '100%' },
  chip: {
    position: 'absolute',
    bottom: space(3),
    left: space(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
  },
  chipDot: { width: 16, height: 16, borderRadius: radius.pill, backgroundColor: colors.accent },
  chipLabel: { ...typography.labelSm, color: colors.text },
  slideBody: { gap: space(2) },
  slideTitle: { ...typography.title, color: colors.text },
  slideText: { ...typography.labelSm, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(4) },
  dots: { flexDirection: 'row', gap: space(2) },
  dot: { height: 6, width: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: space(6), backgroundColor: colors.brandPrimary },
  nextWrap: { minWidth: 120 },
})
