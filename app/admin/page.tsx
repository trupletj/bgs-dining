"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UtensilsCrossed, CloudOff, Clock, ChefHat } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useCurrentMeal } from "@/hooks/use-current-meal";
import { useChefAuth } from "@/hooks/use-chef-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SyncStatusCard } from "@/components/admin/sync-status-card";

export default function AdminDashboard() {
  const { isOnline } = useOnlineStatus();
  const { currentMeal } = useCurrentMeal();
  const { activeChefName } = useChefAuth();

  const today = new Date().toISOString().split("T")[0];
  const employeeCount = useLiveQuery(() => db.employees.count()) ?? 0;
  const todayLogs = useLiveQuery(
    () => db.mealLogs.where("date").equals(today).count()
  ) ?? 0;
  const pendingSync = useLiveQuery(
    () => db.mealLogs.where("syncStatus").equals("pending").count()
  ) ?? 0;
  const diningHallCount = useLiveQuery(() => db.diningHalls.count()) ?? 0;
  const chefCount = useLiveQuery(() => db.chefs.count()) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Хянах самбар</h1>
        <p className="text-muted-foreground">Системийн ерөнхий мэдээлэл</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ажилтнууд</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
            <p className="text-xs text-muted-foreground">Нийт бүртгэлтэй</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Өнөөдрийн бүртгэл</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLogs}</div>
            <p className="text-xs text-muted-foreground">{today}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Синк хүлээгдэж буй</CardTitle>
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSync}</div>
            <Badge variant={isOnline ? "default" : "destructive"} className="mt-1">
              {isOnline ? "Онлайн" : "Оффлайн"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Одоогийн хоол</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMeal?.name ?? "—"}
            </div>
            {currentMeal && (
              <p className="text-xs text-muted-foreground">
                {currentMeal.startTime} - {currentMeal.endTime}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Түргэн үйлдлүүд</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/admin/setup">
              <Button variant="outline" className="w-full justify-start gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Суурь тохиргоо
              </Button>
            </Link>
            <Link href="/admin/meal-times">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Clock className="h-4 w-4" />
                Хоолны цаг тохируулах
              </Button>
            </Link>
            <Link href="/admin/employees">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Ажилтнууд
              </Button>
            </Link>
            <Link href="/admin/records">
              <Button variant="outline" className="w-full justify-start gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Бүртгэл харах
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Системийн мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Гал тогооны тоо</span>
              <span className="font-medium">{diningHallCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Тогоочийн тоо</span>
              <span className="font-medium">{chefCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Идэвхтэй тогооч</span>
              <span className="font-medium">{activeChefName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сүлжээ</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Онлайн" : "Оффлайн"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <SyncStatusCard />
    </div>
  );
}
