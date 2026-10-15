"use client";

import Link from "next/link";
import { ArrowLeft } from "@/components/icons";

import { useI18n } from "@/lib/i18n-provider";

const copyKeys = {
  privacy: ["legal.privacy1", "legal.privacy2", "legal.privacy3", "legal.privacy4", "legal.privacy5"],
  terms: ["legal.terms1", "legal.terms2", "legal.terms3", "legal.terms4"],
  cookies: ["legal.cookies1", "legal.cookies2", "legal.cookies3"],
  deletion: ["legal.deletion1", "legal.deletion2", "legal.deletion3"],
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
    <main className="min-h-dvh bg-bg px-5 py-6 text-text sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-line pb-5">
        <Link href="/" className="flex min-h-11 items-center gap-3 font-bold"><span className="brand-wordmark">Nola</span></Link>
        <Link href="/settings" className="control min-h-11 bg-raised px-4 text-text"><ArrowLeft className="h-4 w-4" />{t("legal.back")}</Link>
      </div>
      <article className="mx-auto max-w-2xl px-1 py-8">
        <h1 className="mt-3 screen-title">{t(titleKeys[kind])}</h1>
        <div className="mt-8 grid gap-6 text-base leading-7 text-muted ">
          {copyKeys[kind].map((key) => <p key={key}>{t(key)}</p>)}
        </div>
        <div className="mt-10 grid gap-2 border-t border-line pt-6 text-sm text-muted">
          <p>{t("legal.updated")}</p>
          <a className="w-fit text-text underline underline-offset-4" href="mailto:inomjonismanaliev@gmail.com">{t("legal.contact")}: inomjonismanaliev@gmail.com</a>
        </div>
      </article>
    </main>
  );
}
