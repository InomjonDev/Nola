import {
  createRequestSupabaseClient,
  createSupabaseParseDependencies,
  getBearerAccessToken,
} from "@/lib/supabase-server";
import { createSpendingParseHandler } from "@/lib/spending-parse-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function response(status: number, error: string, message: string) {
  return Response.json({ error, message }, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const accessToken = getBearerAccessToken(request);
  if (!accessToken) return response(401, "unauthenticated", "Sign in to parse spending text.");

  let client;
  try {
    client = createRequestSupabaseClient(accessToken);
  } catch {
    return response(503, "service_unavailable", "Spending parsing is not available right now.");
  }

  const dependencies = createSupabaseParseDependencies(client, {
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL,
  });
  return createSpendingParseHandler(dependencies)(request);
}
