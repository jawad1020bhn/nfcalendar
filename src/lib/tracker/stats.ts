// Stats calculations for the tracker
import { DayState, LEVELS } from "./types";
import { formatDateStr, getTodayDate, parseDateStr, getDaysInMonth } from "./dates";

type Entries = Record<string, DayState>;
type Notes = Record<string, string>;

export type Stats = {
  currentStreak: number;
  bestStreak: number;
  averageStreak: number;
  medianStreak: number;
  successCount: number;
  slipCount: number;
  failCount: number;
  totalMarks: number;
  cleanRatio: number;
  daysSinceLastRelapse: number | null;
  streakVelocity: number;
  longestGap: number | null;
  bounceBack: number | null;
  weeklyTrend: { thisWeek: number; lastWeek: number; delta: number } | null;
  streakDistribution: { buckets: Record<string, number>; total: number };
  monthComparison: {
    thisMonth: MonthStats;
    lastMonth: MonthStats;
    thisMonthName: string;
    lastMonthName: string;
  };
  weakestDay: { day: number; count: number } | null;
  dangerDays: { day: string; count: number; risk: "high" | "mid" | "low" }[];
  riskScore: { score: number; level: "low" | "mid" | "high" };
  relapseCycleLength: number | null;
  repeatingTriggers: { tag: string; count: number }[];
  level: { current: (typeof LEVELS)[number]; next: (typeof LEVELS)[number] | null };
};

type MonthStats = {
  clean: number;
  slip: number;
  relapse: number;
  total: number;
  cleanPct: number;
  days: number;
};

const getSortedDates = (entries: Entries): string[] =>
  Object.keys(entries).filter((k) => entries[k] !== undefined).sort();

// Maximum number of consecutive UNMARKED days we'll "bridge" when computing a
// streak. Users occasionally forget to log a clean day; we don't want a single
// missed tap to reset a 60-day streak. Set to 0 to disable bridging.
const MAX_UNMARKED_GAP = 1;

