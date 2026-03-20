import type { UserMealConfig } from "@/lib/db";
import { MEAL_TYPE_COLUMN_MAP } from "@/lib/constants";

/**
 * Get the assigned dining hall ID for a specific meal slot from user's config.
 * Returns:
 * - A number (dining hall ID) if the meal is configured
 * - null if the meal column exists but is not configured (unauthorized)
 * - "skip" if no per-meal validation is needed (e.g., snack)
 */
export function getMealLocationForSlot(
  config: UserMealConfig,
  slotId: string,
): number | null | "skip" {
  const columnName = MEAL_TYPE_COLUMN_MAP[slotId];
  console.log("slotid", slotId);

  if (columnName === null || columnName === undefined) {
    // No dedicated column for this meal type (e.g., snack)
    return "skip";
  }

  const value = config[columnName as keyof UserMealConfig];
  if (typeof value === "number") return value;
  return null;
}
