import { router, useLocalSearchParams } from "expo-router";
import { Check, Plus, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from "react-native";

import { Button } from "@/components/button";
import { AddCategoryChoice, CategoryChoice } from "@/components/category-choice";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { Chip } from "@/components/chip";
import { CurrencyCarousel } from "@/components/currency-carousel";
import { DatePicker } from "@/components/date-picker";
import { IconButton } from "@/components/icon-button";
import { Screen } from "@/components/screen";
import { TagPicker } from "@/components/tag-picker";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { useAppStore } from "@/lib/app-store";
import { DEFAULT_PAYMENT_METHODS } from "@/lib/constants";
import { formatAmountDraft, parseAmountValue } from "@/lib/currency-input";
import { radius, spacing, typography } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";
import type { CategoryIconName } from "@/lib/types";

type TextSelection = { start: number; end: number };

function toDateInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function changedTextCursor(previous: string, next: string) {
  let prefixLength = 0;
  while (prefixLength < previous.length && prefixLength < next.length && previous[prefixLength] === next[prefixLength]) prefixLength += 1;

  let suffixLength = 0;
  while (
    suffixLength < previous.length - prefixLength
    && suffixLength < next.length - prefixLength
    && previous[previous.length - 1 - suffixLength] === next[next.length - 1 - suffixLength]
  ) suffixLength += 1;

  return next.length - suffixLength;
}

function caretAtDigitBoundary(display: string, digitCount: number, fallbackToEnd: boolean) {
  if (fallbackToEnd) return display.length;
  if (digitCount === 0) return 0;

  let seenDigits = 0;
  for (let index = 0; index < display.length; index += 1) {
    if (/\d/.test(display[index])) seenDigits += 1;
    if (seenDigits === digitCount) return index + 1;
  }
  return display.length;
}

export default function AddExpenseScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useLedgerTheme();
  const { height } = useWindowDimensions();
  const dense = height < 760;
  const { profile, categories, paymentMethods, tags, expenses, ensureTags, ensurePaymentMethods, addCategory, saveExpense } = useAppStore();
  useEffect(() => { ensurePaymentMethods([...DEFAULT_PAYMENT_METHODS]); }, [ensurePaymentMethods]);
  const existing = useMemo(() => expenses.find((item) => item.id === params.id), [expenses, params.id]);
  const amountLocale = useMemo(() => Intl.NumberFormat().resolvedOptions().locale, []);
  const availableCategories = categories.filter((item) => !item.archivedAt || item.id === existing?.categoryId);
  const availablePayments = paymentMethods.filter((item) => !item.archivedAt);
  const [amountDraft, setAmountDraft] = useState(() => formatAmountDraft(existing ? String(existing.amount) : "", amountLocale));
  const [amountSelection, setAmountSelection] = useState<TextSelection>(() => {
    const end = formatAmountDraft(existing ? String(existing.amount) : "", amountLocale).display.length;
    return { start: end, end };
  });
  const [currency, setCurrency] = useState(existing?.currency ?? profile?.currency ?? "USD");
  const [date, setDate] = useState(toDateInput(existing?.spentAt ?? new Date().toISOString()));
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? availableCategories[0]?.id ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(existing?.paymentMethodId ?? profile?.defaultPaymentMethodId ?? availablePayments[0]?.id ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [tagNames, setTagNames] = useState(existing?.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter((name): name is string => Boolean(name)) ?? []);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategoryIconName>("more-horizontal");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  function createCategory() {
    const id = addCategory(newCategory, newCategoryIcon);
    if (id) {
      setCategoryId(id);
      setNewCategory("");
      setNewCategoryIcon("more-horizontal");
      setCategoryModalOpen(false);
    }
  }

  function updateAmount(input: string) {
    const editCursor = changedTextCursor(amountDraft.display, input);
    const digitsBeforeCursor = input.slice(0, editCursor).replace(/\D/g, "").length;
    const wasAtEnd = editCursor === input.length;
    const deletingGroupedInteger = !amountDraft.canonical.includes(".") && input.length < amountDraft.display.length;
    const nextDraft = formatAmountDraft(deletingGroupedInteger ? input.replace(/[.,]/g, "") : input, amountLocale);
    const caret = caretAtDigitBoundary(nextDraft.display, digitsBeforeCursor, wasAtEnd);

    setAmountDraft(nextDraft);
    setAmountSelection({ start: caret, end: caret });
    setError(null);
  }

  function updateAmountSelection(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
    setAmountSelection(event.nativeEvent.selection);
  }

  function submit() {
    const numericAmount = parseAmountValue(amountDraft.canonical);
    const parsedDate = new Date(date);
    if (numericAmount === null) return setError("Enter an amount greater than zero.");
    if (Number.isNaN(parsedDate.getTime())) return setError("Choose a valid date.");
    if (!categoryId || !paymentMethodId) return setError("Choose a category and payment method.");
    setSaving(true);
    const tagIds = ensureTags(tagNames);
    saveExpense({ amount: numericAmount, currency, spentAt: parsedDate.toISOString(), categoryId, paymentMethodId, note: note.trim(), tagIds }, existing?.id);
    router.back();
  }

  return (
    <Screen scroll={false} contentContainerStyle={[styles.content, dense && styles.contentDense]}>
      <View style={[styles.header, dense && styles.headerDense]}>
        {keyboardVisible ? <Pressable accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.keyboardDone}><ThemedText variant="label" style={{ color: colors.accent }}>Done</ThemedText></Pressable> : null}
        <IconButton icon={X} label="Close expense" onPress={() => router.back()} />
      </View>

      <View style={[styles.amountBlock, dense && styles.sectionDense]}>
        <ThemedText variant="caption" muted>How much?</ThemedText>
        <View style={[styles.amountInputWrap, dense && styles.amountInputWrapDense, error && { backgroundColor: colors.destructiveSoft }]}>
          <TextInput value={amountDraft.display} onChangeText={updateAmount} onSelectionChange={updateAmountSelection} selection={amountSelection} keyboardType="decimal-pad" inputMode="decimal" returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} placeholder="0.00" placeholderTextColor={colors.textMuted} selectionColor={colors.accent} maxLength={20} style={[styles.amountInput, typography.amount, { color: colors.text }]} accessibilityLabel={`Expense amount in ${currency}`} />
          <CurrencyCarousel value={currency} amount={amountDraft.display} onChange={setCurrency} />
        </View>
        {error ? <ThemedText variant="caption" style={{ color: colors.destructive }}>{error}</ThemedText> : null}
      </View>

      <View style={[styles.section, dense && styles.sectionDense]}>
        <ThemedText variant="micro" muted>CATEGORY</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {availableCategories.map((item) => {
            const selected = categoryId === item.id;
            return <CategoryChoice key={item.id} category={item} selected={selected} onPress={() => setCategoryId(item.id)} />;
          })}
          <AddCategoryChoice onPress={() => setCategoryModalOpen(true)} />
        </ScrollView>
      </View>

      <View style={[styles.section, dense && styles.sectionDense]}>
        <ThemedText variant="micro" muted>PAYMENT METHOD</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {availablePayments.map((item) => <Chip key={item.id} label={item.name} selected={paymentMethodId === item.id} onPress={() => setPaymentMethodId(item.id)} variant="choice" />)}
        </ScrollView>
      </View>

      <DatePicker value={date} onChange={setDate} compact />
      <TagPicker compact availableTags={tags} selected={tagNames} onChange={setTagNames} onCreate={(name) => { ensureTags([name]); setTagNames((current) => [...current, name.toLowerCase()]); }} />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="What was this for?" maxLength={160} multiline textAlignVertical="top" style={[styles.noteInput, dense && styles.noteInputDense]} />

      <Button title={existing ? "Save changes" : "Save expense"} loading={saving} onPress={submit} icon={<Check size={19} color={colors.onAccent} />} style={[styles.saveButton, dense && styles.saveButtonDense]} />

      <Modal visible={categoryModalOpen} transparent animationType="slide" onRequestClose={() => setCategoryModalOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={() => setCategoryModalOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHeader}><View><ThemedText variant="micro" muted>NEW CATEGORY</ThemedText><ThemedText variant="title">Keep it personal</ThemedText></View><IconButton icon={X} label="Close category dialog" onPress={() => setCategoryModalOpen(false)} /></View>
            <TextField label="Category name" value={newCategory} onChangeText={setNewCategory} placeholder="e.g. Wellness" autoCapitalize="words" autoFocus />
            <ThemedText variant="micro" muted>ICON</ThemedText>
            <CategoryIconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
            <Button title="Add category" onPress={createCategory} disabled={!newCategory.trim()} icon={<Plus size={18} color={colors.onAccent} />} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xs, paddingBottom: spacing.xs, gap: spacing.sm },
  contentDense: { gap: 6, paddingTop: 4, paddingBottom: 4 },
  header: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.xs },
  headerDense: { minHeight: 42 },
  keyboardDone: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center" },
  amountBlock: { gap: spacing.xs, paddingTop: spacing.xs },
  amountInputWrap: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.control, borderCurve: "continuous" },
  amountInputWrapDense: { minHeight: 62 },
  amountInput: { flex: 1, minWidth: 0, paddingVertical: spacing.sm, fontVariant: ["tabular-nums"] },
  section: { gap: spacing.xs },
  sectionDense: { gap: spacing.xxs, paddingTop: 0 },
  horizontal: { gap: spacing.xs, paddingRight: spacing.md },
  categoryRail: { gap: spacing.sm, paddingRight: spacing.md },
  noteInput: { minHeight: 64, paddingTop: spacing.sm },
  noteInputDense: { minHeight: 50, paddingTop: spacing.xs },
  saveButton: { marginTop: 0 },
  saveButtonDense: { minHeight: 52 },
  scrim: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.lg, gap: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
