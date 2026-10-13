"use client";

import { Check } from "@/components/icons";
import { useI18n } from "@/lib/i18n-provider";
import { useLedgerTheme } from "@/theme/theme-provider";

export function DisplayPreferences({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();
  const { mode, setMode } = useLedgerTheme();
  const languages = ["en", "ru", "uz"] as const;
  const languageName = (value: typeof languages[number]) => t(value === "en" ? "settings.languageEnglish" : value === "ru" ? "settings.languageRussian" : "settings.languageUzbek");
  if (compact) return <div className="grid gap-2">
    <label className="preference-row"><span>{t("settings.appearanceLabel")}</span><select className="flat-select" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{(["system", "light", "dark"] as const).map((value) => <option key={value} value={value}>{t(`settings.${value}`)}</option>)}</select></label>
    <label className="preference-row"><span>{t("settings.language")}</span><select className="flat-select" value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>{languages.map((value) => <option key={value} value={value}>{languageName(value)}</option>)}</select></label>
  </div>;
  return <div className="grid gap-6">
    <fieldset className="min-w-0"><legend className="label mb-2">{t("settings.appearanceLabel")}</legend>
      <div>{(["system", "light", "dark"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} className="preference-row w-full" onClick={() => setMode(value)}><span>{t(`settings.${value}`)}</span>{mode === value && <Check size={20} className="text-accent" aria-hidden="true" />}</button>)}</div>
    </fieldset>
    <fieldset className="min-w-0"><legend className="label mb-2">{t("settings.language")}</legend>
      <div>{languages.map((value) => <button key={value} type="button" lang={value} aria-pressed={language === value} className="preference-row w-full" onClick={() => setLanguage(value)}><span>{languageName(value)}</span>{language === value && <Check size={20} className="text-accent" aria-hidden="true" />}</button>)}</div>
    </fieldset>
  </div>;
}
