"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

export function useChefAuth() {
  const activeChefId = useLiveQuery(async () => {
    const config = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID);
    return config?.value ? Number(config.value) : null;
  });

  const activeChefName = useLiveQuery(async () => {
    const config = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_NAME);
    return config?.value ?? null;
  });

  const login = useCallback(async (pin: string): Promise<{ success: boolean; name?: string; error?: string }> => {
    const chef = await db.chefs.filter((c) => c.pin === pin && c.isActive).first();
    if (!chef) {
      return { success: false, error: "Буруу PIN код эсвэл идэвхгүй тогооч" };
    }

    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID,
      value: String(chef.id),
      updatedAt: new Date().toISOString(),
    });
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.ACTIVE_CHEF_NAME,
      value: chef.name,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, name: chef.name };
  }, []);

  const logout = useCallback(async () => {
    await db.kioskConfig.delete(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID);
    await db.kioskConfig.delete(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_NAME);
  }, []);

  return {
    activeChefId: activeChefId ?? null,
    activeChefName: activeChefName ?? null,
    isLoggedIn: !!activeChefId,
    login,
    logout,
  };
}
