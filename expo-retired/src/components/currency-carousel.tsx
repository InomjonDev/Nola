import * as Haptics from "expo-haptics";
import { ChevronUp, Coins, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { IconButton } from "@/components/icon-button";
import { ThemedText } from "@/components/themed-text";
import { WALLETLY_CURRENCIES } from "@/lib/constants";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

const ITEM_HEIGHT = 56;

export function CurrencyCarousel({ value, amount, onChange }: { value: string; amount?: string; onChange: (currency: string) => void }) {
  const { colors } = useLedgerTheme();
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, WALLETLY_CURRENCIES.indexOf(value as (typeof WALLETLY_CURRENCIES)[number])));
  const reducedMotion = useReducedMotion();
  const sheetY = useSharedValue(420);
  const triggerLift = useSharedValue(0);
  const selectedIndex = Math.max(0, WALLETLY_CURRENCIES.indexOf(value as (typeof WALLETLY_CURRENCIES)[number]));

  useEffect(() => {
    if (!visible) return;
    sheetY.set(reducedMotion ? 0 : 420);
    sheetY.set(withSpring(0, { duration: 300, dampingRatio: 0.8, reduceMotion: ReduceMotion.System }));
  }, [reducedMotion, sheetY, visible]);

  const openPicker = useCallback(() => {
    setActiveIndex(selectedIndex);
    setVisible(true);
  }, [selectedIndex]);

  const closePicker = useCallback(() => {
    if (reducedMotion) {
      setVisible(false);
      return;
    }
    sheetY.set(withTiming(420, { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) }, (finished) => {
      if (finished) scheduleOnRN(setVisible, false);
    }));
  }, [reducedMotion, sheetY]);

  const select = useCallback((currency: (typeof WALLETLY_CURRENCIES)[number]) => {
    const index = WALLETLY_CURRENCIES.indexOf(currency);
    setActiveIndex(index);
    onChange(currency);
    void Haptics.selectionAsync();
    closePicker();
  }, [closePicker, onChange]);

  const commitWheel = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.max(0, Math.min(WALLETLY_CURRENCIES.length - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
    if (index === activeIndex) return;
    setActiveIndex(index);
    onChange(WALLETLY_CURRENCIES[index]);
    void Haptics.selectionAsync();
  };

  const finishSlowDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) commitWheel(event);
  };

  const dragGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      triggerLift.set(Math.max(-8, Math.min(0, event.translationY * 0.16)));
    })
    .onEnd((event) => {
      const shouldOpen = event.translationY < -24 || event.velocityY < -320;
      triggerLift.set(withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: event.velocityY }));
      if (shouldOpen) scheduleOnRN(openPicker);
    });

  const triggerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: triggerLift.get() }, { scale: triggerLift.get() < 0 ? 0.98 : 1 }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.get() }] }));

  return <>
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={triggerStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Currency ${value}. Tap or drag up to change`} onPress={openPicker} style={({ pressed }) => [styles.pill, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.72 : 1 }]}><Coins size={16} color={colors.accentStrong} /><ThemedText variant="caption" style={{ color: colors.accentStrong }}>{value}</ThemedText><ChevronUp size={15} color={colors.accentStrong} /></Pressable>
      </Animated.View>
    </GestureDetector>
    <Modal visible={visible} transparent animationType="none" onRequestClose={closePicker}>
      <View style={[styles.scrim, { backgroundColor: colors.overlay }]}>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.surface }, sheetStyle]}>
          <View style={styles.sheetTop}><View><ThemedText variant="micro" muted>AMOUNT / CURRENCY</ThemedText><ThemedText variant="amount" style={styles.amount}>{amount || "0.00"} <ThemedText variant="section" muted>{value}</ThemedText></ThemedText></View><IconButton icon={X} label="Close currency carousel" onPress={closePicker} /></View>
          <View style={styles.wheelHeader}><ThemedText variant="caption" muted>Slide the wheel</ThemedText><ThemedText variant="caption" style={{ color: colors.accent }}>{WALLETLY_CURRENCIES[activeIndex]}</ThemedText></View>
          <View style={[styles.wheel, { backgroundColor: colors.surfaceElevated }]}><View style={[styles.selectionBand, { backgroundColor: colors.accentSoft }]} /><FlatList key={`${visible}-${selectedIndex}`} data={WALLETLY_CURRENCIES} keyExtractor={(item) => item} showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" initialScrollIndex={selectedIndex} getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })} contentContainerStyle={styles.wheelContent} onMomentumScrollEnd={commitWheel} onScrollEndDrag={finishSlowDrag} renderItem={({ item, index }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: index === activeIndex }} onPress={() => select(item)} style={styles.wheelItem}><ThemedText variant="title" style={{ color: index === activeIndex ? colors.accentStrong : colors.textMuted }}>{item}</ThemedText></Pressable>} /></View>
          <ThemedText variant="micro" muted style={styles.hint}>USD · UZS · RUB and more</ThemedText>
        </Animated.View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  pill: { minHeight: 44, borderRadius: radius.full, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: 5 },
  scrim: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.lg, gap: spacing.md, minHeight: 430, boxShadow: "0 -6px 24px rgba(0, 0, 0, 0.22)" },
  sheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontVariant: ["tabular-nums"] },
  wheelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wheel: { height: ITEM_HEIGHT * 3, borderRadius: radius.popover, borderCurve: "continuous", overflow: "hidden", position: "relative" },
  wheelContent: { paddingVertical: ITEM_HEIGHT },
  wheelItem: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  selectionBand: { position: "absolute", left: spacing.sm, right: spacing.sm, top: ITEM_HEIGHT, height: ITEM_HEIGHT, borderRadius: radius.control, borderCurve: "continuous", zIndex: 1, opacity: 0.72, pointerEvents: "none" },
  hint: { textAlign: "center" },
});
