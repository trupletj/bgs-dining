import { z } from "zod/v4";

export const employeeSchema = z.object({
  id: z.string(),
  employeeCode: z.string(),
  idcardNumber: z.string(),
  name: z.string(),
  department: z.string(),
  position: z.string(),
  heltesName: z.string(),
  isActive: z.boolean(),
});

export const userMealConfigSchema = z.object({
  userId: z.string(),
  breakfastLocation: z.number().nullable(),
  lunchLocation: z.number().nullable(),
  dinnerLocation: z.number().nullable(),
  nightMealLocation: z.number().nullable(),
  morningMealLocation: z.number().nullable(),
});

export const mealLogSchema = z.object({
  id: z.number().optional(),
  userId: z.string(),
  idcardNumber: z.string(),
  employeeName: z.string(),
  mealType: z.string(),
  diningHallId: z.number(),
  date: z.string(),
  scannedAt: z.string(),
  syncStatus: z.enum(["pending", "synced", "failed"]),
  isExtraServing: z.boolean(),
  isManualOverride: z.boolean(),
  chefId: z.number().nullable(),
  deviceUuid: z.string().nullable(),
  syncKey: z.string(),
});

export const mealTimeSlotSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean(),
  sortOrder: z.number(),
});

export const diningHallSchema = z.object({
  id: z.number(),
  name: z.string(),
  location: z.string(),
});

export const chefSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  diningHallId: z.number(),
  pin: z.string(),
  isActive: z.boolean(),
});

export const kioskConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  updatedAt: z.string(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type UserMealConfigInput = z.infer<typeof userMealConfigSchema>;
export type MealLogInput = z.infer<typeof mealLogSchema>;
export type MealTimeSlotInput = z.infer<typeof mealTimeSlotSchema>;
export type DiningHallInput = z.infer<typeof diningHallSchema>;
export type ChefInput = z.infer<typeof chefSchema>;
