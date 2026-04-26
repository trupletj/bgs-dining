"use client";

import { Camera, CameraOff } from "lucide-react";
import { useCameraScanner } from "@/hooks/use-camera-scanner";

interface CameraScannerProps {
  onScan: (code: string) => void;
  id?: string;
}

export function CameraScanner({
  onScan,
  id = "camera-scanner-viewport",
}: CameraScannerProps) {
  const { elementId, isStarted, error, start, stop } = useCameraScanner({
    onScan,
    elementId: id,
  });

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Камерын container — үргэлж DOM-д байна, хэмжээ үргэлж тодорхой */}
      <div
        id={elementId}
        style={{
          width: "100%",
          maxWidth: "320px",
          height: isStarted ? "320px" : "0px",
          overflow: "hidden",
          borderRadius: "16px",
          background: "rgba(30,41,59,0.5)",
          transition: "height 0.3s ease",
        }}
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
