import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native'
import { photo } from '@tipalit/services/seed'
import { Button, Icon, Wordmark } from '../components/ported'
import { colors, cornerPx, spacePx, typePx, shadowRaised } from '../components/ported/tokens'

type Slide = {
  title: string
  body: string
  image: string
  alt: string
  icon: 'shield-check' | 'map-pin' | 'calendar-check'
  chip: string
}

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

const SWIPE_THRESHOLD = 48

export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const animX = useRef(new Animated.Value(0)).current
  const startX = useRef<number | null>(null)
  const last = index === SLIDES.length - 1

  const go = (next: number) => {
    const target = Math.max(0, Math.min(SLIDES.length - 1, next))
    setIndex(target)
  }

  useEffect(() => {
    if (containerWidth > 0) {
      Animated.timing(animX, {
        toValue: -index * containerWidth,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start()
    }
  }, [index, containerWidth, animX])

  const onTouchStart = (e: GestureResponderEvent) => {
    startX.current = e.nativeEvent.pageX
  }

  const onTouchEnd = (e: GestureResponderEvent) => {
    if (startX.current === null) return
    const delta = e.nativeEvent.pageX - startX.current
    startX.current = null
    if (delta <= -SWIPE_THRESHOLD) go(index + 1)
    else if (delta >= SWIPE_THRESHOLD) go(index - 1)
  }

  return (
    <View style={styles.screen}>
      {/* Top bar: Wordmark + Skip button */}
      <View style={styles.topBar}>
        <Wordmark />
        <Button variant="subtle" size="small" label="Skip" onPress={onDone} />
      </View>

      {/* Carousel Section */}
      <View
        style={styles.carouselSection}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Animated.View
          style={[
            styles.track,
            {
              width: containerWidth > 0 ? containerWidth * SLIDES.length : `${SLIDES.length * 100}%`,
              transform: [{ translateX: animX }],
            },
          ]}
        >
          {SLIDES.map((slide, slideIndex) => {
            const active = slideIndex === index
            return (
              <View
                key={slide.title}
                style={[styles.slide, { width: containerWidth || '100%' }]}
                accessibilityLabel={`Slide ${slideIndex + 1} of ${SLIDES.length}`}
                accessibilityElementsHidden={!active}
              >
                {/* 4/5 Aspect Ratio Photo */}
                <View style={styles.photoWrap}>
                  <Image
                    source={{ uri: slide.image }}
                    style={styles.photo}
                    resizeMode="cover"
                    accessibilityLabel={slide.alt}
                  />
                  {/* Chip */}
                  <View style={styles.chip}>
                    <View style={styles.chipIconWrap}>
                      <Icon name={slide.icon} size={16} color={colors.onAccent} />
                    </View>
                    <Text style={styles.chipLabel}>{slide.chip}</Text>
                  </View>
                </View>

                {/* Title & Body */}
                <View style={styles.slideBody}>
                  <Text style={styles.slideTitle} accessibilityRole="header">
                    {slide.title}
                  </Text>
                  <Text style={styles.slideBodyText}>{slide.body}</Text>
                </View>
              </View>
            )
          })}
        </Animated.View>
      </View>

      {/* Footer: Indicator Dots + Next/Get Started Button */}
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
  screen: {
    flex: 1,
    flexDirection: 'column',
    gap: spacePx.xl,
    paddingHorizontal: spacePx.xl,
    paddingBottom: spacePx['2xl'],
    paddingTop: spacePx.xl,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carouselSection: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: cornerPx.lg,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  slide: {
    flexDirection: 'column',
    gap: spacePx.xl,
  },
  photoWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    borderRadius: cornerPx.lg,
    backgroundColor: colors.accentSoft,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
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
  chipIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cornerPx.full,
    backgroundColor: colors.accent,
  },
  chipLabel: {
    ...typePx.labelSm,
    color: colors.text,
  },
  slideBody: {
    flexDirection: 'column',
    gap: spacePx.sm,
  },
  slideTitle: {
    ...typePx.title,
    color: colors.text,
  },
  slideBodyText: {
    ...typePx.labelSm,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacePx.xl,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacePx.sm,
  },
  dot: {
    height: spacePx.sm,
    width: spacePx.sm,
    borderRadius: cornerPx.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: spacePx['2xl'],
    backgroundColor: colors.brandPrimary,
  },
  liveRegion: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
})
