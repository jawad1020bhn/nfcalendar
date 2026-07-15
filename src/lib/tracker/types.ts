// Tracker domain types & constants

export type DayState = 0 | 1 | 2 | 3;
// 0 = unmarked (not stored), 1 = clean, 2 = slip, 3 = relapse

export const DAY_STATE = {
  UNMARKED: 0,
  CLEAN: 1,
  SLIP: 2,
  RELAPSE: 3,
} as const;

export const STATE_LABELS: Record<number, string> = {
  0: "Unmarked",
  1: "Clean",
  2: "Slip",
  3: "Relapse",
};

export const STATE_CYCLE: DayState[] = [1, 2, 3]; // tap cycles clean -> slip -> relapse -> clean

export type RatingKey = "mood" | "energy" | "sleep";
export type Ratings = Partial<Record<RatingKey, number>>; // 1..5

export type DayEntry = {
  state: DayState;
  note?: string;
  mood?: number;
  energy?: number;
  sleep?: number;
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const DAYS_OF_WEEK = ["M", "T", "W", "T", "F", "S", "S"];
export const DAYS_OF_WEEK_FULL = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

// Roman milestones — only at meaningful streak checkpoints
export const MILESTONES: Record<number, string> = {
  7: "VII",
  10: "X",
  15: "XV",
  30: "XXX",
  50: "L",
  60: "LX",
  90: "XC",
  100: "C",
  180: "CLXXX",
  365: "CCCLXV",
};

export const MILESTONE_LIST = Object.keys(MILESTONES)
  .map(Number)
  .sort((a, b) => a - b);

// Levels — based on best streak
export type Tier = {
  name: string;
  threshold: number;
  color: string;
  symbol: string;
};

export const LEVELS: Tier[] = [
  { name: "None", threshold: 0, color: "var(--dim)", symbol: "" },
  { name: "Bronze", threshold: 7, color: "#CD7F32", symbol: "B" },
  { name: "Silver", threshold: 30, color: "#C0C0C0", symbol: "S" },
  { name: "Gold", threshold: 90, color: "var(--gold)", symbol: "G" },
  { name: "Platinum", threshold: 180, color: "#E5E4E2", symbol: "P" },
  { name: "Diamond", threshold: 365, color: "#B9F2FF", symbol: "D" },
];

// Achievement tiers
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export const ACHIEVEMENT_TIERS: Record<
  AchievementTier,
  { name: string; color: string; gradient: string }
> = {
  bronze: {
    name: "Bronze",
    color: "#CD7F32",
    gradient: "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)",
  },
  silver: {
    name: "Silver",
    color: "#C0C0C0",
    gradient: "linear-gradient(135deg, #E8E8E8 0%, #9C9C9C 100%)",
  },
  gold: {
    name: "Gold",
    color: "var(--gold)",
    gradient: "linear-gradient(135deg, #FFD700 0%, #B8860B 100%)",
  },
  platinum: {
    name: "Platinum",
    color: "#E5E4E2",
    gradient: "linear-gradient(135deg, #F5F5F5 0%, #A9A9A9 100%)",
  },
  diamond: {
    name: "Diamond",
    color: "#B9F2FF",
    gradient: "linear-gradient(135deg, #B9F2FF 0%, #4FC3F7 100%)",
  },
};

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: AchievementTier;
};

export const ACHIEVEMENTS: Achievement[] = [
  // Bronze
  { id: "first_mark", name: "First Mark", desc: "Mark your first day", icon: "1", tier: "bronze" },
  { id: "first_week", name: "First Week", desc: "7-day streak", icon: "7", tier: "bronze" },
  { id: "two_weeks", name: "Two Weeks", desc: "14-day streak", icon: "14", tier: "bronze" },
  { id: "kept_3", name: "3 Kept", desc: "3 clean days total", icon: "3", tier: "bronze" },
  { id: "kept_10", name: "10 Kept", desc: "10 clean days total", icon: "10", tier: "bronze" },
  { id: "first_note", name: "First Note", desc: "Write your first note", icon: "✎", tier: "bronze" },
  { id: "tagged", name: "Tagged", desc: "Use your first #tag", icon: "#", tier: "bronze" },
  // Silver
  { id: "month_one", name: "Month One", desc: "30-day streak", icon: "30", tier: "silver" },
  { id: "kept_25", name: "25 Kept", desc: "25 clean days total", icon: "25", tier: "silver" },
  { id: "perfect_week", name: "Perfect Week", desc: "Every day of a clean calendar week", icon: "✓", tier: "silver" },
  { id: "comeback", name: "The Comeback", desc: "Reset after 14+ day streak, then 7+ clean", icon: "↻", tier: "silver" },
  { id: "trigger_aware", name: "Trigger Aware", desc: "Use 5+ unique trigger tags", icon: "⚠", tier: "silver" },
  { id: "storyteller", name: "Storyteller", desc: "Write 25 notes", icon: "✍", tier: "silver" },
  { id: "tag_master", name: "Tag Master", desc: "Use 10+ unique tags", icon: "❖", tier: "silver" },
  // Gold
  { id: "two_months", name: "Two Months", desc: "60-day streak", icon: "60", tier: "gold" },
  { id: "quarter_master", name: "Quarter Master", desc: "90-day streak", icon: "90", tier: "gold" },
  { id: "century", name: "Century", desc: "100-day streak", icon: "C", tier: "gold" },
  { id: "kept_50", name: "50 Kept", desc: "50 clean days total", icon: "50", tier: "gold" },
  { id: "resilient", name: "Resilient", desc: "Reset 5+ times and kept going", icon: "⚑", tier: "gold" },
  { id: "iron_will", name: "Iron Will", desc: "30 days without a single slip", icon: "⚔", tier: "gold" },
  { id: "weekend_warrior", name: "Weekend Warrior", desc: "4 clean weekends in a row", icon: "W", tier: "gold" },
  { id: "unstoppable", name: "Unstoppable", desc: "Current streak beats previous best", icon: "↑", tier: "gold" },
  { id: "climbing", name: "Climbing", desc: "3 streaks in a row, each longer than last", icon: "▲", tier: "gold" },
  // Platinum
  { id: "half_year", name: "Half Year", desc: "180-day streak", icon: "½", tier: "platinum" },
  { id: "kept_100", name: "100 Kept", desc: "100 clean days total", icon: "100", tier: "platinum" },
  { id: "perfect_month", name: "Perfect Month", desc: "Clean every day of a calendar month", icon: "◉", tier: "platinum" },
  { id: "phoenix", name: "Phoenix Rising", desc: "Recover from 30+ relapse to 30+ streak", icon: "⚘", tier: "platinum" },
  { id: "zero_slip", name: "Zero Slip Zone", desc: "90 days with zero slips", icon: "∅", tier: "platinum" },
  { id: "bounce_master", name: "Bounce Back Master", desc: "10 successful bounce-backs after relapse", icon: "↺", tier: "platinum" },
  { id: "plateau", name: "Plateau Breaker", desc: "Broke a 30+ day plateau", icon: "≡", tier: "platinum" },
  // Diamond
  { id: "year_one", name: "Year One", desc: "365-day streak", icon: "✦", tier: "diamond" },
  { id: "kept_250", name: "250 Kept", desc: "250 clean days total", icon: "250", tier: "diamond" },
  { id: "reflective", name: "Reflective", desc: "Wrote a note every day for 14 days", icon: "✎", tier: "diamond" },
  { id: "reset_survivor", name: "Reset Survivor", desc: "Relapsed 10+ times but kept going 90+ days", icon: "✝", tier: "diamond" },
  { id: "archivist", name: "Archivist", desc: "Tracked for 365 days total (any state)", icon: "⊞", tier: "diamond" },
];

