import { db, Employee, type SyncLog } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase/client";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

const BATCH_SIZE = 100;

export type SyncResults = {
  employeesPulled: number;
  hallsPulled: number;
  chefsPulled: number;
  timeSlotsPulled: number;
  overridesPulled: number;
  logsPushed: number;
  isOffline?: boolean;
};

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

// export async function pullEmployees(): Promise<number> {
//   const logId = await logSync("pull-employees", "started", 0);
//   const diningHallId = await getDiningHallId();

//   try {
//     const supabase = await getSupabaseClient();

//     // 1. Get user_meal_configs filtered by this dining hall
//     let configQuery = supabase.from("user_meal_configs").select("*");

//     if (diningHallId) {
//       // Get configs where ANY meal location matches this dining hall
//       configQuery = configQuery.or(
//         `breakfast_location.eq.${diningHallId},lunch_location.eq.${diningHallId},dinner_location.eq.${diningHallId},night_meal_location.eq.${diningHallId},morning_meal_location.eq.${diningHallId}`,
//       );
//     }

//     const { data: configs, error: configError } = await configQuery;
//     if (configError)
//       throw new Error(`user_meal_configs: ${configError.message}`);

//     const allConfigs = configs || [];

//     // 2. Extract user IDs — merge default config users + override users
//     const defaultUserIds = allConfigs.map(
//       (c: { user_id: string }) => c.user_id,
//     );

//     // Also query meal_location_overrides for today pointing to this dining hall
//     let overrideUserIds: string[] = [];
//     if (diningHallId) {
//       const today = new Date().toISOString().split("T")[0];
//       const { data: overrides } = await supabase
//         .from("meal_location_overrides")
//         .select("user_id")
//         .eq("date", today)
//         .eq("dining_hall_id", diningHallId);
//       if (overrides) {
//         overrideUserIds = overrides.map((o: { user_id: string }) => o.user_id);
//       }
//     }

//     const userIds = [...new Set([...defaultUserIds, ...overrideUserIds])];

//     if (userIds.length === 0) {
//       // No default configs and no overrides — clear local and return
//       await db.transaction("rw", db.employees, db.userMealConfigs, async () => {
//         await db.employees.clear();
//         await db.userMealConfigs.clear();
//       });
//       if (typeof logId === "number") {
//         await db.syncLog.update(logId, {
//           status: "success",
//           recordCount: 0,
//           completedAt: new Date().toISOString(),
//         });
//       }
//       return 0;
//     }

//     // Fetch configs for override-only users (they may not match default filter)
//     const overrideOnlyIds = overrideUserIds.filter(
//       (id) => !defaultUserIds.includes(id),
//     );
//     if (overrideOnlyIds.length > 0) {
//       for (let i = 0; i < overrideOnlyIds.length; i += 200) {
//         const batch = overrideOnlyIds.slice(i, i + 200);
//         const { data: extraConfigs } = await supabase
//           .from("user_meal_configs")
//           .select("*")
//           .in("user_id", batch);
//         if (extraConfigs) allConfigs.push(...extraConfigs);
//       }
//     }

//     // 3. Query users in batches (Supabase has URL length limits)
//     const allUsers: Record<string, unknown>[] = [];
//     for (let i = 0; i < userIds.length; i += 200) {
//       const batch = userIds.slice(i, i + 200);
//       const { data: users, error: userError } = await supabase
//         .from("users")
//         .select(
//           "id, bteg_id, idcard_number, first_name, last_name, nice_name, department_name, heltes_name, position_name, is_active",
//         )
//         .in("id", batch);
//       if (userError) throw new Error(`users: ${userError.message}`);
//       if (users) allUsers.push(...users);
//     }

