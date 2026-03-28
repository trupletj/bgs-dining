import { Employee } from "./db";

export const APP_NAME = "Canteen Kiosk";
export const DB_NAME = "canteen-kiosk-db";
export const DB_VERSION = 3;

export const SYNC_STATUS = {
  PENDING: "pending",
  SYNCED: "synced",
  FAILED: "failed",
} as const;

export const KIOSK_CONFIG_KEYS = {
  DINING_HALL_ID: "diningHallId",
  SERVER_URL: "serverUrl",
  ADMIN_PIN: "adminPin",
  SYNC_INTERVAL_MINUTES: "syncIntervalMinutes",
  LAST_EMPLOYEE_SYNC: "lastEmployeeSync",
  LAST_CONFIRMATION_SYNC: "lastConfirmationSync",
  SUPABASE_URL: "supabaseUrl",
  SUPABASE_PUBLISHABLE_KEY: "supabasePublishableKey",
  DEVICE_UUID: "deviceUuid",
  DEVICE_NAME: "deviceName",
  ACTIVE_CHEF_ID: "activeChefId",
  ACTIVE_CHEF_NAME: "activeChefName",
} as const;

export const DEFAULT_MEAL_SLOTS = [
  {
    id: "morning_meal",
    name: "Өглөөний хоол",
    startTime: "05:00",
    endTime: "06:30",
    isActive: false,
    sortOrder: 0,
  },
  {
    id: "breakfast",
    name: "Өглөөний цай",
    startTime: "07:00",
    endTime: "09:00",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "lunch",
    name: "Өдрийн хоол",
    startTime: "11:30",
    endTime: "13:30",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "snack",
    name: "Оройн цай",
    startTime: "15:00",
    endTime: "16:00",
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "dinner",
    name: "Оройн хоол",
    startTime: "17:30",
    endTime: "19:30",
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "night_meal",
    name: "Шөнийн хоол",
    startTime: "23:00",
    endTime: "01:00",
    isActive: false,
    sortOrder: 5,
  },
  {
    id: "extend_morning_meal",
    name: "Өглөөний хоол (сунасан)",
    startTime: "23:00",
    endTime: "01:00",
    isActive: false,
    sortOrder: 5,
  },
  {
    id: "extend_lunch",
    name: "Өдрийн хоол (сунасан)",
    startTime: "23:00",
    endTime: "01:00",
    isActive: false,
    sortOrder: 5,
  },
] as const;

export const MEAL_NAME_MAP = Object.fromEntries(
  DEFAULT_MEAL_SLOTS.map((slot) => [slot.id, slot.name]),
);
/**
 * Maps local meal slot IDs to user_meal_configs column names.
 * `null` means skip per-meal validation (allow if user has any config).
 */
export const MEAL_TYPE_COLUMN_MAP: Record<string, string | null> = {
  morning_meal: "morningMealLocation",
  breakfast: "breakfastLocation",
  lunch: "lunchLocation",
  snack: null, // No dedicated column; allow if user has any config
  dinner: "dinnerLocation",
  night_meal: "nightMealLocation",
};

export const SCANNER_KEYSTROKE_THRESHOLD_MS = 50;
export const CONFIRMATION_DISPLAY_DURATION_MS = 4000;
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
export const DEFAULT_ADMIN_PIN = "1234";

export function getAllowedMealTypesForShift(
  shiftStartStr: string,
  shiftEndStr: string,
): string[] {
  if (!shiftStartStr || !shiftEndStr) return [];

  const startHour = extractHour(shiftStartStr);
  const endHour = extractHour(shiftEndStr);

  console.log(`Parsed Hours -> Start: ${startHour}, End: ${endHour}`);

  // 1. Өдрийн ээлж: 07/08 - 19/20
  if (
    (startHour === 7 || startHour === 8) &&
    (endHour === 19 || endHour === 20)
  ) {
    return ["breakfast", "lunch", "dinner"];
  }

  // 2. Шөнийн ээлж: 19/20 - 07/08
  if (
    (startHour === 19 || startHour === 20) &&
    (endHour === 7 || endHour === 8)
  ) {
    return ["dinner", "night_meal", "morning_meal"];
  }

  // 3. Өглөөний хагас: 07/08 - 12
  if ((startHour === 7 || startHour === 8) && endHour === 12) {
    return ["breakfast", "lunch"];
  }

  // 4. Шөнийн уртасгасан ээлж (19/20 - 12)
  if ((startHour === 19 || startHour === 20) && endHour === 12) {
    return ["dinner", "night_meal", "extend_morning_meal", "extend_lunch"];
  }
  console.warn("No shift match found for hours:", startHour, endHour);
  return [];
}

export const resolveMealTypeForEmployee = (
  employee: Employee | null,
  baseMealType: string,
) => {
  if (!employee) return baseMealType;

  const allowedMeals = getAllowedMealTypesForShift(
    employee.shiftStart,
    employee.shiftEnd,
  );
  let targetMealType = baseMealType;

  if (!allowedMeals.includes(targetMealType)) {
    if (
      targetMealType === "lunch" &&
      allowedMeals.includes("extend_morning_meal")
    ) {
      targetMealType = "extend_morning_meal";
    } else if (
      targetMealType === "dinner" &&
      allowedMeals.includes("extend_lunch")
    ) {
      targetMealType = "extend_lunch";
    } else if (
      targetMealType === "breakfast" &&
      allowedMeals.includes("morning_meal")
    ) {
      targetMealType = "morning_meal";
    }
  }
  return targetMealType;
};

function extractHour(dateStr: string): number {
  if (!dateStr) return -1;

  if (dateStr.includes("T")) {
    const timePart = dateStr.split("T")[1];
    return parseInt(timePart.split(":")[0], 10);
  }

  return parseInt(dateStr.split(":")[0], 10);
}

export const getLocalDate = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date());
};
