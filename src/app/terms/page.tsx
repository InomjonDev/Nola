import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Terms of service",
  description: "Read the Walletly terms of service for personal expense tracking and offline use.",
  path: "/terms",
});

export default function Page() {
  return <LegalPage title="Terms of service" kind="terms" />;
}
