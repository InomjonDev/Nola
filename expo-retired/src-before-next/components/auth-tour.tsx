import { ArrowRight, BarChart3, CircleDollarSign, ReceiptText, Send, ShieldCheck, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions, type StyleProp, type TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, interpolate, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "@/components/button";
import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

const slides = [
  {
    eyebrow: "A clearer starting point",
    title: "See your whole month at a glance.",
    body: "Walletly turns everyday spending into a calm, useful picture of where your money goes.",
    icon: BarChart3,
  },
  {
    eyebrow: "Made for the moment",
    title: "Log it before it disappears.",
    body: "Add an amount and category in seconds. Extra detail is always optional.",
    icon: ReceiptText,
  },
  {
    eyebrow: "Private by default",
    title: "Build a better money habit.",
    body: "Your private notes stay out of analytics while your history remains easy to understand.",
    icon: ShieldCheck,
  },
] as const;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput) as React.ComponentType<React.ComponentProps<typeof TextInput> & { animatedProps?: { text?: string } }>;
const AnimatedPath = Animated.createAnimatedComponent(Path);

type AuthTourProps = {
  onComplete: () => void;
  onSkip: () => void;
};

export function AuthTour({ onComplete, onSkip }: AuthTourProps) {
  const { colors } = useLedgerTheme();
  const { height, width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(Math.max(1, width - spacing.lg * 2));
  const reduceMotion = useReducedMotion();
  const trackX = useSharedValue(0);
  const gestureStart = useSharedValue(0);
  const compact = height < 760;
  const last = index === slides.length - 1;

  const transition = useCallback((nextIndex: number) => {
    if (nextIndex === index || nextIndex < 0 || nextIndex >= slides.length) return;
    setIndex(nextIndex);
    if (reduceMotion) {
      trackX.set(-nextIndex * pageWidth);
      return;
    }
    trackX.set(withSpring(-nextIndex * pageWidth, { duration: 400, dampingRatio: 0.8, overshootClamping: true }));
  }, [index, pageWidth, reduceMotion, trackX]);

  const swipeGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-20, 20])
    .onStart(() => {
      gestureStart.set(trackX.get());
    })
    .onUpdate((event) => {
      const min = -(slides.length - 1) * pageWidth;
      const raw = gestureStart.get() + event.translationX;
      const next = raw > 0 ? raw * 0.2 : raw < min ? min + (raw - min) * 0.2 : raw;
      trackX.set(next);
    })
    .onEnd((event) => {
      const movedLeft = event.translationX < -pageWidth * 0.18 || event.velocityX < -450;
      const movedRight = event.translationX > pageWidth * 0.18 || event.velocityX > 450;
      const nextIndex = movedLeft ? Math.min(index + 1, slides.length - 1) : movedRight ? Math.max(index - 1, 0) : index;
      if (reduceMotion) {
        trackX.set(-nextIndex * pageWidth);
        if (nextIndex !== index) scheduleOnRN(setIndex, nextIndex);
        return;
      }
      trackX.set(withSpring(-nextIndex * pageWidth, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX, overshootClamping: true }, (finished) => {
        if (finished && nextIndex !== index) scheduleOnRN(setIndex, nextIndex);
      }));
    }), [gestureStart, index, pageWidth, reduceMotion, trackX]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackX.get() }],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip tour and continue to sign in"
          hitSlop={10}
          onPress={onSkip}
          style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.55 : 1 }]}
        >
          <ThemedText variant="label" style={{ color: colors.accent }}>Skip tour</ThemedText>
        </Pressable>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <View
          style={styles.viewport}
          onLayout={(event) => {
            const measuredWidth = event.nativeEvent.layout.width;
            if (Math.abs(measuredWidth - pageWidth) > 0.5) {
              setPageWidth(measuredWidth);
              trackX.set(-index * measuredWidth);
            }
          }}
        >
          <Animated.View style={[styles.track, { width: pageWidth * slides.length }, trackStyle]}>
            {slides.map((item, slideIndex) => (
              <TourSlide
                key={item.eyebrow}
                slide={item}
                slideIndex={slideIndex}
                width={pageWidth}
                compact={compact}
                active={slideIndex === index}
                colors={colors}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.bottom}>
        <View style={styles.bottomControls}>
          <View accessible accessibilityLabel={`Tour step ${index + 1} of ${slides.length}`} style={styles.pagination}>
            {slides.map((item, dotIndex) => (
              <View
                key={item.eyebrow}
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotIndex === index ? colors.accent : colors.border,
                    width: dotIndex === index ? 22 : 7,
                  },
                ]}
              />
            ))}
          </View>
          <Button
            title="Next"
            icon={<ArrowRight size={18} color={colors.background} />}
            onPress={() => last ? onComplete() : transition(index + 1)}
            style={styles.nextButton}
          />
        </View>
        {!compact ? (
          <View style={styles.trust}>
            <Sparkles size={14} color={colors.textMuted} />
            <ThemedText variant="micro" muted>Simple by design. Private by default.</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function TourSlide({ slide, slideIndex, width, compact, active, colors }: {
  slide: (typeof slides)[number];
  slideIndex: number;
  width: number;
  compact: boolean;
  active: boolean;
  colors: ReturnType<typeof useLedgerTheme>["colors"];
}) {
  const Icon = slide.icon;

  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.slideContent}>
        <View>
          <View
            accessible
            accessibilityLabel={`Walletly preview. ${slide.title}`}
            style={[styles.preview, compact && styles.previewCompact, { backgroundColor: colors.surface }]}
          >
            <View style={styles.previewHeader}>
              <View style={[styles.previewDot, { backgroundColor: colors.accentSoft }]} />
              <View style={[styles.previewLine, { backgroundColor: colors.surfaceElevated, width: "32%" }]} />
              <View style={[styles.previewLine, { backgroundColor: colors.surfaceElevated, width: "16%" }]} />
            </View>
            <View style={styles.previewBalance}>
              <ThemedText variant="micro" muted>{slideIndex === 0 ? "THIS MONTH" : slideIndex === 1 ? "NEW EXPENSE" : "YOUR PATTERN"}</ThemedText>
              {slideIndex === 0 ? <AnimatedNumber active={active} value={1248.4} prefix="$" style={[styles.previewAmount, compact && styles.previewAmountCompact, { color: colors.text }]} /> : null}
              {slideIndex === 1 ? <AnimatedNumber active={active} value={24.8} prefix="$" style={[styles.previewAmount, compact && styles.previewAmountCompact, { color: colors.text }]} /> : null}
              {slideIndex === 2 ? <AnimatedNumber active={active} value={7} suffix=" days" decimals={0} style={[styles.previewAmount, compact && styles.previewAmountCompact, { color: colors.text }]} /> : null}
            </View>
            <View style={[styles.previewVisual, compact && styles.previewVisualCompact]}>
              {slideIndex === 0 ? <MiniBars active={active} colors={colors} compact={compact} /> : null}
              {slideIndex === 1 ? <MiniExpense colors={colors} /> : null}
              {slideIndex === 2 ? <MiniInsight active={active} colors={colors} compact={compact} /> : null}
              <TrailLine active={active} colors={colors} />
            </View>
            <View style={styles.previewFooter}>
              <Icon size={17} color={colors.accent} />
              <ThemedText variant="caption" muted>
                {slideIndex === 0 ? "Spending, without the noise" : slideIndex === 1 ? "A tiny habit that adds up" : "Small signals, made useful"}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.copy, compact && styles.copyCompact]}>
          <ThemedText variant="micro" style={{ color: colors.accent }}>{slide.eyebrow.toUpperCase()}</ThemedText>
          <ThemedText variant="title" style={styles.title}>{slide.title}</ThemedText>
          <ThemedText muted style={styles.body}>{slide.body}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function MiniBars({ colors, compact, active }: { colors: ReturnType<typeof useLedgerTheme>["colors"]; compact: boolean; active: boolean }) {
  const heights = compact ? [22, 38, 28, 48, 34, 58, 30] : [30, 50, 36, 66, 44, 78, 38];
  return (
    <View style={styles.bars}>
      {heights.map((barHeight, barIndex) => (
        <AnimatedBar
          key={`${barHeight}-${barIndex}`}
          targetHeight={barHeight}
          delay={barIndex * 45}
          active={active}
          color={barIndex === 5 ? colors.accent : colors.accentSoft}
        />
      ))}
    </View>
  );
}

