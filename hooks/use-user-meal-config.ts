"use client";

import { useCallback } from "react";
import { db, type UserMealConfig } from "@/lib/db";

export function useUserMealConfig() {
  const getMealConfig = useCallback(async (userId: string): Promise<UserMealConfig | undefined> => {
    return db.userMealConfigs.get(userId);
  }, []);

  return { getMealConfig };
}
