"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

  // Синк хийгдэж байгаа эсэхийг хугацааны хоцрогдолгүй (synchronous) хянах
  const isSyncingRef = useRef(false);

  /**
   * Нийтлэг синк хийх загвар (Wrapper function)
   * Энэ нь бүх синк функцүүдэд ижил "хаалт" болон "төлөв" хянах боломжийг олгоно.
   */
  const executeSync = useCallback(async (syncFn: () => Promise<any>) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      console.log("Оффлайн горим: Дотоод датаг ашиглаж байна.");
      return;
    }

    if (isSyncingRef.current) {
      console.warn("Синк аль хэдийн явж байна, алгаслаа.");
      return;
    }

    isSyncingRef.current = true;
    setState("syncing");
    setLastError(null);

    try {
      const result = await syncFn();
      setState("success");

      // Амжилттай болсон төлөвийг 3 секундын дараа арилгах
      setTimeout(() => setState("idle"), 3000);
      return result;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Синк амжилтгүй боллоо";
      console.error("Синк алдаа:", msg);
      setLastError(msg);
      setState("error");

      // Алдааны төлөвийг 5 секундын дараа арилгах
      setTimeout(() => setState("idle"), 5000);
      if (syncFn !== runFullSync) throw error; // Ганцаарчилсан синк бол алдааг дамжуулна
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // 1. Бүх датаг бүтнээр синк хийх
  const sync = useCallback(async () => {
    if (window.location.pathname === "/setup") return;
    return await executeSync(runFullSync);
  }, [executeSync]);

  // 2. Ажилчдын мэдээлэл татах
  const syncEmployees = useCallback(async () => {
    return await executeSync(async () => {
      const count = await pullEmployees();
      await pullMealLocationOverrides();
      return count;
    });
  }, [executeSync]);

  // 3. Хоолны танхимын мэдээлэл татах
  const syncDiningHalls = useCallback(async () => {
    return await executeSync(pullDiningHalls);
  }, [executeSync]);

  // 4. Ахлах тогооч нарын мэдээлэл татах
  const syncChefs = useCallback(async () => {
    return await executeSync(pullChefs);
  }, [executeSync]);

  // 5. Байршлын тохиргоо татах
  const syncOverrides = useCallback(async () => {
    return await executeSync(pullMealLocationOverrides);
  }, [executeSync]);

  // 6. Лог мэдээллийг сервер рүү илгээх
  const syncMealLogs = useCallback(async () => {
    return await executeSync(pushMealLogs);
  }, [executeSync]);

  /**
   * Автомат синк хийх useEffect
   */
  useEffect(() => {
    // Программ асах үед шууд биш, 2 секундын дараа эхний синк-ийг хийнэ (UI-д ачаалал өгөхгүй)
    const initialTimer = setTimeout(() => {
      sync();
    }, 2000);

    // 10 минут тутамд автомат синк (600,000 ms)
    const interval = setInterval(() => {
      console.log("Автомат шинэчлэл эхэлж байна...");
      sync();
    }, 1200000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
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