// Tag suggestions
export const TAG_CATEGORIES = {
  clean: ["Workout", "Good Sleep", "Meditated", "Social Win", "Read", "Cold Shower", "Sunlight"],
  relapse: ["Stress", "Boredom", "Social Media", "Insomnia", "Hangover", "Loneliness", "Tired"],
} as const;

export const TAG_SUGGESTIONS = [
  ...TAG_CATEGORIES.clean,
  ...TAG_CATEGORIES.relapse,
];

// Auto-tag keyword map
export const TAG_KEYWORD_MAP: Record<string, string> = {
  tired: "#Insomnia", exhausted: "#Insomnia", sleepy: "#Insomnia", awake: "#Insomnia",
  insomnia: "#Insomnia", "could not sleep": "#Insomnia",
  stressed: "#Stress", anxious: "#Stress", overwhelmed: "#Stress", worried: "#Stress",
  pressure: "#Stress", panic: "#Stress",
  bored: "#Boredom", boring: "#Boredom", "nothing to do": "#Boredom", idle: "#Boredom",
  instagram: "#SocialMedia", tiktok: "#SocialMedia", youtube: "#SocialMedia",
  twitter: "#SocialMedia", facebook: "#SocialMedia", reddit: "#SocialMedia", scrolling: "#SocialMedia",
  drunk: "#Hangover", hungover: "#Hangover", alcohol: "#Hangover", beer: "#Hangover",
  wine: "#Hangover", hangover: "#Hangover",
  lonely: "#Loneliness", alone: "#Loneliness", isolation: "#Loneliness",
  gym: "#Workout", workout: "#Workout", exercise: "#Workout", ran: "#Workout",
  lifted: "#Workout", run: "#Workout", jogging: "#Workout",
  meditated: "#Meditated", meditation: "#Meditated", mindful: "#Meditated", mindfulness: "#Meditated",
  "slept well": "#GoodSleep", rested: "#GoodSleep", "good sleep": "#GoodSleep", "slept great": "#GoodSleep",
  friends: "#SocialWin", party: "#SocialWin", family: "#SocialWin", socialized: "#SocialWin", "hung out": "#SocialWin",
  read: "#Read", book: "#Read", reading: "#Read",
  "cold shower": "#ColdShower", shower: "#ColdShower",
  sunlight: "#Sunlight", sun: "#Sunlight", outside: "#Sunlight",
};

// Affirmations & motivation quotes (mini feature)
export const AFFIRMATIONS = [
  "Discipline is choosing what you want most over what you want now.",
  "Every clean day is a brick in the cathedral of who you're becoming.",
  "The urge is a wave. You are the ocean beneath it.",
  "You don't break a streak — you simply begin a new one, wiser.",
  "What you resist, persists. What you accept, transforms.",
  "Small acts, repeated, become character.",
  "Today's victory is tomorrow's foundation.",
  "You are not your urges. You are what you choose to do with them.",
  "Restraint is a muscle. Every 'no' makes the next 'no' easier.",
  "The cave you fear to enter holds the treasure you seek.",
  "Pain is temporary. Quitting lasts forever.",
  "You will never regret a clean day. You will always regret a relapse.",
  "Become the kind of person your future self would thank.",
  "Boredom is the doorway. Don't flee through it.",
  "Energy follows discipline.",
];

export const POSTER_THEMES = ["archival", "gallery", "solstice"] as const;
export type PosterTheme = (typeof POSTER_THEMES)[number];