//     // 4. Map to local format and save
//     const employees = allUsers.map((u: Record<string, unknown>) => ({
//       id: u.id as string,
//       employeeCode: (u.bteg_id as string) || "",
//       idcardNumber: (u.idcard_number as string) || "",
//       name:
//         (u.nice_name as string) ||
//         `${u.last_name || ""} ${u.first_name || ""}`.trim(),
//       department: (u.department_name as string) || "",
//       position: (u.position_name as string) || "",
//       heltesName: (u.heltes_name as string) || "",
//       isActive: u.is_active !== false,
//     }));

//     const mealConfigs = allConfigs.map((c: Record<string, unknown>) => ({
//       userId: c.user_id as string,
//       breakfastLocation: c.breakfast_location as number | null,
//       lunchLocation: c.lunch_location as number | null,
//       dinnerLocation: c.dinner_location as number | null,
//       nightMealLocation: c.night_meal_location as number | null,
//       morningMealLocation: c.morning_meal_location as number | null,
//     }));

//     await db.transaction("rw", db.employees, db.userMealConfigs, async () => {
//       await db.employees.clear();
//       await db.employees.bulkAdd(employees);
//       await db.userMealConfigs.clear();
//       await db.userMealConfigs.bulkAdd(mealConfigs);
//     });

//     await db.kioskConfig.put({
//       key: KIOSK_CONFIG_KEYS.LAST_EMPLOYEE_SYNC,
//       value: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//     });

//     if (typeof logId === "number") {
//       await db.syncLog.update(logId, {
//         status: "success",
//         recordCount: employees.length,
//         completedAt: new Date().toISOString(),
//       });
//     }

//     return employees.length;
//   } catch (error) {
//     if (typeof logId === "number") {
//       await db.syncLog.update(logId, {
//         status: "failed",
//         completedAt: new Date().toISOString(),
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }
//     throw error;
//   }
// }

export async function pullEmployees(): Promise<number> {
  if (!navigator.onLine) return 0;
  const logId = await logSync("pull-employees", "started", 0);
  const diningHallId = await getDiningHallId();

  try {
    const supabase = await getSupabaseClient();

    let query = supabase.from("users_with_stats").select("*");

    if (diningHallId) {
      query = query.or(
        `breakfast_location.eq.${diningHallId},lunch_location.eq.${diningHallId},dinner_location.eq.${diningHallId},night_meal_location.eq.${diningHallId},morning_meal_location.eq.${diningHallId}`,
      );
    }

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
    }));

    const mealConfigs = (allData || []).map((row) => ({
      userId: row.user_id,
      breakfastLocation: row.breakfast_location,
      lunchLocation: row.lunch_location,
      dinnerLocation: row.dinner_location,
      nightMealLocation: row.night_meal_location,
      morningMealLocation: row.morning_meal_location,
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
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

    const { data: allOverrides, error } = await supabase
      .from("meal_location_overrides")
      .select("id, user_id, bteg_id, date, meal_type, dining_hall_id, note")
      .eq("date", today)
      .eq("is_deleted", false);

    if (error)
      throw new Error(`meal_location_overrides error: ${error.message}`);

    if (!allOverrides || allOverrides.length === 0) {
      console.warn("No data returned from server, keeping local data.");
      return 0;
    }

    const mappedOverrides = (allOverrides || []).map((o) => ({
      id: o.id as number,
      userId: o.user_id as string,
      btegId: (o.bteg_id as string) || "",
      date: o.date as string,
      mealType: o.meal_type as string,
      diningHallId: o.dining_hall_id as number,
      note: (o.note as string) || null,
    }));

    // 2. Override хийсэн ажилчдын дэлгэрэнгүй мэдээллийг татах
    // Ингэснээр өөр гал тогооны ажилтан ирсэн ч QR уншихад нэр нь гарч ирнэ
    const userIds = mappedOverrides.map((o) => o.userId);
    console.log("overrides user id: ", userIds);

    if (userIds.length > 0) {
      // Хурдтай байх үүднээс users_with_stats-аас зөвхөн хэрэгцээт багануудыг авна
      const { data: userData, error: userError } = await supabase
        .from("users_with_stats")
        .select(
          "user_id, bteg_id, idcard_number, first_name, last_name, heltes_name, position_name, phone",
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
        }));

        // db.employees.clear() хийж болохгүй! Зөвхөн bulkPut ашиглан нэмэх/шинэчлэх
        console.log("Syncing employees for overrides:", mappedEmployees);
        await db.employees.bulkPut(mappedEmployees);
      }
    }

    // 3. Override мэдээллүүдийг локал баазад хадгалах
    if (mappedOverrides.length > 0) {
      await db.transaction("rw", db.mealLocationOverrides, async () => {
        await db.mealLocationOverrides.clear();
        await db.mealLocationOverrides.bulkAdd(mappedOverrides);
      });
    } else {
      console.log("No overrides found on server, keeping local.");
    }

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

