import assert from "node:assert/strict";
import test from "node:test";

import { createTranslator, detectLanguage } from "../src/lib/i18n.ts";

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
