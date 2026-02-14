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
    <div className="flex items-center justify-between border-b bg-card px-6 py-3">
      <div className="flex items-center gap-4">
        <HeartbeatIndicator />

        {diningHall && (
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{diningHall.name}</span>
          </div>
        )}

        {activeChefName && (
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{activeChefName}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1"
              onClick={logout}
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {pendingSync > 0 && (
          <Badge variant="outline" className="gap-1">
            <CloudOff className="h-3 w-3" />
            {pendingSync} синк хүлээгдэж буй
          </Badge>
        )}

        <Badge variant="secondary" className="gap-1">
          <UtensilsCrossed className="h-3 w-3" />
          Өнөөдөр: {todayCount}
        </Badge>

        <div className="text-right">
          <div className="text-sm font-mono font-medium">{timeStr}</div>
          <div className="text-xs text-muted-foreground">{dateStr}</div>
        </div>
      </div>
    </div>
  );
}
