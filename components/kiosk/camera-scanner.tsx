"use client";

import { Camera, CameraOff } from "lucide-react";
import { useCameraScanner } from "@/hooks/use-camera-scanner";

interface CameraScannerProps {
  onScan: (code: string) => void;
}

export function CameraScanner({ onScan }: CameraScannerProps) {
  const { elementId, isStarted, error, start, stop } = useCameraScanner({
    onScan,
  });

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* hidden биш — харагдахгүй үед h-0 overflow-hidden ашиглана */}
      <div
        id={elementId}
        className={`rounded-2xl overflow-hidden bg-slate-800/50 shadow-lg ring-2 ring-blue-500/20 transition-all duration-300 w-full max-w-xs
          ${isStarted ? "h-64 opacity-100" : "h-0 opacity-0"}`}
      />

      {error && (
        <p className="text-sm text-red-400 text-center px-4">{error}</p>
      )}

      <button
        onClick={isStarted ? stop : start}
        className="flex items-center gap-2 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 shadow-lg transition-all duration-200 hover:bg-slate-700/60 hover:text-slate-100">
        {isStarted ? (
          <>
            <CameraOff className="h-4 w-4 text-red-400" />
            Камер унтраах
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 text-blue-400" />
            Камер асаах
          </>
        )}
      </button>
    </div>
  );
}
