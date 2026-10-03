import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv();

const target = process.env.AUTH_VALIDATION_TARGET ?? "local";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
const explicitRedirect = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL?.trim() ?? "";
const oauthRedirectUrl = explicitRedirect || `${siteUrl || "http://localhost:3000"}/auth/callback`;
const emailConfirmUrl = `${siteUrl || "http://localhost:3000"}/auth/confirm`;
const errors = [];
const authConfigPath = "supabase/config.toml";
const emailTemplates = [
  ["confirmation", "supabase/templates/confirmation.html"],
  ["magic_link", "supabase/templates/magic_link.html"],
];

function isPlaceholder(value) {
  return /your-|example\.com|copy-from|change-me|localhost:3000/.test(value.toLowerCase());
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !/^https:\/\/[^/]+\.supabase\.co$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || /copy-from|your-/.test(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
  errors.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured");
}
if (!oauthRedirectUrl.endsWith("/auth/callback")) errors.push("NEXT_PUBLIC_AUTH_REDIRECT_URL must end with /auth/callback");
if (!emailConfirmUrl.endsWith("/auth/confirm")) errors.push("The email confirmation URL must end with /auth/confirm");
if (target === "production") {
  if (!siteUrl || !siteUrl.startsWith("https://") || isPlaceholder(siteUrl)) errors.push("production NEXT_PUBLIC_SITE_URL must be a final HTTPS origin");
  if (!explicitRedirect || !explicitRedirect.startsWith("https://") || isPlaceholder(explicitRedirect)) errors.push("production NEXT_PUBLIC_AUTH_REDIRECT_URL must be a final HTTPS callback URL");
}
for (const [key, value] of Object.entries(process.env)) {
  if (/^NEXT_PUBLIC_.*(SERVICE_ROLE|SECRET|PRIVATE_KEY|ACCESS_TOKEN)/.test(key) && value) errors.push(`${key} must never be public`);
}

if (!existsSync(authConfigPath)) {
  errors.push(`${authConfigPath} must define the local email-link settings`);
} else {
  const authConfig = readFileSync(authConfigPath, "utf8");
  if (!/^otp_expiry\s*=\s*1800\s*$/m.test(authConfig)) errors.push("Supabase email-link expiry must be 1800 seconds");
  const requiredRates = {
    email_sent: 30,
    token_refresh: 150,
    sign_in_sign_ups: 30,
    token_verifications: 30,
  };
  if (!authConfig.includes("[auth.rate_limit]")) errors.push("Supabase config must define [auth.rate_limit]");
  for (const [key, value] of Object.entries(requiredRates)) {
    if (!new RegExp(`^${key}\\s*=\\s*${value}\\s*$`, "m").test(authConfig)) errors.push(`Supabase auth rate ${key} must be ${value}`);
  }
  if (!authConfig.includes('"http://localhost:3000/auth/callback"')) errors.push("Local Supabase redirects must include /auth/callback");
  if (!authConfig.includes('"http://localhost:3000/auth/confirm"')) errors.push("Local Supabase redirects must include /auth/confirm");
  for (const [templateName] of emailTemplates) {
    if (!authConfig.includes(`[auth.email.template.${templateName}]`)) errors.push(`Supabase config must register the ${templateName} email template`);
  }
}

for (const [templateName, templatePath] of emailTemplates) {
  if (!existsSync(templatePath)) {
    errors.push(`${templatePath} must contain the Walletly ${templateName} email`);
    continue;
  }
  const emailTemplate = readFileSync(templatePath, "utf8");
  if (!emailTemplate.includes("{{ .RedirectTo }}")) errors.push(`${templateName} email must include {{ .RedirectTo }}`);
  if (!emailTemplate.includes("{{ .TokenHash }}")) errors.push(`${templateName} email must include {{ .TokenHash }}`);
  if (!emailTemplate.includes("type=email")) errors.push(`${templateName} email must use the email verification type`);
  if (emailTemplate.includes("{{ .Token }}")) errors.push(`${templateName} email must not contain a verification code`);
  if (!emailTemplate.includes("30 minutes")) errors.push(`${templateName} email must state the 30-minute expiry`);
}

if (errors.length) {
  console.error(`Auth configuration failed for ${target}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Auth configuration passed for ${target}. Credentials were not printed.`);
