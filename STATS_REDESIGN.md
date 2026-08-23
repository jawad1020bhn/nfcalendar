# Stats Section — Research-Driven Redesign

Scope: **Stats view only** (`src/components/tracker/stats-view.tsx`, plus one additive
helper in `src/lib/tracker/stats.ts`). No other view, the calendar vocabulary
(clean / slip / relapse), the data model, or the `Stats` type contract were
changed — so Today, Calendar, Poster, and Achievements are unaffected.

---

## 1. Research summary

What actually helps people in a recovery / habit calendar, grounded in the
behavioral-science and app-landscape sources reviewed:

- **Completion rate beats the streak counter for long-term motivation.** A single
  missed day does *not* materially affect habit formation (Lally et al., UCL
  2010). 80% consistency produces nearly identical long-term results to 100%.
  “37/38 days (97%)” keeps people going; “streak: 0” tempts them to quit. →
  *Clean rate* should be a first-class headline, and a broken streak must not
  read as catastrophic. [Habi](https://habi.app/tools/habit-tracker/),
  [cohorty](https://blog.cohorty.app/what-to-do-after-you-break-a-habit-streak-recovery-strategy/),
  [ehm-tech](https://www.ehm-tech.com/habit/blog/how-to-get-back-on-track-with-habits/).
- **Recovery speed, not perfection, is the durable signal.** Self-compassion
  after a setback produces better long-term outcomes than self-criticism
  (Neff); shame *extends* avoidance. The metric that matters is *how fast you
  begin again* (“never miss twice”). → Surface **bounce-back time**, framed as
  resilience.
- **Streak anxiety is the #1 reason people abandon tracker apps** (2020 CHI
  study). Anything that frames a slip as a verdict or labels the user “at risk”
  works *against* the goal.
- **Insight > vanity.** The genuinely useful analytics in this category are:
  current streak, best streak, total clean days, completion rate over windows,
  weekday/trigger patterns, and recovery speed. Scatter plots and cycle-length
  math add noise without insight.
- **Privacy is non-negotiable for this data.** This app already stores
  everything in `localStorage` with no account/server, so the Stats screen should
  *say so* (reassurance), and never suggest sharing.

---

## 2. Recommended stats to KEEP (reframed)

| Stat | Was | Now | Why |
|---|---|---|---|
| Current streak | Small “Streak” tile | **Hero** with milestone ring + supportive copy | The motivating anchor; pair with a kind next-target |
| Best streak | “Best” tile | “Best streak” (gold) glance tile + “personal best” line in hero | Proof the user can do it |
| Total clean days | “Clean” tile (count only) | “Days kept” with tooltip reframe | Cumulative effort that gaps don’t erase |
| Avg streak | “Average” tile | “Typical streak” glance tile | A honest, non-judgmental baseline |
| Total tracked days | Hidden | “Days tracked” glance tile | Tracking itself = progress |
| Week-over-week trend | Hidden (computed, never shown) | “Am I improving?” headline card | Daily-rhythm improvement signal |
| Bounce-back time | Hidden (computed, never shown) | “How fast you bounce back” card | The key *resilience* reframe |
| Trigger/tag patterns | Two separate, cold cards | One “Patterns in your notes” card | Answers “what helps / what’s hard” |
| Wellbeing (mood/energy/sleep) | Kept | Reframed as a check-in, not a score | Gentle context |
| Energy 30-day trend | Kept | CSS-var colors, reframed | One calm chart |
| Streak-length sparkline | “Avg streak trend” | “Your longer arc” (longer-time-scale improvement) | Complementary to the weekly view |
| Milestone progress | Buried in 3-badge list | “Focus next” card (one kind target) | Less gamified, more humane |

> Several of these (`weeklyTrend`, `bounceBack`, `repeatingTriggers`,
> `totalMarks`) were **already computed in `stats.ts` but never displayed**.
> This redesign surfaces the valuable ones and drops the rest.

---

## 3. Stats REMOVED and why

| Removed | Reason |
|---|---|
| **“Risk score”** (0–7, colored High/Mid/Low risk) | **Harmful.** Labels the user “high risk” and predicts relapse — the opposite of supportive. Pure anxiety with no action. |
| **“Relapsed” big-number card** (red count) | Guilt-tripping vanity metric; makes a reset read catastrophic. Folded into a calm, neutral day-breakdown. |
| **“Slips” standalone card** | Same — counting slips as a hero number is shame-adjacent. Now part of the balanced breakdown. |
| **“Danger days” framing** | “Danger”/“risk” language is fear-based. Kept the *insight* (weekday clustering), renamed to **“Your weekly rhythm”**. |
| **Median streak** | Redundant with average; adds analytics noise. |
| **Longest gap** | Niche, confusing vanity metric. |
| **Mood-vs-streak scatter plot** | Overcomplicated; noisy with sparse data; implies false causal claims. |
| **Streak survival funnel** | Can feel discouraging when most runs are short; low insight-per-pixel. |
| **“Next 3 achievements” progress list** | Over-gamified for this screen; replaced with one calm “Focus next” target. (Full achievements still reachable from **More**.) |

Wording changes throughout: *relapse → reset* (in stats copy), *fail → reset*,
removed “failure/relapsed/danger/risk” language in favor of *reset / restart /
recovery / consistency / pattern / fresh start*.

---

## 4. New stats ADDED and why

1. **“Am I improving?” card** — clean rate % for the window + this-week-vs-last-week
   delta, with self-compassionate microcopy for up/down/flat. Directly answers
   the user’s central question and de-catastrophizes a dip.
2. **“How fast you bounce back”** — average days to restart a streak after a reset.
   Turns resets from shame into a measurable resilience skill (the research-backed
   “recovery speed” signal).
3. **“Your weekly rhythm”** — clean vs. reset counts by weekday, reframed as
   “patterns to prepare for, not bad days.”
4. **“Focus next”** — one next streak milestone with progress (replaces the badge
   list). Calmer, more motivating.
5. **Milestone hero ring** — conic-gradient progress to the next milestone around
   the current-streak number.
6. **Privacy microcopy** — “Private — stays on this device” in the header and
   “Your data lives only in this browser” above the actions.
7. **Tooltips (ℹ) + microcopy on every card** — explains what each stat means and
   how to read it kindly (e.g. UCL finding that ~80% is excellent).

---

## 4b. Additional stats added (v2 — deeper research pass)

A second research pass surfaced four more genuinely useful, supportive stats —
all computed from data the app *already* records, all with empty states, and
all honoring “minimize friction / no obligation fatigue”:

| New stat | Why it helps |
|---|---|
| **18-week activity heatmap** (“Your journey”) | ~~Added in v2~~ — **removed at the user’s request** (the calendar already shows history, so the heatmap was redundant on Stats). The `ActivityHeatmap` component and its usage were deleted. |
| **Check-in streak** (consecutive days logged) | Rewards *showing up to track* — the “habit behind the habit.” Crucially it does **not** reset to zero after a hard day, directly countering streak anxiety. (1-day grace so an un-logged “today” isn’t a lapse.) |
| **Month over month** clean rate | A stable, easy-to-read rhythm for spotting longer trends (task-listed “monthly completion rate”). Delta vs last month with self-compassionate copy. |
| **Wellbeing on clean vs. harder days** | Daylio/Bearable-style association insight (avg mood/energy/sleep by day type). Directly answers “what patterns help me succeed.” Strictly framed as *association, not cause*; needs ≥2 ratings on each day type to appear. |

New domain helper added to `stats.ts`: **`getLoggingStreak()`** (pure, additive;
the `Stats` type and `calculateStats` are still untouched → zero risk to other
views). Logging-streak logic was unit-checked across 4 cases (today streak, 1-day
grace, lapsed, empty). Heatmap Monday-alignment verified.

---

## 4c. Additional stats added (v3 — momentum + personalized insights)

A third research pass (Loop's habit-strength score, the "chaser effect / one slip
doesn't ruin it" literature, and recovery-via-lengthening-gaps) added two more
zones — five new stats total, deliberately packed to avoid card sprawl:

| New stat | Why it helps |
|---|---|
| **Momentum (28 days)** | Loop-style habit strength: *"the psychological difference between 'streak is 0' and 'consistency is 85%' is profound."* Dips on a hard day but **never resets to zero** — recovers as you do. The flagship research-backed counter to streak anxiety. |
| **Insights → Slip-recovery rate** | % of slips whose next logged day was clean (you caught it before it escalated). Reframes slips as recoverable skill — directly counters the chaser effect. |
| **Insights → Reset gaps lengthening** | If the average time *between* resets is growing, that's progress — **even for users who still reset**. The most encouraging stat for someone struggling. |
| **Insights → Cleanest month** | Celebratory personal record ("March: 28/31 clean"). |
| **Insights → Hurdle day** | Personalized (not prescriptive) "your resets tend to land around day X" from the user's own data — framed as *where the habit is still wiring in*, never a verdict. Only appears with ≥3 qualifying resets. |

The **Insights card** is dynamic: it surfaces only the rows that have enough data,
prioritizes positive findings, and renders nothing (no empty card) until there's
something meaningful — keeping the page calm for new users.

New pure helpers in `stats.ts` (all additive, no type changes): `getMomentum()`,
`getSlipRecoveryRate()`, `getResetGapTrend()`, `getCleanestMonth()`. The hurdle
insight reuses the existing `weakestDay` field. All four helpers were unit-checked
(slip-recovery 75% 3/4; gap trend up 10→18; momentum 75% 21/28; cleanest-month
selection with the ≥7-day guard).

---

## 5. Final improved Stats structure

```
Your progress                      [ All | 90D | 30D ]
Private — stays on this device

(Empty state if no data)

 1. HERO             — current streak + milestone ring + supportive narrative
 2. MOMENTUM (28d)   — Loop-style consistency score that recovers, never resets
 3. AT A GLANCE      — Best streak · Days kept · Typical streak · Days tracked
 4. CHECK-IN STREAK  — consecutive days logged (rewards showing up; never zeroes)
 5. AM I IMPROVING?  — clean-rate % (window) + this-week vs last-week delta
 6. MONTH OVER MONTH — this month vs last month clean rate, with delta
 7. YOUR LONGER ARC  — are streaks getting longer over time? (sparkline)
 8. BOUNCE BACK      — avg days to restart after a reset (resilience)
 9. DAYS IN BALANCE  — clean / slip / reset, neutral stacked bar
10. WEEKLY RHYTHM    — clean & reset counts by weekday (reframed)
11. INSIGHTS         — dynamic, personalized findings (slip-recovery, gap trend,
                       cleanest month, hurdle day) — only shows what’s relevant
12. PATTERNS         — tags on clean days vs “worth noticing” (if notes exist)
13. WELLBEING        — mood / energy / sleep averages (if ratings exist)
    WELLBEING BY DAY TYPE — avg ratings on clean vs harder days (if ratings exist)
    ENERGY 30D      — gentle trend line (if ratings exist)
14. REFLECTIONS      — tags from weekly check-ins (if reflections exist)
15. FOCUS NEXT       — next milestone + link to full achievements

Your data lives only in this browser…
[ Retract ] [ Poster ] [ Backup ] [ Restore ] [ Erase ]
```

Each card: title + ℹ tooltip + supportive microcopy. Conditional sections only
appear when the underlying data exists, so a new user sees a calm, non-empty
scaffold rather than a wall of zeroes.

---

## 6. UI/UX recommendations (applied)

- **Calm, scannable:** consistent `m3-card` surface, M3 tokens, one accent
  (primary green) for the hero; red used only as a *muted* data color, never as a
  headline verdict.
- **Not judgmental:** no “failure/relapsed/danger/risk” copy; resets framed as
  information and as a recovery skill.
- **Not over-gamified:** dropped the badge-collection list on this screen; kept a
  single kind milestone target (badges still live under More).
- **Privacy-forward:** explicit on-device reassurance; no share/leaderboard nudge.
- **Empty states:** top-level empty + per-card empty/teaching copy, so sparse data
  never looks broken.
- **Tooltips/microcopy:** every potentially-confusing stat explains itself and how
  to read it kindly.
- **Motion:** kept the existing shimmer skeleton + 250ms settle on window change.

### Out-of-scope note (recommend, did **not** change)
`today-view.tsx` shows “typical dopamine reset window / 90 days,” which is a soft
health claim. The task scoped changes to **Stats only**, so it was left intact —
but it’s worth softening to “a common early-recovery milestone” elsewhere later.

---

## 7. Implementation

- `src/lib/tracker/stats.ts` — added **`getNextMilestone()`** (pure, additive;
  repaired an unrelated `getCurrentLevel` declaration along the way). The
  `Stats` type and `calculateStats` are unchanged → zero risk to Today, Calendar,
  Poster, Achievements.
- `src/components/tracker/stats-view.tsx` — fully rewritten around the structure
  above. Reuses the app’s existing M3 design system, color tokens, and the
  already-computed-but-unused stats fields.

Verification: `npm run typecheck` ✓ · `npm run lint` (stats files: 0/0) ✓ ·
`npm run build` ✓ · dev server returns HTTP 200 with no errors · milestone edge
cases (0, at-milestone, cleared-board) unit-checked.

---

## 8. Testing checklist

**Functional**
- [ ] Fresh install / empty data → friendly empty state, no zeroes wall.
- [ ] Mark 1 clean day → hero shows “1 day clean”, glance populates, “Am I
      improving?” shows clean-rate.
- [ ] Build a streak to a milestone (e.g. 7) → hero ring fills, Focus next
      advances to the next milestone (X / 10).
- [ ] Mark a reset → current streak → 0, hero switches to “A fresh start … days
      since last reset”, Recovery card eventually shows bounce-back after a
      7-clean recovery.
- [ ] Time windows All / 90D / 30D → numbers and “days tracked” update; skeleton
      shows briefly.
- [ ] Add `#tags` on clean vs reset days → Patterns card shows both groups.
- [ ] Rate mood/energy/sleep → Wellbeing + Energy trend render.
- [ ] Weekly reflection with `#tags` → Reflections card renders.

**v2 stats**
- [ ] Heatmap renders last ~18 weeks, Monday-aligned, with legend; squares
      color by clean/slip/reset; future days are empty outlines.
- [ ] Check-in streak counts consecutive logged days; survives a 1-day gap
      (today un-logged, yesterday logged) but reads 0 after a >1-day lapse.
- [ ] Month over month shows two bars + delta chip; handles missing month data
      gracefully (shows “—”, no NaN).
- [ ] Wellbeing-by-day-type appears only with ≥2 ratings on each day type;
      otherwise shows the teaching empty state.
- [ ] Backup downloads JSON; Restore re-imports it; Retract undoes last mark;
      Erase clears with confirm.

**Edge / correctness**
- [ ] User between streaks (best>0, current=0) → Focus next says “between
      streaks … add one more clean day” (never falsely claims top milestone).
- [ ] User at exactly a milestone (e.g. 30) → next target is 50, progress 0.
- [ ] Cleared the top milestone (≥365) → “new territory” copy, ring full.
- [ ] All three day-types zero for a card → card hides or shows teaching empty
      state (no NaN/`÷0`).
- [ ] Canvas energy chart reads theme CSS vars (light + dark).

**Supportive-language sweep**
- [ ] No occurrence of “failure / failed / danger / risk score / relapsed (as a
      verdict)” in the Stats copy; “reset/restart/recovery/consistency/pattern”
      used instead.
- [ ] No social/share/leaderboard prompt; privacy line present.

**Regression (unchanged views still work)**
- [ ] Today view still shows streak + “since relapse” metric.
- [ ] Calendar still marks clean/slip/relapse with same colors.
- [ ] Poster + Achievements sheets still open and compute stats.
