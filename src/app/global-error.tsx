"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/error-reporting";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { surface: "global-error-boundary" });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <section style={{ maxWidth: "420px", textAlign: "center" }}>
            <p>Walletly</p>
            <h1>Something went wrong.</h1>
            <button type="button" onClick={() => reset()}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
