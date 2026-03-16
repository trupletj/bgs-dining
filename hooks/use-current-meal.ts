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
    if (!mealSlots || mealSlots.length === 0) return null;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activeSlots = mealSlots.filter((s) => s.isActive);

    for (const slot of activeSlots) {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);

      if (end > start) {
        if (currentMinutes >= start && currentMinutes < end) return slot;
      } else {
        if (currentMinutes >= start || currentMinutes < end) return slot;
      }
    }
    return null;
  }, [now]);
  return {
    currentMeal: currentMealResult,
    currentTime: now,
    isLoading: currentMealResult === undefined,
    mealType: currentMealResult?.mealType || null,
  };
}