export const getAllStreakLengths = (entries: Entries): number[] => {
  const dates = getSortedDates(entries);
  if (dates.length === 0) return [];

  // Walk the marked calendar day-by-day from first to last marked date so we
  // correctly count bridging days. A relapse (3) always terminates a streak;
  // gaps of unmarked days up to MAX_UNMARKED_GAP continue the streak without
  // incrementing it.
  const lengths: number[] = [];
  let streak = 0;
  let unmarkedGap = 0;

  const firstDate = parseDateStr(dates[0])!;
  const lastDate = parseDateStr(dates[dates.length - 1])!;
  const cursor = new Date(firstDate);

  while (cursor.getTime() <= lastDate.getTime()) {
    const dStr = formatDateStr(cursor);
    const state = entries[dStr];

    if (state === 1 || state === 2) {
      // Clean or slip day: count it
      streak += 1;
      unmarkedGap = 0;
    } else if (state === 3) {
      // Relapse: break streak
      if (streak > 0) lengths.push(streak);
      streak = 0;
      unmarkedGap = 0;
    } else {
      // Unmarked day: bridge if gap is small, otherwise break
      unmarkedGap += 1;
      if (unmarkedGap > MAX_UNMARKED_GAP) {
        if (streak > 0) lengths.push(streak);
        streak = 0;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }
  if (streak > 0) lengths.push(streak);
  return lengths;
};

export const getBestStreak = (entries: Entries): number => {
  const lengths = getAllStreakLengths(entries);
  return lengths.length > 0 ? Math.max(...lengths) : 0;
};

export const getCurrentStreak = (entries: Entries): number => {
  const today = getTodayDate();
  const todayStr = formatDateStr(today);
  if (entries[todayStr] === 3) return 0;

  // Walk back from today. Allow up to MAX_UNMARKED_GAP unmarked days between
  // clean/slip days, which handles "I forgot to mark yesterday" gracefully.
  let streak = 0;
  let unmarkedGap = 0;
  const cursor = new Date(today);

  for (let i = 0; i < 366 * 5; i++) {
    const dStr = formatDateStr(cursor);
    const state = entries[dStr];

    if (state === 1 || state === 2) {
      streak += 1;
      unmarkedGap = 0;
    } else if (state === 3) {
      break;
    } else {
      // Unmarked: only bridge if we've already started the streak (avoid
      // counting the user's entire pre-tracking history as a streak when there
      // are zero entries yet) AND we haven't exceeded the gap tolerance.
      if (streak === 0) {
        // Haven't found any clean/slip day yet — keep walking silently.
      } else {
        unmarkedGap += 1;
        if (unmarkedGap > MAX_UNMARKED_GAP) break;
      }
    }

    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const getStreakVelocity = (entries: Entries): number => {
  let count = 0;
  const today = getTodayDate();
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = formatDateStr(d);
    if (entries[dStr] === 1 || entries[dStr] === 2) count++;
  }
  return count / 4;
};

const getStreakDistribution = (entries: Entries) => {
  const lengths = getAllStreakLengths(entries);
  const buckets = { "1-3": 0, "4-7": 0, "8-14": 0, "15-30": 0, "31+": 0 };
  lengths.forEach((len) => {
    if (len <= 3) buckets["1-3"]++;
    else if (len <= 7) buckets["4-7"]++;
    else if (len <= 14) buckets["8-14"]++;
    else if (len <= 30) buckets["15-30"]++;
    else buckets["31+"]++;
  });
  return { buckets, total: lengths.length };
};

const countMonth = (entries: Entries, m: number, y: number): MonthStats => {
  const days = getDaysInMonth(m, y);
  let clean = 0,
    slip = 0,
    relapse = 0;
  for (let d = 1; d <= days; d++) {
    const dStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const st = entries[dStr];
    if (st === 1) clean++;
    else if (st === 2) slip++;
    else if (st === 3) relapse++;
  }
  const total = clean + slip + relapse;
  const cleanPct = total > 0 ? Math.round((clean / total) * 100) : 0;
  return { clean, slip, relapse, total, cleanPct, days };
};

const getMonthComparison = (entries: Entries) => {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastDate = new Date(thisYear, thisMonth - 1, 1);
  const lastMonth = lastDate.getMonth();
  const lastYear = lastDate.getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return {
    thisMonth: countMonth(entries, thisMonth, thisYear),
    lastMonth: countMonth(entries, lastMonth, lastYear),
    thisMonthName: months[thisMonth],
    lastMonthName: months[lastMonth],
  };
};

const getLongestGap = (entries: Entries): number | null => {
  const dates = getSortedDates(entries).filter((d) => entries[d] === 3);
  if (dates.length < 2) return null;
  let maxGap = 0;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseDateStr(dates[i - 1])!;
    const curr = parseDateStr(dates[i])!;
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000) - 1;
    if (diff > maxGap) maxGap = diff;
  }
  return maxGap;
};

const getBounceBack = (entries: Entries): number | null => {
  // Average number of *calendar days* between a relapse and the next string of
  // 7 consecutive clean/slip days, or today if the user is currently recovered.
  // This is a more meaningful "bounce back" metric than just counting marked
  // entries.
  const dates = getSortedDates(entries).filter((d) => entries[d] === 3);
  if (dates.length === 0) return null;
  const today = getTodayDate();
  const bounceBacks: number[] = [];

  for (const relapseStr of dates) {
    const relapseDate = parseDateStr(relapseStr)!;
    // Look for the first run of 7 consecutive clean days after this relapse
    // (allowing up to MAX_UNMARKED_GAP holes).
    const cursor = new Date(relapseDate);
    cursor.setDate(cursor.getDate() + 1);
    let run = 0;
    let days = 0;
    const maxLookahead = 365;
    let found = false;
    for (let i = 0; i < maxLookahead; i++) {
      days += 1;
      const key = formatDateStr(cursor);
      const st = entries[key];
      if (st === 1) {
        run += 1;
        if (run >= 7) {
          bounceBacks.push(days - 6);
          found = true;
          break;
        }
      } else if (st === 3) {
        break; // next relapse — this recovery never hit 7 days
      } else {
        // unmarked: don't break run but don't extend it either
        run = 0;
      }
      if (cursor.getTime() >= today.getTime()) break;
      cursor.setDate(cursor.getDate() + 1);
    }
    if (!found && run > 0) {
      // Currently in recovery but <7 days in — record current progress so it
      // counts toward the average rather than being dropped.
      bounceBacks.push(days);
    }
  }

  if (bounceBacks.length === 0) return null;
  return Math.round(bounceBacks.reduce((a, b) => a + b, 0) / bounceBacks.length);
};

const getWeeklyTrend = (entries: Entries) => {
  const today = getTodayDate();
  const countWindow = (daysBack: number) => {
    let clean = 0,
      total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - daysBack - i);
      const dStr = formatDateStr(d);
      const st = entries[dStr];
      if (st === 1 || st === 2 || st === 3) {
        total++;
        if (st === 1) clean++;
      }
    }
    return total > 0 ? Math.round((clean / total) * 100) : 0;
  };
  const thisWeek = countWindow(0);
  const lastWeek = countWindow(7);
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek };
};

