"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n-provider";
import { finishAuthCallback } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useI18n();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callbackUrl = window.location.href;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    finishAuthCallback(callbackUrl)
      .then(() => router.replace("/"))
      .catch(() => setFailed(true));
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-text">
      <section className="panel max-w-md text-center">
        <h1 className="text-2xl font-semibold">{failed ? t("auth.callbackFailedTitle") : t("auth.finishingTitle")}</h1>
        <p className="mt-3 text-muted">{failed ? t("auth.callbackFailedMessage") : t("auth.finishingMessage")}</p>
        {failed && <Link className="control mt-5 justify-center bg-text text-bg" href="/">{t("auth.backToWalletly")}</Link>}
      </section>
    </main>
  );
}
