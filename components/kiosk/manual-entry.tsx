"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Employee, type MealLog } from "@/lib/db";
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
import { DoubleScanModal } from "@/components/kiosk/double-scan-modal";
import { Input } from "@/components/ui/input";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DuplicateInfo {
  employee: Employee;
  existingLog: MealLog;
}

export function ManualEntry() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
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

  const handleSelect = async (employee: Employee) => {
    if (!currentMeal || !diningHallId) {
      toast.error("Хоолны цаг эсвэл гал тогоо тохируулаагүй");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const existing = await checkDuplicateMealLog(employee.id, currentMeal.id, today);
    if (existing) {
      setDuplicate({ employee, existingLog: existing });
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

    setOpen(false);
    setSearch("");
    toast.success(`${employee.name} бүртгэгдлээ`);
  };

  const handleAddExtraServing = useCallback(async () => {
    if (!duplicate || !currentMeal || !diningHallId) return;
    const { employee } = duplicate;
    const today = new Date().toISOString().split("T")[0];

    await createMealLog({
      userId: employee.id,
      idcardNumber: employee.idcardNumber,
      employeeName: employee.name,
      mealType: currentMeal.id,
      diningHallId: Number(diningHallId),
      date: today,
      scannedAt: new Date().toISOString(),
      syncStatus: "pending",
      isExtraServing: true,
      isManualOverride: true,
      chefId: activeChefId ? Number(activeChefId) : null,
      deviceUuid: deviceUuid ?? null,
      syncKey: `manual-${employee.id}-${currentMeal.id}-${today}-extra-${Date.now()}`,
    });

    setDuplicate(null);
    setOpen(false);
    setSearch("");
    toast.success(`${employee.name} нэмэлт порц бүртгэгдлээ`);
  }, [duplicate, currentMeal, diningHallId, activeChefId, deviceUuid]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 shadow-lg transition-all duration-200 hover:bg-slate-700/60 hover:border-white/15 hover:text-slate-100 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)]">
          <UserPlus className="h-4 w-4 text-blue-400" />
          Гараар бүртгэх
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl bg-[rgba(15,23,42,0.85)] backdrop-blur-2xl border border-white/10 shadow-[0_8px_60px_-10px_rgba(0,0,0,0.5)] rounded-2xl [&>button]:text-slate-400 [&>button]:hover:text-slate-200 [&>button]:hover:bg-white/5">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Гараар бүртгэх</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, код, хэлтсээр хайх..."
              className="pl-9 rounded-xl h-11 bg-slate-800/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
              autoFocus
            />
          </div>

          <ScrollArea className="h-[400px]">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {search ? "Олдсонгүй" : "Ажилтан ачааллаж байна..."}
              </p>
            ) : (
              <div className="space-y-1 pr-3">
                {filtered.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    className="flex w-full items-center gap-3 rounded-xl bg-slate-800/40 border border-white/5 px-4 py-3 text-left hover:bg-slate-700/40 hover:border-white/10 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium break-words text-slate-100">{emp.name}</p>
                      <p className="text-xs text-slate-500 break-words">
                        {emp.idcardNumber} | {emp.department}
                      </p>
                    </div>
                    <Badge
                      variant={emp.isActive ? "default" : "secondary"}
                      className={emp.isActive ? "shrink-0 bg-emerald-500/15 border-emerald-400/20 text-emerald-300" : "shrink-0 bg-slate-700/50 border-white/5 text-slate-400"}
                    >
                      {emp.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>

      {duplicate && (
        <DoubleScanModal
          open={true}
          onClose={() => { setDuplicate(null); setOpen(false); setSearch(""); }}
          onAddExtraServing={handleAddExtraServing}
          employeeName={duplicate.employee.name}
          mealName={currentMeal?.name ?? ""}
          existingScanTime={duplicate.existingLog.scannedAt}
        />
      )}
    </Dialog>
  );
}
