import { existsSync, readFileSync } from "node:fs";

const required = [
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/favicon.png",
  "public/branding/walletly-mascot.png",
  "public/screenshots/mobile.png",
  "public/screenshots/desktop.png",
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing PWA assets:\n${missing.join("\n")}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
for (const key of ["name", "short_name", "start_url", "display", "icons", "screenshots"]) {
  if (!manifest[key]) {
    console.error(`Manifest is missing ${key}`);
    process.exit(1);
  }
}

if (!readFileSync("public/sw.js", "utf8").includes("notificationclick")) {
  console.error("Service worker must handle notification clicks.");
  process.exit(1);
}

console.log("PWA validation passed.");
