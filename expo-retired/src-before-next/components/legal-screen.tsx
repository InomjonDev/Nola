import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { IconButton } from "@/components/icon-button";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type Section = { title: string; body: string };

export function LegalScreen({ eyebrow, title, intro, sections, action }: { eyebrow: string; title: string; intro: string; sections: Section[]; action?: { label: string; onPress: () => void } }) {
  const { colors } = useLedgerTheme();
  return <Screen contentContainerStyle={styles.content}>
    <View style={styles.header}><IconButton icon={ArrowLeft} label="Go back" onPress={() => router.back()} /><View style={styles.headerCopy}><ThemedText variant="micro" muted>{eyebrow}</ThemedText><ThemedText variant="title">{title}</ThemedText></View><View style={styles.spacer} /></View>
    <ThemedText muted style={styles.intro}>{intro}</ThemedText>
    <View style={styles.sections}>{sections.map((section) => <View key={section.title} style={styles.section}><ThemedText variant="section">{section.title}</ThemedText><ThemedText muted style={styles.body}>{section.body}</ThemedText></View>)}</View>
    {action ? <Pressable accessibilityRole="button" onPress={action.onPress} style={({ pressed }) => [styles.action, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.72 : 1 }]}><ThemedText variant="label" style={{ color: colors.accent }}>{action.label}</ThemedText><ExternalLink size={17} color={colors.accent} /></Pressable> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm },
  header: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  spacer: { width: 44 },
  intro: { fontSize: 16, lineHeight: 24, paddingTop: spacing.md },
  sections: { gap: spacing.lg },
  section: { gap: spacing.xs },
  body: { fontSize: 15, lineHeight: 23 },
  action: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
