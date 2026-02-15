"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  UtensilsCrossed,
  ChefHat,
  Users,
  FileText,
  LayoutDashboard,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin", label: "Хянах самбар", icon: LayoutDashboard },
  { href: "/admin/meal-times", label: "Хоолны цаг", icon: Clock },
  { href: "/admin/dining-hall", label: "Гал тогоо", icon: UtensilsCrossed },
  { href: "/admin/chefs", label: "Тогооч", icon: ChefHat },
  { href: "/admin/employees", label: "Ажилтнууд", icon: Users },
  { href: "/admin/records", label: "Бүртгэл", icon: FileText },
  { href: "/admin/setup", label: "Тохиргоо", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r bg-card/80 backdrop-blur-sm shadow-[1px_0_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="p-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl transition-all duration-200">
            <ArrowLeft className="h-4 w-4" />
            Киоск руу буцах
          </Button>
        </Link>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-0.5 p-2 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10 text-primary shadow-sm font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
