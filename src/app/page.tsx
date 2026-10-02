import { WalletlyApp } from "@/components/walletly-app";
import { publicPageMetadata, siteDescription, siteName, siteUrl } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: `${siteName} | Private expense tracker`,
  description: siteDescription,
  path: "/",
});

export default function Page() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: siteDescription,
    url: siteUrl.toString(),
    image: new URL("/icons/icon-512.png", siteUrl).toString(),
    isAccessibleForFree: true,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <noscript>
        <main className="mx-auto max-w-2xl px-6 py-16 text-text">
          <h1 className="text-4xl font-semibold">Walletly, a private expense tracker</h1>
          <p className="mt-4 text-lg text-muted">Track everyday spending locally first, sync securely with Supabase, and keep your financial data under your control.</p>
          <p className="mt-6 text-muted">Enable JavaScript to use the Walletly app. Read our <a className="underline" href="/privacy">privacy policy</a> or <a className="underline" href="/terms">terms of service</a>.</p>
        </main>
      </noscript>
      <WalletlyApp view="home" />
    </>
  );
}
