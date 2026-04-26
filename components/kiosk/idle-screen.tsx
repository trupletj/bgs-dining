"use client";

import { ScanLine } from "lucide-react";

export function IdleScreen() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-64 w-64 rounded-full border border-blue-500/20 animate-ping"
          style={{ animationDuration: "3s" }}
        />

        <div className="relative overflow-hidden rounded-3xl bg-slate-800/90 border border-white/10 p-10 shadow-lg">
          <ScanLine
            className="relative h-24 w-24 text-blue-400"
            strokeWidth={1.5}
          />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-slate-100">
          Картаа уншуулна уу
        </h2>
        <p className="mt-3 text-lg text-slate-400">
          Хоолны бүртгэл хийхийн тулд QR кодоо уншуулна уу
        </p>
      </div>
    </div>
  );
}
