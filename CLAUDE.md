# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Offline-first PWA for canteen meal attendance tracking via USB barcode scanner and camera QR code. Dual-mode: fullscreen kiosk for scanning employee badges, and PIN-protected admin panel for configuration. All UI text is in **Mongolian (mn)**.

## Recent Work Summary (2026-02-14)

Latest in-progress kiosk updates (currently modified locally):

- `components/kiosk/chef-dashboard.tsx`
  - Made `today` reactive using `currentTime` + `useMemo` to avoid stale date issues.
  - Added manual employee sync trigger button (`Шинэчлэх`) with loading state via `useSync`.
  - Changed served-count query to use `where("date").equals(today)` + filter by meal/dining hall (avoids brittle compound-range behavior).
  - Minor layout improvements for tighter/responsive header behavior.

- `components/kiosk/confirmed-list-sidebar.tsx`
  - Improved overflow handling and list rendering for long names/IDs.
  - Added safer wrapping (`break-words`) and better badge/icon alignment.

- `components/kiosk/manual-entry.tsx`
  - Expanded dialog width for easier operator use.
  - Improved list text wrapping and right padding for readability.

- `components/kiosk/scan-screen.tsx`
  - Increased sidebar width (`w-80` → `w-96`) and added overflow control for stable kiosk layout.

Intent: improve operational reliability for live canteen scanning (reactive counts/date handling) and reduce UI clipping issues in the operator panel.

## Commands

```bash
npm run dev          # Dev server (Turbopack, PWA disabled)
npm run build        # Production build (uses --webpack flag, required for PWA)
npm run start        # Serve production build
npm run lint         # ESLint
npx shadcn add <component>  # Add shadcn/ui components (new-york style)
```

## Tech Stack Specifics

- **Next.js 16** (App Router) — uses Turbopack by default, but production build must use `--webpack` for PWA plugin compatibility
- **Supabase** — backend via `@supabase/supabase-js` with publishable key (anon). Config via `.env.local` or admin setup page
- **Zod v4** — always import from `"zod/v4"`, not `"zod"`
- **@ducanh2912/next-pwa v10** — `skipWaiting` goes inside `workboxOptions`, not at the plugin top level
- **Dexie.js v3** — `add()` on auto-increment tables returns `number | undefined`, cast to `number`. Cannot change primary keys between versions — must drop table (`null`) then recreate in next version
- **html5-qrcode** — camera QR scanning
- **Tailwind CSS v4** with shadcn/ui (new-york style, neutral base color, CSS variables)
- Path alias: `@/*` maps to project root

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
```

Env vars take priority. If empty, falls back to kioskConfig values set via Admin → Setup page.

## Architecture

### Data Flow

All reads/writes go to **IndexedDB via Dexie** first. Background sync handles Supabase communication:

```
User Action → Component → Hook → Dexie (IndexedDB) → Reactive UI update
                                       ↓ (background)
                                  SyncEngine → Supabase
