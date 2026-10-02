import { LegalPage } from "@/components/legal-page";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Data deletion",
  description: "Learn how to delete a Walletly account and remove locally stored expense data from a browser.",
  path: "/data-deletion",
});

export default function Page() {
  return <LegalPage title="Data deletion" kind="deletion" />;
}
