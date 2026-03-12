"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";
import { pullChefs } from "@/lib/sync/sync-engine";
import { getSupabaseClient } from "@/lib/supabase/client";

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
        // 1. Эхлээд локал баазаас (Dexie) шалгах
        let chef = await db.chefs
          .where("phone")
          .equals(phone)
          .filter((c) => c.pin === pin && c.isActive)
          .first();

        // 2. Хэрэв локал дээр байхгүй бол ШУУД Supabase-ээс шалгах
        if (!chef) {
          console.log("Chef not found locally, checking Supabase directly...");
          const supabase = await getSupabaseClient();

          const { data: remoteChef, error: supabaseError } = await supabase
            .from("chefs")
            .select("*")
            .eq("phone", phone)
            .eq("pin", pin)
            .eq("is_active", true)
            .single();

          if (remoteChef) {
            console.log("Chef found on Supabase, saving to local DB...");
            // Олдсон тогоочийг локал бааз руу нэмэх/шинэчлэх
            const mappedChef = {
              id: remoteChef.id,
              name: remoteChef.name || "",
              phone: remoteChef.phone || "",
              diningHallId: remoteChef.dining_hall_id,
              pin: remoteChef.pin || "0000",
              isActive: remoteChef.is_active !== false,
            };

            await db.chefs.put(mappedChef);
            chef = mappedChef;
          } else {
            if (supabaseError)
              console.error("Supabase check error:", supabaseError);
          }
        }

        // 3. Эцэст нь шалгах
        if (!chef) {
          return {
            success: false,
            error: "Утасны дугаар эсвэл PIN код буруу байна",
          };
        }

        // Амжилттай боллоо - КioskConfig шинэчлэх
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
        console.error("Login process error:", err);
        return {
          success: false,
          error: "Нэвтрэх явцад техникийг алдаа гарлаа",
        };
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
