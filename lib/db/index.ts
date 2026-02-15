import Dexie, { type EntityTable } from "dexie";
import { DB_NAME } from "@/lib/constants";

export interface Employee {
  id: string; // uuid from Supabase users.id
  employeeCode: string; // bteg_id
  idcardNumber: string; // idcard_number - primary lookup field
  name: string;
  department: string;
  position: string;
  heltesName: string;
  isActive: boolean;
}

export interface UserMealConfig {
  userId: string; // uuid, same as Employee.id
  breakfastLocation: number | null;
  lunchLocation: number | null;
  dinnerLocation: number | null;
  nightMealLocation: number | null;
  morningMealLocation: number | null;
}

export interface MealLog {
  id?: number;
  userId: string; // uuid
  idcardNumber: string;
  employeeName: string;
  mealType: string; // breakfast, lunch, dinner, nightmeal, morning_meal, snack
  diningHallId: number;
  date: string; // YYYY-MM-DD
  scannedAt: string; // ISO timestamp
  syncStatus: "pending" | "synced" | "failed";
  isExtraServing: boolean;
  isManualOverride: boolean;
  chefId: number | null;
  deviceUuid: string | null;
  syncKey: string; // unique key for upsert
}

export interface MealTimeSlot {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isActive: boolean;
  sortOrder: number;
}

export interface DiningHall {
  id: number; // bigint from Supabase
  name: string;
  location: string;
}

export interface Chef {
  id: number; // bigint from Supabase (not auto-increment locally)
  name: string;
  diningHallId: number;
  pin: string;
  isActive: boolean;
}

export interface MealLocationOverride {
  id: number; // bigint from Supabase
  userId: string; // uuid
  btegId: string;
  date: string; // YYYY-MM-DD
  mealType: string; // breakfast, lunch, dinner, etc.
  diningHallId: number;
  note: string | null;
}

export interface KioskConfig {
  key: string;
  value: string;
  updatedAt: string;
}

export interface SyncLog {
  id?: number;
  type: "pull-employees" | "pull-dining-halls" | "pull-chefs" | "pull-overrides" | "push-meal-logs" | "heartbeat";
  status: "started" | "success" | "failed";
  recordCount: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

class CanteenDB extends Dexie {
  employees!: EntityTable<Employee, "id">;
  userMealConfigs!: EntityTable<UserMealConfig, "userId">;
  mealLogs!: EntityTable<MealLog, "id">;
  mealTimeSlots!: EntityTable<MealTimeSlot, "id">;
  diningHalls!: EntityTable<DiningHall, "id">;
  chefs!: EntityTable<Chef, "id">;
  mealLocationOverrides!: EntityTable<MealLocationOverride, "id">;
  kioskConfig!: EntityTable<KioskConfig, "key">;
  syncLog!: EntityTable<SyncLog, "id">;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      employees: "id, employeeCode, diningHallId, isActive",
      mealConfirmations:
        "++id, [employeeId+mealSlotId+date], employeeCode, mealSlotId, date, diningHallId, syncStatus, confirmedAt",
      mealTimeSlots: "id, sortOrder, isActive",
      diningHalls: "id, isActive",
      chefs: "++id, diningHallId, isActive",
      kioskConfig: "key",
      syncLog: "++id, type, status, startedAt",
    });

    // v2: Drop tables with changed primary keys (chefs: ++id → id)
    // and old mealConfirmations. Dexie requires null to drop before recreate.
    this.version(2).stores({
      mealConfirmations: null,
      chefs: null,
    });

    // v3: Recreate chefs with new PK, add new tables, update indexes
    this.version(3)
      .stores({
        employees: "id, employeeCode, idcardNumber, isActive",
        userMealConfigs: "userId",
        mealLogs:
          "++id, [userId+mealType+date], idcardNumber, mealType, date, diningHallId, syncStatus, scannedAt, syncKey",
        mealTimeSlots: "id, sortOrder, isActive",
        diningHalls: "id",
        chefs: "id, diningHallId, isActive",
        kioskConfig: "key",
        syncLog: "++id, type, status, startedAt",
      })
      .upgrade(async (tx) => {
        // Migrate mealConfirmations → mealLogs if any exist
        // (mealConfirmations was dropped in v2 but data may have been
        //  preserved by Dexie until this upgrade runs)
        try {
          const oldTable = tx.table("mealConfirmations");
          const oldRecords = await oldTable.toArray();
          if (oldRecords.length > 0) {
            const newLogs = oldRecords.map((old: Record<string, unknown>) => ({
              userId: old.employeeId as string,
              idcardNumber: (old.employeeCode as string) || "",
              employeeName: (old.employeeName as string) || "",
              mealType: (old.mealSlotId as string) || "",
              diningHallId: Number(old.diningHallId) || 0,
              date: (old.date as string) || "",
              scannedAt: (old.confirmedAt as string) || new Date().toISOString(),
              syncStatus: (old.syncStatus as string) === "synced" ? "synced" as const : "pending" as const,
              isExtraServing: false,
              isManualOverride: false,
              chefId: null,
              deviceUuid: null,
              syncKey: `migrated-${old.employeeId}-${old.mealSlotId}-${old.date}`,
            }));
            await tx.table("mealLogs").bulkAdd(newLogs);
          }
        } catch {
          // mealConfirmations already dropped, nothing to migrate
        }
      });

    // v4: Add mealLocationOverrides table
    this.version(4).stores({
      mealLocationOverrides: "id, [userId+date+mealType], [date+diningHallId]",
    });
  }
}

export const db = new CanteenDB();
