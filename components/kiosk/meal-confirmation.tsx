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
      ? "bg-gradient-to-br from-green-500 to-green-600"
      : result.type === "warning"
        ? "bg-gradient-to-br from-yellow-500 to-yellow-600"
        : "bg-gradient-to-br from-red-500 to-red-600";

  const Icon =
    result.type === "success"
      ? CheckCircle2
      : result.type === "warning"
        ? AlertTriangle
        : XCircle;

  const iconColor =
    result.type === "success"
      ? "border-green-400/30 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
      : result.type === "warning"
        ? "border-yellow-400/30 shadow-[0_0_40px_rgba(234,179,8,0.3)]"
        : "border-red-400/30 shadow-[0_0_40px_rgba(239,68,68,0.3)]";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl p-6 ${bgColor}`}
      onClick={onDismiss}>
      {/* Арын фонны эффектүүд (Radial gradient болон Particles хэвээрээ) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Particles-ийн код энд байна */}
      </div>

      <div className="flex flex-col items-center gap-4 md:gap-8 text-white text-center animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-lg">
        {/* Icon хэсэг - Responsive хэмжээтэй */}
        <div className="relative">
          <div
            className="absolute inset-0 scale-125 md:scale-150 rounded-full border border-white/10"
            style={{ animation: "pulse-gentle 2s ease-in-out infinite" }}
          />
          <div
            className={`relative rounded-full bg-white/10 backdrop-blur-sm border ${iconColor} p-4 md:p-6`}>
            {/* Гар утсан дээр h-24, desktop дээр h-40 */}
            <Icon
              className="h-24 w-24 md:h-40 md:w-40 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Ажилчны нэр - Responsive текст */}
        {result.employeeName && (
          <p
            className="text-xl md:text-3xl font-medium opacity-90 animate-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
            {result.employeeName}
          </p>
        )}

        {/* Гарчиг - text-4xl-ээс 6xl хүртэл */}
        <h1
          className="text-4xl md:text-6xl font-bold tracking-tight leading-tight animate-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          {result.title}
        </h1>

        {/* Мессеж */}
        <p
          className="text-lg md:text-2xl opacity-80 animate-in slide-in-from-bottom-4 duration-500 px-4"
          style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
          {result.message}
        </p>

        {/* Хоолны нэр */}
        {result.mealName && (
          <div
            className="animate-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "400ms", animationFillMode: "backwards" }}>
            <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2 text-lg md:text-xl font-semibold">
              {result.mealName}
            </span>
          </div>
        )}

        {/* Доод талын заавар */}
        <p className="mt-6 md:mt-10 text-xs md:text-sm text-white/40 animate-pulse">
          Дарж хаах
        </p>
      </div>
    </div>
  );
}
