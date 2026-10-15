import {
  createRequestSupabaseClient,
  createSupabaseParseDependencies,
  getBearerAccessToken,
} from "@/lib/supabase-server";
import { createSpendingParseHandler } from "@/lib/spending-parse-service";
import { parseNetworkFingerprint } from "@/lib/parse-network-fingerprint";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function response(status: number, error: string, message: string) {
  return Response.json({ error, message }, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const accessToken = getBearerAccessToken(request);
  if (!accessToken) return response(401, "unauthenticated", "Sign in to parse spending text.");

  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const networkFingerprint = parseNetworkFingerprint(request, openRouterApiKey, process.env.VERCEL === "1");
  if (!networkFingerprint) return response(503, "service_unavailable", "Spending parsing is not available right now.");

  let client;
  try {
    client = createRequestSupabaseClient(accessToken);
  } catch {
    return response(503, "service_unavailable", "Spending parsing is not available right now.");
  }

  const dependencies = createSupabaseParseDependencies(client, {
    openRouterApiKey,
    model: process.env.OPENROUTER_MODEL,
    networkFingerprint,
  });
  return createSpendingParseHandler(dependencies)(request);
}
