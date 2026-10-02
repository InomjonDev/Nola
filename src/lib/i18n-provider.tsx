"use client";

import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { createTranslator, detectLanguage, type TranslationKey } from "@/lib/i18n";
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
    const saved = localStorage.getItem(LANGUAGE_KEY);
    setLanguageState(saved === "en" || saved === "ru" || saved === "uz" ? saved : detectLanguage(navigator.language));
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    localStorage.setItem(LANGUAGE_KEY, next);
  };

  const value = useMemo(() => ({ language, setLanguage, t: createTranslator(language) }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
