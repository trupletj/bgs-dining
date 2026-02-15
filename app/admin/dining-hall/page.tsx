"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useKioskConfig } from "@/hooks/use-kiosk-config";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

export default function DiningHallPage() {
  const diningHalls = useLiveQuery(() => db.diningHalls.toArray());
  const { value: selectedId } = useKioskConfig(KIOSK_CONFIG_KEYS.DINING_HALL_ID);

  if (diningHalls === undefined) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Гал тогоо</h1>
        <p className="text-muted-foreground">
          Supabase-ээс синк хийгдсэн гал тогооны жагсаалт
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Бүх гал тогоо ({diningHalls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {diningHalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Гал тогоо олдсонгүй. Тохиргоо хэсгээс Supabase холболт тохируулаад синк хийнэ үү.
            </p>
          ) : (
            <div className="space-y-2">
              {diningHalls.map((hall) => (
                <div
                  key={hall.id}
                  className="flex items-center justify-between rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors p-4"
                >
                  <div>
                    <span className="font-medium">{hall.name}</span>
                    {hall.location && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({hall.location})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ID: {hall.id}</Badge>
                    {selectedId === String(hall.id) && (
                      <Badge variant="default">Сонгосон</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
