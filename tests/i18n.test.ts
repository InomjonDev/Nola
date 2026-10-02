import assert from "node:assert/strict";
import test from "node:test";

import { createTranslator, detectLanguage, languageLocale, translations } from "../src/lib/i18n.ts";

test("detectLanguage prefers Russian and Uzbek locales and falls back to English", () => {
  assert.equal(detectLanguage("ru-RU"), "ru");
  assert.equal(detectLanguage("uz-Latn-UZ"), "uz");
  assert.equal(detectLanguage("en-US"), "en");
  assert.equal(detectLanguage("fr-FR"), "en");
});

test("translator returns the selected language copy", () => {
  assert.equal(createTranslator("ru")("history.title"), "История");
  assert.equal(createTranslator("uz")("settings.title"), "Sozlamalar");
  assert.equal(createTranslator("en")("history.title"), "History");
});

test("all supported languages provide every translation key", () => {
  const keys = Object.keys(translations.en) as Array<keyof typeof translations.en>;
  for (const language of ["ru", "uz"] as const) {
    for (const key of keys) {
      assert.equal(typeof translations[language][key], "string", `${language}.${String(key)} is missing`);
      assert.ok(translations[language][key].length > 0, `${language}.${String(key)} is empty`);
    }
  }
});

test("language locale mapping uses Uzbek Latin explicitly", () => {
  assert.equal(languageLocale("en"), "en-US");
  assert.equal(languageLocale("ru"), "ru-RU");
  assert.equal(languageLocale("uz"), "uz-Latn-UZ");
});
