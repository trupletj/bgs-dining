"use client";

import { useState, useRef, useEffect } from "react";
import { ChefHat, Loader2, Settings, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChefAuth } from "@/hooks/use-chef-auth";
import { toast } from "sonner";

export function ChefLoginScreen() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useChefAuth();
  const phoneRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!phone.trim() || !pin.trim()) {
      toast.error("Мэдээллээ бүрэн оруулна уу");
      return;
    }

    setLoading(true);
    try {
      const result = await login(phone, pin);
      if (result.success) {
        toast.success(`Тавтай морил, ${result.name}!`);
      } else {
        toast.error(result.error ?? "Нэвтрэх амжилтгүй");
        setPin(""); // Алдаа гарвал зөвхөн PIN-г цэвэрлэнэ
        pinRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (document.activeElement === phoneRef.current) {
        pinRef.current?.focus();
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <div
      className="relative flex h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}>
      {/* Background Effects (Pulse, Blobs, Particles) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] animate-pulse-slow" />
      <div className="pointer-events-none absolute top-20 left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse-slow" />

      <div className="relative z-10 flex flex-col items-center gap-4 mb-2">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-40 w-40 rounded-full border border-blue-500/15 animate-pulse-gentle" />
          <div className="relative overflow-hidden rounded-full bg-slate-900/40 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-white/10 border border-white/5">
            <ChefHat
              className="relative h-14 w-14 text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]"
              strokeWidth={1.5}
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-clip-text text-transparent">
          Тогооч нэвтрэх
        </h1>
      </div>

      <div className="relative z-10 flex w-80 flex-col gap-4">
        {/* Phone Input Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">
            Утасны дугаар
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              ref={phoneRef}
              type="text"
              inputMode="tel"
              placeholder="88xxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              className="h-14 pl-12 bg-slate-900/40 backdrop-blur-xl border-white/10 text-lg text-slate-100 placeholder:text-slate-600 focus:ring-blue-500/50 transition-all rounded-xl"
            />
          </div>
        </div>

        {/* PIN Entry Visualization */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">
            PIN код
          </label>
          <div
            className="flex justify-between gap-3 cursor-text"
            onClick={() => pinRef.current?.focus()}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur-xl border transition-all duration-200 ${
                  pin.length === index
                    ? "border-blue-500/50 ring-1 ring-blue-500/30"
                    : "border-white/10"
                }`}
                style={{
                  boxShadow:
                    pin.length > index
                      ? "0 0 15px rgba(59,130,246,0.2)"
                      : undefined,
                }}>
                {pin[index] ? (
                  <div className="h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-slate-700/50" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Input for PIN handling */}
        <Input
          ref={pinRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleKeyDown}
          className="sr-only"
          autoComplete="off"
        />

        <Button
          onClick={handleSubmit}
          disabled={loading || phone.length < 8 || pin.length < 4}
          size="lg"
          className="h-14 text-lg gap-2 rounded-xl shadow-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all duration-300 disabled:opacity-30 mt-2">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Lock className="h-5 w-5" />
          )}
          Нэвтрэх
        </Button>
      </div>
    </div>
  );
}
