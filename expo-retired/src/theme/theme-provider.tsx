import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import type { ThemeMode } from "@/lib/types";
import { palettes, type Theme } from "@/theme";

const THEME_KEY = "walletly.theme-mode";
const THEME_INITIALIZED_KEY = "walletly.theme-initialized";

type ThemeContextValue = {
  colors: Theme;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function LedgerThemeProvider({ children }: PropsWithChildren) {
  const systemMode = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const previousResolvedMode = useRef<"light" | "dark">("light");
  const mounted = useRef(false);
  const transitionProgress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(THEME_KEY), AsyncStorage.getItem(THEME_INITIALIZED_KEY)]).then(([saved, initialized]) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
        return;
      }
      setModeState(initialized === "true" ? "light" : "system");
      void AsyncStorage.setItem(THEME_INITIALIZED_KEY, "true");
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(THEME_KEY, next);
  };

  const resolvedMode = mode === "system" ? (systemMode === "dark" ? "dark" : "light") : mode;
  const transitionStyle = useAnimatedStyle(() => ({ opacity: transitionProgress.get() }));

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      previousResolvedMode.current = resolvedMode;
      return;
    }
    if (previousResolvedMode.current === resolvedMode) return;
    previousResolvedMode.current = resolvedMode;
    if (reducedMotion) {
      transitionProgress.set(0);
      return;
    }
    transitionProgress.set(1);
    transitionProgress.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [reducedMotion, resolvedMode, transitionProgress]);
  const value = useMemo(
    () => ({ colors: palettes[resolvedMode], mode, resolvedMode, setMode }),
    [mode, resolvedMode],
  );

  const transitionColor = palettes[resolvedMode === "dark" ? "light" : "dark"].background;
  return <ThemeContext.Provider value={value}><View style={styles.root}>{children}<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: transitionColor }, transitionStyle]} /></View></ThemeContext.Provider>;
}

export function useLedgerTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useLedgerTheme must be used inside LedgerThemeProvider");
  return value;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
