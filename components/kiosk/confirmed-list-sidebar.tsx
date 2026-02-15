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
    <div className="flex flex-1 flex-col bg-slate-900/20 backdrop-blur-xl min-h-0">
      <div className="flex items-center gap-2 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center justify-center rounded-lg bg-blue-500/15 border border-blue-400/20 p-1">
          <Users className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Бүртгүүлсэн</h3>
        <span className="ml-auto rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20">
          {logs.length}
        </span>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <Users className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">
              Бүртгэл байхгүй
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5 p-2">
            {logs.map((log, index) => (
              <li
                key={log.id}
                className="group relative flex items-start gap-3 overflow-hidden rounded-xl bg-slate-800/40 backdrop-blur-sm border border-white/5 px-3 py-2.5 transition-all duration-200 hover:bg-slate-800/60 hover:border-white/10 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.1)] animate-in slide-in-from-right-5 fade-in-0 duration-300"
                style={{ animationDelay: `${Math.min(index * 50, 500)}ms`, animationFillMode: "backwards" }}
              >
                {/* Shimmer effect on newest item */}
                {index === 0 && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="animate-shimmer-once absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  </div>
                )}
                <div className="mt-0.5 flex items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-400/20 p-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <p className="text-sm font-medium text-slate-100 break-words">
                      {log.employeeName}
                    </p>
                    {log.isExtraServing && (
                      <span className="inline-flex items-center h-4 shrink-0 px-1.5 rounded bg-amber-500/15 border border-amber-400/20 text-[10px] font-medium text-amber-300">
                        <Star className="h-2.5 w-2.5 mr-0.5" />
                        Нэмэлт
                      </span>
                    )}
                    {log.isManualOverride && (
                      <span className="inline-flex items-center h-4 shrink-0 px-1.5 rounded bg-violet-500/15 border border-violet-400/20 text-[10px] font-medium text-violet-300">
                        <Hand className="h-2.5 w-2.5 mr-0.5" />
                        Гараар
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 break-words">
                    {log.idcardNumber}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 text-xs tabular-nums font-mono text-slate-500">
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
