import { NolaApp } from "@/components/nola-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Insights" };

export default function Page() {
  return <NolaApp view="insights" />;
}
