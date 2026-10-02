import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Completing sign-in",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function AuthCallbackLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
