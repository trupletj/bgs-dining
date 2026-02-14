"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Database } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePendingSyncCount } from "@/hooks/use-meal-logs";

export function HeartbeatIndicator() {
  const { isOnline } = useOnlineStatus();
  const pendingSync = usePendingSyncCount();
  const [storageUsage, setStorageUsage] = useState<string>("");

  useEffect(() => {
    async function checkStorage() {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const usedMB = ((est.usage ?? 0) / (1024 * 1024)).toFixed(1);
        const quotaMB = ((est.quota ?? 0) / (1024 * 1024)).toFixed(0);
        setStorageUsage(`${usedMB} MB / ${quotaMB} MB`);
      }
    }
    checkStorage();
    const interval = setInterval(checkStorage, 30000);
    return () => clearInterval(interval);
  }, []);

  const synced = pendingSync === 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {isOnline && synced ? (
                <Cloud className="h-4 w-4 text-green-500" />
              ) : isOnline && !synced ? (
                <Cloud className="h-4 w-4 text-yellow-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-red-500" />
              )}
              {pendingSync > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {pendingSync}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isOnline ? "Онлайн" : "Оффлайн"}
              {pendingSync > 0 && ` · ${pendingSync} синк хүлээгдэж буй`}
            </p>
          </TooltipContent>
        </Tooltip>

        {storageUsage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>IndexedDB: {storageUsage}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
