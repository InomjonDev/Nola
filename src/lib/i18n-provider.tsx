"use client";

import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { createTranslator, detectLanguage, languageLocale, type TranslationKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const LANGUAGE_KEY = "walletly.language";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Use the browser language. */ }
    setLanguageState(saved === "en" || saved === "ru" || saved === "uz" ? saved : detectLanguage(navigator.language));
  }, []);

  useEffect(() => {
    document.documentElement.lang = languageLocale(language);
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Keep the in-memory preference. */ }
  };

  const value = useMemo(() => ({ language, setLanguage, t: createTranslator(language) }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
