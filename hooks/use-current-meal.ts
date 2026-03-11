"use client";

import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}
function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useCurrentMeal() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Цагийг секунд тутамд шинэчлэх (илүү нарийвчлалтай)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Баазаас цагийн хуваарийг унших
  const mealSlots = useLiveQuery(() => db.mealTimeSlots.toArray());

  // 3. Одоогийн хоолны цагийг тооцоолох
  const currentMeal = useMemo(() => {
    if (!mealSlots || mealSlots.length === 0) return null;

    const currentMinutes =
      currentTime.getHours() * 60 + currentTime.getMinutes();

    // Зөвхөн идэвхтэй хуваарийг шүүх
    const activeSlots = mealSlots.filter((s) => s.isActive);

    for (const slot of activeSlots) {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);

      if (end > start) {
        // Хэвийн үе (жишээ нь: 11:30 - 13:30)
        if (currentMinutes >= start && currentMinutes < end) {
          return slot;
        }
      } else {
        // Шөнийн хоол (жишээ нь: 23:00 - 01:00)
        if (currentMinutes >= start || currentMinutes < end) {
          return slot;
        }
      }
    }
    return null;
  }, [mealSlots, currentTime]);

  return {
    currentMeal,
    currentTime,
    allSlots: mealSlots ?? [],
    isLoading: mealSlots === undefined,
    mealType: currentMeal?.mealType || null, // Meal confirmation-д хэрэг болдог
  };
}
