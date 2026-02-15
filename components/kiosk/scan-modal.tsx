"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
  onApproveManually: () => void;
  scannedCode: string;
  employeeName?: string;
  message: string;
}

export function ScanModal({
  open,
  onClose,
  onApproveManually,
  scannedCode,
  employeeName,
  message,
}: ScanModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <DialogTitle>Зөвшөөрөлгүй хандалт</DialogTitle>
          </div>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {employeeName && (
          <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ажилтан:</span>
              <span className="font-medium">{employeeName}</span>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Болих
          </Button>
          <Button onClick={onApproveManually} className="shadow-sm">
            Гараар зөвшөөрөх
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
