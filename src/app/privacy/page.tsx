import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Privacy policy",
  description: "Learn how Walletly handles local expense data, Supabase sync, analytics, exports, and account deletion.",
  path: "/privacy",
});

export default function Page() {
  return <LegalPage title="Privacy policy" kind="privacy" />;
}
