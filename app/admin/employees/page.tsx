"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { UserMealConfig } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users } from "lucide-react";

const PAGE_SIZE = 50;

function MealConfigSummary({ config, diningHalls }: { config: UserMealConfig | undefined; diningHalls: Map<number, string> }) {
  if (!config) {
    return <span className="text-muted-foreground text-xs">Тохиргоогүй</span>;
  }

  const meals: { label: string; hallId: number | null }[] = [
    { label: "Өглөө", hallId: config.morningMealLocation },
    { label: "Ө/цай", hallId: config.breakfastLocation },
    { label: "Өдөр", hallId: config.lunchLocation },
    { label: "Орой", hallId: config.dinnerLocation },
    { label: "Шөнө", hallId: config.nightMealLocation },
  ];

  const configured = meals.filter((m) => m.hallId !== null && m.hallId !== undefined);

  if (configured.length === 0) {
    return <span className="text-muted-foreground text-xs">Тохиргоогүй</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {configured.map((m) => (
        <Badge key={m.label} variant="outline" className="text-[10px] px-1.5 py-0">
          {m.label}: {diningHalls.get(m.hallId!) ?? m.hallId}
        </Badge>
      ))}
    </div>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const allEmployees = useLiveQuery(() => db.employees.toArray());
  const allConfigs = useLiveQuery(() => db.userMealConfigs.toArray());
  const allHalls = useLiveQuery(() => db.diningHalls.toArray());

  if (allEmployees === undefined) return null;

  const configMap = new Map((allConfigs ?? []).map((c) => [c.userId, c]));
  const hallMap = new Map((allHalls ?? []).map((h) => [h.id, h.name]));

  const filtered = search
    ? allEmployees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
          e.idcardNumber.toLowerCase().includes(search.toLowerCase()) ||
          e.department.toLowerCase().includes(search.toLowerCase())
      )
    : allEmployees;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ажилтнууд</h1>
        <p className="text-muted-foreground">
          Нийт {allEmployees.length} ажилтан бүртгэлтэй
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Жагсаалт</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Нэр, код, үнэмлэх №, хэлтсээр хайх..."
              className="pl-9 rounded-xl h-11"
            />
          </div>

          {paged.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                {search ? "Хайлтад тохирох ажилтан олдсонгүй" : "Ажилтан бүртгэгдээгүй"}
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Үнэмлэх №</TableHead>
                      <TableHead>Нэр</TableHead>
                      <TableHead>Хэлтэс</TableHead>
                      <TableHead>Хоолны тохиргоо</TableHead>
                      <TableHead>Төлөв</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm">
                          {emp.employeeCode}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {emp.idcardNumber}
                        </TableCell>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>
                          <MealConfigSummary
                            config={configMap.get(emp.id)}
                            diningHalls={hallMap}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.isActive ? "default" : "secondary"}
                          >
                            {emp.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filtered.length} ажилтнаас {page * PAGE_SIZE + 1}-
                    {Math.min((page + 1) * PAGE_SIZE, filtered.length)}-г
                    харуулж байна
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded-lg border px-4 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      Өмнөх
                    </button>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border px-4 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      Дараах
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