const getDaysSinceLastRelapse = (entries: Entries): number | null => {
  const dates = getSortedDates(entries).filter((d) => entries[d] === 3);
  if (dates.length === 0) return null;
  const last = parseDateStr(dates[dates.length - 1])!;
  const today = getTodayDate();
  return Math.round((today.getTime() - last.getTime()) / 86400000);
};

const getWeakestDay = (entries: Entries) => {
  // For each relapse, find what day-number it was in its streak
  const dates = getSortedDates(entries);
  const counts: Record<number, number> = {};
  let prev: Date | null = null;
  let streakLen = 0;
  for (const d of dates) {
    const state = entries[d];
    const dt = parseDateStr(d)!;
    if (state === 1 || state === 2) {
      if (prev) {
        const diff = Math.round((dt.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) streakLen++;
        else streakLen = 1;
      } else streakLen = 1;
      prev = dt;
    } else if (state === 3) {
      const day = streakLen + 1; // the relapse happened on day N+1 of the would-be streak
      counts[day] = (counts[day] || 0) + 1;
      streakLen = 0;
      prev = dt;
    } else {
      streakLen = 0;
      prev = null;
    }
  }
  const entries2 = Object.entries(counts);
  if (entries2.length === 0) return null;
  entries2.sort((a, b) => b[1] - a[1]);
  return { day: parseInt(entries2[0][0]), count: entries2[0][1] };
};

const getDangerDays = (entries: Entries) => {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of Object.keys(entries)) {
    if (entries[d] === 3) {
      const dt = parseDateStr(d)!;
      let idx = dt.getDay() - 1;
      if (idx < 0) idx = 6;
      counts[idx]++;
    }
  }
  const max = Math.max(...counts, 1);
  return dayNames.map((day, i) => ({
    day,
    count: counts[i],
    risk: (max === 0 ? "low" : counts[i] / max > 0.66 ? "high" : counts[i] / max > 0.33 ? "mid" : "low") as
      | "high"
      | "mid"
      | "low",
  }));
};

const getRiskScore = (entries: Entries): { score: number; level: "high" | "mid" | "low" } => {
  const today = getTodayDate();
  let slips = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = formatDateStr(d);
    if (entries[dStr] === 2) slips++;
  }
  const score = slips;
  const level: "high" | "mid" | "low" = score >= 3 ? "high" : score >= 1 ? "mid" : "low";
  return { score, level };
};

const getRelapseCycleLength = (entries: Entries): number | null => {
  const dates = getSortedDates(entries).filter((d) => entries[d] === 3);
  if (dates.length < 2) return null;
  const diffs: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const prev = parseDateStr(dates[i - 1])!;
    const curr = parseDateStr(dates[i])!;
    diffs.push(Math.round((curr.getTime() - prev.getTime()) / 86400000));
  }
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
};

