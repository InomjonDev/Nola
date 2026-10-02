"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n-provider";

const copyKeys = {
  privacy: ["legal.privacy1", "legal.privacy2", "legal.privacy3"],
  terms: ["legal.terms1", "legal.terms2", "legal.terms3"],
  cookies: ["legal.cookies1", "legal.cookies2"],
  deletion: ["legal.deletion1", "legal.deletion2"],
} as const;

const titleKeys = {
  privacy: "legal.privacyTitle",
  terms: "legal.termsTitle",
  cookies: "legal.cookiesTitle",
  deletion: "legal.deletionTitle",
} as const;

export function LegalPage({ title: _title, kind }: { title: string; kind: keyof typeof copyKeys }) {
  const { t } = useI18n();
  return (
    <main className="min-h-dvh bg-bg px-4 py-8 text-text">
      <article className="mx-auto max-w-3xl rounded-[28px] bg-surface p-6 shadow-soft sm:p-8">
        <Link href="/settings" className="text-sm font-medium text-muted">{t("legal.back")}</Link>
        <h1 className="mt-6 text-3xl font-semibold">{t(titleKeys[kind])}</h1>
        <div className="mt-6 grid gap-4 text-base leading-7 text-muted">
          {copyKeys[kind].map((key) => <p key={key}>{t(key)}</p>)}
        </div>
      </article>
    </main>
  );
}
