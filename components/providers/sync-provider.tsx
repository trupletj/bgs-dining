"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import {
  pullCurrentMealLogCache,
  pushMealLogs,
  runFullSync,
  sendHeartbeat,
} from "@/lib/sync/sync-engine";
import {
  getLocalDate,
  SYNC_INTERVAL_MS,
  MEAL_LOG_PUSH_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  KIOSK_CONFIG_KEYS,
} from "@/lib/constants";
import { db } from "@/lib/db";

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useOnlineStatus();
  const { currentMeal } = useCurrentMeal();
  const currentMealType = currentMeal?.mealType ?? null;
  const syncInProgress = useRef(false);
  const pushInProgress = useRef(false);
  const cachePullInProgress = useRef(false);

  const hasSupabaseConfig = useCallback(async () => {
    const hasEnv = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    );
    if (hasEnv) return true;

    const supabaseUrl = await db.kioskConfig.get(
      KIOSK_CONFIG_KEYS.SUPABASE_URL,
    );
    return Boolean(supabaseUrl?.value);
  }, []);

  const doSync = useCallback(async () => {
    if (syncInProgress.current) return;

    if (!(await hasSupabaseConfig())) return;

    syncInProgress.current = true;
    try {
      await runFullSync();
    } catch (e) {
      console.error("Auto-sync failed:", e);
    } finally {
      syncInProgress.current = false;
    }
  }, [hasSupabaseConfig]);

  const doPushMealLogs = useCallback(async () => {
    if (pushInProgress.current || syncInProgress.current) return;
    if (!(await hasSupabaseConfig())) return;

    pushInProgress.current = true;
    try {
      await pushMealLogs();
    } catch (e) {
      console.error("Meal log push failed:", e);
    } finally {
      pushInProgress.current = false;
    }
  }, [hasSupabaseConfig]);

  const doPullCurrentMealLogCache = useCallback(async () => {
    if (cachePullInProgress.current || !currentMealType) return;
    if (!(await hasSupabaseConfig())) return;

    const hallConfig = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
    if (!hallConfig?.value) return;

    cachePullInProgress.current = true;
    try {
      await pullCurrentMealLogCache({
        diningHallId: Number(hallConfig.value),
        date: getLocalDate(),
        mealType: currentMealType,
      });
    } catch (e) {
      console.error("Current meal log cache pull failed:", e);
    } finally {
      cachePullInProgress.current = false;
    }
  }, [currentMealType, hasSupabaseConfig]);

  // Sync on startup
  useEffect(() => {
    doSync();
  }, [doSync]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      doSync();
      doPushMealLogs();
      doPullCurrentMealLogCache();
    }
  }, [doPullCurrentMealLogCache, doPushMealLogs, doSync, isOnline]);

  // Periodic sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        doSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [doSync, isOnline]);

  // Push pending meal logs more frequently than full sync.
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        doPushMealLogs();
      }
    }, MEAL_LOG_PUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [doPushMealLogs, isOnline]);

  // Refresh cross-kiosk duplicate cache for the active meal.
  useEffect(() => {
    if (isOnline) {
      doPullCurrentMealLogCache();
    }

    const interval = setInterval(() => {
      if (isOnline) {
        doPullCurrentMealLogCache();
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [doPullCurrentMealLogCache, isOnline]);

  // Periodic heartbeat (separate, more frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline]);

  return <>{children}</>;
}
