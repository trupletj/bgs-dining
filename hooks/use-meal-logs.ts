"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealLog } from "@/lib/db";

interface MealLogFilters {
  date?: string;
  mealType?: string;
  diningHallId?: number | null;
}

export function useMealLogs(filters: MealLogFilters = {}) {
  const logs = useLiveQuery(() => {
    return db.mealLogs
      .orderBy("scannedAt")
      .reverse()
      .toArray()
      .then((results) =>
        results.filter((r) => {
          if (filters.date && r.date !== filters.date) return false;
          if (filters.mealType && r.mealType !== filters.mealType) return false;
          if (filters.diningHallId && r.diningHallId !== filters.diningHallId)
            return false;
          return true;
        }),
      );
  }, [filters.date, filters.mealType, filters.diningHallId]);

  return {
    logs: logs ?? [],
    isLoading: logs === undefined,
  };
}

export function useTodayMealLogCount(diningHallId?: number | null) {
  const today = new Date().toISOString().split("T")[0];

  const count = useLiveQuery(() => {
    if (diningHallId) {
      return db.mealLogs
        .where("date")
        .equals(today)
        .filter((l) => l.diningHallId === diningHallId)
        .count();
    }
    return db.mealLogs.where("date").equals(today).count();
  }, [diningHallId, today]);

  return count ?? 0;
}

export function usePendingSyncCount() {
  const count = useLiveQuery(() =>
    db.mealLogs.where("syncStatus").equals("pending").count(),
  );
  return count ?? 0;
}

export async function checkDuplicateMealLog(
  userId: string,
  mealType: string,
  idcardNumber?: string,
): Promise<MealLog | undefined> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  if (userId && userId !== "") {
    return await db.mealLogs
      .where("userId")
      .equals(userId)
      .and((log) => log.mealType === mealType && log.scannedAt > sixHoursAgo)
      .first();
  }

  if (idcardNumber) {
    return await db.mealLogs
      .where("idcardNumber")
      .equals(idcardNumber)
      .and((log) => log.mealType === mealType && log.scannedAt > sixHoursAgo)
      .first();
  }

  return undefined;
}

export async function createMealLog(log: Omit<MealLog, "id">): Promise<number> {
  const id = await db.mealLogs.add(log);
  return id as number;
}
