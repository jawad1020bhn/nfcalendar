# The Daily Tracker — NoFap Tracking App Rebuild

## Project Context
Rebuilding the user's uploaded "The Daily Tracker" (a NoFap tracking app) as a polished
Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui application.

The original is a single-file HTML/CSS/JS app with an archival/editorial aesthetic:
- Dark paper background (#181716) + warm ink (#EAE6DF), Instrument Serif display + Epilogue UI fonts
- Annual calendar grid (color-coded days: Clean / Slip / Relapse / Unmarked / Today)
- Streak tracking with Roman milestones (VII, XIV, XXX, ...) and levels (Bronze→Diamond)
- 35 achievements across 5 tiers
- Notes sidebar with search, tags, autocomplete, templates, mood/energy/sleep ratings
- Rich stats overlay (streak, best, avg, median, velocity, distribution, danger days, risk score, monthly compare)
- Poster export, JSON/CSV export/import, theme toggle, PWA support

## Rebuild Goals
- Same archival aesthetic, but cleaner / less exaggerated ornament
- Fully responsive (desktop + mobile) with sticky footer
- Zustand store with localStorage persistence (private, on-device)
- Add mini features: daily affirmation, breathing exercise, milestone progress, urge-surfing timer, sobriety calculator, "why I started" reminder, mood trends mini-chart

## Architecture
- `src/lib/tracker/types.ts` — types & constants (achievements, milestones, levels)
- `src/lib/tracker/dates.ts` — date helpers
- `src/lib/tracker/stats.ts` — stats calculations (streak, velocity, distribution, danger days, risk score, etc.)
- `src/lib/store.ts` — Zustand store with persist middleware
- `src/app/layout.tsx` — fonts, ThemeProvider, Toaster
- `src/app/globals.css` — archival design tokens
- `src/app/page.tsx` — main page (single user-visible route)
- `src/components/tracker/*` — UI components

---
Task ID: 0
Agent: main (orchestrator)
Task: Initial planning & foundation scaffolding

Work Log:
- Read uploaded index.html, styles.css, app.js, SKILL.md to understand original design & logic
- Inspected Next.js scaffold (layout.tsx, page.tsx, globals.css, package.json)
- Designed rebuild architecture (Zustand + localStorage, modular tracker components)
- Created this worklog.md

Stage Summary:
- Foundation scaffolding ready to begin
- Next: write globals.css with archival tokens, layout with Instrument Serif + Epilogue fonts, theme provider

---
Task ID: 1-8
Agent: main (orchestrator)
Task: Full rebuild of The Daily Tracker as Next.js 16 + TypeScript app

Work Log:
- Foundation: globals.css with archival design tokens (dark paper #181716, warm ink, hairline borders, glass surfaces, grain overlay, day-cell states, animations). layout.tsx with Instrument Serif + Epilogue fonts, ThemeProvider (next-themes), Sonner toaster, PWA manifest, viewport with safe-area.
- Domain layer: src/lib/tracker/types.ts (DayState, milestones, levels, 35 achievements, tag categories, affirmations), dates.ts (date helpers), stats.ts (streak/best/avg/median/velocity/distribution/danger-days/risk-score/month-compare/relapse-cycle + checkAchievements with 35 detection rules + extractNoteTags).
- Store: src/lib/store.ts — Zustand with persist middleware to localStorage, entries/notes/ratings/templates/unlockedAchievements/seenMilestones/whyStarted/currentYear, actions (setDay, cycleDay, clearDay, setNote, setRating, addTemplate, importData, exportData, resetAll, snapshot/restoreSnapshot for undo), escalateSlips helper, useHydrated hook.
- UI Context: src/components/tracker/ui-context.tsx — single source of truth for which dialog/sheet is open (stats/achievements/poster/why/urge/breathing/note) + notesListOpen + jumpToToday.
- Core view: Masthead (year + switcher + quick stats with level badge + milestone progress bar), Legend, CalendarGrid (12-month responsive grid, tap to cycle clean→slip→relapse, double-tap/double-click for note, right-click context menu, today highlight + jump-to-today, milestone Roman numerals on qualifying days, has-note dots).
- Navigation: FloatNav (desktop top-right glass bar with Today/Stats/Notes/Awards/Breathe/Urge/Why/Poster + theme toggle), MobileNav (bottom bar with Today/Stats/Notes/Awards + More sheet for Breathe/Urge/Why/Poster/Theme).
- Notes: NotesSidebar (desktop slide-in aside on lg+, mobile Sheet; search, date-range filter, tag rail with counts, sorted note cards, "Log today" FAB).
- NoteModal: Dialog with pretty date header, mood/energy/sleep 5-dot ratings, quick tag chips, textarea with #autocomplete (arrow keys + enter), auto-suggested tags from keyword map, templates (save current / apply / delete).
- StatsDialog: Crest (days since last relapse), 8-card core grid, secondary metrics (bounce-back, weekly trend), month comparison bars, streak velocity, distribution chart, repeating triggers, relapse cycle, weakest day, risk score, danger-days bar chart, 30-day sparkline canvas, wellbeing trends canvas (mood/energy/sleep lines), monthly trend canvas, action buttons (retract/poster/JSON/CSV/import/reset).
- AchievementsDialog: 1/35 counter, level crest with next-tier hint, 5 tier sections (bronze/silver/gold/platinum/diamond) each with badge cards (locked = lock icon + opacity, unlocked = tier gradient + achievement icon).
- PosterDialog: Live preview, composition toggles (stats/notes/legend), period select (full year or specific month), 3 themes (archival/gallery/solstice), canvas-based PNG generation with month grids, day cells, today marker, legend.
- Mini features: TodayPanel (streak hero + 90-day rewiring progress + daily affirmation + sobriety calculator [time saved, days clean, days since relapse] + quick actions + why-started reminder), BreathingDialog (4-4-6-2 box breathing with pulsing circle + phase indicators + cycle counter), UrgeSurfingDialog (10-min timer with progress ring + daily affirmation + urge-surfing steps), WhyStartedDialog (textarea to save personal reason).
- Watchers: useMilestoneWatcher (toasts newly unlocked achievements + milestone crossings, skips first run), useKeyboardShortcuts (T today, N note, S stats, A awards, / notes, ⌘Z retract).
- Sticky footer: colophon with usage hint + keyboard shortcut legend.

Verification (agent-browser):
- Page loads HTTP 200, no console errors, no runtime errors
- Computed styles confirm dark archival theme (bg #181716, text #EAE6DF)
- Clicked today's cell (July 10) → marked clean (state 1), persisted to localStorage, streak updated to 1
- Stats dialog opens, shows streak=1, best=1, clean=1, ratio=100%
- Notes sidebar opens with empty state
- Breathing dialog: Begin button starts 4-4-6-2 countdown timer
- Achievements dialog: 1/35 unlocked (First Mark), all 5 tiers render
- Poster dialog: all composition/period/theme options render
- Mobile (iPhone 14): bottom nav renders, More sheet shows all extra actions
- Theme toggle works (dark ↔ light)
- Lint: 0 errors, 2 warnings (in uploaded original app.js, not our code)
- Dev server: all GET / 200, no errors after initial fast-refresh fix

Stage Summary:
- Complete NoFap tracking app rebuilt with archival aesthetic, fully responsive
- All original features ported + new mini-features (breathing, urge surfing, why-started, sobriety calculator, 90-day rewiring progress, daily affirmation)
- Zustand + localStorage persistence (private, on-device)
- 35 achievements with auto-detection, Roman milestones with toast notifications
- Keyboard shortcuts, accessibility (aria-labels, focus rings, semantic HTML), reduced-motion support
- Sticky footer, responsive layout (mobile bottom-nav + desktop float-nav)
- Next: create 15-min recurring webDevReview cron for ongoing improvements
