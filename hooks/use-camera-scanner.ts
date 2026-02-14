"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseCameraScannerOptions {
  onScan: (code: string) => void;
  debounceMs?: number;
}

export function useCameraScanner({ onScan, debounceMs = 2000 }: UseCameraScannerOptions) {
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
    [onScan, debounceMs]
  );

  const start = useCallback(async () => {
    if (scannerRef.current) return;
    setError(null);

    try {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleDecode,
        () => {} // ignore errors on each frame
      );

      setIsStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Камер нээхэд алдаа гарлаа");
      scannerRef.current = null;
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
