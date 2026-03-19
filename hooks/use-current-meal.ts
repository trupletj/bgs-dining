"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

export function useCurrentMeal() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentMealResult = useLiveQuery(async () => {
    const mealSlots = await db.mealTimeSlots.toArray();
    if (!mealSlots || mealSlots.length === 0)
      return { primary: null, active: [] };

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activeSlots = mealSlots.filter((s) => s.isActive);

    const runningSlots = activeSlots.filter((slot) => {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);

      if (end > start) {
        return currentMinutes >= start && currentMinutes < end;
      } else {
        return currentMinutes >= start || currentMinutes < end;
      }
    });

    if (runningSlots.length === 0) return { primary: null, active: [] };
    return {
      primary: runningSlots[0],
      active: runningSlots,
    };
  }, [now]);
  return {
    currentMeal: currentMealResult?.primary || null,
    activeMeals: currentMealResult?.active || [],
    currentTime: now,
    isLoading: currentMealResult === undefined,
    mealType: currentMealResult?.primary?.mealType || null,
  };
}
