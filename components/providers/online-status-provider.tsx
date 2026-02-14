"use client";

import type { ReactNode } from "react";
import {
  OnlineStatusContext,
  useOnlineStatusProvider,
} from "@/hooks/use-online-status";

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const value = useOnlineStatusProvider();

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
}
