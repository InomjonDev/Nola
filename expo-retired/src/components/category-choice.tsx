import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { ThemedText } from "@/components/themed-text";
import type { Category } from "@/lib/types";
import { radius, spacing } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type CategoryChoiceProps = {
  category: Category;
  selected: boolean;
  onPress: () => void;
};

export function CategoryChoice({ category, selected, onPress }: CategoryChoiceProps) {
  const { colors } = useLedgerTheme();
  const iconColor = selected ? colors.accentStrong : category.color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name} category`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surfaceElevated,
          opacity: pressed ? 0.76 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={styles.iconWell}>
        <CategoryIcon name={category.name} icon={category.icon} color={iconColor} size={17} />
      </View>
      <ThemedText variant="micro" numberOfLines={1} style={{ color: selected ? colors.accentStrong : colors.text }}>
        {category.name}
      </ThemedText>
    </Pressable>
  );
}

export function AddCategoryChoice({ onPress, label = "Add category" }: { onPress: () => void; label?: string }) {
  const { colors } = useLedgerTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        styles.addChoice,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          opacity: pressed ? 0.76 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={[styles.iconWell, { backgroundColor: colors.accentSoft }]}>
        <Plus size={17} color={colors.accentStrong} strokeWidth={2.2} />
      </View>
      <ThemedText variant="micro" numberOfLines={1} style={{ color: colors.accentStrong }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    width: 82,
    minHeight: 76,
    borderRadius: radius.control,
    borderCurve: "continuous",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
  },
  addChoice: {},
  iconWell: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
