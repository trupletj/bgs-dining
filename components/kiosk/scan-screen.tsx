"use client";

import { useState, useCallback, useRef } from "react";
import { StatusBar } from "@/components/kiosk/status-bar";
import { CurrentMealDisplay } from "@/components/kiosk/current-meal-display";
import { IdleScreen } from "@/components/kiosk/idle-screen";
import {
  MealConfirmationOverlay,
  type ConfirmationResult,
} from "@/components/kiosk/meal-confirmation";
import { ConfirmedListSidebar } from "@/components/kiosk/confirmed-list-sidebar";
import { ScanModal } from "@/components/kiosk/scan-modal";
import { DoubleScanModal } from "@/components/kiosk/double-scan-modal";
import { CameraScanner } from "@/components/kiosk/camera-scanner";
import { ChefDashboard } from "@/components/kiosk/chef-dashboard";
import { ManualEntry } from "@/components/kiosk/manual-entry";
import { RefreshCw } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useScanSound } from "@/hooks/use-scan-sound";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { useSync } from "@/hooks/use-sync";
import { db, type Employee, type MealLog } from "@/lib/db";
import { checkDuplicateMealLog, createMealLog } from "@/hooks/use-meal-logs";
import { getMealLocationForSlot } from "@/lib/meal-type-map";
import {
  getAllowedMealTypesForShift,
  getLocalDate,
  KIOSK_CONFIG_KEYS,
  MEAL_NAME_MAP,
} from "@/lib/constants";
import { ScrollArea } from "../ui/scroll-area";

type ScanState = "idle" | "processing" | "result";

interface PendingModal {
  type: "unauthorized" | "double-scan";
  employee?: Employee;
  scannedCode: string;
  btegId?: string;
  message: string;
  existingLog?: MealLog;
  assignedLocationId?: number | null;
  targetMealType?: string;
}

