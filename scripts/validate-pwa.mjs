import { existsSync, readFileSync } from "node:fs";

const required = [
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/icons/nola-192.png",
  "public/icons/nola-512.png",
  "public/icons/nola-1024.png",
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

if (manifest.name !== "Nola" || manifest.short_name !== "Nola") {
  console.error("PWA manifest must use Nola branding.");
  process.exit(1);
}

for (const path of ["/icons/nola-192.png", "/icons/nola-512.png"]) {
  if (!manifest.icons.some((icon) => icon.src === path)) {
    console.error(`PWA manifest is missing the Nola icon ${path}.`);
    process.exit(1);
  }
}

if (!readFileSync("public/sw.js", "utf8").includes("notificationclick")) {
  console.error("Service worker must handle notification clicks.");
  process.exit(1);
}

console.log("PWA validation passed.");
