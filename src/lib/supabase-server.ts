import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { toSpendingCapture } from "./mappers.ts";
import type { ParseContext, ParseDependencies } from "./spending-parser.ts";

export function getBearerAccessToken(request: Request) {
  const value = request.headers.get("authorization")?.trim() ?? "";
  return /^Bearer\s+([^\s]+)$/i.exec(value)?.[1] ?? null;
}

export function createRequestSupabaseClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) throw new Error("Supabase server authentication is not configured.");

  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseParseDependencies(
  client: SupabaseClient,
  configuration: { openRouterApiKey?: string; model?: string },
): ParseDependencies {
  const apiKey = configuration.openRouterApiKey?.trim() ?? "";
  const model = configuration.model?.trim() ?? "";

  return {
    model,
    authenticate: async (accessToken) => {
      const { data, error } = await client.auth.getUser(accessToken);
      if (error || !data.user) return null;
      return { userId: data.user.id };
    },
    readAiConsent: async (userId) => {
      const { data, error } = await client.from("profiles")
        .select("ai_parsing_enabled")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.ai_parsing_enabled === true;
    },
    readCapture: async (userId, captureId) => {
      const { data, error } = await client.from("spending_captures")
        .select("*")
        .eq("id", captureId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? toSpendingCapture(data as Record<string, unknown>) : null;
    },
    updateCaptureIfCurrent: async (userId, expected, update) => {
      const values: Record<string, unknown> = {
        parse_status: update.parseStatus,
        client_updated_at: update.updatedAt,
      };
      if ("sourceText" in update) values.source_text = update.sourceText;
      if ("parseRevision" in update) values.parse_revision = update.parseRevision;
      if ("parsedRevision" in update) values.parsed_revision = update.parsedRevision;
      if ("parsedItems" in update) values.parsed_items = update.parsedItems;

      const { data, error } = await client.from("spending_captures")
        .update(values)
        .eq("id", expected.id)
        .eq("user_id", userId)
        .eq("parse_revision", expected.parseRevision)
        .eq("source_text", expected.sourceText)
        .eq("parse_status", expected.parseStatus)
        .is("deleted_at", null)
        .select("id,source_text,parse_revision,parse_status,parsed_revision,deleted_at")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data
        && data.id === expected.id
        && data.source_text === (update.sourceText ?? expected.sourceText)
        && Number(data.parse_revision) === (update.parseRevision ?? expected.parseRevision)
        && data.parse_status === update.parseStatus
        && data.deleted_at === null
        && (!("parsedRevision" in update) || Number(data.parsed_revision) === update.parsedRevision));
    },
    readParseContext: async (userId, localDate, timeZone): Promise<ParseContext> => {
      const [profileResult, customCategoriesResult, globalCategoriesResult, methodsResult] = await Promise.all([
        client.from("profiles").select("currency,default_payment_method_id").eq("id", userId).maybeSingle(),
        client.from("categories").select("id,name").eq("user_id", userId).eq("kind", "custom").is("archived_at", null),
        client.from("categories").select("id,name").eq("kind", "global").is("archived_at", null),
        client.from("payment_methods").select("id,name").eq("user_id", userId).is("archived_at", null),
      ]);

      if (profileResult.error || customCategoriesResult.error || globalCategoriesResult.error || methodsResult.error) {
        throw profileResult.error ?? customCategoriesResult.error ?? globalCategoriesResult.error ?? methodsResult.error;
      }
      const profile = profileResult.data;
      if (!profile) throw new Error("The authenticated profile is unavailable.");

      return {
        profileCurrency: String(profile.currency ?? ""),
        localDate,
        timeZone,
        defaultPaymentMethodId: String(profile.default_payment_method_id ?? ""),
        categories: [
          ...((customCategoriesResult.data ?? []) as Array<{ id: string; name: string }>),
          ...((globalCategoriesResult.data ?? []) as Array<{ id: string; name: string }>),
        ],
        paymentMethods: (methodsResult.data ?? []) as Array<{ id: string; name: string }>,
      };
    },
    consumeQuota: async () => {
      const { data, error } = await client.rpc("consume_spending_parse_quota");
      if (error) throw error;
      return data === true;
    },
    requestOpenRouter: async (body) => {
      if (!apiKey || !model) throw new Error("OpenRouter is not configured.");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("OpenRouter returned an unsuccessful response.");
      return await response.json() as unknown;
    },
    isOpenRouterConfigured: () => Boolean(apiKey && model),
    createId: () => globalThis.crypto.randomUUID(),
    now: () => new Date().toISOString(),
  };
}
