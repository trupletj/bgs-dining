# Kiosk Duplicate Scan Context

Use this note when starting a new Codex/agent session about the `bgs-dining` kiosk duplicate-scan issue.

## Short Prompt To Start A New Session

```
Please read /home/aagiihhz/bgs-dining/KIOSK_DUPLICATE_CONTEXT.md first.

I need help with the bgs-dining kiosk duplicate scan behavior. One dining hall can have two kiosks. If the same employee scans the same meal on both kiosks, the second scan currently appears to be ignored on the server because both kiosks generate the same sync_key. I want to decide and implement the correct behavior, likely making the second cross-kiosk scan an extra serving instead of losing it.
```

## Current Finding

- Repo: `/home/aagiihhz/bgs-dining`
- App type: offline-first Next.js kiosk PWA using Dexie locally and Supabase sync.
- Local duplicate detection is per kiosk only because it checks that kiosk's local IndexedDB.
- Normal meal log `syncKey` is generated as:
  - regular employee: `${userId}-${mealType}-${date}`
  - extra serving: `${baseKey}-extra-${Date.now()}`
- Supabase push uses:
  - `.upsert(rows, { onConflict: "sync_key", ignoreDuplicates: true })`
- Because normal `syncKey` does not include `deviceUuid` or `diningHallId`, two kiosks scanning the same employee for the same meal/date generate the same key. The second server push is ignored if the first one already exists.

## Important Files

- `components/kiosk/scan-screen.tsx`
  - `doCreateLog()` builds `syncKey`.
  - Duplicate modal creates extra serving only when the current kiosk detects a local duplicate.
- `hooks/use-meal-logs.ts`
  - `checkDuplicateMealLog()` checks only local Dexie records from the last 6 hours.
- `lib/sync/sync-engine.ts`
  - `pushMealLogs()` upserts local pending logs to Supabase with `onConflict: "sync_key", ignoreDuplicates: true`.
- `lib/db/index.ts`
  - Dexie `mealLogs` schema has indexes including `[userId+mealType+date]` and `syncKey`.

## User-Specific Verification From 2026-05-27

Checked Supabase REST with publishable key for `bteg_id = 5200` on `2026-05-27`.

Existing rows found:

- breakfast, `dining_hall_id = 13`, `device_uuid = e16965ba-6725-412c-8a94-b35f386b6914`
- lunch, `dining_hall_id = 13`, `device_uuid = 270b986f-ff40-4071-99fd-b8bb4b4a1468`

The lunch row's normal `sync_key` shape was:

```text
29170b49-e6fa-423f-8a0c-a013b1ed0c79-lunch-2026-05-27
```

This confirms different meal types can coexist, but same user + same meal type + same date across two kiosks likely conflicts.

## Likely Product Decision Needed

Clarify desired behavior for same employee, same meal, same day, same dining hall, different kiosk:

1. Treat second cross-kiosk scan as duplicate and show/record nothing.
2. Treat second cross-kiosk scan as extra serving (`is_extra_serving = true`, counted as `0.5` in reports).
3. Allow multiple normal scans per kiosk/device by including `deviceUuid` in normal `syncKey`.

Recommended default: option 2, because the user said one dining hall can have two kiosks and the second scan should not be silently lost.

## Implementation Direction If Option 2 Is Chosen

- Keep local duplicate modal behavior for same-kiosk duplicate scans.
- Add server-aware handling for cross-kiosk duplicate scans:
  - Before creating a normal log, query Supabase for an existing normal log for `user_id + meal_type + date` or `bteg_id + meal_type + date`.
  - If found, create the new local log as `isExtraServing: true` with an extra `syncKey`.
  - If offline or Supabase unavailable, keep current local behavior and rely on sync conflict handling.
- Also consider improving sync conflict handling:
  - If a pending normal log is ignored because `sync_key` already exists on server, convert/retry it as an extra serving instead of marking it synced silently.

## Caution

- Do not use service-role secrets in the kiosk app.
- The kiosk only has a publishable key, so any server duplicate check must work through allowed Supabase REST/RLS policies.
- Extra serving counts as `0.5` in reporting logic.
