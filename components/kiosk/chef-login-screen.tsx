"use client";

import { useState, useRef, useEffect } from "react";
import { ChefHat, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChefAuth } from "@/hooks/use-chef-auth";
import { toast } from "sonner";
import Link from "next/link";

export function ChefLoginScreen() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useChefAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    try {
      const result = await login(pin);
      if (result.success) {
        toast.success(`Тавтай морил, ${result.name}!`);
      } else {
        toast.error(result.error ?? "Нэвтрэх амжилтгүй");
        setPin("");
        inputRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div
      className="relative flex h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Animated radial gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse-slow" />

      {/* Floating background blobs */}
      <div className="pointer-events-none absolute top-20 left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse-slow" />
      <div className="pointer-events-none absolute bottom-20 right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />

      {/* Floating particles */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-blue-400/30 animate-float" />
      <div className="pointer-events-none absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-purple-400/30 animate-float" style={{ animationDelay: "0.5s" }} />
      <div className="pointer-events-none absolute bottom-1/4 left-1/3 h-2 w-2 rounded-full bg-blue-300/30 animate-float" style={{ animationDelay: "1s" }} />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 h-1.5 w-1.5 rounded-full bg-purple-300/30 animate-float" style={{ animationDelay: "1.5s" }} />
      <div className="pointer-events-none absolute top-2/3 left-2/3 h-2 w-2 rounded-full bg-blue-400/30 animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Concentric animated rings */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-40 w-40 rounded-full border border-blue-500/15"
            style={{ animation: "pulse-gentle 4s ease-in-out infinite" }}
          />
          <div
            className="absolute h-32 w-32 rounded-full border border-blue-400/20"
            style={{ animation: "pulse-gentle 4s ease-in-out infinite", animationDelay: "0.5s" }}
          />

          {/* Glassmorphism icon card */}
          <div className="relative overflow-hidden rounded-full bg-slate-900/40 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/10 border border-white/5">
            {/* Inner glow pulse */}
            <div className="absolute inset-0 rounded-full bg-blue-500/10" style={{ animation: "pulse-gentle 3s ease-in-out infinite" }} />
            {/* Scan-line effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="animate-scan-line h-1/3 w-full bg-gradient-to-b from-transparent via-blue-400/20 to-transparent" />
            </div>
            <ChefHat className="relative h-16 w-16 text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-clip-text text-transparent">
          Тогооч нэвтрэх
        </h1>
        <p className="text-lg text-slate-400">PIN код оруулна уу</p>
      </div>

      <div className="relative z-10 flex w-80 flex-col gap-5">
        {/* 4 individual PIN digit boxes */}
        <div
          className="flex justify-center gap-3 mb-2 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-xl transition-all duration-200"
              style={{
                boxShadow: pin.length > index ? "0 0 20px rgba(59,130,246,0.3)" : undefined,
              }}
            >
              {pin[index] ? (
                <div className="h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-slate-700/50" />
              )}
            </div>
          ))}
        </div>

        {/* Hidden input for actual input handling */}
        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleKeyDown}
          placeholder="PIN"
          className="sr-only"
          autoComplete="off"
        />

        <Button
          onClick={handleSubmit}
          disabled={loading || !pin.trim()}
          size="lg"
          className="relative h-12 text-lg gap-2 rounded-xl shadow-xl overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-xl"
        >
          {/* Shimmer effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          {loading && <Loader2 className="relative h-5 w-5 animate-spin" />}
          <span className="relative">Нэвтрэх</span>
        </Button>

        <Link href="/admin">
          <Button
            variant="ghost"
            className="w-full gap-2 text-slate-400 bg-slate-900/20 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-slate-900/40 hover:text-slate-300 hover:border-white/10 transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            Админ
          </Button>
        </Link>
      </div>
    </div>
  );
}
