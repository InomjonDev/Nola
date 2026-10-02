import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DatePicker({ value, onChange, compact = false }: { value: string; onChange: (value: string) => void; compact?: boolean }) {
  const { colors } = useLedgerTheme();
  const selected = new Date(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(selected);
  const days = useMemo(() => {
    const firstDay = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)];
  }, [month]);
  const setDay = (day: number) => {
    const next = new Date(month.getFullYear(), month.getMonth(), day, 12);
    const now = new Date();
    if (next.toDateString() === now.toDateString()) next.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    onChange(next.toISOString());
    setOpen(false);
  };
  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.trigger, { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.76 : 1 }, compact && styles.compactTrigger]}>
        <View style={styles.triggerCopy}><ThemedText variant="micro" muted>DATE</ThemedText><ThemedText variant="label">{monthLabel}</ThemedText></View><CalendarDays size={19} color={colors.accent} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.scrim, { backgroundColor: colors.overlay }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close calendar" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={[styles.calendar, { backgroundColor: colors.surface }]}>
            <View style={styles.calendarHeader}><ThemedText variant="section">{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</ThemedText><View style={styles.arrows}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.arrow}><ChevronLeft size={19} color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.arrow}><ChevronRight size={19} color={colors.text} /></Pressable></View></View>
            <View style={styles.grid}>{week.map((day) => <ThemedText key={day} variant="micro" muted style={styles.weekDay}>{day}</ThemedText>)}{days.map((day, index) => { const isSelected = day === selected.getDate() && month.getMonth() === selected.getMonth() && month.getFullYear() === selected.getFullYear(); return day ? <Pressable key={`${day}-${index}`} accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={`${day} ${new Intl.DateTimeFormat(undefined, { month: "long" }).format(month)}`} onPress={() => setDay(day)} style={[styles.day, isSelected && { backgroundColor: colors.accent }]}><ThemedText variant="label" style={{ color: isSelected ? colors.onAccent : colors.text }}>{day}</ThemedText></Pressable> : <View key={`empty-${index}`} style={styles.day} />; })}</View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({ wrapper: { gap: spacing.sm }, trigger: { minHeight: 58, borderRadius: radius.control, borderCurve: "continuous", paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, compactTrigger: { minHeight: 48, paddingHorizontal: spacing.sm }, triggerCopy: { gap: 2 }, scrim: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg }, calendar: { width: "100%", maxWidth: 420, borderRadius: radius.popover, borderCurve: "continuous", padding: spacing.md, gap: spacing.md, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)" }, calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, arrows: { flexDirection: "row", gap: spacing.xxs }, arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, grid: { flexDirection: "row", flexWrap: "wrap" }, weekDay: { width: "14.285%", textAlign: "center", paddingBottom: spacing.xs }, day: { width: "14.285%", height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.full }, });
