import type { ParsedCaptureItem, SpendingCapture } from "./types.ts";
import { OpenRouterHttpError } from "./openrouter-error.ts";
import {
  openRouterBody,
  ParsedResponseError,
  validateParsedItems,
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

function cachedItems(value: unknown): value is ParsedCaptureItem[] {
  if (!Array.isArray(value) || !value.length || value.length > 25) return false;
  const ids = new Set<string>();
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<ParsedCaptureItem>;
    if (typeof candidate.id !== "string" || !candidate.id || ids.has(candidate.id)
      || typeof candidate.amount !== "number" || !Number.isFinite(candidate.amount) || candidate.amount <= 0
      || typeof candidate.currency !== "string" || !/^[A-Z]{3}$/.test(candidate.currency)
      || typeof candidate.description !== "string" || !candidate.description.trim() || candidate.description.length > 160
      || (candidate.quantity !== null && (typeof candidate.quantity !== "number" || !Number.isFinite(candidate.quantity) || candidate.quantity <= 0))
      || typeof candidate.spentAt !== "string" || !Number.isFinite(Date.parse(candidate.spentAt))
      || typeof candidate.categoryId !== "string" || !candidate.categoryId
      || typeof candidate.paymentMethodId !== "string" || !candidate.paymentMethodId
      || !Array.isArray(candidate.tagIds) || !candidate.tagIds.every((tag) => typeof tag === "string")) return false;
    ids.add(candidate.id);
    return true;
  });
}

function providerItems(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const result = value as Record<string, unknown>;
  if ("items" in result) return result;
  const choices = result.choices;
  if (!Array.isArray(choices) || !choices.length || !choices[0] || typeof choices[0] !== "object") return value;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return value;
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== "string") return value;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new ParsedResponseError("invalid_response", "The model returned malformed JSON.");
  }
}

export async function parseSpendingCapture(
  input: ParseRequest,
  deps: ParseDependencies,
  context: ParseContext,
): Promise<ParsedCaptureItem[]> {
  let response: unknown;
  try {
    response = await deps.requestOpenRouter(openRouterBody(input.sourceText, context, deps.model));
  } catch (error) {
    if (error instanceof OpenRouterHttpError) {
      if (error.status === 401 || error.status === 403) {
        throw new SpendingParseError("provider_auth", "OpenRouter rejected the server API key. Replace it in the server configuration.", 502);
      }
      if (error.status === 402) {
        throw new SpendingParseError("provider_payment", "OpenRouter rejected this request for billing or credits. Check the account and free-model limits.", 502);
      }
      if (error.status === 429) {
        throw new SpendingParseError("provider_rate_limited", "OpenRouter is rate limiting requests. Wait a little and retry.", 429);
      }
      if (error.status === 400 || error.status === 404 || error.status === 422) {
        throw new SpendingParseError("provider_model", "The configured OpenRouter model could not accept this parser request. Check its structured-output support.", 502);
      }
    }
    throw new SpendingParseError("provider_failure", "The spending parser is temporarily unavailable. Try again.", 502);
  }

  try {
    return validateParsedItems(providerItems(response), context, deps.createId);
  } catch (error) {
    if (error instanceof ParsedResponseError && error.code === "empty_result") {
      throw new SpendingParseError("empty_result", error.message, 422);
    }
    if (error instanceof ParsedResponseError && error.code === "invalid_context") {
      throw new SpendingParseError("service_unavailable", "Your spending settings could not be loaded. Try again.", 503);
    }
    throw new SpendingParseError("invalid_model_response", "The parser could not validate this result. Edit the text and try again.", 502);
  }
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

    if (!deps.isOpenRouterConfigured()) {
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

    let items: ParsedCaptureItem[];
    try {
      items = await parseSpendingCapture(input, deps, context);
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
