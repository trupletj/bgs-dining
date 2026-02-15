"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealTimeSlot } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function MealTimesPage() {
  const slots = useLiveQuery(() =>
    db.mealTimeSlots.orderBy("sortOrder").toArray()
  );
  const [editSlots, setEditSlots] = useState<MealTimeSlot[]>([]);

  useEffect(() => {
    if (slots) setEditSlots(slots);
  }, [slots]);

  if (!slots) return null;

  const handleChange = (
    index: number,
    field: keyof MealTimeSlot,
    value: string | boolean | number
  ) => {
    setEditSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await db.mealTimeSlots.bulkPut(editSlots);
      toast.success("Хоолны цаг хадгалагдлаа");
    } catch {
      toast.error("Хадгалахад алдаа гарлаа");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Хоолны цаг</h1>
        <p className="text-muted-foreground">
          Хоолны цагийн хуваарь тохируулах
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Цагийн хуваарь</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {editSlots.map((slot, i) => (
              <div
                key={slot.id}
                className="grid grid-cols-[1fr_120px_120px_80px] items-end gap-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border p-4"
              >
                <div className="space-y-1">
                  <Label>Нэр</Label>
                  <Input
                    value={slot.name}
                    onChange={(e) => handleChange(i, "name", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Эхлэх</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      handleChange(i, "startTime", e.target.value)
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Дуусах</Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      handleChange(i, "endTime", e.target.value)
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Label>Идэвхтэй</Label>
                  <Switch
                    checked={slot.isActive}
                    onCheckedChange={(checked) =>
                      handleChange(i, "isActive", checked)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} className="mt-6 rounded-xl shadow-sm">
            Хадгалах
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
