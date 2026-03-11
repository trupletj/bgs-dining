// /home/aagiihhz/bgs-dining/app/setup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { db } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase/client";
import { runFullSync } from "@/lib/sync/sync-engine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Monitor, RefreshCw, CheckCircle } from "lucide-react";

export default function SmartSetupPage() {
  const { value: uuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);
  const { value: hallId, setValue: setHallId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.DINING_HALL_ID,
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "linked" | "unlinked">("idle");

  // 1. Cloud-аас энэ төхөөрөмжийн мэдээллийг татаж шалгах
  const checkConnection = async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("kiosks")
        .select("dining_hall_id, is_active")
        .eq("device_uuid", uuid)
        .single();

      if (error || !data) {
        setStatus("unlinked");
        toast.error("Энэ төхөөрөмж үндсэн системд бүртгэгдээгүй байна.");
      } else {
        // Үндсэн системээс ирсэн Hall ID-г локал баазад хадгалах
        await setHallId(String(data.dining_hall_id));
        setStatus("linked");
        toast.success("Төхөөрөмж амжилттай холбогдлоо!");

        // Холбогдсон бол шууд өгөгдлөө татаж авна (Sync)
        await runFullSync();
        // Амжилттай бол үндсэн дэлгэц рүү шилжих логик энд байж болно
      }
    } catch (e) {
      toast.error("Холболтын алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (uuid) {
      navigator.clipboard.writeText(uuid);
      toast.success("UUID хуулагдлаа!");
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <Monitor className="w-12 h-12 mx-auto text-blue-500" />
          <h1 className="text-2xl font-bold">Киоск холболт</h1>
          <p className="text-slate-400 text-sm">
            Төхөөрөмжийг үндсэн системээс удирдана
          </p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              Төхөөрөмжийн UUID
            </span>
            <div
              onClick={copyToClipboard}
              className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-sm text-blue-400 break-all cursor-pointer hover:bg-slate-900 hover:border-blue-500/50 transition-all active:scale-95 group relative">
              {uuid || "Үүсгэж байна..."}
            </div>
          </div>

          <div className="pt-4">
            {status === "linked" ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle className="text-emerald-500 w-10 h-10" />
                <p className="text-sm text-emerald-400">
                  Гал тогоо ID: {hallId} холбогдсон
                </p>
                <Button
                  className="w-full mt-2"
                  onClick={() => (window.location.href = "/")}>
                  Үндсэн дэлгэц рүү шилжих
                </Button>
              </div>
            ) : (
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-500"
                onClick={checkConnection}
                disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Холболт шалгах
              </Button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Дээрх UUID-г үндсэн системийн <b>Kiosk Manager</b> хэсэгт бүртгэсний
          дараа "Холболт шалгах" товчийг дарна уу.
        </p>
      </div>
    </div>
  );
}
