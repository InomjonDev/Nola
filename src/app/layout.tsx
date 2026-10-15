import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { Providers } from "@/components/providers";
import { siteDescription, siteName, siteUrl } from "@/lib/seo";
import { themeInitScript, themeStyles } from "@/theme";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: siteName, template: `%s | ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  category: "finance",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: siteName, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/nola-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/nola-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/nola-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: themeStyles }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
