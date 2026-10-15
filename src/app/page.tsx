import { NolaApp } from "@/components/nola-app";
import { publicPageMetadata, siteDescription, siteName, siteUrl } from "@/lib/seo";
import { headers } from "next/headers";

export const metadata = publicPageMetadata({
  title: `${siteName} | Private expense tracker`,
  description: siteDescription,
  path: "/",
});

export default async function Page() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: siteDescription,
    url: siteUrl.toString(),
    image: new URL("/icons/nola-512.png", siteUrl).toString(),
    isAccessibleForFree: true,
  };

  return (
    <>
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <noscript>
        <main className="mx-auto max-w-2xl px-6 py-16 text-text">
          <h1 className="screen-title">Nola, a private expense tracker</h1>
          <p className="mt-4 text-base text-muted">Write spending as a note, review linked expenses, and keep your data under your control.</p>
          <p className="mt-6 text-muted">Enable JavaScript to use the Nola app. Read our <a className="underline" href="/privacy">privacy policy</a> or <a className="underline" href="/terms">terms of service</a>.</p>
        </main>
      </noscript>
      <NolaApp view="home" />
    </>
  );
}
