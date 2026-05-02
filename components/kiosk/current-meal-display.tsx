"use client";

import { Clock } from "lucide-react";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { MEAL_NAME_MAP } from "@/lib/constants";

export function CurrentMealDisplay() {
  const { activeMeals } = useCurrentMeal();

  if (!activeMeals || activeMeals.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-4 py-2">
        <Clock className="h-5 w-5 text-slate-500" />
        <span className="text-slate-400">Хоолны цаг биш байна</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Идэвхтэй байгаа бүх хоолны цагуудыг харуулах */}
      {activeMeals.map((meal) => (
        <div
          key={meal.id}
          className="flex items-center gap-3 rounded-lg bg-slate-900 border border-blue-400/30 px-4 py-2">
          <div className="flex items-center justify-center rounded-md bg-blue-500/15 border border-blue-400/30 p-1.5">
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <span className="font-semibold text-blue-200">
              {MEAL_NAME_MAP[meal.mealType as keyof typeof MEAL_NAME_MAP] ||
                meal.mealType}
            </span>
            <span className="ml-2 text-sm text-slate-400">
              {meal.startTime} - {meal.endTime}
            </span>
          </div>
          <span className="ml-2 rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
            Идэвхтэй
          </span>
        </div>
      ))}
    </div>
  );
}
