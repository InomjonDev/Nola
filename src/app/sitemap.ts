import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = ["/", "/privacy", "/terms", "/cookies", "/data-deletion"];

  return publicPaths.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.4,
  }));
}
