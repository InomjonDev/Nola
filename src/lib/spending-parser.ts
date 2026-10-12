import type { ParsedCaptureItem, SpendingCapture } from "./types.ts";

export type ParseContext = {
  profileCurrency: string;
  localDate: string;
  timeZone: string;
  defaultPaymentMethodId: string;
  categories: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
};

export type ParseRequest = {
  captureId: string;
  parseRevision: number;
  sourceText: string;
  localDate: string;
  timeZone: string;
};

export type ParseDependencies = {
  authenticate(accessToken: string): Promise<{ userId: string } | null>;
  readAiConsent(userId: string): Promise<boolean>;
  readCapture(userId: string, captureId: string): Promise<SpendingCapture | null>;
  updateCaptureIfCurrent(
    userId: string,
    expected: Pick<SpendingCapture, "id" | "parseRevision" | "sourceText" | "parseStatus">,
    update: Pick<SpendingCapture, "parseStatus" | "updatedAt"> & Partial<Pick<SpendingCapture, "sourceText" | "parseRevision" | "parsedRevision" | "parsedItems">>,
  ): Promise<boolean>;
  readParseContext(userId: string, localDate: string, timeZone: string): Promise<ParseContext>;
  consumeQuota(userId: string): Promise<boolean>;
  requestOpenRouter(body: Record<string, unknown>): Promise<unknown>;
  isOpenRouterConfigured(): boolean;
  createId(): string;
  now(): string;
  model: string;
};

export type ParseValidationCode = "empty_result" | "invalid_response" | "invalid_context";

export class ParsedResponseError extends Error {
  readonly name = "ParsedResponseError";
  readonly code: ParseValidationCode;

