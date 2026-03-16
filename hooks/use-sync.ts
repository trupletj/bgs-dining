"use client";

import { useState, useCallback, useEffect } from "react";
import {
  runFullSync,
  pullEmployees,
  pullDiningHalls,
  pullChefs,
  pullMealLocationOverrides,
  pushMealLogs,
} from "@/lib/sync/sync-engine";

export type SyncState = "idle" | "syncing" | "success" | "error";

export function useSync() {
  const [state, setState] = useState<SyncState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  // const sync = useCallback(async () => {
  //   if (state === "syncing") return;
  //   setState("syncing");
  //   setLastError(null);

  //   try {
  //     const results = await runFullSync();
  //     setState("success");
  //     setTimeout(() => setState("idle"), 3000);
  //     return results;
  //   } catch (error) {
  //     const msg = error instanceof Error ? error.message : "Sync failed";
  //     setLastError(msg);
  //     setState("error");
  //     setTimeout(() => setState("idle"), 5000);
  //   }
  // }, [state]);

  const sync = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      console.log("Offline mode: Using local cached data.");
      return;
    }
    if (window.location.pathname === "/setup") return;
    let isAlreadySyncing = false;
    setState((prev) => {
      if (prev === "syncing") {
        isAlreadySyncing = true;
        return prev;
      }
      return "syncing";
    });

    if (isAlreadySyncing) return;

    setLastError(null);

    try {
      const results = await runFullSync();
      if (results.isOffline) {
        setState("idle"); // Амжилттай гэж харуулах хэрэггүй
        return;
      } else {
        setState("success");
        setTimeout(() => setState("idle"), 3000);
      }
      return results;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      console.error("Sync error:", msg);
      setLastError(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  }, []); // [] Хоосон dependency - функц дахин үүсэхгүй

  const syncEmployees = useCallback(async () => {
    setState("syncing");
    try {
      const count = await pullEmployees();
      await pullMealLocationOverrides();
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

  const syncOverrides = useCallback(async () => {
    setState("syncing");
    try {
      const count = await pullMealLocationOverrides();
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

  useEffect(() => {
    sync();
    const interval = setInterval(() => {
      console.log("Автомат шинэчлэл эхэлж байна...");
      sync();
    }, 600000);

    return () => clearInterval(interval);
  }, [sync]);

  return {
    state,
    lastError,
    sync,
    syncEmployees,
    syncDiningHalls,
    syncChefs,
    syncOverrides,
    syncMealLogs,
  };
}
