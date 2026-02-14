"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { CONFIRMATION_DISPLAY_DURATION_MS } from "@/lib/constants";

export type ConfirmationResult = {
  type: "success" | "error" | "warning";
  title: string;
  message: string;
  employeeName?: string;
  mealName?: string;
};

interface MealConfirmationOverlayProps {
  result: ConfirmationResult;
  onDismiss: () => void;
}

export function MealConfirmationOverlay({
  result,
  onDismiss,
}: MealConfirmationOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, CONFIRMATION_DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor =
    result.type === "success"
      ? "bg-green-500/95"
      : result.type === "warning"
        ? "bg-yellow-500/95"
        : "bg-red-500/95";

  const Icon =
    result.type === "success"
      ? CheckCircle2
      : result.type === "warning"
        ? AlertTriangle
        : XCircle;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor}`}
      onClick={onDismiss}
    >
      <div className="flex flex-col items-center gap-6 text-white">
        <Icon className="h-32 w-32" strokeWidth={1.5} />
        {result.employeeName && (
          <p className="text-2xl font-medium">{result.employeeName}</p>
        )}
        <h1 className="text-5xl font-bold">{result.title}</h1>
        <p className="text-2xl">{result.message}</p>
        {result.mealName && (
          <p className="text-xl opacity-80">{result.mealName}</p>
        )}
      </div>
    </div>
  );
}
