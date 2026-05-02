"use client";

import { Clock } from "lucide-react";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { MEAL_NAME_MAP } from "@/lib/constants";

export function CurrentMealDisplay() {
  const { activeMeals } = useCurrentMeal();

  if (!activeMeals || activeMeals.length === 0) {
    return (
      <div className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2">
        <Clock className="h-4 w-4 shrink-0 text-slate-500 sm:h-5 sm:w-5" />
        <span className="text-sm text-slate-400 sm:hidden">Цаг биш</span>
        <span className="hidden text text-slate-400 sm:inline">
          Хоолны цаг биш байна.
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
      {/* Идэвхтэй байгаа бүх хоолны цагуудыг харуулах */}
      {activeMeals.map((meal) => (
        <div
          key={meal.id}
          className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-900 border border-blue-400/30 px-3 py-2 sm:gap-3 sm:px-4">
          <div className="hidden items-center justify-center rounded-md bg-blue-500/15 border border-blue-400/30 p-1.5 sm:flex">
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-blue-200 sm:inline sm:text-base">
              {MEAL_NAME_MAP[meal.mealType as keyof typeof MEAL_NAME_MAP] ||
                meal.mealType}
            </span>
            <span className="block text-xs text-slate-400 sm:ml-2 sm:inline sm:text-sm">
              {meal.startTime} - {meal.endTime}
            </span>
          </div>
          <span className="hidden rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white sm:inline">
            Идэвхтэй
          </span>
        </div>
      ))}
    </div>
  );
}
