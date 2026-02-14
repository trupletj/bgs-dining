import { db, type SyncLog } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase/client";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

const BATCH_SIZE = 100;

async function logSync(
  type: SyncLog["type"],
  status: SyncLog["status"],
  recordCount: number,
  error?: string
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
  const logId = await logSync("pull-employees", "started", 0);
  const diningHallId = await getDiningHallId();

  try {
    const supabase = await getSupabaseClient();

    // 1. Get user_meal_configs filtered by this dining hall
    let configQuery = supabase.from("user_meal_configs").select("*");

    if (diningHallId) {
      // Get configs where ANY meal location matches this dining hall
      configQuery = configQuery.or(
        `breakfast_location.eq.${diningHallId},lunch_location.eq.${diningHallId},dinner_location.eq.${diningHallId},night_meal_location.eq.${diningHallId},morning_meal_location.eq.${diningHallId}`
      );
    }

    const { data: configs, error: configError } = await configQuery;
    if (configError) throw new Error(`user_meal_configs: ${configError.message}`);
    if (!configs || configs.length === 0) {
      // Clear local and return
      await db.transaction("rw", db.employees, db.userMealConfigs, async () => {
        await db.employees.clear();
        await db.userMealConfigs.clear();
      });
      if (typeof logId === "number") {
        await db.syncLog.update(logId, { status: "success", recordCount: 0, completedAt: new Date().toISOString() });
      }
      return 0;
    }

    // 2. Extract user IDs
    const userIds = configs.map((c: { user_id: string }) => c.user_id);

    // 3. Query users in batches (Supabase has URL length limits)
    const allUsers: Record<string, unknown>[] = [];
    for (let i = 0; i < userIds.length; i += 200) {
      const batch = userIds.slice(i, i + 200);
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, bteg_id, idcard_number, first_name, last_name, nice_name, department_name, heltes_name, position_name, is_active")
        .in("id", batch);
      if (userError) throw new Error(`users: ${userError.message}`);
      if (users) allUsers.push(...users);
    }

    // 4. Map to local format and save
    const employees = allUsers.map((u: Record<string, unknown>) => ({
      id: u.id as string,
      employeeCode: (u.bteg_id as string) || "",
      idcardNumber: (u.idcard_number as string) || "",
      name: (u.nice_name as string) || `${u.last_name || ""} ${u.first_name || ""}`.trim(),
      department: (u.department_name as string) || "",
      position: (u.position_name as string) || "",
      heltesName: (u.heltes_name as string) || "",
      isActive: u.is_active !== false,
    }));

    const mealConfigs = configs.map((c: Record<string, unknown>) => ({
      userId: c.user_id as string,
      breakfastLocation: c.breakfast_location as number | null,
      lunchLocation: c.lunch_location as number | null,
      dinnerLocation: c.dinner_location as number | null,
      nightMealLocation: c.night_meal_location as number | null,
      morningMealLocation: c.morning_meal_location as number | null,
    }));

    await db.transaction("rw", db.employees, db.userMealConfigs, async () => {
      await db.employees.clear();
      await db.employees.bulkAdd(employees);
      await db.userMealConfigs.clear();
      await db.userMealConfigs.bulkAdd(mealConfigs);
    });

    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.LAST_EMPLOYEE_SYNC,
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    let query = supabase.from("chefs").select("id, name, dining_hall_id, pin, is_active");
    if (diningHallId) {
      query = query.eq("dining_hall_id", diningHallId);
    }

    const { data: chefs, error } = await query;
    if (error) throw new Error(error.message);

    const mapped = (chefs || []).map((c: Record<string, unknown>) => ({
      id: c.id as number,
      name: (c.name as string) || "",
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

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);

      const rows = batch.map((log) => ({
        user_id: log.userId,
        dining_hall_id: log.diningHallId,
        meal_type: log.mealType,
        scanned_at: log.scannedAt,
        date: log.date,
        chef_id: log.chefId,
        is_extra_serving: log.isExtraServing,
        is_manual_override: log.isManualOverride,
        device_uuid: log.deviceUuid,
        sync_key: log.syncKey,
      }));

      const { error } = await supabase
        .from("meal_logs")
        .upsert(rows, { onConflict: "sync_key", ignoreDuplicates: true });

      if (error) throw new Error(error.message);

      // Mark batch as synced
      const ids = batch.map((l) => l.id!).filter(Boolean);
      await db.mealLogs
        .where("id")
        .anyOf(ids)
        .modify({ syncStatus: "synced" });

      totalSynced += batch.length;
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

export async function runFullSync(): Promise<{
  employeesPulled: number;
  hallsPulled: number;
  chefsPulled: number;
  logsPushed: number;
}> {
  const results = {
    employeesPulled: 0,
    hallsPulled: 0,
    chefsPulled: 0,
    logsPushed: 0,
  };

  // Push first (protect local data)
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
    results.employeesPulled = await pullEmployees();
  } catch (e) {
    console.error("Pull employees failed:", e);
  }

  // Non-critical heartbeat
  await sendHeartbeat();

  return results;
}
