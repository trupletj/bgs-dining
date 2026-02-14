"use client";

import { useRef, useCallback, useEffect } from "react";

type SoundType = "success" | "error" | "warning";

const FREQUENCIES: Record<SoundType, number[]> = {
  success: [523, 659, 784], // C5, E5, G5 - major chord ascending
  error: [440, 349],        // A4, F4 - descending minor
  warning: [440, 440],      // A4 repeated - attention
};

const DURATIONS: Record<SoundType, number> = {
  success: 120,
  error: 200,
  warning: 150,
};

export function useScanSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (type: SoundType) => {
      try {
        const ctx = getContext();
        const freqs = FREQUENCIES[type];
        const dur = DURATIONS[type] / 1000;
        const now = ctx.currentTime;

        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = type === "success" ? "sine" : "square";
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.3, now + i * dur);
          gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * dur);
          osc.stop(now + (i + 1) * dur);
        });
      } catch {
        // Audio not available
      }
    },
    [getContext]
  );

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { play };
}
