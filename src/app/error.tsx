"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/error-reporting";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { surface: "app-error-boundary" });
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-text">
      <section className="panel max-w-md">
        <p className="eyebrow">Walletly</p>
        <h1 className="mt-2 text-2xl font-semibold">Something went wrong.</h1>
        <p className="mt-3 text-sm text-muted">Your local data is still stored on this device.</p>
        <button className="control mt-6 justify-center bg-text text-bg" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
