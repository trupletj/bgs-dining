"use client";

import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCameraScanner } from "@/hooks/use-camera-scanner";

interface CameraScannerProps {
  onScan: (code: string) => void;
}

export function CameraScanner({ onScan }: CameraScannerProps) {
  const { elementId, isStarted, error, start, stop } = useCameraScanner({
    onScan,
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        id={elementId}
        className="w-64 h-64 rounded-lg overflow-hidden bg-muted"
        style={{ display: isStarted ? "block" : "none" }}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={isStarted ? stop : start}
        className="gap-2"
      >
        {isStarted ? (
          <>
            <CameraOff className="h-4 w-4" />
            Камер унтраах
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Камер асаах
          </>
        )}
      </Button>
    </div>
  );
}
