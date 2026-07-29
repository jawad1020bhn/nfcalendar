// Date helpers for the tracker.
//
// All YYYY-MM-DD keys are computed in the user's *local* timezone because the
// app is client-only and "today" must match what the user sees on their wall
// clock. We stay consistent by going through `getFullYear/getMonth/getDate`
// instead of UTC getters, and avoid `Date.parse` / ISO-string round-trips
// which can shift the date across timezones.

export const getTodayStr = (): string => formatDateStr(new Date());

export const getTodayDate = (): Date => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

export const formatDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export const parseDateStr = (str: string): Date | null => {
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  // Guard against overflow (e.g. month=13 rolls over; reject invalid input)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
};

export const addDaysToDateStr = (dateStr: string, days: number): string | null => {
  const d = parseDateStr(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
};

export const getDaysInMonth = (monthIndex: number, year: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

// Monday = 0, Sunday = 6
export const getFirstDayOfMonth = (monthIndex: number, year: number): number => {
  const day = new Date(year, monthIndex, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

// Whole-day difference in days (b - a).
export const dayDiff = (a: string, b: string): number => {
  const da = parseDateStr(a);
  const db = parseDateStr(b);
  if (!da || !db) return 0;
  return Math.round(
    (db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24),
  );
};

export const prettyDate = (dateStr: string): string => {
  const d = parseDateStr(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const shortDate = (dateStr: string): string => {
  const d = parseDateStr(dateStr);
  if (!d) return dateStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

// Build a YYYY-MM-DD key from year, month (0-based), day
export const dateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// Is `dateStr` strictly before today (local time)?
export const isBeforeToday = (dateStr: string): boolean => {
  const d = parseDateStr(dateStr);
  if (!d) return false;
  return d.getTime() < getTodayDate().getTime();
};

// Is `dateStr` in the future?
export const isFuture = (dateStr: string): boolean => {
  const d = parseDateStr(dateStr);
  if (!d) return false;
  return d.getTime() > getTodayDate().getTime();
};
