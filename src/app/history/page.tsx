import { NolaApp } from "@/components/nola-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Search" };

export default function Page() {
  return <NolaApp view="history" />;
}
