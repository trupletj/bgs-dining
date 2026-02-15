"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { PinGate } from "@/components/admin/pin-gate";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PinGate>
      <div className="flex h-screen">
        <AdminNav />
        <main className="flex-1 overflow-auto p-8 bg-muted/10">{children}</main>
      </div>
    </PinGate>
  );
}
