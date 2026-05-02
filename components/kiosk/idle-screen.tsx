"use client";

import { ScanLine } from "lucide-react";

export function IdleScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center">
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-10">
          <ScanLine
            className="relative h-24 w-24 text-blue-400"
            strokeWidth={1.5}
          />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-semibold text-slate-100">
          Картаа уншуулна уу
        </h2>
        <p className="mt-3 text-lg text-slate-400">
          Хоолны бүртгэл хийхийн тулд QR кодоо уншуулна уу
        </p>
      </div>
    </div>
  );
}
