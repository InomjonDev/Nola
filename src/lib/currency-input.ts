export type AmountDraft = {
  canonical: string;
  display: string;
  complete: boolean;
};

const MAX_INTEGER_DIGITS = 12;
const MAX_FRACTION_DIGITS = 2;
const MAX_AMOUNT = 999_999_999_999.99;
const localeSymbols: Record<string, { decimal: string; group: string }> = {
  "uz-Latn-UZ": { decimal: ",", group: "\u00a0" },
};

type LocaleNumberConfig = {
  decimal: string;
  group: string;
  nativeGroup: string;
  integerFormatter: Intl.NumberFormat;
};

const localeConfigCache = new Map<string, LocaleNumberConfig>();

function getLocaleConfig(locale?: string): LocaleNumberConfig {
  const resolvedLocale = locale || Intl.NumberFormat().resolvedOptions().locale;
  const cached = localeConfigCache.get(resolvedLocale);
  if (cached) return cached;

  const integerFormatter = new Intl.NumberFormat(resolvedLocale, {
    maximumFractionDigits: 0,
    numberingSystem: "latn",
    useGrouping: true,
  });
  const partsFormatter = new Intl.NumberFormat(resolvedLocale, { numberingSystem: "latn" });
  const parts = typeof partsFormatter.formatToParts === "function"
    ? partsFormatter.formatToParts(12_345.6)
    : null;
  const nativeGroup = parts?.find((part) => part.type === "group")?.value ?? ",";
  const explicitSymbols = localeSymbols[resolvedLocale];
  const config = {
    decimal: explicitSymbols?.decimal ?? parts?.find((part) => part.type === "decimal")?.value ?? ".",
    group: explicitSymbols?.group ?? nativeGroup,
    nativeGroup,
    integerFormatter,
  };
  localeConfigCache.set(resolvedLocale, config);
  return config;
}

function findDecimalIndex(input: string, decimal: string, group: string) {
  const dotIndex = input.lastIndexOf(".");
  const commaIndex = input.lastIndexOf(",");

  if (dotIndex >= 0 && commaIndex >= 0) return Math.max(dotIndex, commaIndex);

  const separator = dotIndex >= 0 ? "." : commaIndex >= 0 ? "," : null;
  if (!separator) return -1;

  const segments = input.split(separator);
  const separatorCount = segments.length - 1;
  const lastSegmentLength = segments.at(-1)?.length ?? 0;
  const looksLikeGroupedThousands = separatorCount > 1 && segments.slice(1).every((segment) => segment.length === 3);

  if (looksLikeGroupedThousands) return -1;
  if (input.endsWith(separator)) return input.lastIndexOf(separator);
  if (separator === decimal) return input.lastIndexOf(separator);
  if (separator === group) return lastSegmentLength <= MAX_FRACTION_DIGITS ? input.lastIndexOf(separator) : -1;
  return lastSegmentLength <= MAX_FRACTION_DIGITS ? input.lastIndexOf(separator) : -1;
}

export function formatAmountDraft(input: string, locale?: string): AmountDraft {
  const { decimal, group, nativeGroup, integerFormatter } = getLocaleConfig(locale);
  const isNegative = input.includes("-");
  const sanitized = input.replace(/[^0-9.,]/g, "");

  if (!sanitized) return { canonical: "", display: "", complete: false };

  const decimalIndex = findDecimalIndex(sanitized, decimal, group);
  const integerSource = decimalIndex >= 0 ? sanitized.slice(0, decimalIndex) : sanitized;
  const fractionSource = decimalIndex >= 0 ? sanitized.slice(decimalIndex + 1) : "";
  const integerDigits = integerSource.replace(/\D/g, "").slice(0, MAX_INTEGER_DIGITS);
  const fractionDigits = fractionSource.replace(/\D/g, "").slice(0, MAX_FRACTION_DIGITS);

  if (!integerDigits && decimalIndex < 0) return { canonical: "", display: "", complete: false };

  const normalizedInteger = (integerDigits || "0").replace(/^0+(?=\d)/, "");
  const groupedInteger = integerFormatter.format(Number(normalizedInteger)).split(nativeGroup).join(group);
  const hasDecimal = decimalIndex >= 0;
  const canonical = `${isNegative ? "-" : ""}${normalizedInteger}${hasDecimal ? `.${fractionDigits}` : ""}`;
  const display = `${isNegative ? "-" : ""}${groupedInteger}${hasDecimal ? `${decimal}${fractionDigits}` : ""}`;

  return {
    canonical,
    display,
    complete: !isNegative && canonical.length > 0 && !canonical.endsWith("."),
  };
}

export function parseAmountValue(canonical: string): number | null {
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(canonical)) return null;

  const value = Number(canonical);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null;
  return value;
}
