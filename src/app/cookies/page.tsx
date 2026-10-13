import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Cookie policy",
  description: "See which essential browser storage Nola uses for sessions, preferences, consent, and offline functionality.",
  path: "/cookies",
});

export default function Page() {
  return <LegalPage title="Cookie policy" kind="cookies" />;
}
