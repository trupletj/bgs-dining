import { db } from "@/lib/db";
import { DEFAULT_ADMIN_PIN, KIOSK_CONFIG_KEYS } from "@/lib/constants";

export async function seedDatabase() {
  const existingPin = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.ADMIN_PIN);
  if (!existingPin) {
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.ADMIN_PIN,
      value: DEFAULT_ADMIN_PIN,
      updatedAt: new Date().toISOString(),
    });
  }

  const existingSyncInterval = await db.kioskConfig.get(
    KIOSK_CONFIG_KEYS.SYNC_INTERVAL_MINUTES,
  );
  if (!existingSyncInterval) {
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.SYNC_INTERVAL_MINUTES,
      value: "5",
      updatedAt: new Date().toISOString(),
    });
  }

  // Төхөөрөмжийн UUID үүсгэх
  const existingUuid = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.DEVICE_UUID);
  if (!existingUuid) {
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.DEVICE_UUID,
      value: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    });
  }
}
