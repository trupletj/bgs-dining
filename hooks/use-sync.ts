"use client";

import { useState, useCallback } from "react";
import {
  runFullSync,
  pullEmployees,
  pullDiningHalls,
  pullChefs,
  pushMealLogs,
} from "@/lib/sync/sync-engine";

export type SyncState = "idle" | "syncing" | "success" | "error";

export function useSync() {
  const [state, setState] = useState<SyncState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (state === "syncing") return;
    setState("syncing");
    setLastError(null);

    try {
      const results = await runFullSync();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
      return results;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setLastError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  }, [state]);

  const syncEmployees = useCallback(async () => {
    setState("syncing");
    try {
      const count = await pullEmployees();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
      return count;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setLastError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
      throw error;
    }
  }, []);

  const syncDiningHalls = useCallback(async () => {
    setState("syncing");
    try {
      const count = await pullDiningHalls();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
      return count;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setLastError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
      throw error;
    }
  }, []);

  const syncChefs = useCallback(async () => {
    setState("syncing");
    try {
      const count = await pullChefs();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
      return count;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setLastError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
      throw error;
    }
  }, []);

  const syncMealLogs = useCallback(async () => {
    setState("syncing");
    try {
      const count = await pushMealLogs();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
      return count;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      setLastError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
      throw error;
    }
  }, []);

  return {
    state,
    lastError,
    sync,
    syncEmployees,
    syncDiningHalls,
    syncChefs,
    syncMealLogs,
  };
}
