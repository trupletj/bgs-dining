"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { MEAL_NAME_MAP } from "@/lib/constants";

export function CurrentMealDisplay() {
  const { activeMeals } = useCurrentMeal();

  if (!activeMeals || activeMeals.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-white/5 px-4 py-2 shadow-lg">
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
          className="relative flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/20 via-blue-500/15 to-purple-500/20 border border-blue-400/30 px-4 py-2.5 shadow-lg">
          <div className="relative flex items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30 p-1.5">
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="relative">
            <span className="font-semibold text-blue-200">
              {MEAL_NAME_MAP[meal.mealType as keyof typeof MEAL_NAME_MAP] ||
                meal.mealType}
            </span>
            <span className="ml-2 text-sm text-slate-400">
              {meal.startTime} - {meal.endTime}
            </span>
          </div>
          <Badge className="relative bg-green-500/90 text-white border-0 shadow-lg ml-2">
            <span className="relative mr-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Идэвхтэй
          </Badge>
        </div>
      ))}
    </div>
  );
}
