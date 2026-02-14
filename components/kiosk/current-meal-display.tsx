"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentMeal } from "@/hooks/use-current-meal";

export function CurrentMealDisplay() {
  const { currentMeal } = useCurrentMeal();

  if (!currentMeal) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">Хоолны цаг биш байна</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-2">
      <Clock className="h-5 w-5 text-primary" />
      <div>
        <span className="font-semibold text-primary">{currentMeal.name}</span>
        <span className="ml-2 text-sm text-muted-foreground">
          {currentMeal.startTime} - {currentMeal.endTime}
        </span>
      </div>
      <Badge variant="default">Идэвхтэй</Badge>
    </div>
  );
}
