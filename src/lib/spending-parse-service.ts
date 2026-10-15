import { SUPPORTED_CURRENCIES } from "./constants.ts";
import type { ParsedCaptureAction, SpendingCapture } from "./types.ts";
import { GeminiHttpError } from "./gemini-error.ts";
import {
  geminiBody,
  ParsedResponseError,
  validateParsedActions,
  type ParseContext,
  type ParseDependencies,
  type ParseRequest,
} from "./spending-parser.ts";

export type SpendingParseErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "consent_required"
  | "stale_revision"
  | "source_conflict"
  | "capture_not_synced"
  | "text_too_long"
  | "rate_limited"
  | "not_configured"
  | "provider_failure"
  | "provider_auth"
  | "provider_payment"
  | "provider_rate_limited"
  | "provider_model"
  | "invalid_model_response"
  | "empty_result"
  | "goal_target_required"
  | "goal_not_found"
  | "goal_ambiguous"
  | "service_unavailable";

export class SpendingParseError extends Error {
  readonly name = "SpendingParseError";
  readonly code: SpendingParseErrorCode;
  readonly status: number;

  constructor(code: SpendingParseErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const MAX_SOURCE_LENGTH = 4000;
const MAX_REQUEST_BYTES = 32 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, value: Record<string, unknown>) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const advertisedLength = request.headers.get("content-length");
  if (advertisedLength && /^\d+$/.test(advertisedLength) && Number(advertisedLength) > MAX_REQUEST_BYTES) {
    throw new SpendingParseError("text_too_long", "The spending request is too large.", 413);
  }

  const reader = request.body?.getReader();
  if (!reader) throw new SpendingParseError("invalid_request", "Send a valid JSON spending capture request.", 400);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_REQUEST_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new SpendingParseError("text_too_long", "The spending request is too large.", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof SpendingParseError) throw error;
    throw new SpendingParseError("invalid_request", "Send a valid JSON spending capture request.", 400);
  }
}

function parseRequestBody(value: unknown): ParseRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SpendingParseError("invalid_request", "Send a valid spending capture request.", 400);
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["captureId", "parseRevision", "sourceText", "localDate", "timeZone"].includes(key))) {
    throw new SpendingParseError("invalid_request", "The spending capture request contains unsupported fields.", 400);
  }
  if (typeof body.captureId !== "string" || !UUID_PATTERN.test(body.captureId)) {
    throw new SpendingParseError("invalid_request", "A valid capture ID is required.", 400);
  }
  if (typeof body.parseRevision !== "number" || !Number.isSafeInteger(body.parseRevision)
    || body.parseRevision < 1 || body.parseRevision > 2_147_483_647) {
    throw new SpendingParseError("invalid_request", "A valid parse revision is required.", 400);
  }
  if (typeof body.sourceText !== "string" || !body.sourceText.trim() || body.sourceText.includes("\0")) {
    throw new SpendingParseError("invalid_request", "Add spending text before parsing.", 400);
  }
  if (body.sourceText.length > MAX_SOURCE_LENGTH) {
    throw new SpendingParseError("text_too_long", "Spending text must be 4,000 characters or fewer.", 413);
  }
  if (typeof body.localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.localDate)
    || !Number.isFinite(Date.parse(`${body.localDate}T00:00:00Z`))
    || new Date(`${body.localDate}T00:00:00Z`).toISOString().slice(0, 10) !== body.localDate) {
    throw new SpendingParseError("invalid_request", "A valid local date is required.", 400);
  }
  if (typeof body.timeZone !== "string" || body.timeZone.length > 100) {
    throw new SpendingParseError("invalid_request", "A valid timezone is required.", 400);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone }).format(0);
  } catch {
    throw new SpendingParseError("invalid_request", "A valid timezone is required.", 400);
  }

  return {
    captureId: body.captureId,
    parseRevision: body.parseRevision,
    sourceText: body.sourceText,
    localDate: body.localDate,
    timeZone: body.timeZone,
  };
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

