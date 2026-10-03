"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n-provider";
import { finishEmailConfirmation } from "@/lib/supabase";

export default function AuthConfirmPage() {
  const router = useRouter();
  const { t } = useI18n();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const confirmationUrl = window.location.href;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    finishEmailConfirmation(confirmationUrl)
      .then(() => router.replace("/"))
      .catch(() => setFailed(true));
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-text">
      <section className="panel w-full max-w-md text-center">
        <img src="/branding/walletly-mascot.png" alt="Walletly" className="mx-auto h-auto w-28 rounded-2xl bg-white p-2 shadow-sm" />
        <h1 className="mt-6 text-2xl font-semibold">{failed ? t("auth.invalidLinkTitle") : t("auth.finishingTitle")}</h1>
        <p className="mt-3 leading-6 text-muted">{failed ? t("auth.invalidLink") : t("auth.finishingMessage")}</p>
        {failed && <Link className="control mt-6 w-full justify-center bg-text text-bg" href="/">{t("auth.backToWalletly")}</Link>}
      </section>
    </main>
  );
}
