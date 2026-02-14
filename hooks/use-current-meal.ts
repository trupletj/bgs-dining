"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealTimeSlot } from "@/lib/db";

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function findActiveMeal(slots: MealTimeSlot[]): MealTimeSlot | null {
  const currentMinutes = getCurrentMinutes();

  const activeSlots = slots
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const slot of activeSlots) {
    const start = parseTime(slot.startTime);
    const end = parseTime(slot.endTime);

    if (end > start) {
      // Normal range (e.g., 11:30-13:30)
      if (currentMinutes >= start && currentMinutes < end) {
        return slot;
      }
    } else {
      // Overnight range (e.g., 23:00-01:00)
      if (currentMinutes >= start || currentMinutes < end) {
        return slot;
      }
    }
  }

  return null;
}

export function useCurrentMeal() {
  const mealSlots = useLiveQuery(() =>
    db.mealTimeSlots.orderBy("sortOrder").toArray()
  );

  const [currentMeal, setCurrentMeal] = useState<MealTimeSlot | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (mealSlots) {
      setCurrentMeal(findActiveMeal(mealSlots));
    }
  }, [mealSlots]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (mealSlots) {
        setCurrentMeal(findActiveMeal(mealSlots));
      }
    }, 60_000); // re-evaluate every minute

    return () => clearInterval(interval);
  }, [mealSlots]);

  return {
    currentMeal,
    currentTime,
    allSlots: mealSlots ?? [],
    isLoading: mealSlots === undefined,
  };
}
