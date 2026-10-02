"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { finishAuthCallback } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    finishAuthCallback(window.location.href)
      .then(() => router.replace("/"))
      .catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Authentication failed."));
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-text">
      <section className="panel max-w-md text-center">
        <h1 className="text-2xl font-semibold">{error ? "Could not sign you in" : "Finishing sign-in"}</h1>
        <p className="mt-3 text-muted">{error ?? "Walletly is securing your browser session."}</p>
        {error && <Link className="control mt-5 justify-center bg-text text-bg" href="/">Back to Walletly</Link>}
      </section>
    </main>
  );
}
