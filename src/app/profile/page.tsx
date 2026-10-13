import { NolaApp } from "@/components/nola-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Profile" };

export default function Page() {
  return <NolaApp view="profile" />;
}
