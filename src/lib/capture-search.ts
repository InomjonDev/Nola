import type { Category, Expense, SpendingCapture, Tag } from "./types.ts";

export type SpendingSearchField = "sourceText" | "amount" | "date" | "category" | "description" | "tag";

export type SpendingSearchResult = {
  kind: "capture" | "expense";
  /** Stable identity for list rendering and navigation. */
  key: `capture:${string}` | `expense:${string}`;
  recordId: string;
  captureId: string | null;
  /** ISO date string used by callers to format for the current locale. */
  displayDate: string;
  title: string;
  amount?: number;
  currency?: string;
  category?: string;
  matchField: SpendingSearchField;
  /** The exact string against which highlight.start/end are measured. */
  matchText: string;
  highlight: { start: number; end: number };
};

type TextMatch = Pick<SpendingSearchResult, "matchField" | "matchText" | "highlight">;

function findTextMatch(value: string | null | undefined, query: string, matchField: SpendingSearchField): TextMatch | null {
  if (!value) return null;
  const start = value.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return start < 0 ? null : { matchField, matchText: value, highlight: { start, end: start + query.length } };
}

function normalizeNumberToken(value: string) {
  const token = value.replace(/[\s'’\u00a0]/g, "");
  const separators = [...token.matchAll(/[.,]/g)].map((match) => match.index ?? -1);
  if (separators.length === 0) return token;

  const lastSeparator = separators.at(-1) ?? -1;
  const digitsAfterLast = token.length - lastSeparator - 1;
  const hasBothSeparators = token.includes(".") && token.includes(",");
  const isDecimalSeparator = hasBothSeparators || digitsAfterLast !== 3;
  if (!isDecimalSeparator) return token.replace(/[.,]/g, "");

  const decimalDigits = token.slice(lastSeparator + 1).replace(/\D/g, "");
  const integerDigits = token.slice(0, lastSeparator).replace(/\D/g, "");
  const fraction = decimalDigits.replace(/0+$/, "");
  return fraction ? `${integerDigits || "0"}.${fraction}` : integerDigits;
}

function findNumericTextMatch(value: string, query: string, matchField: SpendingSearchField): TextMatch | null {
  if (!/^[\d\s.,'’\u00a0]+$/.test(query)) return null;
  const normalizedQuery = normalizeNumberToken(query.trim());
  if (!normalizedQuery) return null;

  const tokenPattern = /\d[\d\s.,'’\u00a0]*/g;
  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0].trimEnd();
    const tokenStart = match.index ?? 0;
    const normalizedToken = normalizeNumberToken(token);
    const normalizedStart = normalizedToken.indexOf(normalizedQuery);
    if (normalizedStart < 0) continue;

    const digitOffsets: number[] = [];
    for (let index = 0; index < token.length; index += 1) {
      if (/\d/.test(token[index])) digitOffsets.push(tokenStart + index);
    }
    const matchedDigits = normalizedToken.slice(normalizedStart, normalizedStart + normalizedQuery.length).replace(/\D/g, "").length;
    const digitStart = normalizedToken.slice(0, normalizedStart).replace(/\D/g, "").length;
    if (!matchedDigits || digitStart + matchedDigits > digitOffsets.length) continue;
    const start = digitOffsets[digitStart];
    const end = digitOffsets[digitStart + matchedDigits - 1] + 1;
    return { matchField, matchText: value, highlight: { start, end } };
  }
  return null;
}

function findHashtagMatch(value: string, query: string): TextMatch | null {
  const normalizedQuery = query.startsWith("#") ? query.slice(1) : query;
  const normalizedValue = value.startsWith("#") ? value.slice(1) : value;
  if (!normalizedQuery) return null;
  const start = normalizedValue.toLocaleLowerCase().indexOf(normalizedQuery.toLocaleLowerCase());
  return start < 0 ? null : {
    matchField: "tag",
    matchText: normalizedValue,
    highlight: { start, end: start + normalizedQuery.length },
  };
}

function formatAmountCandidates(amount: number, currency: string) {
  const locales = ["en-US", "ru-RU", "uz-UZ", "de-DE"];
  const candidates = new Set<string>([String(amount), `${currency} ${amount}`, `${amount} ${currency}`]);
  for (const locale of locales) {
    const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(amount);
    candidates.add(formatted);
    candidates.add(`${currency} ${formatted}`);
    candidates.add(`${formatted} ${currency}`);
  }
  return [...candidates];
}

function findAmountMatch(amount: number, currency: string, query: string): TextMatch | null {
  const candidates = formatAmountCandidates(amount, currency);
  for (const candidate of candidates) {
    const match = findTextMatch(candidate, query, "amount");
    if (match) return match;
  }

  // Amount queries commonly arrive with a different grouping separator than
  // the current locale (for example, `7.000,00` versus `7,000`). Normalize the
  // numeric part and retain offsets into the displayed candidate for highlighting.
  if (!/^(?:(?:[A-Za-z]{3}|\p{Sc})\s*)?[\d\s.,'’\u00a0]+(?:\s*(?:[A-Za-z]{3}|\p{Sc}))?$/u.test(query.trim())) return null;
  const queryToken = query.match(/\d[\d\s.,'’\u00a0]*/)?.[0].trim();
  const normalizedQuery = queryToken ? normalizeNumberToken(queryToken) : "";
  if (!normalizedQuery) return null;
  for (const candidate of candidates) {
    const candidateTokenMatch = candidate.match(/\d[\d\s.,'’\u00a0]*/);
    const candidateToken = candidateTokenMatch?.[0].trimEnd();
    if (!candidateToken || candidateTokenMatch?.index === undefined) continue;
    const normalizedCandidate = normalizeNumberToken(candidateToken);
    const normalizedStart = normalizedCandidate.indexOf(normalizedQuery);
    if (normalizedStart < 0) continue;
    const digitStart = normalizedCandidate.slice(0, normalizedStart).replace(/\D/g, "").length;
    const matchedDigits = normalizedCandidate.slice(normalizedStart, normalizedStart + normalizedQuery.length).replace(/\D/g, "").length;
    const digitOffsets: number[] = [];
    for (let index = 0; index < candidateToken.length; index += 1) {
      if (/\d/.test(candidateToken[index])) digitOffsets.push(candidateTokenMatch.index + index);
    }
    if (!matchedDigits || digitStart + matchedDigits > digitOffsets.length) continue;
    const start = digitOffsets[digitStart];
    const lastDigit = digitOffsets[digitStart + matchedDigits - 1];
    return { matchField: "amount", matchText: candidate, highlight: { start, end: lastDigit + 1 } };
  }
  return null;
}

function tagNames(ids: string[], tagsById: Map<string, Tag>) {
  return ids.flatMap((id) => {
    const tag = tagsById.get(id);
    return tag ? [tag.name] : [];
  });
}

function firstMatch(candidates: Array<TextMatch | null>) {
  return candidates.find((candidate): candidate is TextMatch => candidate !== null) ?? null;
}

/**
 * Search active spending captures and their active linked expenses, along with
 * active legacy expenses that have no capture. Results are newest first and
 * carry a stable key plus an explicit string/range for rendering a highlight.
 */
export function searchSpendingRecords(
  query: string,
  captures: SpendingCapture[],
  expenses: Expense[],
  categories: Category[],
  tags: Tag[],
): SpendingSearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const activeCaptures = captures.filter((capture) => !capture.deletedAt && capture.parseStatus !== "undone");
  const capturesById = new Map(activeCaptures.map((capture) => [capture.id, capture]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const results: Array<SpendingSearchResult & { sortDate: number }> = [];

  for (const capture of activeCaptures) {
    const match = firstMatch([
      findTextMatch(capture.sourceText, trimmedQuery, "sourceText"),
      findNumericTextMatch(capture.sourceText, trimmedQuery, "sourceText"),
      findTextMatch(capture.capturedAt, trimmedQuery, "date"),
      ...tagNames(capture.tagIds, tagsById).map((name) => findHashtagMatch(name, trimmedQuery)),
    ]);
    if (!match) continue;
    results.push({
      kind: "capture",
      key: `capture:${capture.id}`,
      recordId: capture.id,
      captureId: capture.id,
      displayDate: capture.capturedAt,
      title: capture.sourceText,
      ...match,
      sortDate: Date.parse(capture.capturedAt) || 0,
    });
  }

  for (const expense of expenses) {
    if (expense.deletedAt) continue;
    // Capture-linked rows are only searchable while their source note is active.
    if (expense.captureId && !capturesById.has(expense.captureId)) continue;

    const category = categoriesById.get(expense.categoryId)?.name;
    const expenseTags = tagNames(expense.tagIds, tagsById);
    const dateCandidates = [expense.spentAt, expense.spentAt.slice(0, 10)];
    for (const locale of ["en-US", "ru-RU", "uz-UZ"]) {
      const date = new Date(expense.spentAt);
      if (Number.isFinite(date.getTime())) dateCandidates.push(date.toLocaleDateString(locale));
    }
    const match = firstMatch([
      findAmountMatch(expense.amount, expense.currency, trimmedQuery),
      ...dateCandidates.map((date) => findTextMatch(date, trimmedQuery, "date")),
      findTextMatch(category, trimmedQuery, "category"),
      findTextMatch(expense.note, trimmedQuery, "description"),
      ...expenseTags.map((name) => findHashtagMatch(name, trimmedQuery)),
    ]);
    if (!match) continue;

    results.push({
      kind: "expense",
      key: `expense:${expense.id}`,
      recordId: expense.id,
      captureId: expense.captureId,
      displayDate: expense.spentAt,
      title: expense.note || category || expense.currency,
      amount: expense.amount,
      currency: expense.currency,
      ...(category ? { category } : {}),
      ...match,
      sortDate: Date.parse(expense.spentAt) || 0,
    });
  }

  return results
    .sort((left, right) => right.sortDate - left.sortDate || left.key.localeCompare(right.key))
    .map(({ sortDate: _sortDate, ...result }) => result);
}
