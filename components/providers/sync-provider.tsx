"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { runFullSync, sendHeartbeat } from "@/lib/sync/sync-engine";
import { SYNC_INTERVAL_MS, HEARTBEAT_INTERVAL_MS, KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { db } from "@/lib/db";

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useOnlineStatus();
  const syncInProgress = useRef(false);

  const doSync = async () => {
    if (syncInProgress.current) return;

    // Check if Supabase is configured (env vars or kioskConfig)
    const hasEnv = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
    if (!hasEnv) {
      const supabaseUrl = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.SUPABASE_URL);
      if (!supabaseUrl?.value) return;
    }

    syncInProgress.current = true;
    try {
      await runFullSync();
    } catch (e) {
      console.error("Auto-sync failed:", e);
    } finally {
      syncInProgress.current = false;
    }
  };

  // Sync on startup
  useEffect(() => {
    doSync();
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      doSync();
    }
  }, [isOnline]);

  // Periodic sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        doSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline]);

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
