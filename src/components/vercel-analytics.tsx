"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { useEffect, useState } from "react";

import { CONSENT_KEY, COOKIE_CONSENT_KEY } from "@/lib/constants";
import { sanitizeAnalyticsUrl } from "@/lib/analytics-url";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== "true" || localStorage.getItem(COOKIE_CONSENT_KEY) !== "true") return null;
    return { ...event, url: sanitizeAnalyticsUrl(event.url, window.location.origin) };
  } catch {
    return null;
  }
}

export function VercelAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      try {
        setConsented(localStorage.getItem(CONSENT_KEY) === "true" && localStorage.getItem(COOKIE_CONSENT_KEY) === "true");
      } catch {
        setConsented(false);
      }
    };

    syncConsent();
    window.addEventListener("nola:analytics-consent", syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener("nola:analytics-consent", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  return consented ? <Analytics beforeSend={beforeSend} /> : null;
}
