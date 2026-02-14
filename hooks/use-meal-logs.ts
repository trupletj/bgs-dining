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
          if (filters.diningHallId && r.diningHallId !== filters.diningHallId) return false;
          return true;
        })
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
    db.mealLogs.where("syncStatus").equals("pending").count()
  );
  return count ?? 0;
}

export async function checkDuplicateMealLog(
  userId: string,
  mealType: string,
  date: string
): Promise<MealLog | undefined> {
  return db.mealLogs
    .where("[userId+mealType+date]")
    .equals([userId, mealType, date])
    .first();
}

export async function createMealLog(
  log: Omit<MealLog, "id">
): Promise<number> {
  const id = await db.mealLogs.add(log);
  return id as number;
}
