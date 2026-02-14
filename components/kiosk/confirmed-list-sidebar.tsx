"use client";

import { useMemo } from "react";
import { Users, CheckCircle2, Star, Hand } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMealLogs } from "@/hooks/use-meal-logs";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

export function ConfirmedListSidebar() {
  const { currentMeal } = useCurrentMeal();
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { logs } = useMealLogs({
    date: today,
    mealType: currentMeal?.id,
    diningHallId: diningHallId ? Number(diningHallId) : undefined,
  });

  return (
    <div className="flex flex-1 flex-col bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Бүртгүүлсэн</h3>
        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {logs.length}
        </span>
      </div>

      <ScrollArea className="flex-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Бүртгэл байхгүй
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-medium">
                      {log.employeeName}
                    </p>
                    {log.isExtraServing && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        <Star className="h-2.5 w-2.5 mr-0.5" />
                        Нэмэлт
                      </Badge>
                    )}
                    {log.isManualOverride && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        <Hand className="h-2.5 w-2.5 mr-0.5" />
                        Гараар
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.idcardNumber}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.scannedAt).toLocaleTimeString("mn-MN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
