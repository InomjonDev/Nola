import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl
    && supabaseKey
    && !supabaseUrl.includes("your-project")
    && !supabaseKey.includes("your-")
    && !supabaseKey.includes("copy-from"),
);

export const supabaseAuthStorageKey = isSupabaseConfigured ? `sb-${new URL(supabaseUrl!).hostname.split(".")[0]}-auth-token` : undefined;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        storageKey: supabaseAuthStorageKey,
        autoRefreshToken: true,
        persistSession: true,
        // Callback routes perform the one-time exchange; automatic detection would race them.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

export function getAuthRedirectUri() {
  const explicit = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (explicit) return explicit;
  if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
  return "http://localhost:3000/auth/callback";
}

export function getEmailConfirmUri() {
  if (typeof window !== "undefined") return `${window.location.origin}/auth/confirm`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return `${siteUrl || "http://localhost:3000"}/auth/confirm`;
}

export async function finishAuthCallback(url: string): Promise<Session> {
  if (!supabase) throw new Error("Add Supabase credentials to .env.local before using authentication.");
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code")?.trim();
  const error = parsed.searchParams.get("error") ?? new URLSearchParams(parsed.hash.slice(1)).get("error");
  if (error) throw new Error(error);
  if (!code) {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!data.session) throw new Error("No sign-in code or existing session was found.");
    return data.session;
  }
  const result = await supabase.auth.exchangeCodeForSession(code);
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error("Sign-in completed without a session.");
  return result.data.session;
}

export async function signInWithProvider(provider: "google") {
  if (!supabase) throw new Error("Add Supabase credentials to .env.local before using social sign-in.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getAuthRedirectUri() },
  });
  if (error) throw error;
  return null;
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error("Add Supabase credentials to .env.local before using email authentication.");
  const normalizedEmail = email.trim().toLowerCase();
  const result = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: getEmailConfirmUri(),
      shouldCreateUser: true,
    },
  });
  if (result.error) throw result.error;
  return normalizedEmail;
}

export async function finishEmailConfirmation(url: string): Promise<Session> {
  if (!supabase) throw new Error("Add Supabase credentials to .env.local before using email authentication.");
  const parsed = new URL(url);
  const tokenHash = parsed.searchParams.get("token_hash")?.trim();
  const type = parsed.searchParams.get("type");
  if (!tokenHash || type !== "email") throw new Error("This sign-in link is invalid or incomplete.");
  const result = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error("Email confirmation completed without a session.");
  return result.data.session;
}
