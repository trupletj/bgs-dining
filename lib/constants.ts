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
  extend_morning_meal: "morningMealLocation",
  extend_lunch: "lunchLocation",
};

export const SCANNER_KEYSTROKE_THRESHOLD_MS = 50;
export const CONFIRMATION_DISPLAY_DURATION_MS = 4000;
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
export const DEFAULT_ADMIN_PIN = "1234";

export function getAllowedMealTypesForShift(
  shiftStartStr: string,
  shiftEndStr: string,
  scanTime: Date = new Date(),
): string[] {
  if (!shiftStartStr || !shiftEndStr) return [];

  const startHour = extractHour(shiftStartStr);
  const endHour = extractHour(shiftEndStr);
  const scanDate = getLocalDate(scanTime);
  const shiftStartDate = getLocalDateFromTimestamp(shiftStartStr);
  const shiftEndDate = getLocalDateFromTimestamp(shiftEndStr);

  const isBetween = (val: number, min: number, max: number) =>
    val >= min && val <= max;

  // 1. Өдрийн стандарт ээлж: 07/08 -> 18/19/20
  if (
    scanDate === shiftStartDate &&
    isBetween(startHour, 7, 8) &&
    isBetween(endHour, 18, 20)
  ) {
    return ["breakfast", "lunch", "dinner"];
  }

  // 2. Өдрийн богино ээлж: 07/08 -> 12
  if (
    scanDate === shiftStartDate &&
    isBetween(startHour, 7, 8) &&
    endHour === 12
  ) {
    return ["breakfast", "lunch"];
  }

  // 3. Энгийн шөнийн ээлж: 18/19/20 -> next day 07/08
  if (isBetween(startHour, 18, 20) && isBetween(endHour, 7, 8)) {
    if (scanDate === shiftStartDate) return ["dinner", "night_meal"];
    if (scanDate === shiftEndDate) return ["morning_meal"];
  }

  // 4. Сунгасан шөнийн ээлж: 18/19/20 -> next day 12
  if (isBetween(startHour, 18, 20) && endHour === 12) {
    if (scanDate === shiftStartDate) return ["dinner", "night_meal"];
    if (scanDate === shiftEndDate) {
      return ["extend_morning_meal", "extend_lunch"];
    }
  }

  // 5. Зөрж ирж буй өдрийн дунд ээлж: 12/13 -> 19/20
  if (
    scanDate === shiftStartDate &&
    isBetween(startHour, 12, 13) &&
    isBetween(endHour, 19, 20)
  ) {
    return ["lunch", "dinner"];
  }

  // 6. 12/13 -> next day 07/08
  if (isBetween(startHour, 12, 13) && isBetween(endHour, 7, 8)) {
    if (scanDate === shiftStartDate) return ["lunch", "dinner", "night_meal"];
    if (scanDate === shiftEndDate) return ["morning_meal"];
  }

  return [];
}

function extractHour(dateStr: string): number {
  if (!dateStr) return -1;

  const normalized = dateStr.trim().replace("T", " ");
  const timePart = normalized.includes(" ")
    ? normalized.split(" ").at(-1) || ""
    : normalized;
  const hour = parseInt(timePart.split(":")[0], 10);

  return Number.isFinite(hour) ? hour : -1;
}

export const getLocalDate = (date: Date = new Date()): string => {
  return getLocalDateFromDate(date);
};

export const getLocalDateFromDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(date);
};

function getLocalDateFromTimestamp(timestamp: string): string {
  const normalized = timestamp.includes("T")
    ? timestamp
    : timestamp.replace(" ", "T");

  return normalized.slice(0, 10);
}

export function resolveTargetMealType(
  allowedMeals: string[],
  currentMealType: string,
): string {
  if (allowedMeals.includes(currentMealType)) {
    return currentMealType;
  }

  if (currentMealType === "lunch" && allowedMeals.includes("extend_lunch")) {
    return "extend_lunch";
  }

  // 3. Breakfast/Morning -> Extend Morning Meal хөрвүүлэлт
  const isBreakfastSlot =
    currentMealType === "breakfast" || currentMealType === "morning_meal";
  if (isBreakfastSlot && allowedMeals.includes("extend_morning_meal")) {
    return "extend_morning_meal";
  }

  // 4. Breakfast -> Morning Meal (ердийн шөнийн ээлж бууж байгаа бол)
  if (
    currentMealType === "breakfast" &&
    allowedMeals.includes("morning_meal")
  ) {
    return "morning_meal";
  }

  // Хэрэв ямар ч тохирох зүйл олдохгүй бол үндсэн төрлийг буцаана (Энэ нь дараагийн шатны unauthorized шалгалт дээр унана)
  return currentMealType;
}
