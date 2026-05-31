import { db, type MealLog, type ServerMealLogCache } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase/client";

export type ServerMealLogConflict = {
  sync_key: string;
  device_uuid: string | null;
};

function normalizeMealType(mealType: string): string {
  return mealType === "nightmeal" ? "night_meal" : mealType;
}

export function buildExtraServingSyncKey(log: Pick<MealLog, "syncKey" | "id">): string {
  return `${log.syncKey}-extra-${Date.now()}-${log.id ?? crypto.randomUUID()}`;
}

export function buildManualOverrideSyncKey(
  log: Pick<MealLog, "syncKey" | "id" | "diningHallId">,
): string {
  return `${log.syncKey}-manual-${log.diningHallId}-${Date.now()}-${log.id ?? crypto.randomUUID()}`;
}

export function isDifferentDeviceConflict(
  localDeviceUuid: string | null | undefined,
  serverDeviceUuid: string | null | undefined,
): boolean {
  if (!serverDeviceUuid || !localDeviceUuid) return true;
  return serverDeviceUuid !== localDeviceUuid;
}

export async function findNormalMealLogInCache(params: {
  userId?: string | null;
  subEmployeeId?: string | null;
  mealType: string;
  date: string;
  diningHallId: number;
}): Promise<ServerMealLogCache | undefined> {
  const mealType = normalizeMealType(params.mealType);

  if (params.userId) {
    return db.serverMealLogCache
      .where("[userId+mealType+date]")
      .equals([params.userId, mealType, params.date])
      .and(
        (log) =>
          log.diningHallId === params.diningHallId && !log.isExtraServing,
      )
      .first();
  }

  if (params.subEmployeeId) {
    return db.serverMealLogCache
      .where("[subEmployeeId+mealType+date]")
      .equals([params.subEmployeeId, mealType, params.date])
      .and(
        (log) =>
          log.diningHallId === params.diningHallId && !log.isExtraServing,
      )
      .first();
  }

  return undefined;
}

export async function findNormalMealLogOnServer(params: {
  userId?: string | null;
  subEmployeeId?: string | null;
  mealType: string;
  date: string;
  diningHallId: number;
}): Promise<ServerMealLogConflict | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  if (!params.userId && !params.subEmployeeId) return null;

  try {
    const supabase = await getSupabaseClient();
    let query = supabase
      .from("meal_logs")
      .select("sync_key, device_uuid")
      .eq("meal_type", normalizeMealType(params.mealType))
      .eq("date", params.date)
      .eq("dining_hall_id", params.diningHallId)
      .eq("is_extra_serving", false)
      .limit(1);

    query = params.subEmployeeId
      ? query.eq("sub_employee_id", params.subEmployeeId)
      : query.eq("user_id", params.userId);

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn("Server duplicate check failed:", error.message);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.warn("Server duplicate check failed:", error);
    return null;
  }
}

export async function findServerRowsBySyncKey(
  syncKeys: string[],
): Promise<Map<string, ServerMealLogConflict>> {
  const uniqueSyncKeys = Array.from(new Set(syncKeys.filter(Boolean)));
  if (uniqueSyncKeys.length === 0) return new Map();

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("meal_logs")
    .select("sync_key, device_uuid")
    .in("sync_key", uniqueSyncKeys);

  if (error) throw new Error(error.message);

  return new Map(
    (data ?? []).map((row) => [
      row.sync_key,
      {
        sync_key: row.sync_key,
        device_uuid: row.device_uuid,
      },
    ]),
  );
}
