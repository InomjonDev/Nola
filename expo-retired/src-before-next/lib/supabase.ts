import "react-native-url-polyfill/auto";

import { createClient, type Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { secureStorage } from "@/lib/secure-storage";

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes("your-project") && !supabaseKey.includes("your-") && !supabaseKey.includes("copy-from"));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

export function getAuthRedirectUri() {
  return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || makeRedirectUri({ scheme: "walletly", path: "auth/callback" });
}

function getCallbackParams(url: string) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const query = parsed.searchParams;
  return {
    code: query.get("code") ?? hash.get("code"),
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    error: query.get("error") ?? hash.get("error"),
    errorDescription: query.get("error_description") ?? hash.get("error_description"),
  };
}

export async function finishAuthCallback(url: string): Promise<Session | null> {
  if (!supabase) throw new Error("Add Supabase credentials to .env before using authentication.");
  const params = getCallbackParams(url);
  if (params.error) throw new Error(params.errorDescription || params.error);
  if (params.accessToken && params.refreshToken) {
    const result = await supabase.auth.setSession({ access_token: params.accessToken, refresh_token: params.refreshToken });
    if (result.error) throw result.error;
    return result.data.session;
  }
  if (!params.code) throw new Error("The authentication response did not include a valid authorization code.");
  const result = await supabase.auth.exchangeCodeForSession(params.code);
  if (result.error) throw result.error;
  return result.data.session;
}

export async function signInWithProvider(provider: "google") {
  if (!supabase) throw new Error("Add Supabase credentials to .env before using social sign-in.");
  const redirectTo = getAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("The authentication provider did not return a sign-in URL.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return null;
  return finishAuthCallback(result.url);
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error("Add Supabase credentials to .env before using email authentication.");
  const result = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAuthRedirectUri(), shouldCreateUser: true },
  });
  if (result.error) throw result.error;
}
