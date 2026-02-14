"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, ChefHat, Loader2 } from "lucide-react";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { toast } from "sonner";

export default function ChefsPage() {
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("0000");
  const [adding, setAdding] = useState(false);

  const chefs = useLiveQuery(() => {
    if (!diningHallId) return [];
    return db.chefs.where("diningHallId").equals(Number(diningHallId)).toArray();
  }, [diningHallId]);

  const diningHall = useLiveQuery(
    () => (diningHallId ? db.diningHalls.get(Number(diningHallId)) : undefined),
    [diningHallId]
  );

  if (!diningHallId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Тогооч</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Эхлээд Тохиргоо хэсгээс гал тогоо сонгоно уу
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Нэр оруулна уу");
      return;
    }
    setAdding(true);
    try {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClient();

      const { data, error } = await supabase
        .from("chefs")
        .insert({
          name: newName.trim(),
          dining_hall_id: Number(diningHallId),
          pin: newPin || "0000",
          is_active: true,
        })
        .select("id, name, dining_hall_id, pin, is_active")
        .single();

      if (error) throw new Error(error.message);

      // Save to local DB too
      if (data) {
        await db.chefs.put({
          id: data.id,
          name: data.name,
          diningHallId: data.dining_hall_id,
          pin: data.pin || "0000",
          isActive: data.is_active,
        });
      }

      setNewName("");
      setNewPin("0000");
      toast.success("Тогооч нэмэгдлээ");
    } catch (err) {
      toast.error(`Алдаа: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClient();

      const { error } = await supabase
        .from("chefs")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await db.chefs.update(id, { isActive: !isActive });
    } catch (err) {
      toast.error(`Алдаа: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Тогооч</h1>
        <p className="text-muted-foreground">
          {diningHall?.name ?? "..."} - тогоочийн жагсаалт
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шинэ тогооч</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label>Нэр</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Тогоочийн нэр"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="w-32 space-y-1">
              <Label>PIN</Label>
              <Input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="0000"
                maxLength={6}
              />
            </div>
            <Button onClick={handleAdd} disabled={adding} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Нэмэх
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Тогоочийн жагсаалт</CardTitle>
        </CardHeader>
        <CardContent>
          {!chefs || chefs.length === 0 ? (
            <div className="py-8 text-center">
              <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Тогооч бүртгэгдээгүй</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chefs.map((chef) => (
                <div
                  key={chef.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{chef.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      PIN: {chef.pin}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={chef.isActive ? "default" : "secondary"}>
                      {chef.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </Badge>
                    <Switch
                      checked={chef.isActive}
                      onCheckedChange={() => toggleActive(chef.id, chef.isActive)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
