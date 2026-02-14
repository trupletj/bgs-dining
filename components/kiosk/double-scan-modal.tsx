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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Давхар бүртгэл</DialogTitle>
          </div>
          <DialogDescription>
            Энэ ажилтан аль хэдийн бүртгүүлсэн байна
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
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
          <Button onClick={onAddExtraServing}>
            Нэмэлт порц
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
