"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import { useSync } from "@/hooks/use-sync";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { toast } from "sonner";

export function SyncStatusCard() {
  const { state, lastError, sync, syncEmployees, syncMealLogs } = useSync();
  const { value: supabaseUrl } = useKioskConfig(KIOSK_CONFIG_KEYS.SUPABASE_URL);
  const { value: lastEmployeeSync } = useKioskConfig(KIOSK_CONFIG_KEYS.LAST_EMPLOYEE_SYNC);
  const { value: lastConfirmationSync } = useKioskConfig(KIOSK_CONFIG_KEYS.LAST_CONFIRMATION_SYNC);
  const { value: deviceUuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);

  const pendingCount = useLiveQuery(
    () => db.mealLogs.where("syncStatus").equals("pending").count()
  ) ?? 0;

  const recentLogs = useLiveQuery(() =>
    db.syncLog.orderBy("startedAt").reverse().limit(5).toArray()
  );

  const isSyncing = state === "syncing";

  const handleFullSync = async () => {
    try {
      const results = await sync();
      if (results) {
        toast.success(
          `Синк амжилттай: ${results.employeesPulled} ажилтан, ${results.logsPushed} бүртгэл`
        );
      }
    } catch {
      toast.error("Синк амжилтгүй");
    }
  };

  const handleSyncEmployees = async () => {
    try {
      const count = await syncEmployees();
      toast.success(`${count} ажилтан татагдлаа`);
    } catch {
      toast.error("Ажилтан татахад алдаа гарлаа");
    }
  };

  const handlePushLogs = async () => {
    try {
      const count = await syncMealLogs();
      toast.success(`${count} бүртгэл илгээгдлээ`);
    } catch {
      toast.error("Бүртгэл илгээхэд алдаа гарлаа");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Хэзээ ч үгүй";
    return new Date(dateStr).toLocaleString("mn-MN");
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Синк тохиргоо</CardTitle>
          <Badge
            variant={
              state === "success"
                ? "default"
                : state === "error"
                  ? "destructive"
                  : "outline"
            }
          >
            {state === "syncing"
              ? "Синк хийж байна..."
              : state === "success"
                ? "Амжилттай"
                : state === "error"
                  ? "Алдаа"
                  : "Бэлэн"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border/30 pb-2">
            <span className="text-muted-foreground">Supabase</span>
            <Badge variant={supabaseUrl ? "default" : "destructive"}>
              {supabaseUrl ? "Тохируулсан" : "Тохируулаагүй"}
            </Badge>
          </div>
          <div className="flex justify-between border-b border-border/30 pb-2">
            <span className="text-muted-foreground">Төхөөрөмж UUID</span>
            <span className="font-mono text-xs truncate max-w-[180px]">{deviceUuid || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border/30 pb-2">
            <span className="text-muted-foreground">Сүүлд ажилтан татсан</span>
            <span>{formatDate(lastEmployeeSync)}</span>
          </div>
          <div className="flex justify-between border-b border-border/30 pb-2">
            <span className="text-muted-foreground">Сүүлд бүртгэл илгээсэн</span>
            <span>{formatDate(lastConfirmationSync)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Хүлээгдэж буй бүртгэл</span>
            <Badge variant="outline">{pendingCount}</Badge>
          </div>
        </div>

        {lastError && (
          <p className="text-sm text-destructive">{lastError}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleFullSync} disabled={isSyncing} className="gap-2">
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Бүгдийг синк
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncEmployees}
            disabled={isSyncing}
          >
            Ажилтан татах
          </Button>
          <Button
            variant="outline"
            onClick={handlePushLogs}
            disabled={isSyncing}
          >
            Бүртгэл илгээх ({pendingCount})
          </Button>
        </div>

        {recentLogs && recentLogs.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Сүүлийн синк лог</p>
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg bg-muted/30 border px-2 py-1 text-xs"
              >
                <span>{log.type}</span>
                <span>{log.recordCount} бичлэг</span>
                <Badge
                  variant={
                    log.status === "success"
                      ? "default"
                      : log.status === "failed"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
