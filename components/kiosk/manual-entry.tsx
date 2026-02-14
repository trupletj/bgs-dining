"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { createMealLog, checkDuplicateMealLog } from "@/hooks/use-meal-logs";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ManualEntry() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { currentMeal } = useCurrentMeal();
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const { value: activeChefId } = useKioskConfig(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID);
  const { value: deviceUuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);

  const allEmployees = useLiveQuery(() => db.employees.toArray());

  const filtered = useMemo(() => {
    if (!allEmployees) return [];
    if (!search.trim()) return allEmployees.slice(0, 50);
    const q = search.toLowerCase();
    return allEmployees
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.idcardNumber.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [allEmployees, search]);

  const handleSelect = async (employee: typeof filtered[number]) => {
    if (!currentMeal || !diningHallId) {
      toast.error("Хоолны цаг эсвэл гал тогоо тохируулаагүй");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const existing = await checkDuplicateMealLog(employee.id, currentMeal.id, today);
    if (existing) {
      toast.warning(`${employee.name} аль хэдийн бүртгүүлсэн`);
      return;
    }

    await createMealLog({
      userId: employee.id,
      idcardNumber: employee.idcardNumber,
      employeeName: employee.name,
      mealType: currentMeal.id,
      diningHallId: Number(diningHallId),
      date: today,
      scannedAt: new Date().toISOString(),
      syncStatus: "pending",
      isExtraServing: false,
      isManualOverride: true,
      chefId: activeChefId ? Number(activeChefId) : null,
      deviceUuid: deviceUuid ?? null,
      syncKey: `manual-${employee.id}-${currentMeal.id}-${today}-${Date.now()}`,
    });

    toast.success(`${employee.name} бүртгэгдлээ`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Гараар бүртгэх
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Гараар бүртгэх</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, код, хэлтсээр хайх..."
              className="pl-9"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[400px]">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? "Олдсонгүй" : "Ажилтан ачааллаж байна..."}
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.idcardNumber} | {emp.department}
                      </p>
                    </div>
                    <Badge variant={emp.isActive ? "default" : "secondary"} className="shrink-0">
                      {emp.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
