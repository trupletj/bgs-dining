"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Employee, type MealLog, type SubEmployee } from "@/lib/db";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import {
  createMealLog,
  checkDuplicateMealLog,
  checkAssignedLocation,
} from "@/hooks/use-meal-logs";
import {
  getAllowedMealTypesForShift,
  getLocalDate,
  KIOSK_CONFIG_KEYS,
  resolveTargetMealTypeFromActiveSlots,
} from "@/lib/constants";
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
import { UserPlus, Search, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

interface DuplicateInfo {
  employee?: Employee;
  subEmployee?: SubEmployee;
  existingLog: MealLog;
}

type TabType = "employee" | "sub";

export const ManualEntry = React.memo(function ManualEntry() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("employee");
  const [search, setSearch] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  const { currentMeal, activeMeals } = useCurrentMeal();
  const activeMealTypes = useMemo(
    () => activeMeals.map((meal) => meal.mealType),
    [activeMeals],
  );
  const { value: diningHallId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.DINING_HALL_ID,
  );
  const { value: activeChefId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID,
  );
  const { value: deviceUuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);

  const allEmployees = useLiveQuery(() => db.employees.toArray(), []);
  const allSubEmployees = useLiveQuery(() => db.subEmployees.toArray(), []);

  // Байгаа ажилчдын хайлт
  const filteredEmployees = useMemo(() => {
    if (!allEmployees) return [];
    if (!search.trim()) return allEmployees.slice(0, 50);
    const q = search.toLowerCase();
    return allEmployees
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.idcardNumber.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          (e.phone && e.phone.includes(q)),
      )
      .slice(0, 50);
  }, [allEmployees, search]);

  // Гэрээт ажилчдын хайлт
  const filteredSubEmployees = useMemo(() => {
    if (!allSubEmployees) return [];
    if (!search.trim()) return allSubEmployees.slice(0, 50);
    const q = search.toLowerCase();
    return allSubEmployees
      .filter((e) => e.customLabel.toLowerCase().includes(q))
      .slice(0, 50);
  }, [allSubEmployees, search]);

  const resetAndClose = () => {
    setOpen(false);
    setSearch("");
    setDuplicate(null);
    setTab("employee");
  };

  // ── Байгаа ажилтан бүртгэх ──────────────────────────────
  const handleSelectEmployee = async (employee: Employee) => {
    if (!currentMeal || !diningHallId) {
      toast.error("Хоолны цаг эсвэл гал тогоо тохируулаагүй");
      return;
    }

    const today = getLocalDate();
    const allowedMeals = getAllowedMealTypesForShift(
      employee.shiftStart,
      employee.shiftEnd,
      new Date(),
    );
    const targetMealType = resolveTargetMealTypeFromActiveSlots(
      allowedMeals,
      activeMealTypes,
      currentMeal.mealType,
    );

    const existing = await checkDuplicateMealLog(
      employee.id,
      targetMealType,
      employee.idcardNumber,
      Number(diningHallId),
    );
    if (existing) {
      setDuplicate({ employee, existingLog: existing });
      return;
    }

    const { isWrongLocation, assignedHallName } = await checkAssignedLocation(
      employee.id,
      targetMealType,
      Number(diningHallId),
    );

    if (isWrongLocation) {
      toast.warning(
        `${employee.name} нь "${assignedHallName}"-д хуваарьтай байна!`,
      );
    }

    const scannedAt = new Date().toISOString();

    await createMealLog({
      userId: employee.id,
      btegId: employee.employeeCode,
      idcardNumber: employee.idcardNumber,
      employeeName: employee.name,
      mealType: targetMealType,
      diningHallId: Number(diningHallId),
      date: today,
      scannedAt,
      syncStatus: "pending",
      isExtraServing: false,
      isManualOverride: true,
      isWrongLocation,
      chefId: activeChefId ? Number(activeChefId) : null,
      deviceUuid: deviceUuid ?? null,
      subEmployeeId: null,
      syncKey: `manual-${employee.id}-${targetMealType}-${today}-${scannedAt}`,
    });

    resetAndClose();
    toast.success(`${employee.name} бүртгэгдлээ`);
  };

  // ── Гэрээт ажилтан бүртгэх ─────────────────────────────
  const handleSelectSubEmployee = async (sub: SubEmployee) => {
    if (!currentMeal || !diningHallId) {
      toast.error("Хоолны цаг эсвэл гал тогоо тохируулаагүй");
      return;
    }

    const today = getLocalDate();
    const mealType = currentMeal.mealType;

    // Давхардал шалгах — subEmployeeId + mealType + date
    const existing = await db.mealLogs
      .where("subEmployeeId")
      .equals(sub.id)
      .and(
        (log) =>
          log.mealType === mealType &&
          log.date === today &&
          log.diningHallId === Number(diningHallId),
      )
      .first();

    if (existing) {
      setDuplicate({ subEmployee: sub, existingLog: existing });
      return;
    }

    // bteg_id байвал холбосон ажилтны userId олно
    let userId = "";
    if (sub.btegId) {
      const linked = await db.employees
        .where("employeeCode")
        .equals(sub.btegId)
        .first();
      if (linked) userId = linked.id;
    }

    const scannedAt = new Date().toISOString();

    await createMealLog({
      userId,
      btegId: sub.btegId ?? "",
      idcardNumber: "",
      employeeName: sub.customLabel,
      mealType,
      diningHallId: Number(diningHallId),
      date: today,
      scannedAt,
      syncStatus: "pending",
      isExtraServing: false,
      isManualOverride: true,
      isWrongLocation: false,
      chefId: activeChefId ? Number(activeChefId) : null,
      deviceUuid: deviceUuid ?? null,
      subEmployeeId: sub.id,
      syncKey: `manual-sub-${sub.id}-${mealType}-${today}-${scannedAt}`,
    });

    resetAndClose();
    toast.success(`${sub.customLabel} бүртгэгдлээ`);
  };

  // ── Нэмэлт порц (байгаа ажилтан) ──────────────────────
  const handleAddExtraServingEmployee = useCallback(async () => {
    if (!duplicate?.employee || !currentMeal || !diningHallId) return;

    const { employee } = duplicate;
    const today = getLocalDate();
    const allowedMeals = getAllowedMealTypesForShift(
      employee.shiftStart,
      employee.shiftEnd,
      new Date(),
    );
    const targetMealType = resolveTargetMealTypeFromActiveSlots(
      allowedMeals,
      activeMealTypes,
      currentMeal.mealType,
    );
    const { isWrongLocation } = await checkAssignedLocation(
      employee.id,
      targetMealType,
      Number(diningHallId),
    );

    await createMealLog({
      userId: employee.id,
      btegId: employee.employeeCode,
      idcardNumber: employee.idcardNumber,
      employeeName: employee.name,
      mealType: targetMealType,
      diningHallId: Number(diningHallId),
      date: today,
      scannedAt: new Date().toISOString(),
      syncStatus: "pending",
      isExtraServing: true,
      isManualOverride: true,
      isWrongLocation,
      chefId: activeChefId ? Number(activeChefId) : null,
      deviceUuid: deviceUuid ?? null,
      subEmployeeId: null,
      syncKey: `manual-${employee.id}-${targetMealType}-${today}-extra-${Date.now()}`,
    });

    resetAndClose();
    toast.success(`${employee.name} нэмэлт порц бүртгэгдлээ`);
  }, [
    duplicate,
    currentMeal,
    activeMealTypes,
    diningHallId,
    activeChefId,
    deviceUuid,
  ]);

  // ── Нэмэлт порц (гэрээт ажилтан) ──────────────────────
  const handleAddExtraServingSubEmployee = useCallback(async () => {
    if (!duplicate?.subEmployee || !currentMeal || !diningHallId) return;

    const { subEmployee } = duplicate;
    const today = getLocalDate();
    const mealType = currentMeal.mealType;

    let userId = "";
    if (subEmployee.btegId) {
      const linked = await db.employees
        .where("employeeCode")
        .equals(subEmployee.btegId)
        .first();
      if (linked) userId = linked.id;
    }

    await createMealLog({
      userId,
      btegId: subEmployee.btegId ?? "",
      idcardNumber: "",
      employeeName: subEmployee.customLabel,
      mealType,
      diningHallId: Number(diningHallId),
      date: today,
      scannedAt: new Date().toISOString(),
      syncStatus: "pending",
      isExtraServing: true,
      isManualOverride: true,
      isWrongLocation: false,
      chefId: activeChefId ? Number(activeChefId) : null,
      deviceUuid: deviceUuid ?? null,
      subEmployeeId: subEmployee.id,
      syncKey: `manual-sub-${subEmployee.id}-${mealType}-${today}-extra-${Date.now()}`,
    });

    resetAndClose();
    toast.success(`${subEmployee.customLabel} нэмэлт порц бүртгэгдлээ`);
  }, [duplicate, currentMeal, diningHallId, activeChefId, deviceUuid]);

  return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 sm:px-4">
          <UserPlus className="h-4 w-4 text-blue-400" />
          <span className="truncate">Гараар бүртгэх</span>
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl bg-slate-950 border border-slate-700 rounded-lg [&>button]:text-slate-400 [&>button]:hover:text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Гараар бүртгэх</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Tab */}
          <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
            <button
              onClick={() => {
                setTab("employee");
                setSearch("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium ${
                tab === "employee"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}>
              <Users className="h-4 w-4" />
              Байгаа ажилтан
            </button>
            <button
              onClick={() => {
                setTab("sub");
                setSearch("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium ${
                tab === "sub"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}>
              <Building2 className="h-4 w-4" />
              Гэрээт ажилтан
            </button>
          </div>

          {/* Хайлт */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "employee"
                  ? "Нэр, код, хэлтсээр хайх..."
                  : "Гэрээт ажилчны нэрээр хайх..."
              }
              className="pl-9 rounded-lg h-11 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
              autoFocus
            />
          </div>

          {/* Жагсаалт */}
          <ScrollArea className="h-[400px]">
            {tab === "employee" ? (
              filteredEmployees.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {search ? "Олдсонгүй" : "Ажилтан ачаалж байна..."}
                </p>
              ) : (
                <div className="space-y-1 pr-3">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className="flex w-full items-center gap-3 rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 text-left hover:bg-slate-800">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-100">
                          {emp.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {emp.idcardNumber} | {emp.department}
                        </p>
                      </div>
                      <Badge
                        variant={emp.isActive ? "default" : "secondary"}
                        className={
                          emp.isActive
                            ? "shrink-0 bg-emerald-500/15 border-emerald-400/20 text-emerald-300"
                            : "shrink-0 bg-slate-700/50 border-white/5 text-slate-400"
                        }>
                        {emp.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )
            ) : filteredSubEmployees.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {search ? "Олдсонгүй" : "Гэрээт ажилтан байхгүй"}
              </p>
            ) : (
              <div className="space-y-1 pr-3">
                {filteredSubEmployees.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubEmployee(sub)}
                    className="flex w-full items-center gap-3 rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 text-left hover:bg-slate-800">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-100">
                        {sub.customLabel}
                      </p>
                      {sub.btegId && (
                        <p className="text-xs text-blue-400/70 font-mono mt-0.5">
                          Холбосон: {sub.btegId}
                        </p>
                      )}
                    </div>
                    <Badge className="shrink-0 bg-violet-500/15 border-violet-400/20 text-violet-300">
                      Гэрээт
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>

      {/* Давхардал modal */}
      {duplicate && (
        <DoubleScanModal
          open={true}
          onClose={() => setDuplicate(null)}
          onAddExtraServing={
            duplicate.employee
              ? handleAddExtraServingEmployee
              : handleAddExtraServingSubEmployee
          }
          employeeName={
            duplicate.employee?.name ?? duplicate.subEmployee?.customLabel ?? ""
          }
          mealName={currentMeal?.mealType ?? ""}
          existingScanTime={duplicate.existingLog.scannedAt}
        />
      )}
    </Dialog>
  );
});
