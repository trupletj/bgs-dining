"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealLocationOverride } from "@/lib/db";
import {
  getAllowedMealTypesForShift,
  getLocalDate,
  MEAL_TYPE_COLUMN_MAP,
} from "@/lib/constants";
import { getMealLocationForSlot } from "@/lib/meal-type-map";

type MealCounts = Record<string, number>;

const EMPTY_COUNTS: MealCounts = {};

function addCount(counts: MealCounts, mealType: string, amount = 1) {
  counts[mealType] = (counts[mealType] || 0) + amount;
}

function getLatestOverrideMap(overrides: MealLocationOverride[]) {
  const sorted = [...overrides].sort((a, b) => b.id - a.id);
  const map = new Map<string, MealLocationOverride>();

  for (const override of sorted) {
    const key = `${override.userId}|${override.mealType}`;
    if (!map.has(key)) map.set(key, override);
  }

  return map;
}

export function useExpectedMealCounts(diningHallId?: number | null) {
  const today = useMemo(() => getLocalDate(), []);

  const counts = useLiveQuery(async () => {
    if (!diningHallId) return EMPTY_COUNTS;

    const hallId = Number(diningHallId);
    const now = new Date();
    const result: MealCounts = {};

    const syncedExpected = await db.expectedMealCounts
      .where("[date+diningHallId]")
      .equals([today, hallId])
      .toArray();

    if (syncedExpected.length > 0) {
      return syncedExpected.reduce<MealCounts>((acc, row) => {
        addCount(acc, row.mealType, row.expectedCount);
        return acc;
      }, {});
    }

    const [employees, configs, overrides, subPlans] = await Promise.all([
      db.employees.toArray(),
      db.userMealConfigs.toArray(),
      db.mealLocationOverrides.where("date").equals(today).toArray(),
      db.subEmployeeMealPlans
        .where("[date+diningHallId]")
        .equals([today, hallId])
        .toArray(),
    ]);

    const configByUserId = new Map(configs.map((config) => [config.userId, config]));
    const overrideByUserMeal = getLatestOverrideMap(overrides);

    for (const employee of employees) {
      if (!employee.isActive || !employee.shiftStart || !employee.shiftEnd) {
        continue;
      }

      const config = configByUserId.get(employee.id);
      if (!config) continue;

      const allowedMeals = getAllowedMealTypesForShift(
        employee.shiftStart,
        employee.shiftEnd,
        now,
      );

      for (const mealType of allowedMeals) {
        if (!(mealType in MEAL_TYPE_COLUMN_MAP)) continue;

        const override = overrideByUserMeal.get(`${employee.id}|${mealType}`);
        if (override) {
          if (override.diningHallId === hallId) addCount(result, mealType);
          continue;
        }

        const location = getMealLocationForSlot(config, mealType);
        if (location !== "skip" && location === hallId) {
          addCount(result, mealType);
        }
      }
    }

    for (const plan of subPlans) {
      addCount(result, "breakfast", plan.breakfastCount);
      addCount(result, "morning_meal", plan.morningMealCount);
      addCount(result, "lunch", plan.lunchCount);
      addCount(result, "dinner", plan.dinnerCount);
      addCount(result, "night_meal", plan.nightMealCount);
    }

    return result;
  }, [diningHallId, today]);

  const byMealType = counts ?? EMPTY_COUNTS;
  const total = Object.values(byMealType).reduce((sum, value) => sum + value, 0);

  return {
    byMealType,
    total,
    today,
  };
}
