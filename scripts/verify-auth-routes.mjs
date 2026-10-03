import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const origin = (process.env.AUTH_VERIFY_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
if (!url || !key) {
  console.error("Auth route verification needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const oauthRedirectTo = `${origin}/auth/callback`;
const emailRedirectTo = `${origin}/auth/confirm`;
const oauth = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: oauthRedirectTo, skipBrowserRedirect: true } });
if (oauth.error) {
  console.error(`Google OAuth verification failed: ${oauth.error.message}`);
  process.exit(1);
}
const oauthUrl = new URL(oauth.data.url);
if (oauthUrl.searchParams.get("redirect_to") !== oauthRedirectTo) {
  console.error("Google OAuth returned an unexpected callback URL.");
  process.exit(1);
}
console.log(`Google OAuth callback verified for ${origin}.`);

const email = process.env.AUTH_TEST_EMAIL?.trim();
if (!email) {
  console.log("Email-link delivery skipped. Set AUTH_TEST_EMAIL to a dedicated test mailbox to send a real link.");
  process.exit(0);
}

const linkRequest = await client.auth.signInWithOtp({
  email: email.toLowerCase(),
  options: { emailRedirectTo, shouldCreateUser: true },
});
if (linkRequest.error) {
  console.error(`Email-link request failed: ${linkRequest.error.message}`);
  process.exit(1);
}
console.log(`Email-link request accepted for the dedicated test mailbox with redirect ${emailRedirectTo}.`);
console.log("Open the received link to complete the real delivery and session check; this script does not read mailbox contents or print credentials.");
