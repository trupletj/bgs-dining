"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import {
  testSupabaseConnection,
  resetSupabaseClient,
} from "@/lib/supabase/client";
import { runFullSync } from "@/lib/sync/sync-engine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Database,
  Wifi,
  Monitor,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Тохиргоо</h1>
        <p className="text-muted-foreground">Суурь тохиргоо ба Supabase холболт</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SupabaseConnectionCard />
        <DiningHallAssignmentCard />
        <DeviceRegistrationCard />
        <MaintenanceCard />
      </div>
    </div>
  );
}

function SupabaseConnectionCard() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";
  const hasEnv = !!(envUrl && envKey);

  const { value: savedUrl, setValue: setSavedUrl } = useKioskConfig(KIOSK_CONFIG_KEYS.SUPABASE_URL);
  const { value: savedKey, setValue: setSavedKey } = useKioskConfig(KIOSK_CONFIG_KEYS.SUPABASE_PUBLISHABLE_KEY);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Env vars take priority, then local input, then kioskConfig
  const displayUrl = hasEnv ? envUrl : (url || savedUrl || "");
  const displayKey = hasEnv ? envKey : (key || savedKey || "");

  const handleTest = async () => {
    if (!displayUrl || !displayKey) {
      toast.error("URL болон Anon Key оруулна уу");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testSupabaseConnection(displayUrl, displayKey);
      setTestResult(ok);
      if (ok) {
        toast.success("Холболт амжилттай!");
      } else {
        toast.error("Холболт амжилтгүй");
      }
    } catch {
      setTestResult(false);
      toast.error("Холболт амжилтгүй");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await setSavedUrl(displayUrl);
    await setSavedKey(displayKey);
    resetSupabaseClient();
    toast.success("Supabase тохиргоо хадгалагдлаа");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>Supabase холболт</CardTitle>
        </div>
        <CardDescription>Supabase проектын URL ба publishable key</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasEnv && (
          <Badge variant="default" className="text-xs">
            .env файлаас тохируулсан
          </Badge>
        )}
        <div className="space-y-2">
          <Label>Project URL</Label>
          <Input
            value={displayUrl}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxxx.supabase.co"
            disabled={hasEnv}
          />
        </div>
        <div className="space-y-2">
          <Label>Publishable Key</Label>
          <Input
            value={displayKey}
            onChange={(e) => setKey(e.target.value)}
            placeholder="eyJhbGciOi..."
            type="password"
            disabled={hasEnv}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testResult === true ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : testResult === false ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            Холболт шалгах
          </Button>
          {!hasEnv && <Button onClick={handleSave}>Хадгалах</Button>}
        </div>
        {!hasEnv && savedUrl && (
          <Badge variant="outline" className="text-xs">
            Тохируулсан: {savedUrl}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function DiningHallAssignmentCard() {
  const { value: selectedId, setValue: setSelectedId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const diningHalls = useLiveQuery(() => db.diningHalls.toArray());

  const handleSelect = async (id: string) => {
    await setSelectedId(id);
    resetSupabaseClient(); // Force re-fetch on next sync since dining hall affects employee filtering
    toast.success("Гал тогоо сонгогдлоо");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <CardTitle>Гал тогоо</CardTitle>
        </div>
        <CardDescription>Энэ киоск ямар гал тогоонд байрлах</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!diningHalls || diningHalls.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Эхлээд Supabase холболт тохируулаад синк хийнэ үү
          </p>
        ) : (
          <Select value={selectedId ?? ""} onValueChange={handleSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Гал тогоо сонгоно уу" />
            </SelectTrigger>
            <SelectContent>
              {diningHalls.map((hall) => (
                <SelectItem key={hall.id} value={String(hall.id)}>
                  {hall.name} {hall.location && `(${hall.location})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedId && (
          <Badge variant="outline">
            ID: {selectedId}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceRegistrationCard() {
  const { value: deviceUuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);
  const { value: deviceName, setValue: setDeviceName } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_NAME);
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);

  const displayName = name || deviceName || "";

  const handleRegister = async () => {
    if (!displayName.trim()) {
      toast.error("Төхөөрөмжийн нэр оруулна уу");
      return;
    }
    if (!diningHallId) {
      toast.error("Эхлээд гал тогоо сонгоно уу");
      return;
    }
    if (!deviceUuid) {
      toast.error("Төхөөрөмжийн UUID үүсээгүй байна");
      return;
    }

    setRegistering(true);
    try {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClient();

      const { error } = await supabase
        .from("kiosks")
        .upsert(
          {
            device_name: displayName.trim(),
            dining_hall_id: Number(diningHallId),
            device_uuid: deviceUuid,
            is_active: true,
            last_heartbeat: new Date().toISOString(),
          },
          { onConflict: "device_uuid" }
        );

      if (error) throw new Error(error.message);

      await setDeviceName(displayName.trim());
      toast.success("Төхөөрөмж бүртгэгдлээ");
    } catch (err) {
      toast.error(`Бүртгэл амжилтгүй: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <CardTitle>Төхөөрөмж</CardTitle>
        </div>
        <CardDescription>Киоск төхөөрөмж бүртгэх</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Төхөөрөмжийн нэр</Label>
          <Input
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Гал тогоо 1 - Киоск"
          />
        </div>
        <div className="space-y-2">
          <Label>UUID</Label>
          <Input value={deviceUuid ?? "Үүсгэж байна..."} disabled className="font-mono text-xs" />
        </div>
        <Button onClick={handleRegister} disabled={registering} className="gap-2">
          {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Monitor className="h-4 w-4" />}
          Бүртгэх
        </Button>
      </CardContent>
    </Card>
  );
}

function MaintenanceCard() {
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      // Clear local data tables, then re-sync
      await db.transaction("rw", db.employees, db.userMealConfigs, db.diningHalls, db.chefs, async () => {
        await db.employees.clear();
        await db.userMealConfigs.clear();
        await db.diningHalls.clear();
        await db.chefs.clear();
      });
      resetSupabaseClient();
      const results = await runFullSync();
      toast.success(
        `Синк амжилттай: ${results.employeesPulled} ажилтан, ${results.hallsPulled} гал тогоо, ${results.chefsPulled} тогооч`
      );
    } catch (err) {
      toast.error(`Синк алдаа: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Бүх локал өгөгдлийг устгах уу? (Суурь тохиргоог хэвээр үлдээнэ)")) return;
    setClearing(true);
    try {
      await db.transaction("rw", [db.employees, db.userMealConfigs, db.mealLogs, db.diningHalls, db.chefs, db.syncLog], async () => {
        await db.employees.clear();
        await db.userMealConfigs.clear();
        await db.mealLogs.clear();
        await db.diningHalls.clear();
        await db.chefs.clear();
        await db.syncLog.clear();
      });
      toast.success("Локал өгөгдөл цэвэрлэгдлээ");
    } catch (err) {
      toast.error(`Алдаа: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          <CardTitle>Засвар үйлчилгээ</CardTitle>
        </div>
        <CardDescription>Өгөгдөл синк ба цэвэрлэх</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleForceSync} disabled={syncing} variant="outline" className="w-full gap-2">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Бүрэн дахин синк
        </Button>
        <Button onClick={handleClearAll} disabled={clearing} variant="destructive" className="w-full gap-2">
          {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Локал өгөгдөл цэвэрлэх
        </Button>
      </CardContent>
    </Card>
  );
}
