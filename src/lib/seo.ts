import type { Metadata } from "next";

export const siteName = "Walletly";
export const siteDescription = "A private, local-first expense tracker for clear everyday money decisions.";
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
export const socialImagePath = "/screenshots/desktop.png";

type PublicPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

export function publicPageMetadata({ title, description, path }: PublicPageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName,
      title,
      description,
      images: [{ url: socialImagePath, width: 1440, height: 900, alt: "Walletly expense tracker dashboard" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImagePath],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export const privatePageMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};
