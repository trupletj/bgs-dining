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
      className="flex h-screen flex-col items-center justify-center gap-8 bg-background select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-muted p-6">
          <ChefHat className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Тогооч нэвтрэх</h1>
        <p className="text-lg text-muted-foreground">PIN код оруулна уу</p>
      </div>

      <div className="flex w-72 flex-col gap-4">
        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleKeyDown}
          placeholder="PIN"
          className="text-center text-2xl tracking-[0.5em] h-14"
          autoComplete="off"
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !pin.trim()}
          size="lg"
          className="h-12 text-lg gap-2"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          Нэвтрэх
        </Button>

        <Link href="/admin">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            Админ
          </Button>
        </Link>
      </div>
    </div>
  );
}
