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
  { id: "morning_meal", name: "Өглөөний хоол", startTime: "05:00", endTime: "06:30", isActive: false, sortOrder: 0 },
  { id: "breakfast", name: "Өглөөний цай", startTime: "07:00", endTime: "09:00", isActive: true, sortOrder: 1 },
  { id: "lunch", name: "Өдрийн хоол", startTime: "11:30", endTime: "13:30", isActive: true, sortOrder: 2 },
  { id: "snack", name: "Оройн цай", startTime: "15:00", endTime: "16:00", isActive: true, sortOrder: 3 },
  { id: "dinner", name: "Оройн хоол", startTime: "17:30", endTime: "19:30", isActive: true, sortOrder: 4 },
  { id: "nightmeal", name: "Шөнийн хоол", startTime: "23:00", endTime: "01:00", isActive: false, sortOrder: 5 },
] as const;

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
  nightmeal: "nightMealLocation",
};

export const SCANNER_KEYSTROKE_THRESHOLD_MS = 50;
export const CONFIRMATION_DISPLAY_DURATION_MS = 4000;
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
export const DEFAULT_ADMIN_PIN = "1234";
