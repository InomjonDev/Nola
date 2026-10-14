"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAppStore } from "@/lib/app-store";
import { captureParseIssueFromError, type CaptureParseIssue } from "@/lib/capture-parse-issue";
import { supabase } from "@/lib/supabase";
import type { ParsedCaptureItem } from "@/lib/types";

type ParseResponse = { captureId: string; parseRevision: number; items: ParsedCaptureItem[] };

function currentLocalDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseResponse(value: unknown): value is ParseResponse {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ParseResponse>;
  return typeof result.captureId === "string"
    && typeof result.parseRevision === "number"
    && Array.isArray(result.items);
}

const PARSE_DEBOUNCE_MS = 1_000;

export function usePendingCaptureParser() {
  const store = useAppStore();
  const [issues, setIssues] = useState<Record<string, CaptureParseIssue>>({});
  const inFlight = useRef(new Set<string>());
  const parseTimers = useRef(new Map<string, { key: string; timer: ReturnType<typeof setTimeout> }>());
  const latestCaptures = useRef(store.spendingCaptures);
  const latestStore = useRef(store);
  latestCaptures.current = store.spendingCaptures;
  latestStore.current = store;

  useEffect(() => () => {
    for (const { timer } of parseTimers.current.values()) clearTimeout(timer);
    parseTimers.current.clear();
  }, []);

  const retryCapture = useCallback((captureId: string) => {
    const capture = latestCaptures.current.find((item) => item.id === captureId && !item.deletedAt
      && (item.parseStatus === "needs_retry" || (item.parseStatus === "pending" && issues[captureId] === "sync")));
    if (!capture) return;
    setIssues((current) => {
      const next = { ...current };
      delete next[captureId];
      return next;
    });
    store.setCaptureParseStatus(capture.id, capture.parseRevision, "pending");
  }, [issues, store]);

  useEffect(() => {
    if (!store.user || store.user.isDemo) return;
    setIssues((current) => {
      let changed = false;
      const next = { ...current };
      for (const [captureId, issue] of Object.entries(next)) {
        if (issue === "signIn") {
          delete next[captureId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [store.user?.id, store.user?.isDemo]);

  useEffect(() => {
    const { user, profile, isOnline, spendingCaptures, syncQueue } = store;
    for (const capture of spendingCaptures) {
      if (capture.deletedAt || capture.parseStatus !== "parsed" || capture.parsedRevision !== capture.parseRevision || !capture.parsedItems?.length) continue;
      const parsedIds = new Set(capture.parsedItems.map((item) => item.id));
      const hasMissingRows = capture.parsedItems.some((item) => !store.expenses.some((expense) => expense.id === item.id));
      const hasOldActiveRows = store.expenses.some((expense) => expense.captureId === capture.id && !expense.deletedAt && !parsedIds.has(expense.id));
      if (hasMissingRows || hasOldActiveRows) store.replayCachedCaptureParse(capture.id, capture.parseRevision);
    }
    if (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine) || !profile?.aiParsingEnabled || !user || user.isDemo) return;

    const activeCaptures = spendingCaptures.filter((capture) => !capture.deletedAt && capture.parseStatus === "pending");
    for (const capture of activeCaptures) {
      const captureUpsertPending = syncQueue.some((operation) => operation.table === "spending_captures" && operation.recordId === capture.id && operation.action === "upsert");
      if (issues[capture.id] === "sync" || captureUpsertPending) {
        const scheduled = parseTimers.current.get(capture.id);
        if (scheduled) clearTimeout(scheduled.timer);
        parseTimers.current.delete(capture.id);
        continue;
      }
      const flightKey = `${capture.id}:${capture.parseRevision}`;
      if (inFlight.current.has(flightKey)) continue;
      const scheduled = parseTimers.current.get(capture.id);
      if (scheduled?.key === flightKey) continue;
      if (scheduled) clearTimeout(scheduled.timer);
      const timer = setTimeout(() => {
        parseTimers.current.delete(capture.id);
        void parseCapture(capture.id, capture.parseRevision, user.id);
      }, PARSE_DEBOUNCE_MS);
      parseTimers.current.set(capture.id, { key: flightKey, timer });
    }
  }, [issues, parseCapture, store]);

  async function parseCapture(captureId: string, parseRevision: number, userId: string) {
    const currentStore = latestStore.current;
    const capture = latestCaptures.current.find((item) => item.id === captureId && item.userId === userId);
    const flightKey = `${captureId}:${parseRevision}`;
    if (!capture || capture.deletedAt || capture.parseStatus !== "pending" || capture.parseRevision !== parseRevision
      || currentStore.user?.id !== userId || currentStore.user.isDemo || !currentStore.isOnline
      || !currentStore.profile?.aiParsingEnabled || inFlight.current.has(flightKey)) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (currentStore.syncQueue.some((operation) => operation.table === "spending_captures" && operation.recordId === captureId && operation.action === "upsert")) return;

    inFlight.current.add(flightKey);
    const fail = (issue: CaptureParseIssue) => {
      const latest = latestCaptures.current.find((item) => item.id === captureId);
      const liveStore = latestStore.current;
      if (latest && !latest.deletedAt && latest.parseRevision === parseRevision && liveStore.user?.id === userId) {
        liveStore.setCaptureParseStatus(captureId, parseRevision, issue === "sync" ? "pending" : "needs_retry");
        setIssues((existing) => ({ ...existing, [captureId]: issue }));
      }
    };

    latestStore.current.setCaptureParseStatus(captureId, parseRevision, "processing");
    try {
      if (!supabase) {
        fail("signIn");
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;
      if (error || !session?.access_token || session.user.id !== userId) {
        fail("signIn");
        return;
      }

      const response = await fetch("/api/spending-captures/parse", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          captureId,
          parseRevision,
          sourceText: capture.sourceText,
          localDate: currentLocalDate(capture.capturedAt),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      if (!response.ok) {
        const failure: unknown = await response.json().catch(() => null);
        const errorCode = failure && typeof failure === "object" ? (failure as { error?: unknown }).error : null;
        fail(response.status === 401 ? "signIn" : captureParseIssueFromError(errorCode));
        return;
      }
      const result: unknown = await response.json();
      if (!parseResponse(result) || result.captureId !== captureId || result.parseRevision !== parseRevision) {
        fail("retry");
        return;
      }

      const latest = latestCaptures.current.find((item) => item.id === captureId);
      if (!latest || latest.deletedAt || latest.parseRevision !== parseRevision || latest.parseStatus === "undone" || latestStore.current.user?.id !== userId) return;
      if (!latestStore.current.setCaptureParseResult(captureId, parseRevision, result.items)) fail("retry");
      else setIssues((existing) => {
        if (!(captureId in existing)) return existing;
        const next = { ...existing };
        delete next[captureId];
        return next;
      });
    } catch {
      fail("retry");
    } finally {
      inFlight.current.delete(flightKey);
    }
  }

  return { issues, retryCapture };
}
