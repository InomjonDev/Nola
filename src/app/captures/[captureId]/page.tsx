import { NolaApp } from "@/components/nola-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Spending note" };

export default async function Page({ params }: { params: Promise<{ captureId: string }> }) {
  const { captureId } = await params;
  return <NolaApp view="capture" captureId={captureId} />;
}
