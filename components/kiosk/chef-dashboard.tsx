"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import {
  KIOSK_CONFIG_KEYS,
  MEAL_NAME_MAP,
  MEAL_TYPE_COLUMN_MAP,
} from "@/lib/constants";
import { Users, CheckCircle2, Clock, Hand, Star } from "lucide-react";

interface ChefDashboardProps {
  mealSlot: any;
}

export function ChefDashboard({ mealSlot }: ChefDashboardProps) {
  const { currentTime } = useCurrentMeal();
  const { value: diningHallId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.DINING_HALL_ID,
  );

  const today = useMemo(
    () => currentTime.toISOString().split("T")[0],
    [currentTime],
  );

  const expected = useLiveQuery(async () => {
    if (!mealSlot || !diningHallId) return 0;

    const hallId = Number(diningHallId);
    const columnName = MEAL_TYPE_COLUMN_MAP[mealSlot.mealType];
    const todayStr = today; // Гаднаас ирж буй өнөөдрийн огноо

    let defaultCount: number;
    if (!columnName) {
      defaultCount = await db.userMealConfigs.count();
    } else {
      defaultCount = await db.userMealConfigs
        .where(columnName)
        .equals(hallId)
        .count();
    }

    const incoming = await db.mealLocationOverrides
      .where("[date+diningHallId]")
      .equals([todayStr, hallId])
      .filter((o) => o.mealType === mealSlot.mealType)
      .count();

    let outgoing = 0;
    if (columnName) {
      const awayOverrides = await db.mealLocationOverrides
        .where("date")
        .equals(todayStr)
        .filter(
          (o) => o.mealType === mealSlot.mealType && o.diningHallId !== hallId,
        )
        .toArray();

      if (awayOverrides.length > 0) {
        const overriddenUserIds = awayOverrides.map((o) => o.userId);

        outgoing = await db.userMealConfigs
          .where("userId")
          .anyOf(overriddenUserIds)
          .and((config) => config[columnName as keyof typeof config] === hallId)
          .count();
      }
    }

    return defaultCount + incoming - outgoing;
  }, [mealSlot?.id, diningHallId, today]);

  // Meal log counts for today + current meal + this dining hall
  const counts = useLiveQuery(async () => {
    if (!mealSlot || !diningHallId) return { served: 0, manual: 0, extra: 0 };

    const hallId = Number(diningHallId);

    const logs = await db.mealLogs
      .where("date")
      .equals(today)
      .filter(
        (l) => l.mealType === mealSlot.mealType && l.diningHallId === hallId,
      )
      .toArray();

    // Reduce ашиглан нэг удаагийн давталтаар тооцох
    return logs.reduce(
      (acc, log) => {
        acc.served++;
        if (log.isManualOverride) acc.manual++;
        if (log.isExtraServing) acc.extra++;
        return acc;
      },
      { served: 0, manual: 0, extra: 0 },
    );
  }, [mealSlot?.mealType, diningHallId, today]);

  const expectedCount = expected ?? 0;
  const servedCount = counts?.served ?? 0;
  const manualCount = counts?.manual ?? 0;
  const extraCount = counts?.extra ?? 0;
  const remaining = Math.max(0, expectedCount - servedCount);

  const progressPercent =
    expectedCount > 0
      ? Math.min(100, Math.round((servedCount / expectedCount) * 100))
      : 0;

  if (!mealSlot) {
    return (
      <div className="relative flex shrink-0 flex-col gap-3 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl px-4 py-8 shadow-lg items-center justify-center">
        <Clock className="h-8 w-8 text-slate-500 animate-pulse" />
        <p className="text-xs text-slate-400 font-medium">
          Одоогоор хоолны цаг эхлээгүй байна
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex shrink-0 flex-col gap-3 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl px-4 py-4 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.3)]">
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-blue-400">
          {MEAL_NAME_MAP[mealSlot.mealType as keyof typeof MEAL_NAME_MAP] ||
            mealSlot.mealType}
        </h3>
        <span className="text-[10px] text-slate-500">
          {mealSlot.startTime} - {mealSlot.endTime}
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-2">
        {/* Expected (blue) */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-400/20 px-3 py-2.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-500/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-blue-500/15 border border-blue-400/20 p-1.5">
              <Users className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-blue-300/80">
                Хүлээгдэж буй
              </div>
              <div className="text-xl tabular-nums font-bold text-blue-100">
                {expectedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Served (emerald) */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-400/20 px-3 py-2.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-400/20 p-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300/80">
                Идсэн
              </div>
              <div className="text-xl tabular-nums font-bold text-emerald-100">
                {servedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Remaining (orange) */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-400/20 px-3 py-2.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-orange-500/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-orange-500/15 border border-orange-400/20 p-1.5">
              <Clock className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-orange-300/80">
                Үлдсэн
              </div>
              <div className="text-xl tabular-nums font-bold text-orange-100">
                {remaining}
              </div>
            </div>
          </div>
        </div>

        {/* Manual (violet) */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-400/20 px-3 py-2.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-violet-500/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-violet-500/15 border border-violet-400/20 p-1.5">
              <Hand className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-violet-300/80">
                Гараар
              </div>
              <div className="text-xl tabular-nums font-bold text-violet-100">
                {manualCount}
              </div>
            </div>
          </div>
        </div>

        {/* Extra (amber) */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-400/20 px-3 py-2.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg bg-amber-500/15 border border-amber-400/20 p-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-amber-300/80">
                Нэмэлт
              </div>
              <div className="text-xl tabular-nums font-bold text-amber-100">
                {extraCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative flex items-center gap-3">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-800/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-500 transition-all duration-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
            style={{ width: `${progressPercent}%` }}>
            {/* Shimmer on progress */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
        </div>
        <span className="text-xs tabular-nums text-slate-400">
          {progressPercent}%
        </span>
      </div>
    </div>
  );
}