function cachedItems(value: unknown): value is ParsedCaptureAction[] {
  if (!Array.isArray(value) || !value.length || value.length > 25) return false;
  const ids = new Set<string>();
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Record<string, unknown>;
    const id = candidate.id;
    const currency = candidate.currency;
    const amount = candidate.type === "goal" ? candidate.targetAmount : candidate.amount;
    if (typeof id !== "string" || !id || ids.has(id) || typeof currency !== "string"
      || !/^[A-Z]{3}$/.test(currency)
      || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return false;
    if (candidate.type === "income") {
      if (typeof candidate.note !== "string" || candidate.note.length > 160 || typeof candidate.receivedAt !== "string" || !Number.isFinite(Date.parse(candidate.receivedAt))) return false;
    } else if (candidate.type === "goal") {
      if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
        || typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 80
        || typeof candidate.icon !== "string" || !["wallet", "plane", "home", "car", "gift", "briefcase", "heart-pulse", "shopping-bag"].includes(candidate.icon)
        || (candidate.deadline !== null && (typeof candidate.deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.deadline)))) return false;
    } else if (candidate.type === "contribution") {
      if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
        || typeof candidate.goalId !== "string" || !candidate.goalId || candidate.kind !== "deposit"
        || typeof candidate.occurredOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.occurredOn)
        || typeof candidate.note !== "string" || candidate.note.length > 160) return false;
    } else if (candidate.type === undefined || candidate.type === "expense") {
      if (typeof candidate.description !== "string" || !candidate.description.trim() || candidate.description.length > 160
        || (candidate.quantity !== null && (typeof candidate.quantity !== "number" || !Number.isFinite(candidate.quantity) || candidate.quantity <= 0))
        || typeof candidate.spentAt !== "string" || !Number.isFinite(Date.parse(candidate.spentAt))
        || typeof candidate.categoryId !== "string" || !candidate.categoryId
        || typeof candidate.paymentMethodId !== "string" || !candidate.paymentMethodId
        || !Array.isArray(candidate.tagIds) || !candidate.tagIds.every((tag) => typeof tag === "string")) return false;
    } else return false;
    ids.add(id);
    return true;
  });
}

function geminiItems(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const candidates = (value as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") return value;
  const content = (candidates[0] as Record<string, unknown>).content;
  if (!content || typeof content !== "object") return value;
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return value;
  const text = parts.flatMap((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) return [];
    const responsePart = part as Record<string, unknown>;
    return responsePart.thought !== true && typeof responsePart.text === "string" ? [responsePart.text] : [];
  }).join("");
  if (!text) return value;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ParsedResponseError("invalid_response", "The model returned malformed JSON.");
  }
}

export async function parseSpendingCapture(
  input: ParseRequest,
  deps: ParseDependencies,
  context: ParseContext,
): Promise<ParsedCaptureAction[]> {
  let response: unknown;
  try {
    response = await deps.requestGemini(geminiBody(input.sourceText, context));
  } catch (error) {
    if (error instanceof GeminiHttpError) {
      if (error.status === 401 || error.status === 403) {
        throw new SpendingParseError("provider_auth", "Gemini rejected the server API key. Replace it in the server configuration.", 502);
      }
      if (error.status === 402) {
        throw new SpendingParseError("provider_payment", "Gemini rejected this request for billing. Check the project tier.", 502);
      }
      if (error.status === 429) {
        throw new SpendingParseError("provider_rate_limited", "Gemini is rate limiting requests. Wait a little and retry.", 429);
      }
      if (error.status === 400 || error.status === 404 || error.status === 422) {
        throw new SpendingParseError("provider_model", "Gemini could not accept this parser request. Check the configured model and response schema.", 502);
      }
    }
    throw new SpendingParseError("provider_failure", "The spending parser is temporarily unavailable. Try again.", 502);
  }

  try {
    return validateParsedActions(geminiItems(response), context, deps.createId);
  } catch (error) {
    if (error instanceof ParsedResponseError && error.code === "empty_result") {
      throw new SpendingParseError("empty_result", error.message, 422);
    }
    if (error instanceof ParsedResponseError && error.code === "goal_target_required") {
      throw new SpendingParseError("goal_target_required", error.message, 422);
    }
    if (error instanceof ParsedResponseError && error.code === "goal_not_found") {
      throw new SpendingParseError("goal_not_found", error.message, 422);
    }
    if (error instanceof ParsedResponseError && error.code === "goal_ambiguous") {
      throw new SpendingParseError("goal_ambiguous", error.message, 422);
    }
    if (error instanceof ParsedResponseError && error.code === "invalid_context") {
      throw new SpendingParseError("service_unavailable", "Your spending settings could not be loaded. Try again.", 503);
    }
    throw new SpendingParseError("invalid_model_response", "The parser could not validate this result. Edit the text and try again.", 502);
  }
}

