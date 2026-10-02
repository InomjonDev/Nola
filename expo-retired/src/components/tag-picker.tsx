import { Plus, Tag, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { TAG_SUGGESTIONS } from "@/lib/constants";
import type { Tag as TagType } from "@/lib/types";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export function TagPicker({ availableTags, selected, onChange, onCreate, compact = false }: { availableTags: TagType[]; selected: string[]; onChange: (names: string[]) => void; onCreate: (name: string) => void; compact?: boolean }) {
  const { colors } = useLedgerTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const options = useMemo(() => [...new Set([...TAG_SUGGESTIONS, ...availableTags.map((tag) => tag.name)])], [availableTags]);
  const toggle = (name: string) => {
    const normalized = name.trim().toLowerCase();
    const isSelected = selected.some((item) => item.toLowerCase() === normalized);
    onChange(isSelected ? selected.filter((item) => item.toLowerCase() !== normalized) : [...selected, normalized]);
  };
  const create = () => { if (!draft.trim()) return; onCreate(draft.trim()); setDraft(""); setOpen(false); };
  const tagOptions = <View style={compact ? styles.inlineOptions : styles.options}>{options.map((tag) => { const selectedTag = selected.some((item) => item.toLowerCase() === tag.toLowerCase()); return <Chip key={tag} label={`#${tag}`} selected={selectedTag} onPress={() => toggle(tag)} variant="choice" />; })}<Chip label="Add tag" onPress={() => setOpen(true)} variant="choice" leading={<Plus size={15} color={colors.textMuted} />} /></View>;
  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}><View style={styles.label}>{compact ? <ThemedText variant="micro" muted>TAGS</ThemedText> : <><Tag size={17} color={colors.textMuted} /><ThemedText variant="section">Tags</ThemedText></>}</View>{compact ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactOptions}>{tagOptions}</ScrollView> : tagOptions}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><Pressable style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}><Pressable style={[styles.modal, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}><View style={styles.modalTop}><View><ThemedText variant="micro" muted>NEW TAG</ThemedText><ThemedText variant="title">Make it reusable</ThemedText></View><Pressable accessibilityRole="button" accessibilityLabel="Close tag picker" onPress={() => setOpen(false)} style={styles.close}><X size={21} color={colors.text} /></Pressable></View><TextField label="Tag name" value={draft} onChangeText={setDraft} placeholder="e.g. subscriptions" autoCapitalize="words" /><Button title="Add tag" onPress={create} disabled={!draft.trim()} /></Pressable></Pressable></Modal>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.md }, compactWrap: { gap: spacing.xxs }, label: { minHeight: 14, flexDirection: "row", alignItems: "center", gap: spacing.xs }, options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, inlineOptions: { flexDirection: "row", gap: spacing.xs }, compactOptions: { gap: spacing.xs, paddingRight: spacing.md }, scrim: { flex: 1, justifyContent: "flex-end" }, modal: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.lg, gap: spacing.lg }, modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" } });
