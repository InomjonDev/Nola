"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "@/components/icons";
import { languageLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";

function cx(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }

export function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
}



export function DatePicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => { const date = dateFromInput(value); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const firstDay = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
  const selected = dateFromInput(value);

  return (
    <div className="relative">
      <p className="label">{label ?? t("expense.date")}</p>
      <input type="date" className="native-date-input input mt-2" value={value} aria-label={label ?? t("expense.date")} onChange={(event) => { if (event.target.value) onChange(event.target.value); }} />
      <button type="button" className="custom-date-trigger input mt-2 flex w-full items-center justify-between text-left" aria-label={t("expense.chooseDate")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{dateFromInput(value).toLocaleDateString(languageLocale(language))}</span>
        <CalendarDays className="h-5 w-5 text-text" />
      </button>
      {open && <div className="calendar-popover mt-2 bg-bg p-2" role="dialog" aria-label={t("expense.chooseDate")} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); } }}>
        <div className="flex items-center justify-between">
          <button type="button" className="icon-button" aria-label={t("expense.previousMonth")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <p className="text-sm font-semibold">{month.toLocaleDateString(languageLocale(language), { month: "long", year: "numeric" })}</p>
          <button type="button" className="icon-button" aria-label={t("expense.nextMonth")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-muted">{Array.from({ length: 7 }, (_, index) => <span key={index} className="py-1">{new Intl.DateTimeFormat(languageLocale(language), { weekday: "narrow" }).format(new Date(2024, 0, 1 + index))}</span>)}</div>
        <div className="grid grid-cols-7">
          {cells.map((date, index) => date ? <button type="button" key={date.toISOString()} className={cx("calendar-day grid place-items-center rounded-lg text-sm transition hover:bg-raised", dateInputValue(date) === dateInputValue(selected) && "text-accent underline decoration-2 underline-offset-4")} onClick={() => { onChange(dateInputValue(date)); setOpen(false); }}>{date.getDate()}</button> : <span key={`empty-${index}`} />)}
        </div>
      </div>}
    </div>
  );
}