function preserveCaptureGoalIds(previous: SpendingCapture["parsedItems"], actions: ParsedCaptureAction[], activeGoals: ParseContext["savingsGoals"]) {
  const previousGoals = (previous ?? []).filter((item): item is Extract<ParsedCaptureAction, { type: "goal" }> => item.type === "goal" && activeGoals.some((goal) => goal.id === item.id));
  const goalIds = new Map<string, string>();
  for (const action of actions) {
    if (action.type !== "goal") continue;
    const match = previousGoals.find((goal) => goal.name.trim().normalize("NFKC").toLocaleLowerCase("en-US")
      === action.name.trim().normalize("NFKC").toLocaleLowerCase("en-US"));
    if (match) goalIds.set(action.id, match.id);
  }
  return actions.map((action): ParsedCaptureAction => action.type === "goal" && goalIds.has(action.id)
    ? { ...action, id: goalIds.get(action.id)! }
    : action.type === "contribution" && goalIds.has(action.goalId)
      ? { ...action, goalId: goalIds.get(action.goalId)! }
      : action);
}

function parseErrorResponse(error: unknown) {
  if (error instanceof SpendingParseError) {
    return jsonResponse(error.status, { error: error.code, message: error.message });
  }
  return jsonResponse(503, { error: "service_unavailable", message: "Spending parsing is temporarily unavailable. Try again." });
}

