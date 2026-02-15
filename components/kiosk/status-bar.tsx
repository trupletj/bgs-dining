"use client";

import { useEffect, useState } from "react";
import { CloudOff, UtensilsCrossed, ChefHat, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { useTodayMealLogCount, usePendingSyncCount } from "@/hooks/use-meal-logs";
import { useChefAuth } from "@/hooks/use-chef-auth";
import { HeartbeatIndicator } from "@/components/kiosk/heartbeat-indicator";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

export function StatusBar() {
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const todayCount = useTodayMealLogCount(diningHallId ? Number(diningHallId) : null);
  const pendingSync = usePendingSyncCount();
  const { activeChefName, logout } = useChefAuth();
  const [clock, setClock] = useState(new Date());

  const diningHall = useLiveQuery(
    () => (diningHallId ? db.diningHalls.get(Number(diningHallId)) : undefined),
    [diningHallId]
  );

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = clock.toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = clock.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  return (
    <div className="relative flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl px-6 py-3 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.5)]">
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />

      <div className="relative flex items-center gap-4">
        <HeartbeatIndicator />

        {diningHall && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 border border-white/5 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <UtensilsCrossed className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">{diningHall.name}</span>
          </div>
        )}

        {activeChefName && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 border border-white/5 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <ChefHat className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-200">{activeChefName}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              onClick={logout}
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative flex items-center gap-4">
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

        <div className="border-l border-white/10 pl-4 text-right">
          <div className="text-sm font-mono tabular-nums font-semibold text-slate-100">{timeStr}</div>
          <div className="text-xs text-slate-400">{dateStr}</div>
        </div>
      </div>
    </div>
  );
}