  constructor(code: ParseValidationCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MAX_ITEMS = 25;
const MAX_AMOUNT = 999_999_999_999.99;
const MAX_QUANTITY = 999_999_999.999;
const ITEM_KEYS = ["amount", "currency", "description", "quantity", "date", "category", "paymentMethod"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Returns an ISO timestamp at local noon so the stored date remains stable across timezones. */
function localDateToIso(localDate: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const utcNoon = Date.UTC(year, month - 1, day, 12);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcNoon);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return new Date(utcNoon + (utcNoon - representedAsUtc)).toISOString();
}

function normalizedName(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

function invalidResponse(message: string): never {
  throw new ParsedResponseError("invalid_response", message);
}

export function extractHashtags(sourceText: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  const pattern = /(?:^|[\s([{])#([\p{L}\p{N}_-]+)/gu;

  for (const match of sourceText.matchAll(pattern)) {
    const tag = match[1].normalize("NFKC").toLocaleLowerCase("en-US");
    if (!tag || tag.length > 40 || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function openRouterBody(sourceText: string, context: ParseContext, model: string): Record<string, unknown> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        maxItems: MAX_ITEMS,
        items: {
          type: "object",
          additionalProperties: false,
          required: ITEM_KEYS,
          properties: {
            amount: { type: "number", minimum: 0.01 },
            currency: { anyOf: [{ type: "string" }, { type: "null" }] },
            description: { type: "string", minLength: 1, maxLength: 160 },
            quantity: { anyOf: [{ type: "number", exclusiveMinimum: 0 }, { type: "null" }] },
            date: { anyOf: [{ type: "string" }, { type: "null" }] },
            category: { type: "string", minLength: 1 },
            paymentMethod: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
      },
    },
  };

  return {
    model,
    temperature: 0,
    max_tokens: 1800,
    provider: { require_parameters: true },
    response_format: {
      type: "json_schema",
      json_schema: { name: "nola_spending_capture", strict: true, schema },
    },
    messages: [
      {
        role: "system",
        content: [
          "Extract only expense items explicitly described in the user's text.",
          "Return no items when there is no clear positive total amount; never invent an amount.",
          "The amount is the total paid, not a per-unit price. Quantity never multiplies the amount.",
          "For example, '7000 somsa 4x' means amount 7000 and quantity 4.",
          `Assume ${context.profileCurrency} when interpreting an amount with no currency, but return null for currency when it is not explicit.`,
          `Assume ${context.localDate} when interpreting a date that is not stated, but return null for date when it is not explicit.`,
          "Choose the closest category name from the supplied categories, or return 'Other' when none fits.",
          "Use a supplied payment method name when stated; otherwise return null.",
          "Keep each description concise and preserve the user's wording.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          sourceText,
          localDate: context.localDate,
          timeZone: context.timeZone,
          profileCurrency: context.profileCurrency,
          categories: context.categories.map((category) => category.name),
          paymentMethods: context.paymentMethods.map((method) => method.name),
        }),
      },
    ],
  };
}

export function validateParsedItems(
  raw: unknown,
  context: ParseContext,
  createId: () => string = () => globalThis.crypto.randomUUID(),
): ParsedCaptureItem[] {
  if (!isValidLocalDate(context.localDate) || !isValidTimeZone(context.timeZone)
    || !/^[A-Z]{3}$/.test(context.profileCurrency)
    || !context.categories.length || !context.paymentMethods.length) {
    throw new ParsedResponseError("invalid_context", "The spending parser context is incomplete.");
  }

  if (!isRecord(raw) || Object.keys(raw).some((key) => key !== "items") || !Array.isArray(raw.items)) {
    return invalidResponse("The model response does not match the spending schema.");
  }
  if (raw.items.length === 0) {
    throw new ParsedResponseError("empty_result", "No spending amount was found. Add an amount and try again.");
  }
  if (raw.items.length > MAX_ITEMS) return invalidResponse("The model returned too many spending items.");

  const otherCategory = context.categories.find((category) => normalizedName(category.name) === "other");
  if (!otherCategory) throw new ParsedResponseError("invalid_context", "The Other category is unavailable.");

  return raw.items.map((value) => {
    if (!isRecord(value) || Object.keys(value).length !== ITEM_KEYS.length
      || ITEM_KEYS.some((key) => !(key in value))
      || Object.keys(value).some((key) => !ITEM_KEYS.includes(key))) {
      return invalidResponse("A spending item does not match the required schema.");
    }

    const amount = value.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT
      || Math.abs(Math.round(amount * 100) / 100 - amount) > 1e-8) {
      return invalidResponse("A spending amount is invalid.");
    }

    const quantity = value.quantity;
    if (quantity !== null && (typeof quantity !== "number" || !Number.isFinite(quantity)
      || quantity <= 0 || quantity > MAX_QUANTITY || Math.abs(Math.round(quantity * 1000) / 1000 - quantity) > 1e-8)) {
      return invalidResponse("A spending quantity is invalid.");
    }

    const description = value.description;
    if (typeof description !== "string" || !description.trim() || description.length > 160) {
      return invalidResponse("A spending description is invalid.");
    }

    const rawCurrency = value.currency;
    if (rawCurrency !== null && (typeof rawCurrency !== "string" || !/^[A-Za-z]{3}$/.test(rawCurrency))) {
      return invalidResponse("A spending currency is invalid.");
    }

    const rawDate = value.date;
    if (rawDate !== null && (typeof rawDate !== "string" || !isValidLocalDate(rawDate))) {
      return invalidResponse("A spending date is invalid.");
    }

    const rawCategory = value.category;
    if (typeof rawCategory !== "string" || !rawCategory.trim()) {
      return invalidResponse("A spending category is invalid.");
    }

    const matchingCategory = context.categories.find((category) => normalizedName(category.name) === normalizedName(rawCategory));
    const rawPaymentMethod = value.paymentMethod;
    let paymentMethodId = context.defaultPaymentMethodId;
    if (rawPaymentMethod !== null) {
      if (typeof rawPaymentMethod !== "string" || !rawPaymentMethod.trim()) {
        return invalidResponse("A payment method is invalid.");
      }
      const matchingPaymentMethod = context.paymentMethods.find((method) => normalizedName(method.name) === normalizedName(rawPaymentMethod));
      if (!matchingPaymentMethod) return invalidResponse("The model selected an unavailable payment method.");
      paymentMethodId = matchingPaymentMethod.id;
    }
    if (!paymentMethodId || !context.paymentMethods.some((method) => method.id === paymentMethodId)) {
      throw new ParsedResponseError("invalid_context", "The default payment method is unavailable.");
    }

    const category = matchingCategory ?? otherCategory;
    const date = rawDate ?? context.localDate;

    return {
      id: createId(),
      amount,
      currency: rawCurrency?.toUpperCase() ?? context.profileCurrency,
      description: description.trim(),
      quantity,
      spentAt: localDateToIso(date, context.timeZone),
      categoryId: category.id,
      paymentMethodId,
      tagIds: [],
    };
  });
}
