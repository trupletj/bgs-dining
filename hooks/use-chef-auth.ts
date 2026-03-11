"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

export function useChefAuth() {
  // Идэвхтэй нэвтэрсэн тогоочийн ID-г хянах
  const activeChefId = useLiveQuery(async () => {
    const config = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID);
    return config?.value ? Number(config.value) : null;
  });

  // Идэвхтэй нэвтэрсэн тогоочийн нэрийг хянах
  const activeChefName = useLiveQuery(async () => {
    const config = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.ACTIVE_CHEF_NAME);
    return config?.value ?? null;
  });

  /**
   * Утасны дугаар болон PIN-ээр нэвтрэх
   */
  const login = useCallback(
    async (
      phone: string,
      pin: string,
    ): Promise<{ success: boolean; name?: string; error?: string }> => {
      if (!phone || !pin) {
        return { success: false, error: "Утасны дугаар болон PIN оруулна уу" };
      }

      try {
        // Утасны дугаараар индексжүүлсэн хайлт хийж, дараа нь PIN-г шалгана
        const chef = await db.chefs
          .where("phone")
          .equals(phone)
          .filter((c) => c.pin === pin && c.isActive)
          .first();

        if (!chef) {
          return {
            success: false,
            error: "Утасны дугаар эсвэл PIN код буруу байна",
          };
        }

        // Төхөөрөмжийн локал тохиргоонд нэвтэрсэн тогоочийг хадгалах
        await db.kioskConfig.bulkPut([
          {
            key: KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID,
            value: String(chef.id),
            updatedAt: new Date().toISOString(),
          },
          {
            key: KIOSK_CONFIG_KEYS.ACTIVE_CHEF_NAME,
            value: chef.name,
            updatedAt: new Date().toISOString(),
          },
        ]);

        return { success: true, name: chef.name };
      } catch (err) {
        console.error("Login error:", err);
        return { success: false, error: "Нэвтрэх явцад алдаа гарлаа" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await db.kioskConfig.bulkDelete([
      KIOSK_CONFIG_KEYS.ACTIVE_CHEF_ID,
      KIOSK_CONFIG_KEYS.ACTIVE_CHEF_NAME,
    ]);
  }, []);

  return {
    activeChefId: activeChefId ?? null,
    activeChefName: activeChefName ?? null,
    isLoggedIn: !!activeChefId,
    login,
    logout,
  };
}