```

### Sync Strategy

- **Server-wins** for master data: employees, dining halls, chefs, user meal configs are cleared and bulk-replaced on pull
- **Client-source-of-truth** for transactions: meal logs are pushed with `sync_key` upsert (ON CONFLICT DO NOTHING)
- Push runs before pull in full sync (protect local data)
- Sync errors are logged but never crash the app
- Heartbeat sent every 60s to `kiosks` table

### Provider Nesting Order (app/layout.tsx)

```
OnlineStatusProvider → DatabaseProvider → SyncProvider → {children}
```

`DatabaseProvider` seeds default data on first mount. `SyncProvider` auto-syncs on startup, when coming back online, and every 5 minutes.

### Database (lib/db/index.ts)

8 Dexie tables (v3 schema): `employees`, `userMealConfigs`, `mealLogs`, `mealTimeSlots`, `diningHalls`, `chefs`, `kioskConfig`, `syncLog`. The `mealLogs` table uses a compound index `[userId+mealType+date]` for duplicate detection.

**Schema versioning**: v1 → v2 (drop old tables with changed PKs) → v3 (recreate with new schema). Dexie does not support changing primary keys — always drop with `null` first.

### QR Code Format

Company QR codes are JSON: `{"id_card_number":"...", "bteg_id":..., "key":"..."}`. The scan handler parses JSON and extracts `id_card_number` for employee lookup. Plain barcode strings also work as fallback.

### Kiosk Scan Flow (components/kiosk/scan-screen.tsx)

Validation chain on scan:
1. Check active meal time → warning if none
2. Parse QR code (JSON → `id_card_number`, or plain text)
3. Lookup employee by `idcardNumber`, then `employeeCode`
4. Check employee active status
5. Get `userMealConfigs` → check meal location for current slot
6. Validate dining hall match
7. Check duplicate → Double Scan modal (option: add extra serving)
8. Create meal log → success overlay + sound

Unauthorized employees show a modal with [Approve Manually] option. Results display as full-screen colored overlays that auto-dismiss after 4 seconds.

### Chef Authentication

Chef login by PIN code on the main page (`/`). Validates against local Dexie `chefs` table. Active chef is stored in `kioskConfig`. No active chef → chef login screen is shown instead of kiosk.

### Per-Meal Dining Hall Validation

Each employee has a `userMealConfigs` record mapping meal types to dining hall IDs. The `MEAL_TYPE_COLUMN_MAP` in `lib/constants.ts` maps slot IDs to config columns. Snack type skips per-meal validation.

### State Management

No external state library. All persistent state lives in IndexedDB, accessed reactively via `useLiveQuery` from `dexie-react-hooks`. Context is only used for online status. Component-local state uses `useState`. Non-reactive values (barcode buffer, sync lock) use `useRef`.

### Barcode Scanner (hooks/use-barcode-scanner.ts)

USB scanners emit rapid keystrokes ending with Enter. The hook uses a 50ms keystroke threshold to distinguish scanner input from human typing. It ignores events when focus is inside form fields (INPUT/TEXTAREA/SELECT).

### Sound Feedback (hooks/use-scan-sound.ts)

Web Audio API oscillator-based sounds (no MP3 files). Three types: `success` (C5+E5+G5 sine), `error` (A4+F4 square), `warning` (A4 repeated).

### Admin (app/admin/)

All admin pages are behind `<PinGate>` (default PIN: 1234, configurable in kioskConfig). Pages: dashboard, setup (Supabase config, dining hall, device registration), meal-times, dining-hall (read-only from Supabase), chefs (CRUD with PIN, synced to Supabase), employees (read-only with meal config summary), records (with CSV export).

## File Structure

```
lib/db/           - Dexie schema (8 tables), seed data
lib/supabase/     - Supabase client singleton
lib/sync/         - Sync engine (pull/push via Supabase)
lib/schemas/      - Zod validation schemas
lib/constants.ts  - Config keys, meal slots, meal type mapping
lib/meal-type-map.ts - Meal slot → userMealConfigs column mapping
hooks/            - Online status, kiosk config, current meal, barcode scanner,
                    camera scanner, employees, meal logs, chef auth, scan sound, sync
components/kiosk/ - Scan screen, status bar, idle screen, confirmation overlay,
                    camera scanner, chef login, chef dashboard, manual entry,
                    scan modal, double-scan modal, heartbeat indicator
components/admin/ - Nav, pin gate, sync status card
components/providers/ - Database, online status, sync
app/admin/        - Dashboard, setup, meal-times, dining-hall, chefs, employees, records
```

## Conventions

- All page/component files use `"use client"` — this is a fully client-side app
- Mongolian UI text throughout; date/time formatting uses `"mn-MN"` locale
- Dates stored as `YYYY-MM-DD` strings, timestamps as ISO strings, times as `HH:mm` strings
- Configuration stored as key-value pairs in `kioskConfig` table (keys defined in `lib/constants.ts`)
- Toast notifications via `sonner` for user-facing feedback
- Generated PWA files (`sw.js`, `workbox-*.js`) in `/public/` are gitignored
- Supabase RLS: `chefs`, `kiosks`, `meal_logs` tables need public INSERT/UPDATE policies for kiosk (anon key) access