// export async function pullMealLocationOverrides(): Promise<number> {
//   const logId = await logSync("pull-overrides", "started", 0);

//   try {
//     const supabase = await getSupabaseClient();
//     const today = new Date().toISOString().split("T")[0]; // Get all local employee IDs

//     const localEmployeeIds = await db.employees.toCollection().primaryKeys();
//     if (localEmployeeIds.length === 0) {
//       await db.mealLocationOverrides.clear();
//       if (typeof logId === "number") {
//         await db.syncLog.update(logId, {
//           status: "success",
//           recordCount: 0,
//           completedAt: new Date().toISOString(),
//         });
//       }
//       return 0;
//     } // Fetch overrides for today where user_id is in local employees
//     // This catches both "to this hall" and "away from this hall" overrides

//     const allOverrides: Record<string, unknown>[] = [];
//     for (let i = 0; i < localEmployeeIds.length; i += 200) {
//       const batch = localEmployeeIds.slice(i, i + 200);
//       const { data, error } = await supabase
//         .from("meal_location_overrides")
//         .select("id, user_id, bteg_id, date, meal_type, dining_hall_id, note")
//         .eq("date", today)
//         .in("user_id", batch);
//       if (error) throw new Error(`meal_location_overrides: ${error.message}`);
//       if (data) allOverrides.push(...data);
//     }

//     console.log("Fetched meal location overrides:", allOverrides);

//     const mapped = allOverrides.map((o: Record<string, unknown>) => ({
//       id: o.id as number,
//       userId: o.user_id as string,
//       btegId: (o.bteg_id as string) || "",
//       date: o.date as string,
//       mealType: o.meal_type as string,
//       diningHallId: o.dining_hall_id as number,
//       note: (o.note as string) || null,
//     }));

//     await db.transaction("rw", db.mealLocationOverrides, async () => {
//       await db.mealLocationOverrides.clear();
//       if (mapped.length > 0) {
//         await db.mealLocationOverrides.bulkAdd(mapped);
//       }
//     });

//     if (typeof logId === "number") {
//       await db.syncLog.update(logId, {
//         status: "success",
//         recordCount: mapped.length,
//         completedAt: new Date().toISOString(),
//       });
//     }

//     return mapped.length;
//   } catch (error) {
//     if (typeof logId === "number") {
//       await db.syncLog.update(logId, {
//         status: "failed",
//         completedAt: new Date().toISOString(),
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }
//     throw error;
//   }
// }

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
    console.log("Fetched meal time slots:", slots);

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
        user_id: !log.userId || log.userId === "unknown" ? null : log.userId,
        bteg_id: log.btegId || "",
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
      await db.mealLogs.where("id").anyOf(ids).modify({ syncStatus: "synced" });

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

export async function runFullSync(): Promise<SyncResults> {
  const results = {
    employeesPulled: 0,
    hallsPulled: 0,
    chefsPulled: 0,
    timeSlotsPulled: 0,
    overridesPulled: 0,
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
    results.overridesPulled = await pullMealLocationOverrides();
  } catch (e) {
    console.error("Pull meal location overrides failed:", e);
  }
  await sendHeartbeat();

  return results;
}
