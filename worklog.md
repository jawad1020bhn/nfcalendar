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
