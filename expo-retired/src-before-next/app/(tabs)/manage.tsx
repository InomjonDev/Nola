import { Archive, Check, Pencil, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { IconButton } from "@/components/icon-button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { useAppStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n-provider";
import type { CategoryIconName } from "@/lib/types";
import { radius, spacing, typography } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

export default function ManageScreen() {
  const { colors } = useLedgerTheme();
  const { t } = useI18n();
  const { categories, tags, addCategory, renameCategory, archiveCategory } = useAppStore();
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<CategoryIconName>("more-horizontal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingIcon, setEditingIcon] = useState<CategoryIconName>("more-horizontal");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const activeCategories = categories.filter((item) => !item.archivedAt);

  function add() {
    if (!newName.trim()) return;
    addCategory(newName, newIcon);
    setNewName("");
    setNewIcon("more-horizontal");
  }

  function beginEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
    setEditingIcon(categories.find((item) => item.id === id)?.icon ?? "more-horizontal");
  }

  function saveEdit() {
    if (editingId && editingName.trim()) renameCategory(editingId, editingName, editingIcon);
    setEditingId(null);
  }

  return (
    <Screen>
      <View><ThemedText variant="micro" muted>{t("manage.eyebrow")}</ThemedText><ThemedText variant="title">{t("manage.title")}</ThemedText></View>

      <View style={styles.section}>
        <ThemedText variant="section">{t("manage.categories")}</ThemedText>
        <View style={styles.addRow}>
          <View style={styles.grow}><TextField value={newName} onChangeText={setNewName} placeholder={t("manage.newCategory")} returnKeyType="done" onSubmitEditing={add} /></View>
          <Button title={t("manage.add")} onPress={add} disabled={!newName.trim()} icon={<Plus size={18} color={colors.onAccent} />} style={styles.addButton} />
        </View>
        <ThemedText variant="micro" muted>{t("manage.icon")}</ThemedText>
        <CategoryIconPicker value={newIcon} onChange={setNewIcon} />
        <View style={styles.list}>
          {activeCategories.map((item, index) => {
            const nextItem = activeCategories[index + 1];
            const separatesActionableRows = item.kind === "custom" && nextItem?.kind === "custom";
            return (
              <View key={item.id}>
              <View style={[styles.row, separatesActionableRows && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}> 
                <CategoryIcon name={item.name} icon={item.icon} color={item.color} size={18} />
                {editingId === item.id ? <TextInput autoFocus value={editingName} onChangeText={setEditingName} onSubmitEditing={saveEdit} style={[styles.editInput, typography.body, { color: colors.text, borderColor: colors.accent }]} /> : <View style={styles.grow}><ThemedText variant="label">{item.name}</ThemedText><ThemedText variant="micro" muted>{item.kind === "global" ? t("manage.builtIn") : t("manage.custom")}</ThemedText></View>}
                {item.kind === "custom" ? editingId === item.id ? <><IconButton icon={Check} label="Save category" onPress={saveEdit} /><IconButton icon={X} label="Cancel editing" onPress={() => setEditingId(null)} /></> : <><IconButton icon={Pencil} label="Rename category" onPress={() => beginEdit(item.id, item.name)} /><IconButton icon={Archive} label="Archive category" onPress={() => setArchiveId(item.id)} /></> : null}
              </View>
              {editingId === item.id ? <View style={styles.editPicker}><ThemedText variant="micro" muted>{t("manage.icon")}</ThemedText><CategoryIconPicker value={editingIcon} onChange={setEditingIcon} /></View> : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText variant="section">{t("manage.reusableTags")}</ThemedText>
        {tags.length ? <View style={styles.tags}>{tags.map((tag) => <View key={tag.id} style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}><ThemedText variant="caption">#{tag.name}</ThemedText></View>)}</View> : <ThemedText variant="caption" muted>{t("manage.tagsEmpty")}</ThemedText>}
      </View>
      <Modal visible={Boolean(archiveId)} transparent animationType="slide" onRequestClose={() => setArchiveId(null)}><Pressable style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={() => setArchiveId(null)}><Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}><ThemedText variant="title">{t("manage.archive")}</ThemedText><ThemedText muted>{t("manage.archiveDetail")}</ThemedText><Button title={t("manage.archiveCategory")} variant="destructive" onPress={() => { if (archiveId) archiveCategory(archiveId); setArchiveId(null); }} icon={<Archive size={18} color={colors.destructive} />} /><Button title={t("manage.keepCategory")} variant="secondary" onPress={() => setArchiveId(null)} /></Pressable></Pressable></Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  grow: { flex: 1 },
  addButton: { minWidth: 92 },
  list: { backgroundColor: "transparent" },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxs },
  editInput: { flex: 1, minHeight: 44, borderBottomWidth: 1 },
  editPicker: { paddingBottom: spacing.sm, gap: spacing.xs },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tag: { minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.lg, gap: spacing.lg },
});
