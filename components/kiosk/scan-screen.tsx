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
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useScanSound } from "@/hooks/use-scan-sound";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { db, type Employee, type MealLog } from "@/lib/db";
import { checkDuplicateMealLog, createMealLog } from "@/hooks/use-meal-logs";
import { getMealLocationForSlot } from "@/lib/meal-type-map";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

type ScanState = "idle" | "processing" | "result";

interface PendingModal {
  type: "unauthorized" | "double-scan";
  employee?: Employee;
  scannedCode: string;
  message: string;
  existingLog?: MealLog;
}

export function ScanScreen() {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal | null>(null);
  const { currentMeal } = useCurrentMeal();
  const { value: diningHallId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  const { value: activeChefId } = useKioskConfig(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID);
  const { value: deviceUuid } = useKioskConfig(KIOSK_CONFIG_KEYS.DEVICE_UUID);
  const { play: playSound } = useScanSound();

  const generateSyncKey = (userId: string, mealType: string, date: string, extra: boolean) => {
    const base = `${userId}-${mealType}-${date}`;
    return extra ? `${base}-extra-${Date.now()}` : base;
  };

  const doCreateLog = useCallback(
    async (params: {
      employee: Employee;
      isExtraServing: boolean;
      isManualOverride: boolean;
    }) => {
      if (!currentMeal || !diningHallId) return;
      const today = new Date().toISOString().split("T")[0];

      await createMealLog({
        userId: params.employee.id,
        idcardNumber: params.employee.idcardNumber,
        employeeName: params.employee.name,
        mealType: currentMeal.id,
        diningHallId: Number(diningHallId),
        date: today,
        scannedAt: new Date().toISOString(),
        syncStatus: "pending",
        isExtraServing: params.isExtraServing,
        isManualOverride: params.isManualOverride,
        chefId: activeChefId ? Number(activeChefId) : null,
        deviceUuid: deviceUuid ?? null,
        syncKey: generateSyncKey(
          params.employee.id,
          currentMeal.id,
          today,
          params.isExtraServing
        ),
      });
    },
    [currentMeal, diningHallId, activeChefId, deviceUuid]
  );

  const handleScan = useCallback(
    async (code: string) => {
      if (scanState === "processing") return;
      setScanState("processing");

      try {
        // 1. Check if meal time is active
        if (!currentMeal) {
          setConfirmationResult({
            type: "warning",
            title: "Хоолны цаг биш",
            message: "Одоогоор хоолны цаг эхлээгүй байна",
          });
          setScanState("result");
          return;
        }

        // 2. Parse QR code — must be JSON {"id_card_number":"...","bteg_id":...,"key":"..."}
        let lookupCode: string | null = null;
        try {
          const parsed = JSON.parse(code);
          if (parsed.id_card_number) {
            lookupCode = String(parsed.id_card_number);
          }
        } catch {
          // Not valid JSON
        }

        if (!lookupCode) {
          playSound("error");
          setConfirmationResult({
            type: "error",
            title: "Буруу QR код",
            message: "QR кодын формат таарахгүй байна",
          });
          setScanState("result");
          return;
        }

        // Look up employee by idcardNumber first, then by employeeCode
        let employee = await db.employees.where("idcardNumber").equals(lookupCode).first();
        if (!employee) {
          employee = await db.employees.where("employeeCode").equals(lookupCode).first();
        }

        if (!employee) {
          // Not found at all → unauthorized modal
          setPendingModal({
            type: "unauthorized",
            scannedCode: lookupCode,
            message: "Бүртгэлгүй ажилтан",
          });
          setScanState("idle");
          return;
        }

        // 3. Check if employee is active
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

        // 4. Check meal location override first, then default config
        const today = new Date().toISOString().split("T")[0];
        const override = await db.mealLocationOverrides
          .where("[userId+date+mealType]")
          .equals([employee.id, today, currentMeal.id])
          .first();

        if (override) {
          // Override exists — check if it points to THIS dining hall
          if (diningHallId && override.diningHallId !== Number(diningHallId)) {
            // Employee was redirected to a different hall today
            const targetHall = await db.diningHalls.get(override.diningHallId);
            playSound("error");
            setConfirmationResult({
              type: "error",
              title: "Шилжүүлсэн",
              message: `${employee.name} өнөөдөр "${targetHall?.name ?? override.diningHallId}" руу шилжүүлсэн`,
              employeeName: employee.name,
            });
            setScanState("result");
            return;
          }
          // Override matches this hall → allowed, skip default config check
        } else {
          // No override — use default config logic
          const config = await db.userMealConfigs.get(employee.id);
          if (!config) {
            // No meal config and no override → unauthorized modal
            setPendingModal({
              type: "unauthorized",
              employee,
              scannedCode: code,
              message: `${employee.name} хоолны тохиргоо хийгдээгүй байна`,
            });
            setScanState("idle");
            return;
          }

          // Check meal location for current slot
          const location = getMealLocationForSlot(config, currentMeal.id);
          if (location === null) {
            setPendingModal({
              type: "unauthorized",
              employee,
              scannedCode: code,
              message: `${employee.name} "${currentMeal.name}" хоолонд бүртгэлгүй`,
            });
            setScanState("idle");
            return;
          }
          if (location !== "skip" && diningHallId && location !== Number(diningHallId)) {
            const correctHall = await db.diningHalls.get(location);
            playSound("error");
            setConfirmationResult({
              type: "error",
              title: "Буруу гал тогоо",
              message: `${employee.name} "${correctHall?.name ?? location}" гал тогоонд бүртгэлтэй`,
              employeeName: employee.name,
            });
            setScanState("result");
            return;
          }
        }

        // 5. Check duplicate
        const existing = await checkDuplicateMealLog(employee.id, currentMeal.id, today);
        if (existing) {
          setPendingModal({
            type: "double-scan",
            employee,
            scannedCode: code,
            message: `${employee.name} аль хэдийн бүртгүүлсэн`,
            existingLog: existing,
          });
          setScanState("idle");
          return;
        }

        // 7. Create meal log → success
        await doCreateLog({ employee, isExtraServing: false, isManualOverride: false });
        playSound("success");

        setConfirmationResult({
          type: "success",
          title: "Амжилттай",
          message: "Хоолны бүртгэл хийгдлээ",
          employeeName: employee.name,
          mealName: currentMeal.name,
        });
        setScanState("result");
      } catch (error) {
        console.error("Scan processing error:", error);
        playSound("error");
        setConfirmationResult({
          type: "error",
          title: "Алдаа",
          message: "Бүртгэл хийхэд алдаа гарлаа",
        });
        setScanState("result");
      }
    },
    [scanState, currentMeal, diningHallId, doCreateLog]
  );

  const handleDismiss = useCallback(() => {
    setScanState("idle");
    setConfirmationResult(null);
  }, []);

  const handleModalClose = useCallback(() => {
    setPendingModal(null);
  }, []);

  const handleApproveManually = useCallback(async () => {
    if (!pendingModal || !currentMeal || !diningHallId) return;

    const employee = pendingModal.employee;
    if (employee) {
      await doCreateLog({ employee, isExtraServing: false, isManualOverride: true });
    } else {
      // Unknown employee — create log with minimal info
      const today = new Date().toISOString().split("T")[0];
      await createMealLog({
        userId: "unknown",
        idcardNumber: pendingModal.scannedCode,
        employeeName: "Тодорхойгүй",
        mealType: currentMeal.id,
        diningHallId: Number(diningHallId),
        date: today,
        scannedAt: new Date().toISOString(),
        syncStatus: "pending",
        isExtraServing: false,
        isManualOverride: true,
        chefId: activeChefId ? Number(activeChefId) : null,
        deviceUuid: deviceUuid ?? null,
        syncKey: `manual-${pendingModal.scannedCode}-${currentMeal.id}-${today}-${Date.now()}`,
      });
    }

    setPendingModal(null);
    setConfirmationResult({
      type: "success",
      title: "Гараар зөвшөөрсөн",
      message: "Хоолны бүртгэл хийгдлээ",
      employeeName: employee?.name ?? pendingModal.scannedCode,
      mealName: currentMeal.name,
    });
    setScanState("result");
  }, [pendingModal, currentMeal, diningHallId, activeChefId, deviceUuid, doCreateLog]);

  const handleAddExtraServing = useCallback(async () => {
    if (!pendingModal?.employee) return;
    await doCreateLog({
      employee: pendingModal.employee,
      isExtraServing: true,
      isManualOverride: false,
    });

    setPendingModal(null);
    setConfirmationResult({
      type: "success",
      title: "Нэмэлт порц",
      message: "Нэмэлт порц бүртгэгдлээ",
      employeeName: pendingModal.employee.name,
      mealName: currentMeal?.name,
    });
    setScanState("result");
  }, [pendingModal, currentMeal, doCreateLog]);

  useBarcodeScanner({
    onScan: handleScan,
    enabled: scanState !== "processing" && !pendingModal,
  });

  return (
    <div className="flex h-screen flex-col select-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" onContextMenu={(e) => e.preventDefault()}>
      {/* Animated radial gradient overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.1) 0%, transparent 50%)" }} />

      <div className="relative z-10 flex h-screen flex-col">
        <StatusBar />

        <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 backdrop-blur-xl px-6 py-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.02)]">
          <CurrentMealDisplay />
          <ManualEntry />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden">
            {/* Animated background blobs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="animate-pulse-slow absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
              <div className="animate-pulse-slow absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" style={{ animationDelay: "2s" }} />
            </div>
            <IdleScreen />
            <CameraScanner onScan={handleScan} />
          </div>
          <div className="relative flex h-full w-96 flex-col overflow-hidden border-l border-white/5 bg-slate-900/60 backdrop-blur-2xl shadow-[-4px_0_24px_-4px_rgba(0,0,0,0.3)]">
            {/* Glass shine overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
            <ChefDashboard />
            <ConfirmedListSidebar />
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
          onClose={handleModalClose}
          onApproveManually={handleApproveManually}
          scannedCode={pendingModal.scannedCode}
          employeeName={pendingModal.employee?.name}
          message={pendingModal.message}
        />
      )}

      {pendingModal?.type === "double-scan" && pendingModal.employee && (
        <DoubleScanModal
          open={true}
          onClose={handleModalClose}
          onAddExtraServing={handleAddExtraServing}
          employeeName={pendingModal.employee.name}
          mealName={currentMeal?.name ?? ""}
          existingScanTime={pendingModal.existingLog?.scannedAt ?? ""}
        />
      )}
    </div>
  );
}
