import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirming sign-in",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function AuthConfirmLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
