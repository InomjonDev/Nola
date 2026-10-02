import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { createTranslator, detectLanguage, type TranslationKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const LANGUAGE_KEY = "walletly.language";

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(() => detectLanguage());

  useEffect(() => {
    void AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved === "en" || saved === "ru" || saved === "uz") setLanguageState(saved);
    });
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    void AsyncStorage.setItem(LANGUAGE_KEY, next);
  };
  const t = useMemo(() => createTranslator(language), [language]);

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
