"use client";

import { useEffect, useRef } from "react";
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
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const timer = setTimeout(
      () => onDismissRef.current(),
      CONFIRMATION_DISPLAY_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const bgColor =
    result.type === "success"
      ? "bg-green-600"
      : result.type === "warning"
        ? "bg-yellow-600"
        : "bg-red-600";

  const Icon =
    result.type === "success"
      ? CheckCircle2
      : result.type === "warning"
        ? AlertTriangle
        : XCircle;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${bgColor} bg-opacity-95`}
      onClick={onDismiss}>
      <div className="flex flex-col items-center gap-4 md:gap-8 text-white text-center w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="relative">
          <div className="absolute inset-0 scale-125 rounded-full border border-white/20" />
          <div className="relative rounded-full bg-white/10 border border-white/20 p-4 md:p-6">
            <Icon className="h-24 w-24 md:h-40 md:w-40" strokeWidth={2} />
          </div>
        </div>

        <div className="space-y-2">
          {result.employeeName && (
            <p className="text-xl md:text-3xl font-medium opacity-90">
              {result.employeeName}
            </p>
          )}

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            {result.title}
          </h1>

          <p className="text-lg md:text-2xl opacity-90 px-4">
            {result.message}
          </p>
        </div>

        {result.mealName && (
          <div className="mt-2">
            <span className="rounded-full bg-black/20 border border-white/30 px-6 py-2 text-lg md:text-xl font-semibold">
              {result.mealName}
            </span>
          </div>
        )}

        <p className="mt-6 md:mt-10 text-xs md:text-sm text-white/60">
          Дарж хаах
        </p>
      </div>
    </div>
  );
}
