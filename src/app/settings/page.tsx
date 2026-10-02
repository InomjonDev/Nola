import { WalletlyApp } from "@/components/walletly-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Settings" };

export default function Page() {
  return <WalletlyApp view="settings" />;
}
