import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/seo.ts",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "src/app/page.tsx",
  "public/screenshots/desktop.png",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing SEO files:\n${missing.join("\n")}`);
  process.exit(1);
}

const sourceChecks = [
  ["src/lib/seo.ts", "metadataBase-compatible site URL"],
  ["src/app/page.tsx", "JSON-LD structured data"],
  ["src/app/robots.ts", "sitemap reference"],
];

const failures = sourceChecks.flatMap(([file, label]) => {
  const source = readFileSync(file, "utf8");
  const patterns = {
    "metadataBase-compatible site URL": "NEXT_PUBLIC_SITE_URL",
    "JSON-LD structured data": "application/ld+json",
    "sitemap reference": "sitemap.xml",
  };
  return source.includes(patterns[label]) ? [] : [`${file}: missing ${label}`];
});

if (failures.length) {
  console.error(`SEO validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("SEO validation passed.");
