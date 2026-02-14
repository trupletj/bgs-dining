import { db } from "@/lib/db";
import { DEFAULT_MEAL_SLOTS, DEFAULT_ADMIN_PIN, KIOSK_CONFIG_KEYS } from "@/lib/constants";

export async function seedDatabase() {
  // Seed meal time slots (use bulkPut to handle both new installs and upgrades)
  const existingSlots = await db.mealTimeSlots.count();
  if (existingSlots === 0) {
    await db.mealTimeSlots.bulkPut(
      DEFAULT_MEAL_SLOTS.map((slot) => ({
        id: slot.id,
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
        sortOrder: slot.sortOrder,
      }))
    );
  } else {
    // Ensure new slots (like morning_meal) are added for existing installs
    for (const slot of DEFAULT_MEAL_SLOTS) {
      const existing = await db.mealTimeSlots.get(slot.id);
      if (!existing) {
        await db.mealTimeSlots.put({
          id: slot.id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
          sortOrder: slot.sortOrder,
        });
      }
    }
  }

  const existingPin = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.ADMIN_PIN);
  if (!existingPin) {
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.ADMIN_PIN,
      value: DEFAULT_ADMIN_PIN,
      updatedAt: new Date().toISOString(),
    });
  }

  const existingSyncInterval = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.SYNC_INTERVAL_MINUTES);
  if (!existingSyncInterval) {
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.SYNC_INTERVAL_MINUTES,
      value: "5",
      updatedAt: new Date().toISOString(),
    });
  }

  // Auto-generate device UUID if not set
  const existingUuid = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.DEVICE_UUID);
  if (!existingUuid) {
    await db.kioskConfig.put({
      key: KIOSK_CONFIG_KEYS.DEVICE_UUID,
      value: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    });
  }
}
