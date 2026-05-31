import { db, Employee, type MealLog, type SyncLog } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getLocalDate, KIOSK_CONFIG_KEYS } from "@/lib/constants";
import {
  buildExtraServingSyncKey,
  buildManualOverrideSyncKey,
  findServerRowsBySyncKey,
  isDifferentDeviceConflict,
} from "@/lib/sync/meal-log-conflicts";

const BATCH_SIZE = 100;

export type SyncResults = {
  employeesPulled: number;
  hallsPulled: number;
  chefsPulled: number;
  timeSlotsPulled: number;
  overridesPulled: number;
  subMealPlansPulled: number;
  expectedMealCountsPulled: number;
  serverMealLogCachePulled: number;
  logsPushed: number;
  isOffline?: boolean;
};

type ExpectedMealRow = {
  meal_type: string | null;
  expected_count: number | string | null;
  actual_count: number | string | null;
};

type ServerMealLogRow = {
  sync_key: string | null;
  user_id: string | null;
  sub_employee_id: string | null;
  bteg_id: string | null;
  meal_type: string | null;
  date: string | null;
  dining_hall_id: number | string | null;
  device_uuid: string | null;
  is_extra_serving: boolean | null;
  scanned_at: string | null;
};

type MealLogInsertRow = {
  user_id: string | null;
  bteg_id: string;
  dining_hall_id: number;
  meal_type: string;
  scanned_at: string;
  date: string;
  chef_id: number | null;
  is_extra_serving: boolean;
  is_manual_override: boolean;
  is_wrong_location: boolean;
  device_uuid: string | null;
  sync_key: string;
  sub_employee_id: string | null;
};

function normalizeMealType(mealType: string): string {
  return mealType === "nightmeal" ? "night_meal" : mealType;
}

function mealLogToInsertRow(log: MealLog): MealLogInsertRow {
  return {
    user_id: !log.userId || log.userId === "unknown" ? null : log.userId,
    bteg_id: log.btegId || "",
    dining_hall_id: log.diningHallId,
    meal_type: normalizeMealType(log.mealType),
    scanned_at: log.scannedAt,
    date: log.date,
    chef_id: log.chefId,
    is_extra_serving: log.isExtraServing,
    is_manual_override: log.isManualOverride,
    is_wrong_location: log.isWrongLocation,
    device_uuid: log.deviceUuid,
    sync_key: log.syncKey,
    sub_employee_id: log.subEmployeeId,
  };
}

function isDuplicateSyncKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; message?: string; details?: string };
  const text = `${maybeError.message ?? ""} ${maybeError.details ?? ""}`;

  return (
    maybeError.code === "23505" ||
    (text.includes("duplicate key value") &&
      text.includes("meal_logs_sync_key_key"))
  );
}

async function logSync(
  type: SyncLog["type"],
  status: SyncLog["status"],
  recordCount: number,
  error?: string,
): Promise<number | void> {
  return db.syncLog.add({
    type,
    status,
    recordCount,
    startedAt: new Date().toISOString(),
    ...(status !== "started" && { completedAt: new Date().toISOString() }),
    error,
  });
}

async function getDiningHallId(): Promise<number | null> {
  const config = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
  return config?.value ? Number(config.value) : null;
}

