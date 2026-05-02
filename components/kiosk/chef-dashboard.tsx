"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import {
  getLocalDate,
  KIOSK_CONFIG_KEYS,
  MEAL_NAME_MAP,
} from "@/lib/constants";
import { useExpectedMealCounts } from "@/hooks/use-expected-meal-counts";
import { Users, CheckCircle2, Clock, Hand, Star } from "lucide-react";

interface ChefDashboardProps {
  mealSlot: {
    id: number | string;
    mealType: string;
    startTime: string;
    endTime: string;
  };
}

export function ChefDashboard({ mealSlot }: ChefDashboardProps) {
  // 1. currentTime-г ашиглахгүй — today тогтмол string байна
  const { value: diningHallId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.DINING_HALL_ID,
  );
  const hallId = diningHallId ? Number(diningHallId) : null;
  const expectedCounts = useExpectedMealCounts(hallId);

  // getLocalDate() нь тогтмол утга, useMemo шаардлагагүй
  const today = getLocalDate();

  const counts = useLiveQuery(async () => {
    if (!mealSlot || !diningHallId)
      return { servedPlan: 0, manual: 0, extra: 0, totalServed: 0 };

    const hallId = Number(diningHallId);
    const logs = await db.mealLogs
      .where("date")
      .equals(today)
      .filter(
        (l) => l.mealType === mealSlot.mealType && l.diningHallId === hallId,
      )
      .toArray();

    return logs.reduce(
      (acc, log) => {
        acc.totalServed++;
        if (log.isExtraServing) acc.extra++;
        else acc.servedPlan++;
        if (log.isManualOverride) acc.manual++;
        return acc;
      },
      { servedPlan: 0, manual: 0, extra: 0, totalServed: 0 },
    );
  }, [mealSlot?.mealType, diningHallId, today]);

  const expectedCount = mealSlot
    ? expectedCounts.byMealType[mealSlot.mealType] || 0
    : 0;
  const servedCount = counts?.servedPlan ?? 0;
  const manualCount = counts?.manual ?? 0;
  const extraCount = counts?.extra ?? 0;
  const remaining = Math.max(0, expectedCount - servedCount);
  const progressPercent =
    expectedCount > 0
      ? Math.min(100, Math.round((servedCount / expectedCount) * 100))
      : 0;

  if (!mealSlot) {
    return (
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/5 bg-slate-900/40 px-4 py-8 items-center justify-center">
        <Clock className="h-8 w-8 text-slate-500" /> {/* animate-pulse хасав */}
        <p className="text-xs text-slate-400 font-medium">
          Одоогоор хоолны цаг эхлээгүй байна
        </p>
      </div>
    );
  }

  return (
    // 4. backdrop-blur-xl хасав
    <div className="flex shrink-0 flex-col gap-3 border-b border-slate-800 bg-slate-950 px-4 py-4">
      {/* gradient overlay хасав */}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-blue-400">
          {MEAL_NAME_MAP[mealSlot.mealType as keyof typeof MEAL_NAME_MAP] ||
            mealSlot.mealType}
        </h3>
        <span className="text-[10px] text-slate-500">
          {mealSlot.startTime} - {mealSlot.endTime}
        </span>
      </div>

      {/* 5. group-hover blur effect-үүдийг бүгдийг хасав */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Users className="h-3.5 w-3.5 text-blue-400" />}
          iconBg="bg-blue-500/15 border-blue-400/20"
          cardBg="bg-slate-900 border-blue-400/20"
          label="Хүлээгдэж буй"
          labelColor="text-blue-300/80"
          value={expectedCount}
          valueColor="text-blue-100"
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          iconBg="bg-emerald-500/15 border-emerald-400/20"
          cardBg="bg-slate-900 border-emerald-400/20"
          label="Идсэн"
          labelColor="text-emerald-300/80"
          value={servedCount}
          valueColor="text-emerald-100"
        />
        <StatCard
          icon={<Clock className="h-3.5 w-3.5 text-orange-400" />}
          iconBg="bg-orange-500/15 border-orange-400/20"
          cardBg="bg-slate-900 border-orange-400/20"
          label="Үлдсэн"
          labelColor="text-orange-300/80"
          value={remaining}
          valueColor="text-orange-100"
        />
        <StatCard
          icon={<Hand className="h-3.5 w-3.5 text-violet-400" />}
          iconBg="bg-violet-500/15 border-violet-400/20"
          cardBg="bg-slate-900 border-violet-400/20"
          label="Гараар"
          labelColor="text-violet-300/80"
          value={manualCount}
          valueColor="text-violet-100"
        />
        <StatCard
          icon={<Star className="h-3.5 w-3.5 text-amber-400" />}
          iconBg="bg-amber-500/15 border-amber-400/20"
          cardBg="bg-slate-900 border-amber-400/20"
          label="Нэмэлт"
          labelColor="text-amber-300/80"
          value={extraCount}
          valueColor="text-amber-100"
        />
      </div>

      {/* 6. shimmer animation progress bar-аас хасав */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800/60">
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-slate-400">
          {progressPercent}%
        </span>
      </div>
    </div>
  );
}

// 7. StatCard тусдаа компонент болгов — давтагдах код хасагдаж, re-render оновчтой болно
function StatCard({
  icon,
  iconBg,
  cardBg,
  label,
  labelColor,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  cardBg: string;
  label: string;
  labelColor: string;
  value: number;
  valueColor: string;
}) {
  return (
    <div
      className={`rounded-lg ${cardBg} border px-3 py-2.5`}>
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center justify-center rounded-lg border p-1.5 ${iconBg}`}>
          {icon}
        </div>
        <div>
          <div
            className={`text-[10px] font-medium uppercase tracking-wider ${labelColor}`}>
            {label}
          </div>
          <div className={`text-xl tabular-nums font-bold ${valueColor}`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
