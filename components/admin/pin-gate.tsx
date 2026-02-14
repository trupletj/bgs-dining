"use client";

import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS, DEFAULT_ADMIN_PIN } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ChefHat } from "lucide-react";
import Link from "next/link";

export function PinGate({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const storedPin = useLiveQuery(
    () => db.kioskConfig.get(KIOSK_CONFIG_KEYS.ADMIN_PIN),
    []
  );

  if (storedPin === undefined) return null; // loading

  if (authenticated) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = storedPin?.value ?? DEFAULT_ADMIN_PIN;
    if (pin === correctPin) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Буруу ПИН код");
      setPin("");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 rounded-full bg-muted p-3">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Админ нэвтрэх</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">ПИН код</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="ПИН код оруулна уу"
                autoFocus
                maxLength={10}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full">
              Нэвтрэх
            </Button>
          </form>

          <Link href="/">
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground mt-2">
              <ChefHat className="h-4 w-4" />
              Тогооч нэвтрэх
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