export async function pullEmployees(): Promise<number> {
  if (!navigator.onLine) return 0;
  const logId = await logSync("pull-employees", "started", 0);

  try {
    const supabase = await getSupabaseClient();

    const query = supabase.from("users_with_stats").select("*");

    const { data: allData, error } = await query;
    if (error) throw error;
    if (!allData || allData.length === 0) {
      console.warn("No data returned from server, keeping local data.");
      return 0;
    }

    const employees: Employee[] = (allData || []).map((row) => ({
      id: row.user_id,
      employeeCode: row.bteg_id || "",
      idcardNumber: row.idcard_number || "",
      phone: row.phone || "", // Шинээр нэмэгдсэн талбар
      name: `${row.last_name || ""} ${row.first_name || ""}`.trim(),
      department: row.department_name || row.heltes_name || "",
      position: row.position_name || "",
      heltesName: row.heltes_name || "",
      isActive: true, // View-ийн WHERE нөхцөлөөр аль хэдийн true байгаа
      shiftStart: row.start_at || "",
      shiftEnd: row.end_at || "",
    }));

    const mealConfigs = (allData || []).map((row) => ({
      userId: row.user_id,
      breakfastLocation: row.breakfast_location,
      lunchLocation: row.lunch_location,
      dinnerLocation: row.dinner_location,
      nightMealLocation: row.night_meal_location,
      morningMealLocation: row.morning_meal_location,
      extendMorningMealLocation: row.extend_morning_meal_location,
      extendLunchLocation: row.extend_lunch_location,
    }));

    // 4. Локал баазад хадгалах
    await db.transaction("rw", [db.employees, db.userMealConfigs], async () => {
      await db.employees.clear();
      await db.employees.bulkAdd(employees);
      await db.userMealConfigs.clear();
      await db.userMealConfigs.bulkAdd(mealConfigs);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: employees.length,
        completedAt: new Date().toISOString(),
      });
    }

    return employees.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullDiningHalls(): Promise<number> {
  const logId = await logSync("pull-dining-halls", "started", 0);

  try {
    const supabase = await getSupabaseClient();
    const { data: halls, error } = await supabase
      .from("dining_hall")
      .select("id, name, location");

    if (error) throw new Error(error.message);

    const mapped = (halls || []).map((h: Record<string, unknown>) => ({
      id: h.id as number,
      name: (h.name as string) || "",
      location: (h.location as string) || "",
    }));

    await db.transaction("rw", db.diningHalls, async () => {
      await db.diningHalls.clear();
      await db.diningHalls.bulkAdd(mapped);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mapped.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mapped.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullChefs(): Promise<number> {
  const logId = await logSync("pull-chefs", "started", 0);
  const diningHallId = await getDiningHallId();

  try {
    const supabase = await getSupabaseClient();
    let query = supabase
      .from("chefs")
      .select("id, name, phone, dining_hall_id, pin, is_active");
    if (diningHallId) {
      query = query.eq("dining_hall_id", diningHallId);
    }

    const { data: chefs, error } = await query;
    if (error) throw new Error(error.message);

    const mapped = (chefs || []).map((c: Record<string, unknown>) => ({
      id: c.id as number,
      name: (c.name as string) || "",
      phone: (c.phone as string) || "",
      diningHallId: c.dining_hall_id as number,
      pin: (c.pin as string) || "0000",
      isActive: c.is_active !== false,
    }));

    await db.transaction("rw", db.chefs, async () => {
      await db.chefs.clear();
      await db.chefs.bulkAdd(mapped);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mapped.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mapped.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullMealLocationOverrides(): Promise<number> {
  if (!navigator.onLine) return 0;
  const logId = await logSync("pull-overrides", "started", 0);

  try {
    const supabase = await getSupabaseClient();
    const today = new Date().toLocaleDateString("en-CA");

    const { data: allOverrides, error } = await supabase
      .from("meal_location_overrides")
      .select("id, user_id, bteg_id, date, meal_type, dining_hall_id, note")
      .eq("date", today)
      .eq("is_deleted", false);

    if (error)
      throw new Error(`meal_location_overrides error: ${error.message}`);

    const mappedOverrides = (allOverrides || []).map((o) => ({
      id: o.id as number,
      userId: o.user_id as string,
      btegId: (o.bteg_id as string) || "",
      date: o.date as string,
      mealType: o.meal_type as string,
      diningHallId: o.dining_hall_id as number,
      note: (o.note as string) || null,
    }));

    // 2. Ажилчдын мэдээллийг татах (Override байгаа үед л)
    if (mappedOverrides.length > 0) {
      const userIds = mappedOverrides.map((o) => o.userId);
      const { data: userData, error: userError } = await supabase
        .from("users_with_stats")
        .select(
          "user_id, bteg_id, idcard_number, first_name, last_name, heltes_name, position_name, phone, start_at, end_at",
        )
        .in("user_id", userIds);

      if (!userError && userData) {
        const mappedEmployees = userData.map((row) => ({
          id: row.user_id,
          employeeCode: row.bteg_id || "",
          idcardNumber: row.idcard_number || "",
          phone: row.phone || "",
          name: `${row.last_name || ""} ${row.first_name || ""}`.trim(),
          department: "",
          heltesName: row.heltes_name || "",
          position: row.position_name || "",
          isActive: true,
          shiftStart: row.start_at || "",
          shiftEnd: row.end_at || "",
        }));
        await db.employees.bulkPut(mappedEmployees);
      }
    }

    // 3. Локаль баазыг заавал ШИНЭЧЛЭХ (Энд хамгийн чухал хэсэг)
    await db.transaction("rw", db.mealLocationOverrides, async () => {
      // Сервер дээр дата байсан ч, байгаагүй ч эхлээд локаль баазаа цэвэрлэнэ
      await db.mealLocationOverrides.clear();

      if (mappedOverrides.length > 0) {
        // Зөвхөн идэвхтэй байгааг нь нэмнэ
        await db.mealLocationOverrides.bulkAdd(mappedOverrides);
      } else {
        console.log("No active overrides on server. Local storage cleared.");
      }
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mappedOverrides.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mappedOverrides.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullMealTimeSlots(): Promise<number> {
  const logId = await logSync("pull-time-slots", "started", 0);

  try {
    const rawDiningHallId = await getDiningHallId();

    const isInvalid =
      !rawDiningHallId ||
      String(rawDiningHallId) === "null" ||
      String(rawDiningHallId) === "undefined";

    if (isInvalid) {
      console.warn(
        "Sync: dining_hall_id олдсонгүй (эсвэл 'null' текст байна).",
      );
      if (typeof logId === "number") {
        await db.syncLog.update(logId, {
          status: "success",
          recordCount: 0,
          completedAt: new Date().toISOString(),
          error: "Dining Hall ID is missing or stringified 'null'",
        });
      }
      return 0;
    }
    const diningHallId = Number(rawDiningHallId);

    if (isNaN(diningHallId)) {
      throw new Error(`Invalid Dining Hall ID: ${rawDiningHallId}`);
    }
    const supabase = await getSupabaseClient();

    // Зөвхөн өөрийн гал тогоонд хамаарах цагийн хуваарийг татна
    let query = supabase
      .from("meal_time_slots")
      .select("*")
      .eq("dining_hall_id", diningHallId)
      .eq("is_active", true);
    if (diningHallId) {
      query = query.eq("dining_hall_id", diningHallId);
    }

    const { data: slots, error } = await query;
    if (error) throw new Error(`meal_time_slots: ${error.message}`);

    const mapped = (slots || []).map((s: Record<string, unknown>) => ({
      id: s.id as number,
      diningHallId: s.dining_hall_id as number,
      mealType: s.meal_type as string,
      startTime: s.start_time as string,
      endTime: s.end_time as string,
      isActive: s.is_active !== false,
      sortOrder: s.sort_order as number,
    }));

    await db.transaction("rw", db.mealTimeSlots, async () => {
      await db.mealTimeSlots.clear();
      await db.mealTimeSlots.bulkAdd(mapped);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mapped.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mapped.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullSubEmployees(): Promise<number> {
  if (!navigator.onLine) return 0;
  const logId = await logSync("pull-sub-employees", "started", 0);

  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from("sub_employee_for_food")
      .select("id, org_id, custom_label, bteg_id, is_active")
      .eq("is_active", true);

    if (error) throw error;

    const mapped = (data || []).map((row) => ({
      id: row.id as string,
      orgId: row.org_id as string,
      customLabel: row.custom_label ?? "",
      btegId: row.bteg_id ?? null,
      isActive: row.is_active ?? true,
    }));

    await db.transaction("rw", db.subEmployees, async () => {
      await db.subEmployees.clear();
      await db.subEmployees.bulkAdd(mapped);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mapped.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mapped.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullSubEmployeeMealPlans(): Promise<number> {
  if (!navigator.onLine) return 0;
  const logId = await logSync("pull-sub-meal-plans", "started", 0);

  try {
    const diningHallId = await getDiningHallId();
    if (!diningHallId) return 0;

    const supabase = await getSupabaseClient();
    const today = getLocalDate();

    const { data, error } = await supabase
      .from("sub_employee_meal_plans")
      .select(
        "id, org_id, dining_hall_id, date, breakfast_count, morning_meal_count, lunch_count, dinner_count, night_meal_count",
      )
      .eq("date", today)
      .eq("dining_hall_id", diningHallId);

    if (error) throw error;

    const mapped = (data || []).map((row) => ({
      id: row.id as string,
      orgId: row.org_id as string,
      diningHallId: row.dining_hall_id as number,
      date: row.date as string,
      breakfastCount: Number(row.breakfast_count || 0),
      morningMealCount: Number(row.morning_meal_count || 0),
      lunchCount: Number(row.lunch_count || 0),
      dinnerCount: Number(row.dinner_count || 0),
      nightMealCount: Number(row.night_meal_count || 0),
    }));

    await db.transaction("rw", db.subEmployeeMealPlans, async () => {
      await db.subEmployeeMealPlans.clear();
      await db.subEmployeeMealPlans.bulkAdd(mapped);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mapped.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mapped.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullExpectedMealCounts(): Promise<number> {
  if (!navigator.onLine) return 0;
  const logId = await logSync("pull-expected-meal-counts", "started", 0);

  try {
    const diningHallId = await getDiningHallId();
    if (!diningHallId) return 0;

    const supabase = await getSupabaseClient();
    const today = getLocalDate();

    const { data, error } = await supabase.rpc("get_meal_expected_vs_actual", {
      p_date: today,
      p_hall_id: diningHallId,
    });

    if (error) throw error;

    const totals = new Map<string, { expectedCount: number; actualCount: number }>();
    for (const row of (data || []) as ExpectedMealRow[]) {
      if (!row.meal_type) continue;

      const current = totals.get(row.meal_type) || {
        expectedCount: 0,
        actualCount: 0,
      };
      current.expectedCount += Number(row.expected_count || 0);
      current.actualCount += Number(row.actual_count || 0);
      totals.set(row.meal_type, current);
    }

    const mapped = Array.from(totals, ([mealType, counts]) => ({
      id: `${today}-${diningHallId}-${mealType}`,
      diningHallId,
      date: today,
      mealType,
      expectedCount: counts.expectedCount,
      actualCount: counts.actualCount,
    }));

    await db.transaction("rw", db.expectedMealCounts, async () => {
      await db.expectedMealCounts
        .where("[date+diningHallId]")
        .equals([today, diningHallId])
        .delete();
      await db.expectedMealCounts.bulkPut(mapped);
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: mapped.length,
        completedAt: new Date().toISOString(),
      });
    }

    return mapped.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pullCurrentMealLogCache(params: {
  diningHallId: number;
  date: string;
  mealType: string;
}): Promise<number> {
  if (!navigator.onLine) return 0;

  const logId = await logSync("pull-server-meal-log-cache", "started", 0);

  try {
    const supabase = await getSupabaseClient();
    const mealType = normalizeMealType(params.mealType);
    const { data, error } = await supabase
      .from("meal_logs")
      .select(
        "sync_key, user_id, sub_employee_id, bteg_id, meal_type, date, dining_hall_id, device_uuid, is_extra_serving, scanned_at",
      )
      .eq("dining_hall_id", params.diningHallId)
      .eq("date", params.date)
      .eq("meal_type", mealType);

    if (error) throw new Error(error.message);

    const fetchedAt = new Date().toISOString();
    const rows = ((data ?? []) as ServerMealLogRow[])
      .filter((row) => row.sync_key)
      .map((row) => ({
        syncKey: row.sync_key!,
        userId: row.user_id,
        subEmployeeId: row.sub_employee_id,
        btegId: row.bteg_id ?? "",
        mealType: row.meal_type ?? mealType,
        date: row.date ?? params.date,
        diningHallId: Number(row.dining_hall_id ?? params.diningHallId),
        deviceUuid: row.device_uuid,
        isExtraServing: Boolean(row.is_extra_serving),
        scannedAt: row.scanned_at ?? fetchedAt,
        fetchedAt,
      }));

    await db.transaction("rw", db.serverMealLogCache, async () => {
      await db.serverMealLogCache
        .where("[diningHallId+date+mealType]")
        .equals([params.diningHallId, params.date, mealType])
        .delete();
      if (rows.length > 0) {
        await db.serverMealLogCache.bulkPut(rows);
      }
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: rows.length,
        completedAt: new Date().toISOString(),
      });
    }

    return rows.length;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function pushMealLogs(): Promise<number> {
  const pending = await db.mealLogs
    .where("syncStatus")
    .equals("pending")
    .toArray();

  if (pending.length === 0) return 0;

  const logId = await logSync("push-meal-logs", "started", pending.length);
  let totalSynced = 0;

  try {
    const supabase = await getSupabaseClient();

    const markLogSynced = async (log: MealLog) => {
      if (typeof log.id === "number") {
        await db.mealLogs.update(log.id, { syncStatus: "synced" });
      }
    };

    const uploadSingleLog = async (log: MealLog): Promise<boolean> => {
      const { error } = await supabase
        .from("meal_logs")
        .insert(mealLogToInsertRow(log));

      if (!error) {
        await markLogSynced(log);
        return true;
      }

      if (!isDuplicateSyncKeyError(error)) {
        throw new Error(error.message);
      }

      const serverLog = (await findServerRowsBySyncKey([log.syncKey])).get(
        log.syncKey,
      );

      if (
        serverLog &&
        isDifferentDeviceConflict(log.deviceUuid, serverLog.device_uuid) &&
        !log.isExtraServing &&
        typeof log.id === "number"
      ) {
        if (log.isManualOverride) {
          const manualLog = {
            ...log,
            syncKey: buildManualOverrideSyncKey(log),
          };

          await db.mealLogs.update(log.id, {
            syncKey: manualLog.syncKey,
          });

          const { error: manualError } = await supabase
            .from("meal_logs")
            .insert(mealLogToInsertRow(manualLog));

          if (manualError) throw new Error(manualError.message);

          await markLogSynced(manualLog);
          return true;
        }

        const extraLog = {
          ...log,
          isExtraServing: true,
          syncKey: buildExtraServingSyncKey(log),
        };

        await db.mealLogs.update(log.id, {
          isExtraServing: true,
          syncKey: extraLog.syncKey,
        });

        const { error: extraError } = await supabase
          .from("meal_logs")
          .insert(mealLogToInsertRow(extraLog));

        if (extraError) throw new Error(extraError.message);

        await markLogSynced(extraLog);
        return true;
      }

      await markLogSynced(log);
      return true;
    };

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const existingBySyncKey = await findServerRowsBySyncKey(
        batch.map((log) => log.syncKey),
      );

      const uploadBatch: MealLog[] = [];
      const alreadySyncedIds: number[] = [];

      for (const log of batch) {
        const serverLog = existingBySyncKey.get(log.syncKey);

        if (!serverLog) {
          uploadBatch.push(log);
          continue;
        }

        if (!isDifferentDeviceConflict(log.deviceUuid, serverLog.device_uuid)) {
          if (typeof log.id === "number") alreadySyncedIds.push(log.id);
          continue;
        }

        if (!log.isExtraServing && typeof log.id === "number") {
          if (log.isManualOverride) {
            const syncKey = buildManualOverrideSyncKey(log);
            const manualLog = {
              ...log,
              syncKey,
            };

            await db.mealLogs.update(log.id, {
              syncKey,
            });
            uploadBatch.push(manualLog);
            continue;
          }

          const syncKey = buildExtraServingSyncKey(log);
          const extraLog = {
            ...log,
            isExtraServing: true,
            syncKey,
          };

          await db.mealLogs.update(log.id, {
            isExtraServing: true,
            syncKey,
          });
          uploadBatch.push(extraLog);
          continue;
        }

        if (typeof log.id === "number") {
          await db.mealLogs.update(log.id, { syncStatus: "failed" });
        }
      }

      if (alreadySyncedIds.length > 0) {
        await db.mealLogs
          .where("id")
          .anyOf(alreadySyncedIds)
          .modify({ syncStatus: "synced" });
        totalSynced += alreadySyncedIds.length;
      }

      if (uploadBatch.length === 0) continue;

      const rows = uploadBatch.map(mealLogToInsertRow);

      const { error } = await supabase
        .from("meal_logs")
        .insert(rows);

      if (error) {
        if (!isDuplicateSyncKeyError(error)) throw new Error(error.message);

        for (const log of uploadBatch) {
          if (await uploadSingleLog(log)) totalSynced += 1;
        }
        continue;
      }

      const ids = uploadBatch.map((l) => l.id!).filter(Boolean);
      await db.mealLogs.where("id").anyOf(ids).modify({ syncStatus: "synced" });
      totalSynced += uploadBatch.length;
    }

    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.LAST_CONFIRMATION_SYNC,
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "success",
        recordCount: totalSynced,
        completedAt: new Date().toISOString(),
      });
    }

    return totalSynced;
  } catch (error) {
    if (typeof logId === "number") {
      await db.syncLog.update(logId, {
        status: "failed",
        recordCount: totalSynced,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export async function sendHeartbeat(): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const uuidConfig = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.DEVICE_UUID);
    if (!uuidConfig?.value) return;

    await supabase
      .from("kiosks")
      .update({ last_heartbeat: new Date().toISOString() })
      .eq("device_uuid", uuidConfig.value);
  } catch {
    // Heartbeat failures are non-critical
  }
}

export async function runFullSync(): Promise<SyncResults> {
  const results = {
    employeesPulled: 0,
    hallsPulled: 0,
    chefsPulled: 0,
    timeSlotsPulled: 0,
    overridesPulled: 0,
    subMealPlansPulled: 0,
    expectedMealCountsPulled: 0,
    serverMealLogCachePulled: 0,
    logsPushed: 0,
  };
  if (!navigator.onLine) {
    console.warn("Sync: Интернет холболтгүй тул шинэчлэл хийгдсэнгүй.");
    return { ...results, isOffline: true };
  }

  try {
    const uuidConfig = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.DEVICE_UUID);
    const hallIdConfig = await db.kioskConfig.get(
      KIOSK_CONFIG_KEYS.DINING_HALL_ID,
    );

    if (!uuidConfig?.value) {
      console.warn("Sync skipped: Device UUID not found.");
      return results;
    }

    const supabase = await getSupabaseClient();
    const { data: kiosk, error: kioskError } = await supabase
      .from("kiosks")
      .select("is_active, dining_hall_id")
      .eq("device_uuid", uuidConfig.value)
      .single();

    if (kioskError) {
      console.error(
        "Sync: Auth check failed due to network/server error. Skipping sync...",
        kioskError,
      );
      return results;
    }

    if (hallIdConfig?.value) {
      if (kioskError || !kiosk || !kiosk.is_active) {
        await db.kioskConfig.delete(KIOSK_CONFIG_KEYS.DINING_HALL_ID);
        window.location.href = "/setup";
        throw new Error("UNAUTHORIZED_DEVICE");
      }
    } else {
      return results;
    }
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED_DEVICE") throw e;
    return results;
  }
  try {
    results.logsPushed = await pushMealLogs();
  } catch (e) {
    console.error("Push meal logs failed:", e);
  }

  try {
    results.hallsPulled = await pullDiningHalls();
  } catch (e) {
    console.error("Pull dining halls failed:", e);
  }

  try {
    results.chefsPulled = await pullChefs();
  } catch (e) {
    console.error("Pull chefs failed:", e);
  }

  try {
    results.timeSlotsPulled = await pullMealTimeSlots();
  } catch (e) {
    console.error("Pull time slots failed:", e);
  }

  try {
    results.employeesPulled = await pullEmployees();
  } catch (e) {
    console.error("Pull employees failed:", e);
  }
  try {
    await pullSubEmployees();
  } catch (e) {
    console.error("Pull sub employees failed:", e);
  }
  try {
    results.subMealPlansPulled = await pullSubEmployeeMealPlans();
  } catch (e) {
    console.error("Pull sub employee meal plans failed:", e);
  }
  try {
    results.expectedMealCountsPulled = await pullExpectedMealCounts();
  } catch (e) {
    console.error("Pull expected meal counts failed:", e);
  }
  try {
    results.overridesPulled = await pullMealLocationOverrides();
  } catch (e) {
    console.error("Pull meal location overrides failed:", e);
  }
  await sendHeartbeat();

  return results;
}
