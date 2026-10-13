"use client";

import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import type { ThemeMode } from "@/lib/types";
import { palettes, type Theme } from "@/theme";

const THEME_KEY = "walletly.theme-mode";

type ThemeContextValue = {
  colors: Theme;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemMode() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function LedgerThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemMode, setSystemMode] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      setModeState(saved === "light" || saved === "dark" ? saved : "system");
    } catch { /* System preference remains available without storage. */ }
    setSystemMode(getSystemMode());
    setReady(true);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemMode(getSystemMode());
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Keep the in-memory preference. */ }
  };

  const resolvedMode = mode === "system" ? systemMode : mode;

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = resolvedMode;
    document.documentElement.style.colorScheme = resolvedMode;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute("media");
      meta.content = resolvedMode === "dark" ? "#000000" : "#FFFFFF";
    });
  }, [resolvedMode, ready]);

  const value = useMemo(
    () => ({ colors: palettes[resolvedMode], mode, resolvedMode, setMode }),
    [mode, resolvedMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useLedgerTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useLedgerTheme must be used inside LedgerThemeProvider");
  return value;
}
