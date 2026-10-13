"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

export function useDialogFocus(dialog: RefObject<HTMLElement | null>, backdrop: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop.current && !["SCRIPT", "STYLE"].includes(node.tagName));
    const inert = siblings.map((node) => node.inert);
    document.body.style.overflow = "hidden";
    siblings.forEach((node) => { node.inert = true; });
    (dialog.current?.querySelector<HTMLElement>("[data-autofocus]") ?? dialog.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") { event.preventDefault(); close.current(); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []).filter((node) => node.getClientRects().length > 0);
      const first = controls[0]; const last = controls.at(-1);
      if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      siblings.forEach((node, index) => { node.inert = inert[index]; });
      if (focused?.isConnected) focused.focus();
      else document.querySelector<HTMLElement>("[data-dialog-return-focus]")?.focus();
    };
  }, [dialog, backdrop]);
}
