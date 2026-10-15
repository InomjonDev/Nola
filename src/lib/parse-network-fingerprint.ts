import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/** Vercel overwrites X-Forwarded-For with the client's public IP. Never persist the raw address. */
export function parseNetworkFingerprint(request: Request, secret: string, onVercel: boolean): string | null {
  if (!secret) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  const address = onVercel ? forwarded?.split(",")[0]?.trim() : forwarded?.split(",")[0]?.trim() || "127.0.0.1";
  if (!address || !isIP(address)) return null;
  return createHmac("sha256", secret).update(`nola-spending-parse:v1:${address}`).digest("hex");
}
