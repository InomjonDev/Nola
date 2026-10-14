export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, card: 16, control: 12, popover: 16, sheet: 0, full: 999 } as const;
export const typography = {
  display: { fontSize: 22, lineHeight: 32, fontWeight: "600" as const },
  amount: { fontSize: 22, lineHeight: 32, fontWeight: "600" as const, fontVariant: ["tabular-nums"] as ("tabular-nums")[] },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  section: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  body: { fontSize: 17, lineHeight: 21, fontWeight: "400" as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  micro: { fontSize: 12, lineHeight: 18, fontWeight: "500" as const },
} as const;

export const palettes = {
  light: {
    background: "#FFFFFF", surface: "#FFFFFF", surfaceElevated: "#F2F2F2", raised: "#F2F2F2",
    text: "#1B1B1F", textMuted: "#62616A", border: "#E5E5E5", controlBorder: "#77767F",
    accent: "#2457C5", accentStrong: "#1743AF", accentSoft: "#E8F0FF", onAccent: "#FFFFFF",
    destructive: "#B42332", onDestructive: "#FFFFFF", destructiveSoft: "#FCEFF0",
    success: "#16753D", warning: "#925500", overlay: "rgba(0, 0, 0, 0.6)",
    chart: ["#E87500", "#0064D9", "#16753D", "#B72A6B", "#16753D"],
    chartBackground: ["#FFF1E2", "#EAF2FE", "#EAF7EE", "#FBEAF1", "#EAF7EE"],
  },
  dark: {
    background: "#000000", surface: "#1C1C1E", surfaceElevated: "#2C2C2E", raised: "#2C2C2E",
    text: "#F2F2F7", textMuted: "#AEAEB2", border: "#38383A", controlBorder: "#8E8E93",
    accent: "#0A84FF", accentStrong: "#409CFF", accentSoft: "#061321", onAccent: "#FFFFFF",
    destructive: "#FF453A", onDestructive: "#000000", destructiveSoft: "#3A1C1E",
    success: "#30D158", warning: "#FF9F0A", overlay: "rgba(0, 0, 0, 0.72)",
    chart: ["#FF9F0A", "#0A84FF", "#30D158", "#FF375F", "#64D2FF"],
    chartBackground: ["#332310", "#07182A", "#11291C", "#321B25", "#10262B"],
  },
} as const;

export type Theme = (typeof palettes)[keyof typeof palettes];
const cssTokens = {
  bg: "background", surface: "surface", raised: "surfaceElevated", text: "text", muted: "textMuted",
  line: "border", "control-edge": "controlBorder", accent: "accent", "accent-strong": "accentStrong",
  "accent-soft": "accentSoft", "on-accent": "onAccent", danger: "destructive",
  "on-danger": "onDestructive", "danger-soft": "destructiveSoft", success: "success", warning: "warning",
} as const;
function paletteVariables(palette: Theme) {
  const tokens = Object.entries(cssTokens).map(([token, field]) => {
    const hex = palette[field];
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(" ");
    return `--color-${token}:${rgb};`;
  });
  palette.chart.forEach((hex, index) => {
    const family = ["tangerine", "cobalt", "teal", "rose", "green"][index];
    tokens.push(`--category-${family}:${hex};`, `--category-${family}-bg:${palette.chartBackground[index]};`);
  });
  return tokens.join("");
}
// SSR CSS and React consumers use the same palette source.
export const themeStyles = `:root{${paletteVariables(palettes.light)}}:root[data-theme="dark"]{${paletteVariables(palettes.dark)}}`;
export const themeInitScript = `(function(){var mode='system';try{var saved=localStorage.getItem('walletly.theme-mode');if(saved==='light'||saved==='dark')mode=saved;}catch(e){}var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';})();`;
