"use client";

import { ScanLine } from "lucide-react";

export function IdleScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="rounded-full bg-muted p-8">
        <ScanLine className="h-24 w-24 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Картаа уншуулна уу
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Хоолны бүртгэл хийхийн тулд QR кодоо уншуулна уу
        </p>
      </div>
    </div>
  );
}
