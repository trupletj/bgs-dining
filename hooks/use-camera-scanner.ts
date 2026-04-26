"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseCameraScannerOptions {
  onScan: (code: string) => void;
  debounceMs?: number;
  elementId?: string;
}

export function useCameraScanner({
  onScan,
  debounceMs = 2000,
  elementId = "camera-scanner-viewport",
}: UseCameraScannerOptions) {
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

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

    // Элемент DOM-д байгаа эсэх, хэмжээ тодорхой эсэхийг шалгана
    const el = document.getElementById(elementId);
    if (!el) {
      setError("Камерын container олдсонгүй");
      return;
    }

    // Mobile-д layout paint дуусахыг хүлээнэ
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Хэмжээг динамикаар тодорхойлно
            const size = Math.min(viewfinderWidth, viewfinderHeight, 250);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        handleDecode,
        () => {},
      );
      setIsStarted(true);
    } catch (err) {
      console.error("Camera Error:", err);
      // Fallback: user camera
      try {
        await scannerRef.current?.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
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
  }, [handleDecode, elementId]);

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
