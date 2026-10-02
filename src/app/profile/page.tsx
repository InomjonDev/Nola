import { WalletlyApp } from "@/components/walletly-app";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = { ...privatePageMetadata, title: "Profile" };

export default function Page() {
  return <WalletlyApp view="profile" />;
}
