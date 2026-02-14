"use client";

import { useEffect, useRef, useCallback } from "react";
import { SCANNER_KEYSTROKE_THRESHOLD_MS } from "@/lib/constants";

interface UseBarcodeScanner {
  onScan: (code: string) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScanner) {
  const bufferRef = useRef<string>("");
  const lastKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processBuffer = useCallback(() => {
    const code = bufferRef.current.trim();
    if (code.length >= 3) {
      onScan(code);
    }
    bufferRef.current = "";
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input/textarea (admin forms)
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeystrokeRef.current;

      if (timeSinceLastKey > SCANNER_KEYSTROKE_THRESHOLD_MS) {
        // Too much time passed — start fresh buffer
        bufferRef.current = "";
      }

      lastKeystrokeRef.current = now;

      if (e.key === "Enter") {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        processBuffer();
        return;
      }

      // Only capture printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Auto-process after a brief pause (scanner always ends with Enter,
        // but this is a safety fallback)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = "";
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, processBuffer]);
}
