// Date helpers for the tracker

export const getTodayStr = (): string => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate(),
  ).padStart(2, "0")}`;
};

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
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  d.setHours(0, 0, 0, 0);
  return d;
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

export const dayDiff = (a: string, b: string): number => {
  const da = parseDateStr(a);
  const db = parseDateStr(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
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
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

// Build a YYYY-MM-DD key from year, month (0-based), day
export const dateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