export function ScanScreen() {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal | null>(null);
  const { activeMeals } = useCurrentMeal();
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);

  const currentMeal = activeMeals.length > 0 ? activeMeals[0] : null;

  const { value: diningHallId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.DINING_HALL_ID,
  );
  const { value: activeChefId } = useKioskConfig(
    KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID,
  );
  const { value: deviceUuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);
  const { play: playSound } = useScanSound();
  const { syncEmployees, state: syncState } = useSync();

  const generateSyncKey = (
    userId: string,
    mealType: string,
    date: string,
    extra: boolean,
  ) => {
    const base = `${userId}-${mealType}-${date}`;
    return extra ? `${base}-extra-${Date.now()}` : base;
  };

  const doCreateLog = useCallback(
    async (params: {
      employee: Employee;
      isExtraServing: boolean;
      mealType: string;
      isManualOverride: boolean;
      isWrongLocation?: boolean;
    }) => {
      if (!diningHallId) return;

      const today = getLocalDate();
      await createMealLog({
        userId: params.employee.id,
        btegId: params.employee.employeeCode,
        idcardNumber: params.employee.idcardNumber,
        employeeName: params.employee.name,
        mealType: params.mealType,
        diningHallId: Number(diningHallId),
        date: today,
        scannedAt: new Date().toISOString(),
        syncStatus: "pending",
        isExtraServing: params.isExtraServing,
        isManualOverride: params.isManualOverride,
        isWrongLocation: params.isWrongLocation || false,
        chefId: activeChefId ? Number(activeChefId) : null,
        deviceUuid: deviceUuid ?? null,
        syncKey: generateSyncKey(
          params.employee.id,
          params.mealType,
          today,
          params.isExtraServing,
        ),
      });
    },
    [diningHallId, activeChefId, deviceUuid],
  );

  const handleScan = useCallback(
    async (code: string) => {
      const now = Date.now();

      if (scanState === "processing") return;

      // 3 секундын доторх давхар скан хаах
      if (
        lastScannedRef.current &&
        lastScannedRef.current.code === code &&
        now - lastScannedRef.current.time < 3000
      ) {
        return;
      }
      lastScannedRef.current = { code, time: now };
      setScanState("processing");

      setPendingModal(null);
      setConfirmationResult(null);

      if (!currentMeal) {
        setConfirmationResult({
          type: "warning",
          title: "Хоолны цаг биш",
          message: "Одоогоор хоолны цаг эхлээгүй байна",
        });
        setScanState("result");
        return;
      }

      try {
        // 1. QR код задлах
        let qrData: any = null;
        try {
          qrData = JSON.parse(code);
        } catch (e) {
          playSound("error");
          setConfirmationResult({
            type: "error",
            title: "Буруу QR код",
            message: "Системд бүртгэлгүй эсвэл буруу форматтай код байна",
          });
          setScanState("result");
          return;
        }

        const lookupIdCard = qrData?.id_card_number
          ? String(qrData.id_card_number)
          : null;
        const lookupBteg = qrData?.bteg_id ? String(qrData.bteg_id) : null;

        if (!lookupIdCard && !lookupBteg) {
          playSound("error");
          setConfirmationResult({
            type: "error",
            title: "Буруу QR код",
            message: "QR кодын формат таарахгүй байна",
          });
          setScanState("result");
          return;
        }

        // 2. Ажилчныг хайх
        let employee = null;
        if (lookupBteg) {
          employee = await db.employees
            .where("employeeCode")
            .equals(lookupBteg)
            .first();
        }
        if (!employee && lookupIdCard) {
          employee = await db.employees
            .where("idcardNumber")
            .equals(lookupIdCard)
            .first();
        }

        // 3. Ажилтан олдохгүй бол
        if (!employee) {
          const existingUnregistered = await checkDuplicateMealLog(
            "", // userId байхгүй
            currentMeal.mealType,
            lookupIdCard || "", // QR-ын дугаараар хайх
          );

          if (existingUnregistered) {
            setPendingModal({
              type: "double-scan",
              employee: { name: "Бүртгэлгүй ажилтан", id: "" } as Employee, // Dummy объект
              btegId: lookupBteg || "",
              scannedCode: lookupIdCard || code,
              assignedLocationId: null,
              targetMealType: currentMeal.mealType,
              message: "Энэ бүртгэлгүй ажилтан аль хэдийн бүртгүүлсэн байна",
              existingLog: existingUnregistered,
            });
            setScanState("idle");
            return;
          }

          setPendingModal({
            type: "unauthorized",
            btegId: lookupBteg || "",
            scannedCode: lookupIdCard || code,
            assignedLocationId: null, // Мэдээлэл байхгүй үед null дамжуулна
            message: "Бүртгэлгүй ажилтан",
          });
          setScanState("idle");
          return;
        }

        // 4. Идэвхгүй ажилтан
        if (!employee.isActive) {
          playSound("error");
          setConfirmationResult({
            type: "error",
            title: "Идэвхгүй",
            message: `${employee.name} идэвхгүй байна`,
            employeeName: employee.name,
          });
          setScanState("result");
          return;
        }

        // 5. Хоол идэх эрх шалгах (Shift)
        const allowedMeals = getAllowedMealTypesForShift(
          employee.shiftStart,
          employee.shiftEnd,
          new Date(),
        );
        let targetMealType = currentMeal.mealType;

        // Хоолны төрөл хөрвүүлэх (Extend Lunch, Morning Meal гэх мэт)
        if (!allowedMeals.includes(targetMealType)) {
          if (
            targetMealType === "lunch" &&
            allowedMeals.includes("extend_lunch")
          ) {
            targetMealType = "extend_lunch";
          } else if (
            (targetMealType === "breakfast" ||
              targetMealType === "morning_meal") &&
            allowedMeals.includes("extend_morning_meal")
          ) {
            targetMealType = "extend_morning_meal";
          } else if (
            targetMealType === "breakfast" &&
            allowedMeals.includes("morning_meal")
          ) {
            targetMealType = "morning_meal";
          }
        }

        if (!allowedMeals.includes(targetMealType)) {
          setPendingModal({
            type: "unauthorized",
            employee,
            btegId: lookupBteg || "",
            scannedCode: lookupIdCard || code,
            assignedLocationId: null,
            message: `${employee.name} энэ хоолыг (${MEAL_NAME_MAP[targetMealType] || targetMealType}) идэх хуваарьгүй байна.`,
          });
          setScanState("idle");
          return;
        }

        // 6. Байршил (Dining Hall) шалгах
        const today = getLocalDate();
        const override = await db.mealLocationOverrides
          .where("[userId+date+mealType]")
          .equals([employee.id, today, targetMealType])
          .first();

        let assignedLocationId: number | null = null;
        if (override) {
          assignedLocationId = override.diningHallId;
        } else {
          const config = await db.userMealConfigs.get(employee.id);
          const location = config
            ? getMealLocationForSlot(config, targetMealType)
            : null;
          if (location !== "skip" && location !== null) {
            assignedLocationId = Number(location);
          }
        }

        // Буруу байршил бол Modal гаргах
        if (
          assignedLocationId !== null &&
          diningHallId &&
          assignedLocationId !== Number(diningHallId)
        ) {
          const targetHall = await db.diningHalls.get(assignedLocationId);
          const targetHallName =
            targetHall?.name ?? `Гал тогоо #${assignedLocationId}`;

          setPendingModal({
            type: "unauthorized",
            employee,
            assignedLocationId, // Зөв байршлыг дамжуулж байна
            btegId: lookupBteg || "",
            scannedCode: lookupIdCard || code,
            message: `${employee.name} нь "${targetHallName}"-д хуваарьтай байна. Энд гараар зөвшөөрөх үү?`,
          });
          setScanState("idle");
          return;
        } else if (assignedLocationId === null) {
          setPendingModal({
            type: "unauthorized",
            employee,
            assignedLocationId: null,
            btegId: lookupBteg || "",
            scannedCode: lookupIdCard || code,
            message: `${employee.name} энэ хоолонд бүртгэлгүй байна.`,
          });
          setScanState("idle");
          return;
        }

        // 7. Давхардал шалгах
        const existing = await checkDuplicateMealLog(
          employee.id,
          targetMealType,
          lookupIdCard || "",
        );
        if (existing) {
          setPendingModal({
            type: "double-scan",
            employee,
            btegId: lookupBteg || "",
            scannedCode: lookupIdCard || code,
            assignedLocationId,
            targetMealType: targetMealType,
            message: `${employee.name} аль хэдийн бүртгүүлсэн`,
            existingLog: existing,
          });
          setScanState("idle");
          return;
        }

        // 8. Амжилттай бүртгэх
        await doCreateLog({
          employee,
          isExtraServing: false,
          mealType: targetMealType,
          isManualOverride: false,
        });
        playSound("success");
        setConfirmationResult({
          type: "success",
          title: "Амжилттай",
          message: "Хоолны бүртгэл хийгдлээ",
          employeeName: employee.name,
          mealName: getMealName(targetMealType),
        });
        setScanState("result");
      } catch (error) {
        console.error("Scan error:", error);
        setScanState("result");
      }
    },
    [scanState, currentMeal, diningHallId, doCreateLog, playSound],
  );

  const handleDismiss = useCallback(() => {
    setScanState("idle");
    setConfirmationResult(null);
  }, []);

  const handleApproveManually = useCallback(async () => {
    if (!pendingModal || !currentMeal || !diningHallId) return;

    const today = getLocalDate();
    let employee = pendingModal.employee;
    let assignedLocationId = pendingModal.assignedLocationId;

    // 1. Хэрэв employee байхгүй бол DB-ээс нөхөж хайх
    if (!employee && pendingModal.btegId) {
      employee = await db.employees
        .where("employeeCode")
        .equals(pendingModal.btegId)
        .first();
    }

    // 2. Ажилтны ээлжинд тохирох mealType-ийг тодорхойлох (Mapping)
    let targetMealType = currentMeal.mealType;
    if (employee) {
      const allowedMeals = getAllowedMealTypesForShift(
        employee.shiftStart,
        employee.shiftEnd,
        new Date(),
      );

      if (!allowedMeals.includes(targetMealType)) {
        if (
          targetMealType === "lunch" &&
          allowedMeals.includes("extend_lunch")
        ) {
          targetMealType = "extend_lunch";
        } else if (
          (targetMealType === "breakfast" ||
            targetMealType === "morning_meal") &&
          allowedMeals.includes("extend_morning_meal")
        ) {
          targetMealType = "extend_morning_meal";
        } else if (
          targetMealType === "breakfast" &&
          allowedMeals.includes("morning_meal")
        ) {
          targetMealType = "morning_meal";
        }
      }

      // 3. Байршлыг дахин шалгах
      const override = await db.mealLocationOverrides
        .where("[userId+date+mealType]")
        .equals([employee.id, today, targetMealType])
        .first();

      if (override) {
        assignedLocationId = override.diningHallId;
      } else {
        const config = await db.userMealConfigs.get(employee.id);
        const location = config
          ? getMealLocationForSlot(config, targetMealType)
          : null;
        if (location !== "skip" && location !== null) {
          assignedLocationId = Number(location);
        }
      }
    }

    const isWrongLocation =
      assignedLocationId !== null &&
      assignedLocationId !== Number(diningHallId);

    // 4. Log үүсгэх (employee олдсон бол userId-г заавал дамжуулна)
    if (employee) {
      await doCreateLog({
        employee,
        isExtraServing: false,
        mealType: targetMealType, // Хөрвүүлсэн төрлөөр нь
        isManualOverride: true,
        isWrongLocation,
      });
    } else {
      // DB-д огт байхгүй ажилтан бол хуучин хэвээрээ
      await createMealLog({
        userId: "", // Олдоогүй
        btegId: pendingModal.btegId || "",
        idcardNumber: pendingModal.scannedCode,
        employeeName: "Тодорхойгүй ажилтан",
        mealType: currentMeal.mealType,
        diningHallId: Number(diningHallId),
        date: today,
        scannedAt: new Date().toISOString(),
        syncStatus: "pending",
        isExtraServing: false,
        isManualOverride: true,
        isWrongLocation: isWrongLocation,
        chefId: activeChefId ? Number(activeChefId) : null,
        deviceUuid: deviceUuid ?? null,
        syncKey: `manual-${pendingModal.scannedCode}-${today}-${Date.now()}`,
      });
    }

    setPendingModal(null);
    setConfirmationResult({
      type: "success",
      title: "Гараар зөвшөөрлөө",
      message: isWrongLocation
        ? "Буруу байршилд бүртгэгдлээ"
        : "Бүртгэл хадгалагдлаа",
      employeeName: employee?.name ?? "Бүртгэлгүй ажилтан",
      mealName: getMealName(targetMealType),
    });
    setScanState("result");
  }, [
    pendingModal,
    currentMeal,
    diningHallId,
    activeChefId,
    deviceUuid,
    doCreateLog,
  ]);

  const handleAddExtraServing = useCallback(async () => {
    if (!pendingModal?.employee || !currentMeal) return;

    const correctMealType = pendingModal.targetMealType || currentMeal.mealType;

    await doCreateLog({
      employee: pendingModal.employee,
      isExtraServing: true,
      mealType: correctMealType,
      isManualOverride: false,
    });

    setPendingModal(null);
    setConfirmationResult({
      type: "success",
      title: "Нэмэлт порц",
      message: "Нэмэлт порц бүртгэгдлээ",
      employeeName: pendingModal.employee.name,
      mealName: getMealName(correctMealType),
    });
    setScanState("result");
  }, [pendingModal, currentMeal, doCreateLog]);

  useBarcodeScanner({
    onScan: handleScan,
    enabled: scanState !== "processing",
  });

  return (
    <div className="flex h-screen flex-col select-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative z-10 flex h-screen flex-col">
        <StatusBar />
        <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 backdrop-blur-xl px-6 py-2.5">
          <CurrentMealDisplay />
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncEmployees()}
              disabled={syncState === "syncing"}
              className="flex items-center gap-2 rounded-xl bg-slate-800/60 border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white">
              <RefreshCw
                className={`h-4 w-4 ${syncState === "syncing" ? "animate-spin" : ""}`}
              />
              Шинэчлэх
            </button>
            <ManualEntry />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-slate-950">
          {/* Зүүн тал: Сканнер */}
          <div className="relative flex flex-[2] flex-col items-center justify-center gap-6">
            <IdleScreen />
            <CameraScanner onScan={handleScan} />
          </div>

          <div
            className={`
  relative border-l border-white/5 bg-slate-900/40 backdrop-blur-2xl transition-all duration-500 ease-in-out
  ${activeMeals.length === 2 ? "flex-[2] w-[600px]" : "flex-[0.8] w-80"}
`}>
            {activeMeals.length === 2 ? (
              <div className="flex h-full w-full">
                <div className="flex flex-1 flex-col border-r border-white/5 bg-slate-900/20">
                  <div className="p-3 border-b border-white/5 bg-slate-900/40">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">
                      Гал тогоо (Давхар ээлж)
                    </h3>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                      {activeMeals.map((meal) => (
                        <ChefDashboard key={meal.id} mealSlot={meal} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex flex-1 flex-col">
                  <ConfirmedListSidebar />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="border-b border-white/5 bg-slate-900/40">
                  {activeMeals.length > 0 ? (
                    activeMeals.map((meal) => (
                      <ChefDashboard key={meal.id} mealSlot={meal} />
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-sm italic">
                      Хоолны цаг эхлээгүй
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0">
                  <ConfirmedListSidebar />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {scanState === "result" && confirmationResult && (
        <MealConfirmationOverlay
          result={confirmationResult}
          onDismiss={handleDismiss}
        />
      )}

      {pendingModal?.type === "unauthorized" && (
        <ScanModal
          open={true}
          onClose={() => setPendingModal(null)}
          onApproveManually={handleApproveManually}
          scannedCode={pendingModal.scannedCode}
          employeeName={pendingModal.employee?.name}
          message={pendingModal.message}
        />
      )}

      {pendingModal?.type === "double-scan" && pendingModal.employee && (
        <DoubleScanModal
          open={true}
          onClose={() => setPendingModal(null)}
          onAddExtraServing={handleAddExtraServing}
          employeeName={pendingModal.employee.name}
          mealName={getMealName(currentMeal?.mealType ?? "")}
          existingScanTime={pendingModal.existingLog?.scannedAt ?? ""}
        />
      )}
    </div>
  );
}

function getMealName(mealType: string) {
  return MEAL_NAME_MAP[mealType as keyof typeof MEAL_NAME_MAP] || mealType;
}
