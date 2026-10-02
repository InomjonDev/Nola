import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/cookies", "/data-deletion"],
      disallow: ["/auth/", "/add-expense", "/history", "/insights", "/manage", "/onboarding", "/profile", "/settings"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
