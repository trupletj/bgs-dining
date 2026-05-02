"use client";

import { useEffect, useState } from "react";
import { CloudOff, UtensilsCrossed, ChefHat, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { useTodayMealLogCount, usePendingSyncCount } from "@/hooks/use-meal-logs";
import { useChefAuth } from "@/hooks/use-chef-auth";
import { HeartbeatIndicator } from "@/components/kiosk/heartbeat-indicator";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { useExpectedMealCounts } from "@/hooks/use-expected-meal-counts";

const EXPECTED_MEAL_ITEMS = [
  { type: "breakfast", label: "Ө/цай" },
  { type: "morning_meal", label: "Ө/хоол" },
  { type: "lunch", label: "Өдөр" },
  { type: "dinner", label: "Орой" },
  { type: "night_meal", label: "Шөнө" },
  { type: "extend_morning_meal", label: "С/өглөө" },
  { type: "extend_lunch", label: "С/өдөр" },
] as const;

export function StatusBar() {
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const hallId = diningHallId ? Number(diningHallId) : null;
  const todayCount = useTodayMealLogCount(hallId);
  const expectedCounts = useExpectedMealCounts(hallId);
  const remainingCount = Math.max(0, expectedCounts.total - todayCount);
  const pendingSync = usePendingSyncCount();
  const { activeChefName, logout } = useChefAuth();
  const [clock, setClock] = useState(new Date());

  const diningHall = useLiveQuery(
    () => (diningHallId ? db.diningHalls.get(Number(diningHallId)) : undefined),
    [diningHallId]
  );

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = clock.toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dateStr = clock.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  return (
    <div className="border-b border-slate-800 bg-slate-950 px-3 py-2 md:px-6 md:py-3">
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="mt-1">
              <HeartbeatIndicator />
            </div>

            <div className="min-w-0">
              {diningHall && (
                <div className="flex min-w-0 items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 shrink-0 text-blue-400" />
                  <span className="truncate text-sm font-medium text-slate-200">
                    {diningHall.name}
                  </span>
                </div>
              )}

              {activeChefName && (
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
                  <ChefHat className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">{activeChefName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    onClick={logout}
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="font-mono text-sm font-semibold tabular-nums text-slate-100">
              {timeStr}
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Metric label="Өнөөдөр" value={todayCount} tone="blue" />
          <Metric label="Хүлээгдэж" value={expectedCounts.total} tone="green" />
          <Metric label="Үлдсэн" value={remainingCount} tone="orange" />
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {EXPECTED_MEAL_ITEMS.map((item) => (
            <span
              key={item.type}
              className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300"
            >
              {item.label}: {expectedCounts.byMealType[item.type] || 0}
            </span>
          ))}
          {pendingSync > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
              <CloudOff className="h-3 w-3" />
              {pendingSync}
            </span>
          )}
        </div>
      </div>

      <div className="hidden items-center justify-between gap-4 md:flex">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="shrink-0">
            <HeartbeatIndicator />
          </div>

          <div className="flex min-w-0 items-center gap-3">
            {diningHall && (
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-800/60 border border-white/5 px-3 py-1.5">
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-blue-400" />
                <span className="max-w-[260px] truncate text-sm font-medium text-slate-200 xl:max-w-[420px]">
                  {diningHall.name}
                </span>
              </div>
            )}

            {activeChefName && (
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-800/60 border border-white/5 px-3 py-1.5">
                <ChefHat className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="max-w-[180px] truncate text-sm font-medium text-slate-200">
                  {activeChefName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={logout}
                >
                  <LogOut className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {pendingSync > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-300">
              <CloudOff className="h-3 w-3" />
              {pendingSync} синк хүлээгдэж буй
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/15 border border-blue-400/30 px-3 py-1.5 text-xs font-medium text-blue-300">
            <UtensilsCrossed className="h-3 w-3" />
            Өнөөдөр: {todayCount}
          </div>

          <div className="flex max-w-[560px] items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/25 px-2.5 py-1.5 text-xs font-medium text-emerald-300 xl:max-w-none">
            <Users className="h-3 w-3 shrink-0" />
            <span className="shrink-0">Хүлээгдэж: {expectedCounts.total}</span>
            <span className="mx-1 h-3 w-px shrink-0 bg-emerald-400/25" />
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {EXPECTED_MEAL_ITEMS.map((item) => (
                <span key={item.type} className="tabular-nums whitespace-nowrap">
                  {item.label}: {expectedCounts.byMealType[item.type] || 0}
                </span>
              ))}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 border border-orange-400/25 px-3 py-1.5 text-xs font-medium text-orange-300">
            Үлдсэн: {remainingCount}
          </div>

          <div className="border-l border-white/10 pl-4 text-right">
            <div className="font-mono text-sm font-semibold tabular-nums text-slate-100">
              {timeStr}
            </div>
            <div className="text-xs text-slate-400">{dateStr}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "orange";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-400/25 bg-blue-500/10 text-blue-300"
      : tone === "green"
        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
        : "border-orange-400/25 bg-orange-500/10 text-orange-300";

  return (
    <div className={`rounded border px-2 py-1 ${toneClass}`}>
      <div className="text-[10px] leading-none opacity-80">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