function nextClientTimestamp(previous: string, now: string) {
  const previousTime = Date.parse(previous);
  const currentTime = Date.parse(now);
  return new Date(Math.max(Number.isFinite(currentTime) ? currentTime : Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
}

function conflictResponse(message = "This spending note changed. Refresh it and try again.") {
  return parseErrorResponse(new SpendingParseError("stale_revision", message, 409));
}

async function markRetryIfCurrent(userId: string, capture: SpendingCapture, deps: ParseDependencies) {
  const updatedAt = nextClientTimestamp(capture.updatedAt, deps.now());
  const didUpdate = await deps.updateCaptureIfCurrent(userId, capture, {
    parseStatus: "needs_retry",
    updatedAt,
  });
  if (didUpdate) return { ...capture, parseStatus: "needs_retry" as const, updatedAt };
  return null;
}

export function createSpendingParseHandler(deps: ParseDependencies) {
  return async function POST(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "method_not_allowed", message: "Use POST to parse spending text." });
    }

    const token = bearerToken(request);
    if (!token) return parseErrorResponse(new SpendingParseError("unauthenticated", "Sign in to parse spending text.", 401));

    let userId: string;
    try {
      const identity = await deps.authenticate(token);
      if (!identity?.userId) throw new SpendingParseError("unauthenticated", "Your session is invalid. Sign in again.", 401);
      userId = identity.userId;
    } catch (error) {
      return parseErrorResponse(error instanceof SpendingParseError ? error : new SpendingParseError("unauthenticated", "Your session is invalid. Sign in again.", 401));
    }

    let input: ParseRequest;
    try {
      input = parseRequestBody(await readJsonBody(request));
    } catch (error) {
      return parseErrorResponse(error);
    }

    let consentEnabled: boolean;
    try {
      consentEnabled = await deps.readAiConsent(userId);
    } catch {
      return parseErrorResponse(new SpendingParseError("service_unavailable", "Your spending settings could not be loaded. Try again.", 503));
    }
    if (!consentEnabled) {
      return parseErrorResponse(new SpendingParseError("consent_required", "Enable AI spending parsing in Settings before using this feature.", 403));
    }

    let capture: SpendingCapture | null;
    try {
      capture = await deps.readCapture(userId, input.captureId);
    } catch {
      return parseErrorResponse(new SpendingParseError("service_unavailable", "This spending note could not be loaded. Try again.", 503));
    }
    if (!capture) {
      return parseErrorResponse(new SpendingParseError("capture_not_synced", "Sync this spending note before parsing it.", 409));
    }

    if (capture.deletedAt || input.parseRevision < capture.parseRevision) {
      return parseErrorResponse(new SpendingParseError("stale_revision", "This spending note changed. Refresh it and try again.", 409));
    }
    if (input.parseRevision === capture.parseRevision && input.sourceText !== capture.sourceText) {
      return parseErrorResponse(new SpendingParseError("source_conflict", "The spending note text changed. Refresh it and try again.", 409));
    }
    if (input.parseRevision === capture.parseRevision && capture.parsedRevision === input.parseRevision
      && input.sourceText === capture.sourceText && cachedItems(capture.parsedItems)) {
      return jsonResponse(200, { captureId: input.captureId, parseRevision: input.parseRevision, items: capture.parsedItems });
    }

    let context: ParseContext;
    try {
      context = await deps.readParseContext(userId, input.localDate, input.timeZone);
    } catch {
      return parseErrorResponse(new SpendingParseError("service_unavailable", "Your spending settings could not be loaded. Try again.", 503));
    }

    const previousCapture = capture;
    const processingUpdate = {
      ...(input.parseRevision > capture.parseRevision
        ? { parseRevision: input.parseRevision, sourceText: input.sourceText }
        : {}),
      parseStatus: "processing" as const,
      updatedAt: nextClientTimestamp(capture.updatedAt, deps.now()),
    };
    try {
      const didStart = await deps.updateCaptureIfCurrent(userId, previousCapture, processingUpdate);
      if (!didStart) return conflictResponse();
      capture = { ...previousCapture, ...processingUpdate };
    } catch {
      return parseErrorResponse(new SpendingParseError("service_unavailable", "This spending note could not be prepared for parsing. Try again.", 503));
    }

    if (!deps.isGeminiConfigured()) {
      try {
        if (!await markRetryIfCurrent(userId, capture, deps)) return conflictResponse();
      } catch {
        return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending note could not be marked for retry.", 503));
      }
      return parseErrorResponse(new SpendingParseError("not_configured", "AI spending parsing is not configured on this server.", 503));
    }

    let quotaAvailable: boolean;
    try {
      quotaAvailable = await deps.consumeQuota(userId);
    } catch {
      try {
        if (!await markRetryIfCurrent(userId, capture, deps)) return conflictResponse();
      } catch {
        return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending note could not be marked for retry.", 503));
      }
      return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending parser is temporarily unavailable. Try again.", 503));
    }
    if (!quotaAvailable) {
      try {
        if (!await markRetryIfCurrent(userId, capture, deps)) return conflictResponse();
      } catch {
        return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending note could not be marked for retry.", 503));
      }
      return parseErrorResponse(new SpendingParseError("rate_limited", "The AI spending limit has been reached. Try again later. Your note is safe.", 429));
    }

    let items: ParsedCaptureAction[];
    try {
      items = preserveCaptureGoalIds(capture.parsedItems, await parseSpendingCapture(input, deps, context), context.savingsGoals);
    } catch (error) {
      try {
        if (!await markRetryIfCurrent(userId, capture, deps)) return conflictResponse();
      } catch {
        return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending note could not be marked for retry.", 503));
      }
      if (error instanceof SpendingParseError) return parseErrorResponse(error);
      return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending result could not be saved. Try again.", 503));
    }

    const finalizeUpdate = {
      parseStatus: "parsed" as const,
      parsedRevision: input.parseRevision,
      parsedItems: items,
      updatedAt: nextClientTimestamp(capture.updatedAt, deps.now()),
    };
    try {
      const didFinalize = await deps.updateCaptureIfCurrent(userId, capture, finalizeUpdate);
      if (!didFinalize) return conflictResponse();
    } catch {
      try { await markRetryIfCurrent(userId, capture, deps); } catch { /* the original note remains available for retry */ }
      return parseErrorResponse(new SpendingParseError("service_unavailable", "The spending result could not be saved. Try again.", 503));
    }
    return jsonResponse(200, { captureId: input.captureId, parseRevision: input.parseRevision, items });
  };
}
