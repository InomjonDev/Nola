import { NolaApp } from "@/components/nola-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Spending folder" };

export default async function Page({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  return <NolaApp view="folders" folderId={folderId} />;
}
