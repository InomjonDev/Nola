"use client";

import { useLayoutEffect, useRef, type InputHTMLAttributes } from "react";

import { formatAmountDraft } from "@/lib/currency-input";

type CurrencyAmountInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "onChange"> & {
  locale: string;
  value: string;
  onValueChange: (canonical: string) => void;
};

export function CurrencyAmountInput({ locale, value, onValueChange, ...props }: CurrencyAmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const display = formatAmountDraft(value, locale).display;

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const input = inputRef.current;
    if (input) input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [display]);

  return <input
    {...props}
    ref={inputRef}
    lang={locale}
    type="text"
    inputMode="decimal"
    autoComplete="off"
    autoCapitalize="off"
    spellCheck={false}
    value={display}
    onChange={(event) => {
      const raw = event.currentTarget.value;
      const caret = event.currentTarget.selectionStart ?? raw.length;
      const next = formatAmountDraft(raw, locale);
      pendingCaret.current = formatAmountDraft(raw.slice(0, caret), locale).display.length;
      onValueChange(next.canonical);
    }}
  />;
}
