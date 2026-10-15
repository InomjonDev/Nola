export function sanitizeAnalyticsUrl(value: string, origin: string) {
  const url = new URL(value, origin);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname
    .replace(/^\/captures\/[^/]+(?=\/|$)/, "/captures/[captureId]")
    .replace(/^\/folders\/[^/]+(?=\/|$)/, "/folders/[folderId]");
  return url.toString();
}
