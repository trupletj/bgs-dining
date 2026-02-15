"use client";

import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DoubleScanModalProps {
  open: boolean;
  onClose: () => void;
  onAddExtraServing: () => void;
  employeeName: string;
  mealName: string;
  existingScanTime: string;
}

export function DoubleScanModal({
  open,
  onClose,
  onAddExtraServing,
  employeeName,
  mealName,
  existingScanTime,
}: DoubleScanModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Copy className="h-5 w-5 text-yellow-500" />
            </div>
            <DialogTitle>Давхар бүртгэл</DialogTitle>
          </div>
          <DialogDescription>
            Энэ ажилтан аль хэдийн бүртгүүлсэн байна
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ажилтан:</span>
            <span className="font-medium">{employeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Хоол:</span>
            <span className="font-medium">{mealName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Өмнөх бүртгэлийн цаг:</span>
            <span className="font-medium">
              {new Date(existingScanTime).toLocaleTimeString("mn-MN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Болих
          </Button>
          <Button onClick={onAddExtraServing} className="shadow-sm">
            Нэмэлт порц
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
