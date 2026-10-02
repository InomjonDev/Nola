import type { ComponentProps } from "react";
import { Text } from "react-native";

import { typography } from "@/theme";
import { useLedgerTheme } from "@/theme/theme-provider";

type TextVariant = keyof typeof typography;

export function ThemedText({ variant = "body", muted, style, ...props }: ComponentProps<typeof Text> & { variant?: TextVariant; muted?: boolean }) {
  const { colors } = useLedgerTheme();
  return <Text style={[typography[variant], { color: muted ? colors.textMuted : colors.text }, style]} {...props} />;
}
