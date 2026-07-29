# Steady — a calm streak tracker

A client-side PWA for tracking daily habits and recovery streaks. Mark each day
as **clean**, a **slip**, or a **relapse**; write free-text journal notes with
`#tags`; and watch your stats, streaks, and achievements build over time. All
data lives in `localStorage` — no account, no server.

## Features

- **Today / Calendar / Stats / More** views with bottom navigation and a quick-add FAB.
- **M3 (Material Design 3 Expressive)** design system implemented from the ground
  up in Tailwind v4 — tonal surfaces, shape scale, spring motion tokens, dynamic
  color from a user-chosen seed, light + dark themes.
- **Starter toolbox:** 4-4-6-2 box breathing, urge surfing, weekly reflections,
  "why I started", shareable milestone posters.
- **Stats engine:** current/best/average/median streak, weekly trend,
  month-over-month comparison, risk score, weakest streak day, danger days of
  the week, streak survival funnel, repeating `#tags`, XP levels.
- **Achievement system** across Bronze / Silver / Gold / Platinum / Diamond tiers.
- **Installable PWA:** service worker with network-first navigation,
  stale-while-revalidate assets, offline fallback, manifest shortcuts, maskable
  icons, iOS home-screen badge support.
- **Export/Import JSON**, undo snapshot, keyboard shortcuts (`T/C/S/N/A/R`,
  Ctrl/Cmd+Z).

## Stack

| Layer      | Tool                                |
| ---------- | ----------------------------------- |
| Framework  | Next.js 16 (App Router, React 19)   |
| Styling    | Tailwind CSS v4 + custom M3 tokens  |
| Primitives | Radix UI Dialog (for bottom sheets) |
| State      | Zustand + `persist` middleware      |
| Toasts     | Sonner                              |
| Icons      | `lucide-react`                      |
| Build      | standalone output (Node server)     |

## Scripts

```
npm install          # install deps
npm run dev          # dev server on http://localhost:3000
npm run build        # production build (Vercel / Node server)
npm run start        # start the built app in production mode
npm run build:standalone   # self-contained server (Docker / VPS)
npm run start:standalone   # run the standalone output
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

`build:standalone` copies `public/` and `.next/static/` into `.next/standalone/`
so the standalone server can be deployed with just that folder. Most people
won't need it.

## Deploy to Vercel

This project is a standard Next.js 16 app and deploys to Vercel with zero
configuration.

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjawad1020bhn%2Fnfcalendar)

### Manual steps

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. **Framework preset:** Next.js (auto-detected).
4. **Build command:** `npm run build` (the default).
5. **Environment variables:** none required. The app runs 100% client-side.
6. Click **Deploy**.

### Optional env vars

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL of your deployment (used for Open Graph metadata). Auto-detected from `VERCEL_PROJECT_PRODUCTION_URL` when unset. |

### What `vercel.json` does for you

- Serves `/sw.js` with `Cache-Control: no-cache` so service-worker updates are
  picked up immediately (browsers can otherwise serve stale SWs for 24h).
- Adds `Service-Worker-Allowed: /` so the SW can control the whole origin.
- Serves `manifest.webmanifest` with the `application/manifest+json` content type
  (PWA install prompt requires this).

### Vercel notes

- **No server/API routes exist.** The repo previously shipped a dead Prisma/API
  scaffold — it has been removed, so Vercel will not spin up serverless
  functions for data access. All data stays in `localStorage` in the browser.
- **Output is static** (the `/` route prerenders at build time as static HTML),
  so the site can also be served from any static host, but Vercel handles the
  Next.js runtime (RSC/hydration/streaming) out of the box.
- **Service worker:** the SW is in `public/sw.js` and registered at runtime by
  `components/service-worker-register.tsx`. It works fine on Vercel's edge CDN —
  the headers in `vercel.json` make sure it updates promptly.

## Data & Privacy

Everything is stored in your browser under the `daily-tracker-v1` localStorage
key. There is no backend. Use **Export** (from Stats) periodically to back up.
The export is a plain JSON file that can be re-imported from the same screen.

## Project layout

```
src/
  app/
    layout.tsx         Root layout (fonts, theme, SW registration)
    page.tsx           Single-page shell (app bar, routing, overlays)
    globals.css        Tailwind + M3 design tokens + components
  components/
    tracker/           The app: today-panel, calendar-grid, sheets, …
    ui/                Minimal primitives: dialog, sonner
    theme-provider.tsx next-themes wrapper
    service-worker-register.tsx
  lib/
    store.ts           Zustand store (entries, notes, reflections, settings)
    tracker/
      dates.ts         Timezone-safe date helpers
      stats.ts         All streak + statistics calculations
      types.ts         Day states, achievements, levels, tags
      tag-taxonomy.ts  Tag tree and suggestion logic
      dynamic-color.ts M3 tonal palette generator (light + dark)
      markdown.ts      HTML-escaped note renderer (bold/italic/links/#tags)
    utils.ts           `cn` helper
public/
  sw.js              Service worker (caching strategies)
  manifest.webmanifest
  icon-*.png         App icons (192, 512, maskable)
  offline.html
```

## Notes on the design

- The streak counter tolerates up to 1 unmarked day (MAX_UNMARKED_GAP in
  `lib/tracker/stats.ts`) so that forgetting to tap one day doesn't instantly
  nuke a long streak. Two slip marks within 7 days auto-escalate the second to
  a relapse (`setDay`/`cycleDay` in `store.ts`).
- Dynamic color is generated by converting a seed hex to HSL and applying M3
  tonal roles; it reacts to theme (light/dark) changes through a
  `MutationObserver` on `<html>`.
- Bottom sheets are built on top of Radix Dialog with a `sheet` variant
  (`components/ui/dialog.tsx`) plus a custom swipe-down-to-dismiss handler in
  `sheet-manager.tsx`.
