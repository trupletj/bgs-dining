"use client";

import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function useKioskConfig(key: string) {
  const config = useLiveQuery(() => db.kioskConfig.get(key), [key]);

  const setValue = useCallback(
    async (value: string) => {
      await db.kioskConfig.put({
        key,
        value,
        updatedAt: new Date().toISOString(),
      });
    },
    [key]
  );

  return {
    value: config?.value ?? null,
    setValue,
    isLoading: config === undefined,
  };
}

export function useKioskConfigAll() {
  const configs = useLiveQuery(() => db.kioskConfig.toArray());

  const getConfig = useCallback(
    (key: string) => configs?.find((c) => c.key === key)?.value ?? null,
    [configs]
  );

  const setConfig = useCallback(async (key: string, value: string) => {
    await db.kioskConfig.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  return { configs, getConfig, setConfig, isLoading: configs === undefined };
}
