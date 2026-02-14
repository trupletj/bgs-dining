"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { useSync } from "@/hooks/use-sync";
import { KIOSK_CONFIG_KEYS, MEAL_TYPE_COLUMN_MAP } from "@/lib/constants";
import { Users, CheckCircle2, Clock, RefreshCw } from "lucide-react";

export function ChefDashboard() {
  const { currentMeal, currentTime } = useCurrentMeal();
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const { syncEmployees, state } = useSync();

  // Reactive today — updates when currentTime changes (every 60s via useCurrentMeal)
  const today = useMemo(
    () => currentTime.toISOString().split("T")[0],
    [currentTime]
  );

  // Expected: count of userMealConfigs where current meal's location column = this diningHallId
  const expected = useLiveQuery(async () => {
    if (!currentMeal || !diningHallId) return 0;

    const columnName = MEAL_TYPE_COLUMN_MAP[currentMeal.id];
    if (columnName === null || columnName === undefined) {
      // For snack: count all users with any config
      return db.userMealConfigs.count();
    }

    // Filter configs where the specific meal location matches this dining hall
    const hallId = Number(diningHallId);
    const configs = await db.userMealConfigs.toArray();
    return configs.filter((c) => {
      const value = c[columnName as keyof typeof c];
      return value === hallId;
    }).length;
  }, [currentMeal?.id, diningHallId]);

  // Served: count of mealLogs for today + current meal + this dining hall
  // Uses individual "date" index instead of broken compound index between()
  const served = useLiveQuery(async () => {
    if (!currentMeal || !diningHallId) return 0;
    const hallId = Number(diningHallId);
    return db.mealLogs
      .where("date")
      .equals(today)
      .filter((l) => l.mealType === currentMeal.id && l.diningHallId === hallId)
      .count();
  }, [currentMeal?.id, diningHallId, today]);

  const expectedCount = expected ?? 0;
  const servedCount = served ?? 0;
  const remaining = Math.max(0, expectedCount - servedCount);

  if (!currentMeal) return null;

  return (
    <div className="flex shrink-0 flex-wrap gap-3 px-4 py-3 border-b">
      <button
        onClick={() => syncEmployees()}
        disabled={state === "syncing"}
        className="ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${state === "syncing" ? "animate-spin" : ""}`} />
        Шинэчлэх
      </button>
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950">
        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div>
          <div className="text-xs text-muted-foreground">Хүлээгдэж буй</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{expectedCount}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div>
          <div className="text-xs text-muted-foreground">Идсэн</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{servedCount}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950">
        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <div>
          <div className="text-xs text-muted-foreground">Үлдсэн</div>
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{remaining}</div>
        </div>
      </div>
      
    </div>
  );
}
