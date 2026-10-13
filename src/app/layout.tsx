import type { Metadata, Viewport } from "next";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
