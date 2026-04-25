"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealLog } from "@/lib/db";
import { getLocalDate } from "@/lib/constants";
import { getMealLocationForSlot } from "@/lib/meal-type-map";

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
  identifier?: string,
): Promise<MealLog | undefined> {
  // 6 цагийн доторх бичлэгийг л давхардал гэж үзнэ
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  // 1. Хэрэв userId байгаа бол (Бүртгэлтэй ажилтан)
  if (userId && userId !== "") {
    const logByUserId = await db.mealLogs
      .where("userId")
      .equals(userId)
      .and((log) => log.mealType === mealType && log.scannedAt > sixHoursAgo)
      .first();

    if (logByUserId) return logByUserId;
  }

  // 2. Хэрэв identifier байгаа бол (Бүртгэлгүй ажилтан эсвэл userId-аар олдоогүй үед)
  if (identifier && identifier !== "") {
    // idcardNumber-ээр хайх
    const logByIdCard = await db.mealLogs
      .where("idcardNumber")
      .equals(identifier)
      .and((log) => log.mealType === mealType && log.scannedAt > sixHoursAgo)
      .first();

    if (logByIdCard) return logByIdCard;

    // Хэрэв idcardNumber-ээр олдоогүй бол btegId-аар хайх (Нэмэлт хамгаалалт)
    const logByBteg = await db.mealLogs
      .where("btegId")
      .equals(identifier)
      .and((log) => log.mealType === mealType && log.scannedAt > sixHoursAgo)
      .first();

    return logByBteg;
  }

  return undefined;
}

export async function createMealLog(log: Omit<MealLog, "id">): Promise<number> {
  const id = await db.mealLogs.add(log);
  return id as number;
}

export async function checkAssignedLocation(
  userId: string,
  mealType: string,
  currentDiningHallId: number,
) {
  const today = getLocalDate();

  // 1. Override шалгах
  const override = await db.mealLocationOverrides
    .where("[userId+date+mealType]")
    .equals([userId, today, mealType])
    .first();

  let assignedLocationId: number | null = null;

  if (override) {
    assignedLocationId = override.diningHallId;
  } else {
    const config = await db.userMealConfigs.get(userId);
    const location = config ? getMealLocationForSlot(config, mealType) : null;

    if (location !== "skip" && location !== null) {
      assignedLocationId = Number(location);
    }
  }

  const isWrongLocation =
    assignedLocationId !== null && assignedLocationId !== currentDiningHallId;

  // Гал тогооны нэрийг авах
  let assignedHallName = "";
  if (assignedLocationId) {
    const hall = await db.diningHalls.get(assignedLocationId);
    assignedHallName = hall?.name ?? `Гал тогоо #${assignedLocationId}`;
  }

  return {
    isWrongLocation,
    assignedLocationId,
    assignedHallName,
  };
}