const getRepeatingTriggers = (entries: Entries, notes: Notes) => {
  const counts: Record<string, number> = {};
  for (const d of Object.keys(notes)) {
    if (entries[d] === 2 || entries[d] === 3) {
      const text = notes[d] || "";
      const tags = text.match(/#[A-Za-z0-9_-]+/g) || [];
      tags.forEach((t) => {
        const n = t.toLowerCase();
        counts[n] = (counts[n] || 0) + 1;
      });
    }
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
};

export const getCurrentLevel = (bestStreak: number) => {
  let current = LEVELS[0];
  let next: (typeof LEVELS)[number] | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (bestStreak >= LEVELS[i].threshold) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  return { current, next };
};

export const calculateStats = (entries: Entries, notes: Notes): Stats => {
  const lengths = getAllStreakLengths(entries);
  const bestStreak = lengths.length > 0 ? Math.max(...lengths) : 0;
  const averageStreak =
    lengths.length > 0
      ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10
      : 0;
  const sortedLengths = [...lengths].sort((a, b) => a - b);
  const medianStreak =
    sortedLengths.length > 0
      ? sortedLengths.length % 2 === 0
        ? Math.round(
            ((sortedLengths[sortedLengths.length / 2 - 1] +
              sortedLengths[sortedLengths.length / 2]) /
              2) *
              10,
          ) / 10
        : sortedLengths[Math.floor(sortedLengths.length / 2)]
      : 0;

  const successCount = Object.values(entries).filter((s) => s === 1).length;
  const slipCount = Object.values(entries).filter((s) => s === 2).length;
  const failCount = Object.values(entries).filter((s) => s === 3).length;
  const totalMarks = successCount + slipCount + failCount;
  const cleanRatio = totalMarks > 0 ? Math.round((successCount / totalMarks) * 100) : 0;

  return {
    currentStreak: getCurrentStreak(entries),
    bestStreak,
    averageStreak,
    medianStreak,
    successCount,
    slipCount,
    failCount,
    totalMarks,
    cleanRatio,
    daysSinceLastRelapse: getDaysSinceLastRelapse(entries),
    streakVelocity: getStreakVelocity(entries),
    longestGap: getLongestGap(entries),
    bounceBack: getBounceBack(entries),
    weeklyTrend: getWeeklyTrend(entries),
    streakDistribution: getStreakDistribution(entries),
    monthComparison: getMonthComparison(entries),
    weakestDay: getWeakestDay(entries),
    dangerDays: getDangerDays(entries),
    riskScore: getRiskScore(entries),
    relapseCycleLength: getRelapseCycleLength(entries),
    repeatingTriggers: getRepeatingTriggers(entries, notes),
    level: getCurrentLevel(bestStreak),
  };
};

// Achievement detection — returns array of newly unlocked IDs given entries/notes
export const checkAchievements = (
  entries: Entries,
  notes: Notes,
): string[] => {
  const stats = calculateStats(entries, notes);
  const unlocked: string[] = [];
  const push = (id: string) => unlocked.push(id);

  const lengths = getAllStreakLengths(entries);
  const sortedLengths = [...lengths].sort((a, b) => b - a);
  const bestStreak = stats.bestStreak;
  const currentStreak = stats.currentStreak;
  const totalCleanDays = stats.successCount;
  const totalMarks = stats.totalMarks;

  // ---- Bronze ----
  if (totalMarks >= 1) push("first_mark");
  if (bestStreak >= 7) push("first_week");
  if (bestStreak >= 14) push("two_weeks");
  if (totalCleanDays >= 3) push("kept_3");
  if (totalCleanDays >= 10) push("kept_10");
  if (Object.keys(notes).filter((k) => notes[k]?.trim()).length >= 1) push("first_note");

  const allTags = new Set<string>();
  for (const text of Object.values(notes)) {
    if (text) (text.match(/#[A-Za-z0-9_-]+/g) || []).forEach((t) => allTags.add(t.toLowerCase()));
  }
  if (allTags.size >= 1) push("tagged");

  // ---- Silver ----
  if (bestStreak >= 30) push("month_one");
  if (totalCleanDays >= 25) push("kept_25");
  if (Object.keys(notes).filter((k) => notes[k]?.trim()).length >= 25) push("storyteller");
  if (allTags.size >= 10) push("tag_master");

  const triggerTags = new Set<string>();
  for (const dateStr in notes) {
    if (entries[dateStr] === 2 || entries[dateStr] === 3) {
      (notes[dateStr].match(/#[A-Za-z0-9_-]+/g) || []).forEach((t) =>
        triggerTags.add(t.toLowerCase()),
      );
    }
  }
  if (triggerTags.size >= 5) push("trigger_aware");

  // Perfect Week
  {
    const today = getTodayDate();
    const checkPerfectWeek = (weeksBack: number) => {
      const ref = new Date(today);
      ref.setDate(ref.getDate() - weeksBack * 7);
      const refDay = ref.getDay();
      const daysSinceMon = refDay === 0 ? 6 : refDay - 1;
      const monday = new Date(ref);
      monday.setDate(monday.getDate() - daysSinceMon);
      if (monday > today) return false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        if (d > today) return false;
        const dStr = formatDateStr(d);
        if (entries[dStr] !== 1) return false;
      }
      return true;
    };
    for (let w = 0; w < 52; w++) {
      if (checkPerfectWeek(w)) {
        push("perfect_week");
        break;
      }
    }
  }

  // Comeback
  {
    const dates = getSortedDates(entries);
    let prevStreakLen = 0;
    let tempStreak = 0;
    let prev: Date | null = null;
    let i = 0;
    while (i < dates.length) {
      const d = dates[i];
      const state = entries[d];
      if (state === 1 || state === 2) {
        const dt = parseDateStr(d)!;
        if (prev) {
          const diff = Math.round((dt.getTime() - prev.getTime()) / 86400000);
          if (diff === 1) tempStreak++;
          else {
            if (tempStreak > prevStreakLen) prevStreakLen = tempStreak;
            tempStreak = 1;
          }
        } else tempStreak = 1;
        prev = dt;
      } else if (state === 3) {
        if (tempStreak > prevStreakLen) prevStreakLen = tempStreak;
        tempStreak = 0;
        prev = parseDateStr(d);
        if (prevStreakLen >= 14) {
          let recoveryDays = 0;
          for (let j = i + 1; j < dates.length; j++) {
            const st = entries[dates[j]];
            if (st === 1 || st === 2) recoveryDays++;
            else break;
          }
          if (recoveryDays >= 7) {
            push("comeback");
            break;
          }
        }
      }
      i++;
    }
  }

  // ---- Gold ----
  if (bestStreak >= 60) push("two_months");
  if (bestStreak >= 90) push("quarter_master");
  if (bestStreak >= 100) push("century");
  if (totalCleanDays >= 50) push("kept_50");

  {
    const dates = getSortedDates(entries);
    let bounceBacks = 0;
    for (let i = 0; i < dates.length; i++) {
      if (entries[dates[i]] === 3) {
        let recoveryDays = 0;
        for (let j = i + 1; j < dates.length; j++) {
          const st = entries[dates[j]];
          if (st === 1 || st === 2) recoveryDays++;
          else break;
        }
        if (recoveryDays >= 7) bounceBacks++;
      }
    }
    if (bounceBacks >= 5) push("resilient");
    if (bounceBacks >= 10) push("bounce_master");

    let totalRelapses = 0;
    for (const d of dates) if (entries[d] === 3) totalRelapses++;
    if (totalRelapses >= 10 && totalMarks >= 90) push("reset_survivor");
  }

  {
    let noSlip30 = true;
    const today = getTodayDate();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (entries[formatDateStr(d)] === 2) {
        noSlip30 = false;
        break;
      }
    }
    if (noSlip30 && currentStreak >= 30) push("iron_will");

    if (currentStreak >= 90) {
      let noSlip90 = true;
      for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (entries[formatDateStr(d)] === 2) {
          noSlip90 = false;
          break;
        }
      }
      if (noSlip90) push("zero_slip");
    }
  }

  {
    const today = getTodayDate();
    const checkWeekend = (weeksBack: number) => {
      const ref = new Date(today);
      ref.setDate(ref.getDate() - weeksBack * 7);
      const refDay = ref.getDay();
      const daysSinceSat = (refDay - 6 + 7) % 7;
      const sat = new Date(ref);
      sat.setDate(sat.getDate() - daysSinceSat);
      if (sat > today) return false;
      const satStr = formatDateStr(sat);
      const sunStr = formatDateStr(new Date(sat.getTime() + 86400000));
      const satOk = entries[satStr] === 1 || entries[satStr] === 2;
      const sunOk = entries[sunStr] === 1 || entries[sunStr] === 2;
      return satOk && sunOk;
    };
    let weekendOk = true;
    for (let w = 0; w < 4; w++) {
      if (!checkWeekend(w)) {
        weekendOk = false;
        break;
      }
    }
    if (weekendOk) push("weekend_warrior");
  }

  if (sortedLengths.length >= 2 && currentStreak > 0) {
    const previousBest = sortedLengths[1] || 0;
    if (currentStreak > previousBest && previousBest > 0) push("unstoppable");
  }

  if (lengths.length >= 3) {
    let climbing = true;
    for (let i = lengths.length - 3; i < lengths.length - 1; i++) {
      if (lengths[i] >= lengths[i + 1]) {
        climbing = false;
        break;
      }
    }
    if (climbing) push("climbing");
  }

  // ---- Platinum ----
  if (bestStreak >= 180) push("half_year");
  if (totalCleanDays >= 100) push("kept_100");

  {
    const today = getTodayDate();
    for (let monthsBack = 0; monthsBack < 24; monthsBack++) {
      const ref = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
      if (ref > today) continue;
      const daysInMon = getDaysInMonth(ref.getMonth(), ref.getFullYear());
      let allClean = true;
      for (let d = 1; d <= daysInMon; d++) {
        const dStr = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(
          d,
        ).padStart(2, "0")}`;
        if (entries[dStr] !== 1) {
          allClean = false;
          break;
        }
        const cellDate = parseDateStr(dStr)!;
        if (cellDate > today) {
          allClean = false;
          break;
        }
      }
      if (allClean) {
        push("perfect_month");
        break;
      }
    }
  }

  {
    const dates = getSortedDates(entries);
    let hadRelapse = false;
    for (let i = 0; i < dates.length; i++) {
      if (entries[dates[i]] === 3) {
        let relapseLen = 1;
        for (let j = i + 1; j < dates.length; j++) {
          const dt1 = parseDateStr(dates[j - 1])!;
          const dt2 = parseDateStr(dates[j])!;
          if (Math.round((dt2.getTime() - dt1.getTime()) / 86400000) === 1 && entries[dates[j]] === 3)
            relapseLen++;
          else break;
        }
        if (relapseLen >= 30) hadRelapse = true;
      }
    }
    if (hadRelapse && bestStreak >= 30) push("phoenix");
  }

  if (sortedLengths.length >= 2 && currentStreak >= 30) {
    const prevBest = sortedLengths[1] || 0;
    if (prevBest >= 30 && currentStreak > prevBest + 30) push("plateau");
  }

  // ---- Diamond ----
  if (bestStreak >= 365) push("year_one");
  if (totalCleanDays >= 250) push("kept_250");

  {
    // Reflective — note every day for 14 days
    const today = getTodayDate();
    let allNotes = true;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = formatDateStr(d);
      if (!notes[dStr] || !notes[dStr].trim()) {
        allNotes = false;
        break;
      }
    }
    if (allNotes) push("reflective");
  }

  if (totalMarks >= 365) push("archivist");

  return unlocked;
};

// Extract #tags from a note
export const extractNoteTags = (text: string): string[] => {
  const matches = text.match(/#[A-Za-z0-9_-]+/g) || [];
  const seen = new Set<string>();
  return matches.filter((tag) => {
    const n = tag.toLowerCase();
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
};
