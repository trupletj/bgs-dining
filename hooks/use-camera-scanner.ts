"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseCameraScannerOptions {
  onScan: (code: string) => void;
  debounceMs?: number;
}

export function useCameraScanner({
  onScan,
  debounceMs = 2000,
}: UseCameraScannerOptions) {
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const elementId = "camera-scanner-viewport";

  const handleDecode = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // Debounce same code
      if (
        decodedText === lastCodeRef.current &&
        now - lastScanTimeRef.current < debounceMs
      ) {
        return;
      }
      lastCodeRef.current = decodedText;
      lastScanTimeRef.current = now;
      onScan(decodedText);
    },
    [onScan, debounceMs],
  );

  // use-camera-scanner.ts — start функцийг өөрчлөх
  const start = useCallback(async () => {
    if (scannerRef.current) return;
    setError(null);

    try {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // ← deviceId биш, facingMode ашиглана
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        handleDecode,
        () => {},
      );
      setIsStarted(true);
    } catch (err) {
      console.error("Camera Error:", err);
      // facingMode: "environment" амжилтгүй бол user camera туршина
      try {
        await scannerRef.current?.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleDecode,
          () => {},
        );
        setIsStarted(true);
      } catch (fallbackErr) {
        setError(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Камер нээхэд алдаа гарлаа",
        );
        scannerRef.current = null;
      }
    }
  }, [handleDecode]);

  const stop = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    } catch {
      // ignore stop errors
    }
    scannerRef.current = null;
    setIsStarted(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return {
    elementId,
    isStarted,
    error,
    start,
    stop,
  };
}
