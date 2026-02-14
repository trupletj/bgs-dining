"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Star, Hand } from "lucide-react";
import { toast } from "sonner";

export default function RecordsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [mealFilter, setMealFilter] = useState<string>("all");

  const mealSlots = useLiveQuery(() =>
    db.mealTimeSlots.orderBy("sortOrder").toArray()
  );

  const chefs = useLiveQuery(() => db.chefs.toArray());

  const logs = useLiveQuery(() => {
    return db.mealLogs
      .orderBy("scannedAt")
      .reverse()
      .toArray()
      .then((results) =>
        results.filter((r) => {
          if (dateFilter && r.date !== dateFilter) return false;
          if (mealFilter !== "all" && r.mealType !== mealFilter) return false;
          return true;
        })
      );
  }, [dateFilter, mealFilter]);

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error("Экспортлох бүртгэл байхгүй");
      return;
    }

    const headers = ["Огноо", "Цаг", "Үнэмлэх №", "Нэр", "Хоол", "Нэмэлт", "Гараар", "Тогооч", "Синк", "Бүртгэсэн цаг"];
    const rows = logs.map((l) => {
      const slot = mealSlots?.find((s) => s.id === l.mealType);
      const chef = chefs?.find((c) => c.id === l.chefId);
      return [
        l.date,
        new Date(l.scannedAt).toLocaleTimeString("mn-MN"),
        l.idcardNumber,
        l.employeeName,
        slot?.name ?? l.mealType,
        l.isExtraServing ? "Тийм" : "",
        l.isManualOverride ? "Тийм" : "",
        chef?.name ?? "",
        l.syncStatus,
        l.scannedAt,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canteen-records-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV файл татагдлаа");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Бүртгэл</h1>
        <p className="text-muted-foreground">Хоолны бүртгэлийн жагсаалт</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Шүүлтүүр</CardTitle>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV татах
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-1">
              <Label>Огноо</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Хоол</Label>
              <Select value={mealFilter} onValueChange={setMealFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Бүгд</SelectItem>
                  {mealSlots?.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Бүртгэл ({logs?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Бүртгэл олдсонгүй</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Цаг</TableHead>
                    <TableHead>Үнэмлэх №</TableHead>
                    <TableHead>Нэр</TableHead>
                    <TableHead>Хоол</TableHead>
                    <TableHead>Тэмдэглэл</TableHead>
                    <TableHead>Тогооч</TableHead>
                    <TableHead>Синк</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l, i) => {
                    const slot = mealSlots?.find((s) => s.id === l.mealType);
                    const chef = chefs?.find((c) => c.id === l.chefId);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(l.scannedAt).toLocaleTimeString("mn-MN")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {l.idcardNumber}
                        </TableCell>
                        <TableCell>{l.employeeName}</TableCell>
                        <TableCell>{slot?.name ?? l.mealType}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {l.isExtraServing && (
                              <Badge variant="outline" className="gap-0.5 text-xs">
                                <Star className="h-3 w-3" /> Нэмэлт
                              </Badge>
                            )}
                            {l.isManualOverride && (
                              <Badge variant="outline" className="gap-0.5 text-xs">
                                <Hand className="h-3 w-3" /> Гараар
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {chef?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              l.syncStatus === "synced"
                                ? "default"
                                : l.syncStatus === "pending"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {l.syncStatus === "synced"
                              ? "Синк"
                              : l.syncStatus === "pending"
                                ? "Хүлээгдэж буй"
                                : "Алдаа"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