function AnimatedBar({ targetHeight, delay, color, active }: { targetHeight: number; delay: number; color: string; active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    progress.set(withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [active, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({ height: targetHeight * progress.get() }));
  return <Animated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

function AnimatedNumber({ active, value, prefix = "", suffix = "", decimals = 2, style }: { active: boolean; value: number; prefix?: string; suffix?: string; decimals?: number; style?: StyleProp<TextStyle> }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    progress.set(withTiming(value, { duration: 720, easing: Easing.out(Easing.cubic) }));
  }, [active, progress, value]);

  const animatedProps = useAnimatedProps(() => ({
    text: formatAnimatedNumber(progress.get(), prefix, suffix, decimals),
  }));

  return <AnimatedTextInput editable={false} caretHidden animatedProps={animatedProps} style={style} />;
}

function formatAnimatedNumber(value: number, prefix: string, suffix: string, decimals: number) {
  "worklet";
  const factor = 10 ** decimals;
  const fixed = (Math.round(value * factor) / factor).toFixed(decimals);
  const parts = fixed.split(".");
  const whole = parts[0];
  let grouped = "";
  for (let index = 0; index < whole.length; index += 1) {
    if (index > 0 && (whole.length - index) % 3 === 0) grouped += ",";
    grouped += whole[index];
  }
  return `${prefix}${grouped}${decimals ? `.${parts[1]}` : ""}${suffix}`;
}

function TrailLine({ active, colors }: { active: boolean; colors: ReturnType<typeof useLedgerTheme>["colors"] }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    progress.set(withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }));
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 220 * (1 - progress.get()),
  }));
  const planeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.55, 0.9], [0, 1]),
    transform: [
      { translateX: interpolate(progress.get(), [0, 1], [-110, 0]) },
      { translateY: interpolate(progress.get(), [0, 1], [12, 0]) },
    ],
  }));

  return (
    <View accessible accessibilityLabel="Animated spending trend" style={styles.trail}>
      <Svg width="100%" height="42" viewBox="0 0 180 42">
        <AnimatedPath
          d="M 6 32 C 28 4 52 36 76 20 S 120 36 168 8"
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="220"
          animatedProps={animatedProps}
        />
      </Svg>
      <Animated.View style={[styles.plane, planeStyle]}>
        <Send size={15} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

function MiniExpense({ colors }: { colors: ReturnType<typeof useLedgerTheme>["colors"] }) {
  return (
    <View style={styles.expensePreview}>
      <View style={[styles.expenseIcon, { backgroundColor: colors.accentSoft }]}>
        <CircleDollarSign size={22} color={colors.accent} />
      </View>
      <View style={styles.expenseLines}>
        <View style={[styles.previewLine, { backgroundColor: colors.text, width: "72%" }]} />
        <View style={[styles.previewLine, { backgroundColor: colors.surfaceElevated, width: "48%" }]} />
      </View>
      <ThemedText variant="label">Food</ThemedText>
    </View>
  );
}

function MiniInsight({ active, colors, compact }: { active: boolean; colors: ReturnType<typeof useLedgerTheme>["colors"]; compact: boolean }) {
  return (
    <View style={styles.insightPreview}>
      <View style={[styles.insightRing, compact && styles.insightRingCompact, { borderColor: colors.accent }]}>
        <AnimatedNumber active={active} value={84} suffix="%" decimals={0} style={[styles.insightNumber, { color: colors.accent }]} />
      </View>
      <View style={styles.expenseLines}>
        <View style={[styles.previewLine, { backgroundColor: colors.text, width: "80%" }]} />
        <View style={[styles.previewLine, { backgroundColor: colors.surfaceElevated, width: "56%" }]} />
        <View style={[styles.previewLine, { backgroundColor: colors.surfaceElevated, width: "64%" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  pagination: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 7, borderRadius: radius.full },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  viewport: { flex: 1, overflow: "hidden" },
  track: { height: "100%", flexDirection: "row" },
  slide: { height: "100%", flexGrow: 0, flexShrink: 0, justifyContent: "center" },
  slideContent: { gap: spacing.md },
  preview: {
    minHeight: 250,
    borderRadius: radius.sheet,
    borderCurve: "continuous",
    padding: spacing.lg,
    justifyContent: "space-between",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08)",
  },
  previewCompact: { minHeight: 205, padding: spacing.md },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  previewDot: { width: 28, height: 28, borderRadius: radius.full },
  previewLine: { height: 8, borderRadius: radius.full },
  previewBalance: { gap: spacing.xxs },
  previewAmount: { fontSize: 32, lineHeight: 38 },
  previewAmountCompact: { fontSize: 28, lineHeight: 32 },
  insightNumber: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  previewVisual: { height: 112, justifyContent: "space-between" },
  previewVisualCompact: { height: 96 },
  previewFooter: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  bars: { height: 68, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.sm },
  bar: { width: 18, borderRadius: radius.sm },
  trail: { height: 42, width: "100%", position: "relative" },
  plane: { position: "absolute", right: 0, top: 0 },
  expensePreview: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  expenseIcon: { width: 50, height: 50, borderRadius: radius.control, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  expenseLines: { flex: 1, gap: spacing.xs },
  insightPreview: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  insightRing: { width: 82, height: 82, borderRadius: radius.full, borderWidth: 9, alignItems: "center", justifyContent: "center" },
  insightRingCompact: { width: 62, height: 62, borderWidth: 7 },
  copy: { gap: spacing.xs },
  copyCompact: { gap: spacing.xxs },
  title: { maxWidth: 340 },
  body: { maxWidth: 340, lineHeight: 21 },
  bottom: { gap: spacing.sm, paddingTop: spacing.sm },
  bottomControls: { alignItems: "center", gap: spacing.xs },
  nextButton: { width: "100%", maxWidth: 320 },
  trust: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
});
