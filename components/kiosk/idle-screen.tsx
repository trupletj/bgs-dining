"use client";

import { ScanLine } from "lucide-react";

export function IdleScreen() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-8">
      {/* Concentric animated rings */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-80 w-80 rounded-full border border-blue-500/10"
          style={{ animation: "pulse-gentle 4s ease-in-out infinite" }}
        />
        <div
          className="absolute h-64 w-64 rounded-full border border-blue-400/15"
          style={{ animation: "pulse-gentle 4s ease-in-out infinite", animationDelay: "0.5s" }}
        />
        <div
          className="absolute h-48 w-48 rounded-full border border-blue-300/20"
          style={{ animation: "pulse-gentle 4s ease-in-out infinite", animationDelay: "1s" }}
        />

        {/* Center glass card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 p-10 shadow-[0_8px_60px_-10px_rgba(59,130,246,0.2)]">
          {/* Inner glow pulse */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-blue-500/5 animate-pulse-slow" />
          {/* Scan line animation */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="animate-scan-line h-1/3 w-full bg-gradient-to-b from-transparent via-blue-400/10 to-transparent" />
          </div>
          <ScanLine className="relative h-24 w-24 text-blue-400 drop-shadow-[0_0_24px_rgba(59,130,246,0.5)]" strokeWidth={1.5} />
        </div>
      </div>

      <div className="text-center ">
        <h2 className="bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
          Картаа уншуулна уу
        </h2>
        <p className="mt-3 text-lg text-slate-400">
          Хоолны бүртгэл хийхийн тулд QR кодоо уншуулна уу
        </p>
      </div>
    </div>
  );
}
