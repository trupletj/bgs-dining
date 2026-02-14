"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface OnlineStatusContextValue {
  isOnline: boolean;
}

export const OnlineStatusContext = createContext<OnlineStatusContextValue>({
  isOnline: true,
});

export function useOnlineStatusProvider() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}

export function useOnlineStatus() {
  return useContext(OnlineStatusContext);
}
