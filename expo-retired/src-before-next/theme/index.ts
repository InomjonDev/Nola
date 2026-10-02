export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  card: 12,
  control: 16,
  popover: 20,
  sheet: 28,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 42, lineHeight: 48, fontWeight: "700" as const, letterSpacing: 0 },
  amount: { fontSize: 36, lineHeight: 42, fontWeight: "700" as const, fontVariant: ["tabular-nums"] as ("tabular-nums")[], letterSpacing: 0 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const, letterSpacing: 0 },
  section: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const, letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const, letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: "600" as const, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const, letterSpacing: 0 },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: "600" as const, letterSpacing: 0 },
} as const;

export const palettes = {
  light: {
    background: "#F2F0F8",
    surface: "#FFFFFF",
    surfaceElevated: "#E8E4F0",
    text: "#17151D",
    textMuted: "#6D6877",
    border: "#DCD8E5",
    accent: "#5B5CE2",
    accentStrong: "#4244BB",
    accentSoft: "#E4E3FF",
    onAccent: "#FFFFFF",
    destructive: "#C84D62",
    onDestructive: "#FFFFFF",
    destructiveSoft: "#F9E1E8",
    success: "#248568",
    warning: "#A56B22",
    overlay: "rgba(16, 12, 24, 0.52)",
    chart: ["#6366F1", "#2E9BC3", "#D59C48", "#B26DD4", "#D95D70"],
    cardGradient: ["#D5D9FF", "#A7B3F6", "#6A74E5", "#BFD5F2"],
  },
  dark: {
    background: "#0D0C10",
    surface: "#16151A",
    surfaceElevated: "#24222B",
    text: "#F7F5FA",
    textMuted: "#A29EAA",
    border: "#302D38",
    accent: "#9A9BFF",
    accentStrong: "#B7B7FF",
    accentSoft: "#29284A",
    onAccent: "#17162B",
    destructive: "#FF8BA0",
    onDestructive: "#17162B",
    destructiveSoft: "#42212B",
    success: "#72D3B0",
    warning: "#E0AE62",
    overlay: "rgba(0, 0, 0, 0.72)",
    chart: ["#9A9BFF", "#67C3E2", "#E1B05D", "#D38AE7", "#FF8199"],
    cardGradient: ["#25294D", "#4C558B", "#9EA3FF", "#3B406E"],
  },
} as const;

export type Theme = (typeof palettes)[keyof typeof palettes];
