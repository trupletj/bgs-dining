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
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl ${bgColor}`}
      onClick={onDismiss}
    >
      {/* Animated radial gradient pulse */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${
            result.type === "success" ? "rgba(34,197,94,0.15)" : result.type === "warning" ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)"
          } 0%, transparent 70%)`,
          animation: "pulse-gentle 3s ease-in-out infinite",
        }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 text-white animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Icon with ping rings */}
        <div className="relative">
          <div
            className="absolute inset-0 scale-150 rounded-full border border-white/10"
            style={{ animation: "pulse-gentle 2s ease-in-out infinite" }}
          />
          <div
            className="absolute inset-0 scale-125 rounded-full border border-white/15"
            style={{ animation: "pulse-gentle 2s ease-in-out infinite", animationDelay: "0.5s" }}
          />
          <div className={`relative rounded-full bg-white/10 backdrop-blur-sm border ${iconColor} p-4`}>
            <Icon className="h-40 w-40 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
          </div>
        </div>

        {result.employeeName && (
          <p className="text-3xl font-medium opacity-90 animate-in slide-in-from-bottom-4 fade-in-0 duration-500" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
            {result.employeeName}
          </p>
        )}
        <h1 className="text-6xl font-bold tracking-tight animate-in slide-in-from-bottom-4 fade-in-0 duration-500" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          {result.title}
        </h1>
        <p className="text-2xl animate-in slide-in-from-bottom-4 fade-in-0 duration-500" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
          {result.message}
        </p>
        {result.mealName && (
          <div className="animate-in slide-in-from-bottom-4 fade-in-0 duration-500" style={{ animationDelay: "400ms", animationFillMode: "backwards" }}>
            <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-2 text-xl">
              {result.mealName}
            </span>
          </div>
        )}
        <p className="mt-4 text-sm text-white/50 animate-bounce">Дарж хаах</p>
      </div>
    </div>
  );
}
