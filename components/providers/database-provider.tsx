"use client";

import { useEffect, useState, type ReactNode } from "react";
import { seedDatabase } from "@/lib/db/seed";

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    seedDatabase()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error("Database seeding failed:", err);
        setIsReady(true); // still render even if seeding fails
      });
  }, []);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Ачааллаж байна...</p>
      </div>
    );
  }

  return <>{children}</>;
}
