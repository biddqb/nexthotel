import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parse,
  parseISO,
  startOfMonth,
} from "date-fns";

/** Parse YYYY-MM-DD to Date (local time, no tz shenanigans). */
export function parseDate(s: string): Date {
  return parse(s, "yyyy-MM-dd", new Date());
}

/** Format Date to YYYY-MM-DD (canonical storage format). */
export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Format Date for Vietnamese display, e.g. "15/04/2026". */
export function formatDateVN(d: Date | string): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return format(date, "dd/MM/yyyy");
}

/** Format Date for short Vietnamese display, e.g. "15/04". */
export function formatDateShortVN(d: Date | string): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return format(date, "dd/MM");
}

/** Format Date for long Vietnamese display with day-of-week. */
export function formatDateLongVN(d: Date | string): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  const day = format(date, "EEEE");
  const viDay = translateDay(day);
  return `${viDay}, ${format(date, "dd/MM/yyyy")}`;
}

const DAY_MAP: Record<string, string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

function translateDay(english: string): string {
  return DAY_MAP[english] ?? english;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseDate(checkOut), parseDate(checkIn));
}

export function monthDays(year: number, monthIndex0: number): Date[] {
  const start = startOfMonth(new Date(year, monthIndex0, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export { addDays, parseISO, startOfMonth, endOfMonth, format };

export function today(): string {
  return toISODate(new Date());
}
