import { SUPPORTED_CURRENCIES } from "./constants.ts";
import type { ParsedCaptureAction, SavingsGoal, SpendingCapture } from "./types.ts";

export type ParseContext = {
  profileCurrency: string;
  localDate: string;
  timeZone: string;
  defaultPaymentMethodId: string;
  categories: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
  savingsGoals: Array<Pick<SavingsGoal, "id" | "name" | "currency">>;
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
  requestGemini(body: Record<string, unknown>): Promise<unknown>;
  isGeminiConfigured(): boolean;
  createId(): string;
  now(): string;
};

export type ParseValidationCode = "empty_result" | "invalid_response" | "invalid_context" | "goal_target_required" | "goal_not_found" | "goal_ambiguous";

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
const ITEM_KEYS = ["amount", "priceBasis", "currency", "description", "quantity", "date", "category", "paymentMethod"];
const INCOME_KEYS = ["amount", "currency", "note", "date"];
const GOAL_KEYS = ["name", "targetAmount", "currency", "deadline"];
const CONTRIBUTION_KEYS = ["amount", "currency", "goalName", "date", "note"];

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

export function geminiBody(sourceText: string, context: ParseContext): Record<string, unknown> {
  const expenseSchema = {
    type: "object",
    additionalProperties: false,
    required: ITEM_KEYS,
    properties: {
      amount: { type: "number" },
      priceBasis: { type: "string", enum: ["per_item", "total"] },
      currency: { type: ["string", "null"] },
      description: { type: "string" },
      quantity: { type: ["number", "null"] },
      date: { type: ["string", "null"] },
      category: { type: "string" },
      paymentMethod: { type: ["string", "null"] },
    },
  };
  const amount = { type: "number" };
  const nullableCurrency = { type: ["string", "null"] };
  const nullableDate = { type: ["string", "null"] };
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["expenses", "incomes", "goals", "contributions"],
    properties: {
      expenses: {
        type: "array",
        items: expenseSchema,
      },
      incomes: {
        type: "array",
        items: {
          type: "object", additionalProperties: false, required: INCOME_KEYS,
          properties: { amount, currency: nullableCurrency, note: { type: "string" }, date: nullableDate },
        },
      },
      goals: {
        type: "array",
        items: {
          type: "object", additionalProperties: false, required: GOAL_KEYS,
          properties: { name: { type: "string" }, targetAmount: { type: ["number", "null"] }, currency: nullableCurrency, deadline: nullableDate },
        },
      },
      contributions: {
        type: "array",
        items: {
          type: "object", additionalProperties: false, required: CONTRIBUTION_KEYS,
          properties: { amount, currency: nullableCurrency, goalName: { type: "string" }, date: nullableDate, note: { type: "string" } },
        },
      },
    },
  };

  return {
    systemInstruction: {
      parts: [{
        text: [
          "Extract only expenses, income, savings goals, and goal deposits explicitly described in the user's text. Never invent money or an action.",
          "Return all four arrays, using empty arrays when an action type is absent. Return empty arrays for everything when the note has no clear money action.",
          "For expenses, priceBasis is per_item when the written amount is a unit price, and total when the note explicitly says that amount is the total. For example, 'Coffee 7$ 2x' is amount 7, quantity 2, priceBasis per_item; Nola will calculate the total as 14. '2 coffees for 7$ total' is amount 7, quantity 2, priceBasis total.",
          "Spaces in grouped numbers are thousands separators, so 150 000 means 150000.",
          `Assume ${context.profileCurrency} when interpreting an amount with no currency, but return null for currency when it is not explicit.`,
          `For each action, convert an explicit date to ISO YYYY-MM-DD; D.M.YY, DD.MM.YY, and DD.MM.YYYY are valid written forms. A date at the end of a line applies only to that line and never carries to the next. Use null when no date is written; Nola will use ${context.localDate}. For a goal deadline written as a month and year, use the last calendar day of that month (April 2027 is 2027-04-30).`,
          "An income action needs an explicit income cue such as salary, income, paid, or received. Preserve its source as the note, for example '2000$ income salary' becomes a 2000 USD income with note 'salary'.",
          "Create a goal only when the text explicitly asks for a new goal. If it has no target amount, include the goal with targetAmount null so Nola can ask for the target before saving any actions.",
          "A goal deposit must name the goal the user refers to. Use the exact name phrase from the note as goalName; do not invent or create a goal for a deposit.",
          "Goal names are resolved against this user's existing active goals by Nola after the model responds; do not assume goal details that are not in the note.",
          "Choose the closest category name from the supplied categories, or return 'Other' when none fits.",
          "Use a supplied payment method name when stated; otherwise return null.",
          "Keep descriptions and notes concise and preserve the user's wording.",
        ].join(" "),
      }],
    },
    contents: [{
      role: "user",
      parts: [{
        text: JSON.stringify({
          sourceText,
          localDate: context.localDate,
          timeZone: context.timeZone,
          profileCurrency: context.profileCurrency,
          categories: context.categories.map((category) => category.name),
          paymentMethods: context.paymentMethods.map((method) => method.name),
        }),
      }],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1800,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  };
}

function validMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT
    && Math.abs(Math.round(value * 100) / 100 - value) <= 1e-8;
}

function validCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value);
}

function isExactObject(value: unknown, keys: string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length === keys.length
    && keys.every((key) => key in value) && Object.keys(value).every((key) => keys.includes(key));
}

function normalizedGoalName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\b(?:my|the|a|an)\b/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function matchGoal(name: string, goals: Array<{ id: string; name: string; currency: string }>) {
  const target = normalizedGoalName(name);
  const exact = goals.filter((goal) => normalizedGoalName(goal.name) === target);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new ParsedResponseError("goal_ambiguous", "The note matches more than one savings goal.");
  const partial = goals.filter((goal) => {
    const candidate = normalizedGoalName(goal.name);
    return target.length >= 3 && (candidate.includes(target) || target.includes(candidate));
  });
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new ParsedResponseError("goal_ambiguous", "The note matches more than one savings goal.");
  throw new ParsedResponseError("goal_not_found", "The savings goal in this note could not be found.");
}

export function validateParsedActions(
  raw: unknown,
  context: ParseContext,
  createId: () => string = () => globalThis.crypto.randomUUID(),
): ParsedCaptureAction[] {
  if (!isValidLocalDate(context.localDate) || !isValidTimeZone(context.timeZone)
    || !/^[A-Z]{3}$/.test(context.profileCurrency)
    || !context.categories.length || !context.paymentMethods.length || !Array.isArray(context.savingsGoals)) {
    throw new ParsedResponseError("invalid_context", "The spending parser context is incomplete.");
  }

  const responseKeys = ["expenses", "incomes", "goals", "contributions"];
  if (!isExactObject(raw, responseKeys) || responseKeys.some((key) => !Array.isArray(raw[key]))) {
    return invalidResponse("The model response does not match the spending schema.");
  }
  const expenseItems = raw.expenses as unknown[];
  const incomeItems = raw.incomes as unknown[];
  const goalItems = raw.goals as unknown[];
  const contributionItems = raw.contributions as unknown[];
  if (expenseItems.length + incomeItems.length + goalItems.length + contributionItems.length > MAX_ITEMS) {
    return invalidResponse("The model returned too many money actions.");
  }
  if (goalItems.some((item) => isRecord(item) && item.targetAmount === null)) {
    throw new ParsedResponseError("goal_target_required", "Ask the user for a target before creating this goal.");
  }
  if (!expenseItems.length && !incomeItems.length && !goalItems.length && !contributionItems.length) {
    throw new ParsedResponseError("empty_result", "No clear money action was found. Add an amount and try again.");
  }

  const otherCategory = context.categories.find((category) => normalizedName(category.name) === "other");
  if (!otherCategory) throw new ParsedResponseError("invalid_context", "The Other category is unavailable.");

  const actions: ParsedCaptureAction[] = [];
  for (const value of goalItems) {
    if (!isExactObject(value, GOAL_KEYS)) return invalidResponse("A savings goal does not match the required schema.");
    const name = value.name;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80) return invalidResponse("A savings goal name is invalid.");
    if (!validMoney(value.targetAmount)) return invalidResponse("A savings goal target is invalid.");
    if (value.currency !== null && (!validCurrency(value.currency) || !(SUPPORTED_CURRENCIES as readonly string[]).includes(value.currency.toUpperCase()))) return invalidResponse("A savings goal currency is invalid.");
    if (value.deadline !== null && (typeof value.deadline !== "string" || !isValidLocalDate(value.deadline))) return invalidResponse("A savings goal deadline is invalid.");
    actions.push({
      type: "goal", id: createId(), name: name.trim(), targetAmount: value.targetAmount,
      currency: typeof value.currency === "string" ? value.currency.toUpperCase() : context.profileCurrency,
      icon: "wallet", deadline: value.deadline as string | null,
    });
  }

  const createdGoals = actions.flatMap((action) => action.type === "goal" ? [{ id: action.id, name: action.name, currency: action.currency }] : []);
  const otherGoals = context.savingsGoals.filter((goal) => typeof goal.id === "string" && typeof goal.name === "string" && validCurrency(goal.currency));

  for (const value of expenseItems) {
    if (!isExactObject(value, ITEM_KEYS)) {
      return invalidResponse("A spending item does not match the required schema.");
    }

    const unitOrTotal = value.amount;
    if (!validMoney(unitOrTotal)) {
      return invalidResponse("A spending amount is invalid.");
    }

    if (value.priceBasis !== "per_item" && value.priceBasis !== "total") return invalidResponse("A price basis is invalid.");
    const quantity = value.quantity;
    if (quantity !== null && (typeof quantity !== "number" || !Number.isFinite(quantity)
      || quantity <= 0 || quantity > MAX_QUANTITY || Math.abs(Math.round(quantity * 1000) / 1000 - quantity) > 1e-8)) {
      return invalidResponse("A spending quantity is invalid.");
    }
    if (value.priceBasis === "per_item" && quantity === null) return invalidResponse("A per-item price needs a quantity.");

    const amount = Math.round(unitOrTotal * (value.priceBasis === "per_item" ? quantity as number : 1) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return invalidResponse("The calculated spending total is invalid.");

    const description = value.description;
    if (typeof description !== "string" || !description.trim() || description.length > 160) {
      return invalidResponse("A spending description is invalid.");
    }

    const rawCurrency = value.currency;
    if (rawCurrency !== null && !validCurrency(rawCurrency)) {
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

    actions.push({
      type: "expense",
      id: createId(),
      amount,
      currency: typeof rawCurrency === "string" ? rawCurrency.toUpperCase() : context.profileCurrency,
      description: description.trim(),
      quantity,
      spentAt: localDateToIso(date, context.timeZone),
      categoryId: category.id,
      paymentMethodId,
      tagIds: [],
    });
  }

  for (const value of incomeItems) {
    if (!isExactObject(value, INCOME_KEYS)) return invalidResponse("An income does not match the required schema.");
    if (!validMoney(value.amount)) return invalidResponse("An income amount is invalid.");
    if (value.currency !== null && !validCurrency(value.currency)) return invalidResponse("An income currency is invalid.");
    if (typeof value.note !== "string" || value.note.length > 160) return invalidResponse("An income note is invalid.");
    if (value.date !== null && (typeof value.date !== "string" || !isValidLocalDate(value.date))) return invalidResponse("An income date is invalid.");
    actions.push({
      type: "income", id: createId(), amount: value.amount,
      currency: typeof value.currency === "string" ? value.currency.toUpperCase() : context.profileCurrency,
      receivedAt: localDateToIso((value.date as string | null) ?? context.localDate, context.timeZone), note: value.note.trim(),
    });
  }

  const goals = [...otherGoals, ...createdGoals];
  for (const value of contributionItems) {
    if (!isExactObject(value, CONTRIBUTION_KEYS)) return invalidResponse("A goal contribution does not match the required schema.");
    if (!validMoney(value.amount)) return invalidResponse("A contribution amount is invalid.");
    if (value.currency !== null && !validCurrency(value.currency)) return invalidResponse("A contribution currency is invalid.");
    if (typeof value.goalName !== "string" || !value.goalName.trim() || value.goalName.length > 80) return invalidResponse("A contribution goal name is invalid.");
    if (value.date !== null && (typeof value.date !== "string" || !isValidLocalDate(value.date))) return invalidResponse("A contribution date is invalid.");
    if (typeof value.note !== "string" || value.note.length > 160) return invalidResponse("A contribution note is invalid.");
    const goal = matchGoal(value.goalName, goals);
    const currency = typeof value.currency === "string" ? value.currency.toUpperCase() : goal.currency;
    if (currency !== goal.currency) return invalidResponse("A contribution currency does not match its goal.");
    actions.push({
      type: "contribution", id: createId(), goalId: goal.id, amount: value.amount, currency,
      kind: "deposit", occurredOn: (value.date as string | null) ?? context.localDate, note: value.note.trim(),
    });
  }

  if (new Set(actions.map((action) => action.id)).size !== actions.length) return invalidResponse("The model generated duplicate action IDs.");
  return actions;
}
